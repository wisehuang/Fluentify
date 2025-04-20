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
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that improves English sentences for clarity, grammar, and style. Keep the meaning intact but make the sentence more professional and polished.'
          },
          {
            role: 'user',
            content: `Improve this English sentence: "${request.text}"`
          }
        ],
        temperature: 0.7
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
