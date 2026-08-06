chrome.runtime.onInstalled.addListener(() => {
  console.log('Fluentify extension installed successfully');
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "refineText") {
    // Direct REST API call to OpenAI
    fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${request.apiKey}`
      },
      body: JSON.stringify({
        model: typeof request.model === 'string' && request.model.trim()
          ? request.model.trim()
          : 'gpt-5.2',
        messages: [
          {
            role: 'system',
            content: 'You are an AI assistant that makes English sentences clearer, correct, and more professional. Keep the original meaning. Use simple words. Do not use polite or complex language.'
          },
          {
            role: 'user',
            content: `Improve this English sentence: "${request.text}"`
          }
        ],
        reasoning_effort: 'none'
      })
    })
    .then(response => {
      if (!response.ok) {
        return response.json().then(err => {
          throw new Error(err.error?.message || `API responded with status ${response.status}: ${response.statusText}`);
        });
      }
      return response.json();
    })
    .then(data => {
      if (data.choices && data.choices.length > 0) {
        sendResponse({
          success: true,
          refinedText: data.choices[0].message.content.trim()
        });
      } else {
        throw new Error('No completion choices returned from the API');
      }
    })
    .catch(error => {
      console.error('OpenAI API Error:', error);
      sendResponse({
        success: false,
        error: error.message || "An unexpected error occurred"
      });
    });
    
    // Return true to indicate that the response will be sent asynchronously
    return true;
  }
});
