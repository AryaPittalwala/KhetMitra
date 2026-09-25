# KhetMitra AI Chatbot Support Module

A modular, token-conscious AI assistant component built for **KhetMitra** to provide smart agricultural guidance to farmers.

---

## 📁 File Structure

```text
KhetMitra/
├── chatbot/
│   ├── chatbot.css       # Chat widget styles, glassmorphism, keyframes, scrollbar
│   ├── chatbot.js        # Self-contained logic, Groq API (Qwen 3.8 / GPT-OSS) & Agri-Engine
│   └── README.md         # Component documentation & token optimization guide
├── index.html            # Main site calling chatbot.css & chatbot.js
└── ...
```

---

## ⚡ How It Conserves Tokens (Conscious Optimization)

1. **Ultra-Fast Low-Latency Engine (Groq LPU)**:
   * Uses high-throughput, low-latency inference on Groq's dedicated LPU architecture.
   * Primary model: `qwen/qwen3.8-27b` with automatic failover to `openai/gpt-oss-20b`.

2. **Strict Output Token Budget (`max_tokens: 220`)**:
   * Caps the model's output generation to concise, actionable bullet points (~70 words maximum).

3. **Pruned Context Sliding Window (`MAX_CONTEXT_TURNS: 4`)**:
   * The conversation memory only sends the **last 4 messages** (2 user turns + 2 assistant responses) to the API.
   * This ensures prompt token costs never balloon as the user continues chatting.

4. **Streamlined System Prompt**:
   * Specifically instructs the model to omit conversational pleasantries and give direct, practical agricultural advice.

5. **Built-in Offline Knowledge Engine**:
   * Provides immediate, zero-token answers to common agricultural questions (Rabi/Kharif crop planning, tomato leaf curl, wheat rust, NPK ratios, drip irrigation, PM-KISAN) if offline or as a fallback.

---

## 🔌 How It Is Called in `index.html`

In `<head>`:
```html
<!-- KhetMitra Chatbot Component Stylesheet -->
<link rel="stylesheet" href="chatbot/chatbot.css">
```

Before `</body>`:
```html
<!-- KhetMitra Chatbot Component Script -->
<script src="chatbot/chatbot.js" defer></script>
```
