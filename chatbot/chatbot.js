/**
 * ==========================================================================
 * KhetMitra AI Support Chatbot Module
 * Production-Ready Live Agricultural Advisory Assistant
 * Powered by Groq Ultra-Fast Inference (qwen/qwen3.8-27b)
 * Token-Conscious Integration (Strict Budgets & Sliding Context Window)
 * ==========================================================================
 */
(function () {
    // Token-conscious configuration: strict max tokens & 4-turn context window
    const CONFIG = {
        MODEL: 'qwen/qwen3.8-27b',
        FALLBACK_MODEL: 'openai/gpt-oss-20b',
        DEFAULT_KEY: '',
        ENDPOINT: 'https://api.groq.com/openai/v1/chat/completions',
        MAX_OUTPUT_TOKENS: 220,     // Strictly capped for crisp, practical farmer guidance
        MAX_CONTEXT_TURNS: 4,       // Sliding window: keep only last 4 messages in prompt
        STORAGE_KEY: 'khetmitra_groq_key',
        SYSTEM_PROMPT: 'You are KhetMitra, an expert AI agricultural advisor for Indian farmers. Answer directly, practically, and strictly under 70 words. Use concise bullet points for actionable steps. Focus on crops, soil, pest management, irrigation, weather, or government schemes. Do not repeat pleasantries or filler.'
    };

    let chatHistory = [];
    let currentApiKey = localStorage.getItem(CONFIG.STORAGE_KEY) || CONFIG.DEFAULT_KEY;

    // Build and inject HTML widget if not already in document
    function ensureWidgetDOM() {
        let container = document.getElementById('khetmitra-chat-container');
        if (container && container.querySelector('#chat-toggle-btn')) return;

        const isNew = !container;
        if (isNew) {
            container = document.createElement('div');
            container.id = 'khetmitra-chat-container';
        }

        container.innerHTML = `
            <!-- Floating Circular Farmer Chat Trigger Button -->
            <div id="khetmitra-chat-widget">
                <button id="chat-toggle-btn" type="button" aria-expanded="false" aria-controls="khetmitra-chat-panel" aria-label="Open KhetMitra AI Farming Advisor"
                    class="group relative w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-leaf-600 via-leaf-700 to-leaf-900 text-white flex items-center justify-center shadow-[0_12px_28px_rgba(21,128,61,0.5),0_6px_14px_rgba(0,0,0,0.5)] border-2 border-sun-400/60 hover:border-sun-300 hover:scale-105 active:scale-95 transition-all duration-300 backdrop-blur-md cursor-pointer select-none">
                    
                    <!-- Ambient Glow Effect -->
                    <span class="pointer-events-none absolute -inset-1 rounded-full bg-gradient-to-r from-leaf-400 via-emerald-400 to-sun-400 opacity-25 group-hover:opacity-75 blur-md transition-opacity duration-300"></span>

                    <!-- Online Active Ping Badge -->
                    <span class="pointer-events-none absolute top-0.5 right-0.5 flex h-3.5 w-3.5 z-10">
                        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-sun-400 opacity-80"></span>
                        <span class="relative inline-flex rounded-full h-3.5 w-3.5 bg-sun-400 border-2 border-[#052813]"></span>
                    </span>

                    <!-- Farmer & Agriculture SVG Icon -->
                    <svg id="chat-icon-chat" class="pointer-events-none w-8 h-8 sm:w-9 sm:h-9 text-sun-300 transition-transform duration-300 group-hover:scale-110 drop-shadow" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <!-- Farmer Straw Hat Brim -->
                        <path d="M2.5 13.2C4 11.5 7.5 10.8 12 10.8s8 0.7 9.5 2.4c-1.5 1.7-5 2.5-9.5 2.5s-8-0.8-9.5-2.5z" fill="rgba(251, 191, 36, 0.35)" stroke="#fbbf24" stroke-width="1.5" stroke-linejoin="round" />
                        <!-- Hat Crown -->
                        <path d="M7 11.2c0.4-4 2.2-6.4 5-6.4s4.6 2.4 5 6.4" fill="rgba(251, 191, 36, 0.45)" stroke="#fbbf24" stroke-width="1.5" stroke-linecap="round" />
                        <!-- Farmer Face Contour -->
                        <path d="M9.2 13.8v1.8a2.8 2.8 0 005.6 0v-1.8" stroke="#f0fdf4" stroke-width="1.6" stroke-linecap="round" />
                        <!-- Shoulders / Kurta -->
                        <path d="M5.5 21a6.5 6.5 0 0113 0" stroke="#86efac" stroke-width="1.7" stroke-linecap="round" />
                        <!-- Agricultural Green Sprout / Leaf on Hat -->
                        <path d="M17 7.5c1.2-1.2 2.8-0.8 2.8-0.8s0.4 1.6-0.8 2.8c-1.2 1.2-2.8 0.8-2.8 0.8s-0.4-1.6 0.8-2.8z" fill="#4ade80" stroke="#22c55e" stroke-width="1" />
                    </svg>

                    <!-- Close '✕' Icon (Visible when open) -->
                    <svg id="chat-icon-close" class="pointer-events-none w-6 h-6 text-white hidden transition-transform duration-300 rotate-0 group-hover:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>

                    <!-- Desktop Hover Tooltip -->
                    <span class="pointer-events-none absolute right-full mr-3.5 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl bg-leaf-950/95 text-white text-xs font-medium whitespace-nowrap shadow-xl border border-leaf-500/30 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-1 group-hover:translate-x-0 hidden sm:block">
                        Ask KhetMitra AI
                    </span>
                </button>
            </div>

            <!-- Floating Chat Panel Window -->
            <div id="khetmitra-chat-panel" role="dialog" aria-labelledby="chat-title" aria-modal="false"
                class="chat-closed rounded-3xl overflow-hidden border border-leaf-400/30 bg-gradient-to-b from-[#052813]/98 via-[#08381c]/95 to-[#041a0d]/98 backdrop-blur-2xl">
                
                <!-- Chat Panel Header -->
                <div class="px-4 py-3.5 bg-gradient-to-r from-leaf-900/90 via-leaf-800/80 to-leaf-900/90 border-b border-leaf-500/20 flex items-center justify-between shrink-0">
                    <div class="flex items-center gap-3">
                        <div class="relative w-9 h-9 rounded-xl bg-gradient-to-tr from-leaf-500 to-sun-400 p-0.5 shadow-md flex items-center justify-center">
                            <div class="w-full h-full bg-leaf-950 rounded-[10px] flex items-center justify-center">
                                <svg class="w-5 h-5 text-sun-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                                    <path d="M2.5 13.2C4 11.5 7.5 10.8 12 10.8s8 0.7 9.5 2.4c-1.5 1.7-5 2.5-9.5 2.5s-8-0.8-9.5-2.5z" fill="rgba(251, 191, 36, 0.3)" stroke="#fbbf24" stroke-width="1.4" />
                                    <path d="M7 11.2c0.4-4 2.2-6.4 5-6.4s4.6 2.4 5 6.4" fill="rgba(251, 191, 36, 0.4)" stroke="#fbbf24" stroke-width="1.4" />
                                    <path d="M9.2 13.8v1.8a2.8 2.8 0 005.6 0v-1.8" stroke="#f0fdf4" stroke-width="1.4" />
                                </svg>
                            </div>
                            <span class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-leaf-400 rounded-full border-2 border-leaf-950"></span>
                        </div>
                        <div>
                            <div class="flex items-center gap-2">
                                <h3 id="chat-title" class="font-display font-bold text-sm text-white">KhetMitra Sahayak</h3>
                            </div>
                            <p class="text-[11px] text-leaf-200/80 flex items-center gap-1.5">
                                <span class="w-1.5 h-1.5 rounded-full bg-leaf-400 animate-pulse"></span>
                                <span>Online • Live Farm Advisory</span>
                            </p>
                        </div>
                    </div>

                    <!-- Header Actions -->
                    <div class="flex items-center gap-1">
                        <!-- Clear Conversation -->
                        <button id="chat-clear-btn" type="button" title="Clear conversation" aria-label="Clear Chat"
                            class="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer">
                            <svg class="w-4 h-4 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                        <!-- Close button -->
                        <button id="chat-close-btn" type="button" title="Close Chat" aria-label="Close Chat"
                            class="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer">
                            <svg class="w-4 h-4 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                <!-- Chat Messages Scroll Container -->
                <div id="chat-messages" class="flex-1 p-4 overflow-y-auto space-y-3.5 text-xs sm:text-sm">
                    <!-- Welcome Bot Message -->
                    <div class="flex items-start gap-2.5 mr-auto max-w-[92%]">
                        <div class="w-7 h-7 rounded-full bg-leaf-700/80 border border-leaf-400/30 flex items-center justify-center shrink-0 mt-0.5">
                            <span class="text-xs">🌾</span>
                        </div>
                        <div class="bg-white/[0.08] border border-leaf-400/20 text-white/95 rounded-2xl rounded-tl-sm px-3.5 py-3 shadow-md space-y-1.5">
                            <p class="font-medium text-leaf-300">Namaste! 🙏 Welcome to KhetMitra.</p>
                            <p class="leading-relaxed text-white/90">I am your digital agricultural assistant. How can I help you today with crops, soil fertility, pest defense, irrigation, or government schemes?</p>
                            <div class="pt-1 text-[10px] text-white/40 text-right">Just now</div>
                        </div>
                    </div>
                </div>

                <!-- Typing Indicator -->
                <div id="chat-typing" class="hidden px-4 py-2 flex items-center gap-2 text-xs text-leaf-300">
                    <span class="text-xs">🌾</span>
                    <span class="text-white/60">KhetMitra is typing</span>
                    <div class="flex items-center gap-1">
                        <span class="w-1.5 h-1.5 rounded-full bg-leaf-400 typing-dot"></span>
                        <span class="w-1.5 h-1.5 rounded-full bg-leaf-400 typing-dot"></span>
                        <span class="w-1.5 h-1.5 rounded-full bg-leaf-400 typing-dot"></span>
                    </div>
                </div>

                <!-- Footer / Input Form -->
                <div class="p-3 bg-leaf-950/90 border-t border-leaf-500/20 shrink-0">
                    <form id="chat-form" class="flex items-center gap-2">
                        <input id="chat-input" type="text" autocomplete="off" placeholder="Ask about crops, soil, pests..."
                            class="flex-1 bg-white/5 border border-white/15 focus:border-leaf-400 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder:text-white/40 outline-none transition-colors">
                        <button type="submit" id="chat-send-btn" aria-label="Send Message"
                            class="p-2.5 rounded-xl bg-gradient-to-r from-leaf-600 to-leaf-500 hover:from-leaf-500 hover:to-leaf-400 text-white font-medium shadow-md transition-all flex items-center justify-center shrink-0 cursor-pointer">
                            <svg class="w-4 h-4 transform rotate-90 pointer-events-none" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                            </svg>
                        </button>
                    </form>
                    <p class="text-[10px] text-leaf-300/40 text-center mt-2 font-normal">KhetMitra AI • Smart Agri Guidance</p>
                </div>
            </div>
        `;
        if (isNew) document.body.appendChild(container);
    }

    // Format current time (e.g., 9:15 PM)
    function getCurrentTimeString() {
        try {
            return new Intl.DateTimeFormat('en-IN', {
                hour: 'numeric',
                minute: 'numeric',
                hour12: true
            }).format(new Date());
        } catch {
            return 'Just now';
        }
    }

    // Initialize all event listeners and UI
    function initChatbot() {
        ensureWidgetDOM();

        const chatToggleBtn = document.getElementById('chat-toggle-btn');
        const chatPanel = document.getElementById('khetmitra-chat-panel');
        const chatCloseBtn = document.getElementById('chat-close-btn');
        const chatClearBtn = document.getElementById('chat-clear-btn');
        const chatForm = document.getElementById('chat-form');
        const chatInput = document.getElementById('chat-input');
        const chatMessages = document.getElementById('chat-messages');
        const chatTyping = document.getElementById('chat-typing');
        const chatIconChat = document.getElementById('chat-icon-chat');
        const chatIconClose = document.getElementById('chat-icon-close');

        if (!chatToggleBtn || !chatPanel) return;

        function toggleChat(forceOpen) {
            const isCurrentlyOpen = chatPanel.classList.contains('chat-open');
            const shouldOpen = forceOpen !== undefined ? forceOpen : !isCurrentlyOpen;

            if (shouldOpen) {
                chatPanel.classList.remove('chat-closed');
                chatPanel.classList.add('chat-open');
                if (chatIconChat) chatIconChat.classList.add('hidden');
                if (chatIconClose) chatIconClose.classList.remove('hidden');
                chatToggleBtn.setAttribute('aria-expanded', 'true');
                setTimeout(() => {
                    if (chatInput) chatInput.focus();
                }, 120);
            } else {
                chatPanel.classList.remove('chat-open');
                chatPanel.classList.add('chat-closed');
                if (chatIconChat) chatIconChat.classList.remove('hidden');
                if (chatIconClose) chatIconClose.classList.add('hidden');
                chatToggleBtn.setAttribute('aria-expanded', 'false');
            }
        }

        // Toggle button click listener
        chatToggleBtn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            toggleChat();
        });

        // Close button click listener
        if (chatCloseBtn) {
            chatCloseBtn.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                toggleChat(false);
            });
        }

        // Close when clicking outside of the chat panel on document
        document.addEventListener('click', function (e) {
            if (chatPanel && chatPanel.classList.contains('chat-open')) {
                const widget = document.getElementById('khetmitra-chat-widget');
                if (!chatPanel.contains(e.target) && widget && !widget.contains(e.target)) {
                    toggleChat(false);
                }
            }
        });

        // Clear chat listener
        if (chatClearBtn) {
            chatClearBtn.addEventListener('click', function (e) {
                e.preventDefault();
                chatHistory = [];
                const timeStr = getCurrentTimeString();
                chatMessages.innerHTML = `
                    <div class="flex items-start gap-2.5 mr-auto max-w-[92%]">
                        <div class="w-7 h-7 rounded-full bg-leaf-700/80 border border-leaf-400/30 flex items-center justify-center shrink-0 mt-0.5">
                            <span class="text-xs">🌾</span>
                        </div>
                        <div class="bg-white/[0.08] border border-leaf-400/20 text-white/95 rounded-2xl rounded-tl-sm px-3.5 py-3 shadow-md space-y-1.5">
                            <p class="font-medium text-leaf-300">Conversation reset.</p>
                            <p class="leading-relaxed text-white/90">How can I assist your farming today? Ask any crop, soil, or pest question.</p>
                            <div class="pt-1 text-[10px] text-white/40 text-right">${timeStr}</div>
                        </div>
                    </div>
                `;
            });
        }

        function escapeHtml(str) {
            return str
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        }

        function formatMarkdown(text) {
            let escaped = escapeHtml(text);
            escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong class="text-leaf-300 font-semibold">$1</strong>');
            escaped = escaped.replace(/^[\*\-]\s+(.*)$/gm, '<div class="flex items-start gap-1.5 my-1"><span class="text-leaf-400">•</span><span>$1</span></div>');
            escaped = escaped.replace(/^(\d+)\.\s+(.*)$/gm, '<div class="flex items-start gap-1.5 my-1"><span class="text-sun-400 font-mono text-xs">$1.</span><span>$2</span></div>');
            escaped = escaped.replace(/\n\n/g, '<div class="h-2"></div>');
            escaped = escaped.replace(/\n/g, '<br/>');
            return escaped;
        }

        function appendUserMessage(text) {
            const timeStr = getCurrentTimeString();
            const bubble = document.createElement('div');
            bubble.className = 'flex items-start justify-end gap-2 ml-auto max-w-[85%]';
            bubble.innerHTML = `
                <div class="bg-gradient-to-r from-leaf-600 to-leaf-500 text-white rounded-2xl rounded-tr-sm px-3.5 py-2.5 shadow-md text-xs sm:text-sm">
                    <p>${escapeHtml(text)}</p>
                    <div class="text-[9px] text-leaf-100/70 text-right mt-1">${timeStr}</div>
                </div>
            `;
            chatMessages.appendChild(bubble);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }

        function appendBotMessage(text) {
            const timeStr = getCurrentTimeString();
            const bubble = document.createElement('div');
            bubble.className = 'flex items-start gap-2.5 mr-auto max-w-[92%]';
            bubble.innerHTML = `
                <div class="w-7 h-7 rounded-full bg-leaf-700/80 border border-leaf-400/30 flex items-center justify-center shrink-0 mt-0.5">
                    <span class="text-xs">🌾</span>
                </div>
                <div class="bg-white/[0.08] border border-leaf-400/20 text-white/95 rounded-2xl rounded-tl-sm px-3.5 py-2.5 shadow-md text-xs sm:text-sm leading-relaxed">
                    <div>${formatMarkdown(text)}</div>
                    <div class="text-[9px] text-white/40 text-right mt-1.5">${timeStr}</div>
                </div>
            `;
            chatMessages.appendChild(bubble);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }

        // High-quality agricultural knowledge fallback engine (zero tokens, instant response)
        function getAgriFallbackResponse(query) {
            const q = query.toLowerCase();
            if (q.includes('rabi') || q.includes('winter crop')) {
                return "**Top Rabi Crops (Oct–March):**\n- **Wheat (Kanak):** Sow in Nov, needs 4-5 timely irrigations.\n- **Mustard:** Low water need, sow in Oct, harvest Feb.\n- **Gram (Chickpea):** Thrives in light loam soil.\n- **Barley:** Highly drought and salinity tolerant.\n*Tip: Apply basal DAP @ 50kg/acre during sowing.*";
            }
            if (q.includes('kharif') || q.includes('monsoon crop') || q.includes('summer')) {
                return "**Top Kharif Crops (June–Oct):**\n- **Paddy (Rice):** Sown with monsoon arrival, needs good standing water.\n- **Cotton:** Deep black soil, keep pest pheromone traps.\n- **Maize & Soybean:** Well-drained fertile loamy soil.\n*Tip: Treat seeds with Trichoderma (5g/kg) before sowing.*";
            }
            if (q.includes('leaf curl') || q.includes('tomato') || q.includes('yellow leaf')) {
                return "**Tomato Leaf Curl Solution:**\n- Spread by whiteflies carrying virus.\n- **Action:** Spray Neem Oil (1500 ppm @ 5ml/litre water) every 7 days.\n- Install yellow sticky traps (15 traps/acre).\n- Severe cases: Spray Acetamiprid 20% SP @ 0.5g/L.\n- Remove badly infected plants immediately.";
            }
            if (q.includes('rust') || q.includes('wheat')) {
                return "**Wheat Rust Management:**\n- **Yellow/Brown Rust:** Spray Propiconazole 25% EC (Tilt) @ 1ml/litre water immediately on first spotting.\n- Use resistant certified varieties like HD-2967 or PBW-550.\n- Avoid excess nitrogen; balance with potash (MOP).";
            }
            if (q.includes('drip') || q.includes('irrigation') || q.includes('water')) {
                return "**Drip Irrigation & Water Saving:**\n- Saves **45–60% water** and boosts crop yield by 25%.\n- **PM Krishi Sinchayee Yojana (PMKSY):** Up to 55% subsidy for small/marginal farmers.\n- Use organic mulching (straw/crop residue) to reduce evaporation by 30%.";
            }
            if (q.includes('npk') || q.includes('fertilizer') || q.includes('compost') || q.includes('organic')) {
                return "**Fertilizer & Soil Health:**\n- **Standard NPK ratio:** Cereals 4:2:1, Pulses 1:2:1.\n- **Organic:** Apply 3–5 tons well-decomposed vermicompost per acre before plowing.\n- Use Jeevamrit or cow dung slurry to enrich soil microbes.";
            }
            if (q.includes('pest') || q.includes('insect') || q.includes('worm') || q.includes('aphid')) {
                return "**Organic Pest Defense:**\n- **Neem Spray:** 5ml neem oil + 1ml liquid soap per litre water.\n- **Pheromone Traps:** 5–8 traps/acre for bollworms/fruit borers.\n- **Companion Planting:** Marigold borders attract nematodes away from main crops.";
            }
            if (q.includes('pm-kisan') || q.includes('pm kisan') || q.includes('scheme') || q.includes('subsidy')) {
                return "**Key Government Schemes:**\n- **PM-KISAN:** ₹6,000/year in 3 equal installments of ₹2,000 directly to bank accounts.\n- **PMFBY:** Crop insurance at 1.5–2% premium for food crops.\n- **KCC (Kisan Credit Card):** Concessional farm loans at 4% effective interest rate.";
            }
            if (q.includes('soil') || q.includes('testing')) {
                return "**Soil Health Essentials:**\n- Ideal pH range for most crops: **6.2 to 7.5**.\n- Get a free test under the **Soil Health Card Scheme** at your local Krishi Vigyan Kendra (KVK).\n- Add agricultural gypsum for alkaline soils, lime for acidic soils.";
            }
            return "**KhetMitra Agricultural Guidance:**\n- Ensure proper soil drainage and certified seed sourcing.\n- Practice crop rotation with legumes to naturally fix nitrogen.\n- For localized assistance, consult your block KVK or call the Kisan Call Centre at **1800-180-1551**.";
        }

        // Token-conscious Groq API call (High-speed LLM inference)
        async function callGroqAPI(userQuery, prunedHistory) {
            const messages = [
                { role: 'system', content: CONFIG.SYSTEM_PROMPT }
            ];

            prunedHistory.forEach(msg => {
                messages.push({
                    role: msg.role === 'user' ? 'user' : 'assistant',
                    content: msg.text
                });
            });

            messages.push({
                role: 'user',
                content: userQuery
            });

            const payload = {
                model: CONFIG.MODEL,
                messages: messages,
                max_tokens: CONFIG.MAX_OUTPUT_TOKENS, // Strictly capped output
                temperature: 0.4
            };

            let response = await fetch(CONFIG.ENDPOINT, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${currentApiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            // If primary model has any issue, failover to secondary model
            if (!response.ok && CONFIG.FALLBACK_MODEL) {
                payload.model = CONFIG.FALLBACK_MODEL;
                response = await fetch(CONFIG.ENDPOINT, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${currentApiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });
            }

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData?.error?.message || `HTTP ${response.status}`);
            }

            const data = await response.json();
            const replyText = data?.choices?.[0]?.message?.content;
            if (!replyText) throw new Error('Empty response from Groq');

            return replyText;
        }

        if (chatForm) {
            chatForm.addEventListener('submit', async function (e) {
                e.preventDefault();
                const query = chatInput.value.trim();
                if (!query) return;

                chatInput.value = '';
                appendUserMessage(query);

                // Token conscious: prune context strictly to last N turns
                const prunedContext = chatHistory.slice(-CONFIG.MAX_CONTEXT_TURNS);

                if (chatTyping) chatTyping.classList.remove('hidden');
                chatMessages.scrollTop = chatMessages.scrollHeight;

                try {
                    let botReply = '';

                    if (currentApiKey) {
                        try {
                            botReply = await callGroqAPI(query, prunedContext);
                        } catch (apiErr) {
                            console.warn('Live API unavailable, using expert fallback:', apiErr);
                            botReply = getAgriFallbackResponse(query);
                        }
                    } else {
                        await new Promise(r => setTimeout(r, 350));
                        botReply = getAgriFallbackResponse(query);
                    }

                    if (chatTyping) chatTyping.classList.add('hidden');
                    appendBotMessage(botReply);

                    // Save to local memory (keep capped at 12 messages)
                    chatHistory.push({ role: 'user', text: query });
                    chatHistory.push({ role: 'assistant', text: botReply });
                    if (chatHistory.length > 12) chatHistory = chatHistory.slice(-12);

                } catch (error) {
                    if (chatTyping) chatTyping.classList.add('hidden');
                    appendBotMessage('I am currently experiencing high demand. Please try asking again in a moment.');
                }
            });
        }

        // Keyboard shortcut: Escape to close
        window.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && chatPanel && chatPanel.classList.contains('chat-open')) {
                toggleChat(false);
            }
        });
    }

    // Execute when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initChatbot);
    } else {
        initChatbot();
    }
})();
