document.addEventListener('DOMContentLoaded', function() {
  const apiKeyContainer = document.getElementById('apiKeyContainer');
  const refineContainer = document.getElementById('refineContainer');
  const apiKeyInput = document.getElementById('apiKey');
  const saveApiKeyButton = document.getElementById('saveApiKey');
  const apiKeyStatus = document.getElementById('apiKeyStatus');
  const inputText = document.getElementById('inputText');
  const refineButton = document.getElementById('refineButton');
  const loadingIndicator = document.getElementById('loadingIndicator');
  const resultContainer = document.getElementById('resultContainer');
  const result = document.getElementById('result');
  const copyButton = document.getElementById('copyButton');
  const error = document.getElementById('error');
  const showSettings = document.getElementById('showSettings');

  // Check if API key is already set
  chrome.storage.sync.get('openaiApiKey', function(data) {
    if (data.openaiApiKey) {
      // API key is set, show enhancement interface
      refineContainer.style.display = 'block';
    } else {
      // API key is not set, show settings interface
      apiKeyContainer.style.display = 'block';
    }
  });

  // Save API key
  saveApiKeyButton.addEventListener('click', function() {
    const apiKey = apiKeyInput.value.trim();
    
    if (!apiKey) {
      apiKeyStatus.textContent = 'Please enter a valid API key';
      apiKeyStatus.style.color = '#d93025';
      return;
    }

    // Validate API key format
    if (!apiKey.startsWith('sk-')) {
      apiKeyStatus.textContent = 'Invalid API key format, should start with sk-';
      apiKeyStatus.style.color = '#d93025';
      return;
    }

    // Save API key
    chrome.storage.sync.set({ 'openaiApiKey': apiKey }, function() {
      apiKeyStatus.textContent = 'API key saved successfully';
      apiKeyStatus.style.color = '#0f9d58';
      
      // Switch to enhancement interface after delay
      setTimeout(function() {
        apiKeyContainer.style.display = 'none';
        refineContainer.style.display = 'block';
      }, 1000);
    });
  });

  // Enhance button click event
  refineButton.addEventListener('click', function() {
    const text = inputText.value.trim();
    
    if (!text) {
      error.textContent = 'Please enter an English sentence to enhance';
      error.style.display = 'block';
      resultContainer.style.display = 'none';
      return;
    }

    // Show loading indicator
    loadingIndicator.style.display = 'block';
    error.style.display = 'none';
    resultContainer.style.display = 'none';

    // Get API key from storage
    chrome.storage.sync.get('openaiApiKey', function(data) {
      if (!data.openaiApiKey) {
        loadingIndicator.style.display = 'none';
        error.textContent = 'API key not set, please configure settings first';
        error.style.display = 'block';
        return;
      }

      // Send message to background.js to process text
      chrome.runtime.sendMessage({
        action: "refineText",
        text: text,
        apiKey: data.openaiApiKey
      }, function(response) {
        loadingIndicator.style.display = 'none';
        
        if (response && response.success) {
          result.textContent = response.refinedText;
          resultContainer.style.display = 'block';
        } else {
          // Detailed error handling
          if (response && response.error) {
            error.textContent = `Error: ${response.error}`;
          } else if (chrome.runtime.lastError) {
            error.textContent = `Chrome error: ${chrome.runtime.lastError.message}`;
          } else {
            error.textContent = 'Unable to connect to API. Check your network connection and API key.';
          }
          error.style.display = 'block';
        }
      });
    });
  });

  // Copy to clipboard
  copyButton.addEventListener('click', function() {
    const textToCopy = result.textContent;
    navigator.clipboard.writeText(textToCopy).then(function() {
      copyButton.textContent = 'Copied!';
      setTimeout(function() {
        copyButton.textContent = 'Copy to Clipboard';
      }, 2000);
    }).catch(function() {
      error.textContent = 'Failed to copy text to clipboard';
      error.style.display = 'block';
    });
  });

  // Show settings link click event
  showSettings.addEventListener('click', function(e) {
    e.preventDefault();
    refineContainer.style.display = 'none';
    apiKeyContainer.style.display = 'block';
    
    // Load saved API key
    chrome.storage.sync.get('openaiApiKey', function(data) {
      if (data.openaiApiKey) {
        apiKeyInput.value = data.openaiApiKey;
      }
    });
  });
});
