# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Fluentify is a Chrome extension (Manifest V3) that enhances English sentences using OpenAI's Chat Completions API (default model `gpt-5.2`, configurable in Settings). The extension stores the user's OpenAI API key locally and sends sentences to the API for improvement.

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
   - Two views: settings (API key, model, reasoning effort, auto-copy, close-after-copy, custom tones) and an editor-style enhancement view (input on top, result card below)
   - Composer (Ctrl/Cmd+Enter sends, × clears draft and result), tone chips (built-in plus custom; picking another tone re-runs when a result is shown), a loading card with Cancel, one result card with a Changes toggle, word-diff marks (`<mark>` added, `<del>` removed), a Meaning line for Chinese input, Retry and Copy
   - Copy is focused after each result; Ctrl/Cmd+C copies the result when no text is selected; an explicit copy closes the popup when `closeAfterCopy` is on (auto-copy never closes it)
   - Custom tones save immediately on add/delete, independent of the Save button
   - Communicates with background script via `chrome.runtime.sendMessage`

2. **background.js** - Service worker (Manifest V3)
   - Loads `shared.js` via `importScripts`
   - Listens for messages from popup via `chrome.runtime.onMessage`
   - Keeps one in-flight request (`AbortController`): `{action: "cancelRefine"}` aborts it, a new request replaces it, and it times out after `REQUEST_TIMEOUT_MS` (120 s); aborts reply `{success: false, cancelled: true, error}` for cancel/replace
   - Calls `https://api.openai.com/v1/chat/completions` with `reasoning_effort` (from Settings, default `none`) and `response_format: { type: 'json_object' }`; on a 400 naming one of those parameters it drops it and retries
   - Registers the "Enhance with Fluentify" context menu for selected text; stores the selection as the draft, sets `autoRun`, and tries `chrome.action.openPopup()` (falls back to a badge)
   - Writes `lastResult` to `chrome.storage.session` and returns it via `sendResponse`

3. **shared.js** - Pure logic, no `chrome.*` or DOM (also loaded by popup.html and the Node tests)
   - `TONES`, `DEFAULT_TONE`, `DEFAULT_MODEL`, `REASONING_EFFORTS`, `resolveTone(tone, customTones)`, `resolveReasoningEffort`
   - `normalizeCustomTones(list)` validates `[{ id: 'custom-…', label, style }]` (max `MAX_CUSTOM_TONES` = 8, label 24 / style 300 chars); `toneTable(customTones)` merges them after the built-ins
   - `buildMessages(text, tone, customTones)` builds the system and user messages; the prompt also tells the model to translate Chinese input into English in the chosen tone (same single request) and, for Chinese input only, asks for a `meaning` field (the rewrite back in Chinese, same script as the input)
   - `containsChinese(text)` lets the popup show a "Translated" tag instead of the Changes diff for Chinese input
   - `parseResult(content)` returns `{ text, note, meaning }`
   - `diffWords(original, revised)` word-level diff; tokens of `revised` flagged `changed`, plus `{ text, removed: true }` for words only in `original`

4. **manifest.json** - Extension configuration
   - Manifest version 3
   - Permissions: `storage`, `contextMenus`; host permission `https://api.openai.com/*`
   - Defines service worker, popup, and icons

### Message Flow

```
popup.js → chrome.runtime.sendMessage({action: "refineText", text, apiKey, model, reasoningEffort, tone, customTones})
         → background.js builds the prompt and calls OpenAI API
         → background.js saves lastResult to chrome.storage.session
         → sendResponse({success, source, tone, toneLabel, text, note, meaning}) or {success: false, cancelled?, error}
         → popup.js renders the result card or an error card
```

### Storage

- `chrome.storage.local`: `openaiApiKey` (must start with `sk-`), `openaiModel`, `reasoningEffort`, `tone`, `customTones`, `autoCopy` (default false), `closeAfterCopy` (default true)
- `chrome.storage.session`: `draft`, `lastResult`, `autoRun`
- `chrome.storage.sync` is legacy: popup.js `loadSettings()` moves an old key to local and removes the synced copy

## Development Commands

### Load Extension in Chrome

1. Navigate to `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select the Fluentify directory

### Run Tests

```
node --test
```

### Reload Extension After Changes

- Go to `chrome://extensions/` and click the reload icon for Fluentify
- Or use keyboard shortcut: Cmd+R (Mac) / Ctrl+R (Windows) while on the extensions page

## Customization Points

### Changing the AI Model, Tones or Prompt

Edit `shared.js`:
- `DEFAULT_MODEL` for the default model
- `REASONING_EFFORTS` / `DEFAULT_REASONING_EFFORT` for the Settings dropdown
- `TONES` to add or change a built-in tone (the popup renders its chips from `toneTable`, built-ins first, then custom tones)
- `buildMessages` for the shared rewrite rules and the JSON reply shape

### UI Modifications

- `popup.html` contains inline styles and structure
- `popup.js` handles all DOM interactions and state management
- The result uses the `.card` / `.result` classes with pre-wrap whitespace handling; colors are CSS variables at the top of the `<style>` block

## Important Notes

- This is a client-side only extension with no backend server
- API key is never transmitted anywhere except directly to OpenAI
- Background script must return `true` from message listener to enable async response
- Error handling includes API errors, network errors, and Chrome runtime errors
