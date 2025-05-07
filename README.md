# Fluentify

**Fluentify** is a Chrome extension that helps you enhance and refine your English sentences using OpenAI's GPT models. With a simple popup interface, you can enter your OpenAI API key and instantly get improved, more fluent English sentences.

---

## Features

- ✨ **Refine English sentences:** Instantly enhance your writing with AI-powered suggestions.
- 🔑 **Secure API key storage:** Your OpenAI API key is stored securely in Chrome's extension storage.
- 📝 **Easy-to-use popup:** Enter text and get results in one click.
- 📋 **Copy to clipboard:** Quickly copy the improved sentence for use anywhere.
- ⚙️ **Settings panel:** Easily update your API key at any time.

---


## Installation

### 1. Clone

Clone this repository.

### 2. Load the Extension in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the folder containing the extension files (with `manifest.json`)

---

## Usage

1. Click the Fluentify icon in your Chrome toolbar.
2. **First time:** Enter your OpenAI API key (starts with `sk-`) and save it.
3. Enter the English sentence you want to enhance.
4. Click **Enhance**. The refined sentence will appear below.
5. Click **Copy to Clipboard** to copy the improved sentence.

---

## How It Works

- The extension stores your API key securely using Chrome's storage.
- When you submit a sentence, it sends a request to OpenAI's GPT API via a secure background script.
- The improved sentence is displayed in the popup for you to use.

---

## Security & Privacy

- Your API key is only stored locally in your browser and is never shared with anyone except OpenAI.
- The extension does **not** collect or transmit any of your data.

---

## Requirements

- A valid [OpenAI API key](https://platform.openai.com/account/api-keys)
- Google Chrome browser (latest recommended)

---

## File Structure

```
fluentify/
├── background.js
├── manifest.json
├── popup.html
├── popup.js
└── README.md
```

---

## Customization

- You can change the prompt or model used by editing `background.js`.
- To update the UI, modify `popup.html` and `popup.js`.

---

## License

MIT License

---

## Disclaimer

Fluentify is not affiliated with or endorsed by OpenAI. Use at your own risk and be mindful of your OpenAI API usage and associated costs.

---

## Credits

- [OpenAI](https://openai.com/) for the GPT API
- Chrome Extension API

---

Enjoy writing fluently with **Fluentify**! 🚀
