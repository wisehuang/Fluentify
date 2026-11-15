# Fluentify

**Fluentify** is a Chrome extension that helps you enhance and refine your English sentences using OpenAI's GPT models. With a simple popup interface, you can enter your OpenAI API key and instantly get improved, more fluent English sentences.

---

## Features

- 🌏 **Chinese input:** Type Chinese and get it translated into English in the selected tone, in one request.
- ✨ **Refine English sentences:** Get one rewrite per sentence, with added words highlighted, removed words struck through, and a one-line note on what was fixed.
- 🎭 **Tones:** Neutral, Formal, Work chat, or Casual. Your last choice is remembered.
- 📝 **Editor-style popup:** Type on top, read the rewrite in a full-width card below. Press Ctrl/⌘ + Enter to send; picking another tone redoes the rewrite.
- 🖱️ **Right-click menu:** Select text on any page and choose **Enhance with Fluentify**.
- 📋 **Copy to clipboard:** One click on the Copy button next to the rewrite.
- 💾 **Keeps your place:** The draft and the last result survive closing the popup, until the browser is closed.
- 🔑 **Local API key storage:** Your OpenAI API key is stored on this device only (`chrome.storage.local`).
- ⚙️ **Settings panel:** Update your API key, model and reasoning effort at any time.

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
3. Pick a tone and enter the English (or Chinese) sentence you want to enhance.
4. Click the send button or press Ctrl/⌘ + Enter. The rewrite appears in the card below; use **Changes** to switch between the marked-up and clean text, and **Copy** to copy it.
5. Click **Copy** next to the rewrite.

You can also select text on a web page, right-click, and choose **Enhance with Fluentify**. If the popup does not open by itself, click the Fluentify icon (it shows a badge).

---

## How It Works

- The extension stores your API key in Chrome's local extension storage.
- When you submit a sentence, the background service worker sends it to OpenAI's Chat Completions API with the prompt for the chosen tone.
- The rewrite is displayed in the popup, with words that differ from your original highlighted.

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
├── background.js      # service worker: OpenAI calls, context menu
├── shared.js          # tones, prompt, reply parsing, word diff
├── manifest.json
├── popup.html
├── popup.js
├── tests/             # node --test
└── README.md
```

---

## Customization

- Tones and the prompt live in `shared.js` (`TONES`, `buildMessages`).
- The default model is `DEFAULT_MODEL` in `shared.js`; you can also set a model in Settings.
- To update the UI, modify `popup.html` and `popup.js`.
- Run the unit tests with `node --test`.

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
