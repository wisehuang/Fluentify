document.addEventListener('DOMContentLoaded', async function() {
  const apiKeyContainer = document.getElementById('apiKeyContainer');
  const refineContainer = document.getElementById('refineContainer');
  const apiKeyInput = document.getElementById('apiKey');
  const openaiModelInput = document.getElementById('openaiModel');
  const reasoningEffortSelect = document.getElementById('reasoningEffort');
  const saveApiKeyButton = document.getElementById('saveApiKey');
  const apiKeyStatus = document.getElementById('apiKeyStatus');
  const inputText = document.getElementById('inputText');
  const refineButton = document.getElementById('refineButton');
  const chat = document.getElementById('chat');
  const tones = document.getElementById('tones');
  const title = document.getElementById('title');
  const showSettings = document.getElementById('showSettings');
  const backButton = document.getElementById('backButton');

  let currentTone = DEFAULT_TONE;
  let hasApiKey = false;
  let busy = false;
  let hasOutput = false;
  let showChanges = true;
  let draftTimer = null;

  // ---------- storage ----------

  // The key lives in storage.local. Older versions kept it in storage.sync,
  // so move it over once and remove the synced copy.
  async function loadSettings() {
    const local = await chrome.storage.local.get(['openaiApiKey', 'openaiModel', 'reasoningEffort', 'tone']);
    if (local.openaiApiKey) return local;

    const synced = await chrome.storage.sync.get(['openaiApiKey', 'openaiModel']);
    if (!synced.openaiApiKey) return local;

    const migrated = {
      openaiApiKey: synced.openaiApiKey,
      openaiModel: synced.openaiModel || DEFAULT_MODEL
    };
    await chrome.storage.local.set(migrated);
    await chrome.storage.sync.remove(['openaiApiKey', 'openaiModel']);
    return { ...local, ...migrated };
  }

  // ---------- views ----------

  function showView(view) {
    const settings = view === 'settings';
    apiKeyContainer.hidden = !settings;
    refineContainer.hidden = settings;
    title.textContent = settings ? 'Settings' : 'Fluentify';
    showSettings.hidden = settings;
    backButton.hidden = !(settings && hasApiKey);
    if (!settings) inputText.focus();
  }

  function setStatus(message, ok) {
    apiKeyStatus.textContent = message;
    apiKeyStatus.className = `status ${ok ? 'ok' : 'bad'}`;
  }

  // ---------- tone chips ----------

  function renderTones() {
    tones.replaceChildren();
    for (const [key, tone] of Object.entries(TONES)) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'tone';
      chip.textContent = tone.label;
      chip.setAttribute('role', 'radio');
      chip.setAttribute('aria-checked', String(key === currentTone));
      chip.disabled = busy;
      chip.addEventListener('click', function() {
        if (key === currentTone) return;
        currentTone = key;
        chrome.storage.local.set({ tone: key });
        renderTones();
        // A result is already on screen: redo it in the new tone.
        if (hasOutput && inputText.value.trim()) enhance();
      });
      tones.appendChild(chip);
    }
  }

  // ---------- result rendering ----------

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  // Rewrite with added words in <mark> and words dropped from the source in <del>.
  function highlighted(source, rewrite) {
    const fragment = document.createDocumentFragment();
    const tokens = diffWords(source, rewrite);
    let lastWasWord = false;
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (!token.removed) {
        fragment.appendChild(token.changed ? el('mark', '', token.text) : document.createTextNode(token.text));
        lastWasWord = /\S/.test(token.text);
        continue;
      }
      const words = [token.text];
      while (i + 1 < tokens.length && tokens[i + 1].removed) {
        words.push(tokens[++i].text);
      }
      if (lastWasWord) fragment.appendChild(document.createTextNode(' '));
      fragment.appendChild(el('del', '', words.join(' ')));
      if (i + 1 < tokens.length) fragment.appendChild(document.createTextNode(' '));
      lastWasWord = false;
    }
    return fragment;
  }

  function copyButton(text) {
    const button = el('button', 'primary', 'Copy');
    button.type = 'button';
    button.addEventListener('click', function() {
      navigator.clipboard.writeText(text).then(function() {
        button.textContent = 'Copied';
        setTimeout(function() { button.textContent = 'Copy'; }, 1500);
      }).catch(function() {
        button.textContent = 'Failed';
      });
    });
    return button;
  }

  function renderEmpty() {
    hasOutput = false;
    chat.replaceChildren(el('div', 'system', 'Type a sentence, pick a tone, and send.'));
  }

  function renderLoading() {
    const dots = el('span', 'typing');
    dots.append(el('i'), el('i'), el('i'));
    const card = el('div', 'card');
    card.appendChild(dots);
    chat.replaceChildren(card);
  }

  function renderError(message) {
    hasOutput = true;
    chat.replaceChildren(el('div', 'card error', message));
  }

  function renderResult(data) {
    hasOutput = true;
    const source = typeof data.source === 'string' ? data.source : '';
    const card = el('div', 'card');

    const head = el('div', 'card-head');
    head.appendChild(el('span', 'tone-tag', TONES[resolveTone(data.tone)].label));
    const toggle = el('button', 'toggle', 'Changes');
    toggle.type = 'button';
    head.appendChild(toggle);

    const body = el('div', 'result');
    function paint() {
      toggle.setAttribute('aria-pressed', String(showChanges));
      body.replaceChildren(showChanges ? highlighted(source, data.text) : document.createTextNode(data.text));
    }
    toggle.addEventListener('click', function() {
      showChanges = !showChanges;
      paint();
    });
    paint();

    card.append(head, body);
    if (data.note) card.appendChild(el('p', 'note', data.note));
    card.appendChild(copyButton(data.text));
    chat.replaceChildren(card);
    chat.scrollTop = 0;
  }

  // ---------- composer ----------

  function autosize() {
    inputText.style.height = 'auto';
    inputText.style.height = `${Math.min(inputText.scrollHeight + 2, 160)}px`;
  }

  function setBusy(value) {
    busy = value;
    refineButton.disabled = value;
    renderTones();
  }

  function sendToBackground(message) {
    return new Promise(function(resolve) {
      chrome.runtime.sendMessage(message, function(response) {
        if (chrome.runtime.lastError) {
          resolve({ success: false, error: `Chrome error: ${chrome.runtime.lastError.message}` });
        } else {
          resolve(response);
        }
      });
    });
  }

  async function enhance() {
    if (busy) return;
    const text = inputText.value.trim();
    if (!text) {
      renderError('Please enter an English sentence to enhance');
      return;
    }

    const settings = await loadSettings();
    if (!settings.openaiApiKey) {
      renderError('API key not set, please configure settings first');
      return;
    }

    setBusy(true);
    renderLoading();
    const response = await sendToBackground({
      action: 'refineText',
      text: text,
      apiKey: settings.openaiApiKey,
      model: settings.openaiModel || DEFAULT_MODEL,
      reasoningEffort: resolveReasoningEffort(settings.reasoningEffort),
      tone: currentTone
    });
    setBusy(false);

    if (response && response.success) {
      renderResult(response);
    } else if (response && response.error) {
      renderError(response.error.startsWith('Chrome error') ? response.error : `Error: ${response.error}`);
    } else {
      renderError('Unable to connect to API. Check your network connection and API key.');
    }
  }

  refineButton.addEventListener('click', enhance);

  inputText.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !e.isComposing) {
      e.preventDefault();
      enhance();
    }
  });

  inputText.addEventListener('input', function() {
    autosize();
    clearTimeout(draftTimer);
    draftTimer = setTimeout(function() {
      chrome.storage.session.set({ draft: inputText.value });
    }, 300);
  });

  // ---------- settings ----------

  saveApiKeyButton.addEventListener('click', async function() {
    const apiKey = apiKeyInput.value.trim();
    const openaiModel = openaiModelInput.value.trim() || DEFAULT_MODEL;

    if (!apiKey) {
      setStatus('Please enter a valid API key', false);
      return;
    }
    if (!apiKey.startsWith('sk-')) {
      setStatus('Invalid API key format, should start with sk-', false);
      return;
    }

    await chrome.storage.local.set({
      openaiApiKey: apiKey,
      openaiModel: openaiModel,
      reasoningEffort: resolveReasoningEffort(reasoningEffortSelect.value)
    });
    hasApiKey = true;
    setStatus('Saved', true);
    setTimeout(function() {
      setStatus('', true);
      showView('chat');
    }, 600);
  });

  showSettings.addEventListener('click', async function() {
    const settings = await loadSettings();
    apiKeyInput.value = settings.openaiApiKey || '';
    openaiModelInput.value = settings.openaiModel || DEFAULT_MODEL;
    reasoningEffortSelect.value = resolveReasoningEffort(settings.reasoningEffort);
    showView('settings');
  });

  backButton.addEventListener('click', function() {
    showView('chat');
  });

  // ---------- startup ----------

  chrome.action.setBadgeText({ text: '' });

  const settings = await loadSettings();
  const session = await chrome.storage.session.get(['draft', 'lastResult', 'autoRun']);

  hasApiKey = Boolean(settings.openaiApiKey);
  currentTone = resolveTone(settings.tone);
  openaiModelInput.value = settings.openaiModel || DEFAULT_MODEL;
  for (const effort of REASONING_EFFORTS) {
    reasoningEffortSelect.appendChild(new Option(effort, effort));
  }
  reasoningEffortSelect.value = resolveReasoningEffort(settings.reasoningEffort);
  renderTones();

  inputText.value = session.draft || '';
  if (session.lastResult && typeof session.lastResult.text === 'string') {
    renderResult(session.lastResult);
  } else {
    renderEmpty();
  }

  showView(hasApiKey ? 'chat' : 'settings');
  autosize();

  // Set by the "Enhance with Fluentify" context menu item.
  if (session.autoRun) {
    await chrome.storage.session.remove('autoRun');
    if (hasApiKey) enhance();
  }
});
