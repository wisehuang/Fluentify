# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Fluentify is a Chrome extension (Manifest V3) that enhances English sentences using OpenAI's GPT-4 API. The extension stores the user's OpenAI API key locally and sends sentences to the API for improvement.

## Behavioral Guardrails
Unknowns are allowed: If not certain, respond with “Unknown/Not sure” and enumerate concrete evidence-gathering steps. Do not invent APIs, functions, error messages, third‑party capabilities, files, or directories.

Evidence-first: Before proposing solutions or writing code, quote sources verbatim with file paths and line ranges, API docs paragraphs, or command outputs. If no verifiable source exists, stop and mark as Unknown.

Minimal change policy: Only propose the smallest viable patch after evidence is collected and referenced.

## Insufficient Context Policy
When context is insufficient, first request the exact files, directories, or command runs needed to gather facts. Do not write code until that evidence is obtained.

Acceptable evidence sources: repository files with path/line ranges, lockfiles and manifests, official API docs excerpts, test or typechecker output, linter output, or sandbox run logs.

## Additional Instruction

Unless specifically requested, do not generate a new Markdown document for each answer.

## Architecture

### Core Components

1. **popup.html / popup.js** - UI layer
   - Manages two views: API key setup and text enhancement interface
   - Handles user input, displays results, and manages clipboard operations
   - Uses Chrome storage API (`chrome.storage.sync`) to persist API key
   - Communicates with background script via `chrome.runtime.sendMessage`

2. **background.js** - Service worker (Manifest V3)
   - Listens for messages from popup via `chrome.runtime.onMessage`
   - Handles all OpenAI API calls using fetch to `https://api.openai.com/v1/chat/completions`
   - Uses GPT-4 model with temperature 0.7
   - System prompt instructs GPT to improve clarity, correctness, and professionalism while avoiding overly polite language
   - Returns responses asynchronously via `sendResponse`

3. **manifest.json** - Extension configuration
   - Manifest version 3
   - Requires permissions: `storage` and `https://api.openai.com/*`
   - Defines service worker, popup, and icons

### Message Flow

```
popup.js → chrome.runtime.sendMessage({action: "refineText", text, apiKey})
         → background.js receives message
         → background.js calls OpenAI API
         → background.js sends response back via sendResponse
         → popup.js displays result or error
```

### Storage

- API key stored in `chrome.storage.sync` under key `openaiApiKey`
- Validated to start with `sk-` prefix
- Loaded on popup open to determine which view to show

## Development Commands

### Load Extension in Chrome

1. Navigate to `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select the Fluentify directory

### Reload Extension After Changes

- Go to `chrome://extensions/` and click the reload icon for Fluentify
- Or use keyboard shortcut: Cmd+R (Mac) / Ctrl+R (Windows) while on the extensions page

## Customization Points

### Changing the AI Model or Prompt

Edit `background.js:15-25`:
- Change model from `gpt-4` to `gpt-3.5-turbo` or other models
- Modify system prompt to adjust enhancement style
- Adjust `temperature` parameter for more/less creative outputs

### UI Modifications

- `popup.html` contains inline styles and structure
- `popup.js` handles all DOM interactions and state management
- Result display uses `.result` class with pre-wrap whitespace handling

## Important Notes

- This is a client-side only extension with no backend server
- API key is never transmitted anywhere except directly to OpenAI
- Background script must return `true` from message listener to enable async response
- Error handling includes API errors, network errors, and Chrome runtime errors
