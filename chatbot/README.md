# KhetMitra Chatbot

This widget calls the project's `/api/chat` endpoint for dynamic farming guidance. The browser never receives the Groq API key.

## Included safeguards

- Questions are limited to 500 characters.
- The server sends only the latest 6 messages and caps the AI response at 180 tokens.
- The server rate-limits each IP to 15 requests per 10 minutes.
- Advice is general and directs users to local agricultural experts for crop- and state-specific treatment.

## Run locally

1. Revoke the key previously shared in chat and generate a replacement in Groq.
2. Copy `.env.example` to `.env`, then put the replacement key after `GROQ_API_KEY=`.
3. Run `node server.js` and open `http://localhost:3000`.

Do not open `index.html` directly from the file system: the chat endpoint requires the local server. Never add `.env` to Git or place a key in browser JavaScript.
