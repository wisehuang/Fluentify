importScripts('shared.js');

const API_URL = 'https://api.openai.com/v1/chat/completions';
const MENU_ID = 'fluentify-enhance-selection';
// Sent by default, dropped one at a time if the chosen model rejects them.
const OPTIONAL_PARAMS = ['reasoning_effort', 'response_format'];

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_ID,
      title: 'Enhance with Fluentify',
      contexts: ['selection']
    });
  });
});

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId !== MENU_ID) return;
  const text = (info.selectionText || '').trim();
  if (!text) return;

  await chrome.storage.session.set({ draft: text, autoRun: true });
  try {
    await chrome.action.openPopup();
  } catch (e) {
    // The popup could not be opened from here: flag the icon so the user clicks it.
    chrome.action.setBadgeBackgroundColor({ color: '#06C755' });
    chrome.action.setBadgeText({ text: '1' });
  }
});

async function callOpenAI(apiKey, body) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const error = new Error(
      payload?.error?.message || `API responded with status ${response.status}: ${response.statusText}`
    );
    error.status = response.status;
    error.param = payload?.error?.param || '';
    throw error;
  }
  return response.json();
}

function rejectedParam(error, body) {
  if (error.status !== 400) return null;
  return OPTIONAL_PARAMS.find(name =>
    name in body && (String(error.param).startsWith(name) || error.message.includes(name))
  ) || null;
}

async function refineText({ text, apiKey, model, tone, reasoningEffort }) {
  const body = {
    model: typeof model === 'string' && model.trim() ? model.trim() : DEFAULT_MODEL,
    messages: buildMessages(text, tone),
    reasoning_effort: resolveReasoningEffort(reasoningEffort),
    response_format: { type: 'json_object' }
  };

  for (;;) {
    try {
      const data = await callOpenAI(apiKey, body);
      const content = data.choices?.[0]?.message?.content;
      if (typeof content !== 'string') {
        throw new Error('No completion choices returned from the API');
      }
      return parseResult(content);
    } catch (error) {
      const param = rejectedParam(error, body);
      if (!param) throw error;
      delete body[param];
    }
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action !== 'refineText') return;

  refineText(request)
    .then(async ({ text, note }) => {
      const lastResult = {
        source: request.text,
        tone: resolveTone(request.tone),
        text,
        note
      };
      // Stored here so the result survives the popup closing mid-request.
      await chrome.storage.session.set({ lastResult });
      sendResponse({ success: true, ...lastResult });
    })
    .catch(error => {
      console.error('OpenAI API Error:', error);
      sendResponse({
        success: false,
        error: error.message || 'An unexpected error occurred'
      });
    });

  // Return true to indicate that the response will be sent asynchronously
  return true;
});
