/* KhetMitra farming assistant. The browser calls this project's protected /api/chat endpoint. */
(function () {
    'use strict';

    const MAX_QUERY_LENGTH = 500;
    const MAX_HISTORY_MESSAGES = 12;
    const MAX_HISTORY_SENT = 6;
    const CHAT_ENDPOINT = '/api/chat';
    let chatHistory = [];

    function timeNow() {
        return new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: 'numeric', hour12: true }).format(new Date());
    }

    function escapeHtml(value) {
        return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    }

    function formatMessage(value) {
        return escapeHtml(value)
            .replace(/\*\*(.*?)\*\*/g, '<strong class="text-leaf-300 font-semibold">$1</strong>')
            .replace(/^[*-]\s+(.*)$/gm, '<div class="flex gap-1.5 my-1"><span class="text-leaf-400">&bull;</span><span>$1</span></div>')
            .replace(/\n/g, '<br>');
    }

    function answerFor(query) {
        const q = query.toLowerCase();
        const crops = {
            rice: ['Rice', 'Keep early growth evenly moist and maintain drainage where water can collect.', 'stem borer, leaf folder, and nutrient imbalance'],
            paddy: ['Paddy', 'Use healthy seedlings, level the field, and manage water according to local advice.', 'stem borer, leaf folder, and nutrient imbalance'],
            maize: ['Maize', 'Use well-drained soil, timely weeding, and split nitrogen applications.', 'fall armyworm and water stress at flowering'],
            cotton: ['Cotton', 'Use certified seed, avoid excess nitrogen, and monitor traps regularly.', 'sucking pests and bollworms'],
            potato: ['Potato', 'Use disease-free seed tubers, earthing-up, and even soil moisture.', 'late blight and tuber rot'],
            onion: ['Onion', 'Keep beds weed-free, irrigate lightly, and cure bulbs well before storage.', 'thrips and fungal leaf diseases'],
            chilli: ['Chilli', 'Use healthy seedlings, mulch where practical, and avoid water stress.', 'thrips, mites, and leaf curl'],
            soybean: ['Soybean', 'Use seed treatment, good drainage, and timely weed control.', 'leaf defoliators and waterlogging'],
            sugarcane: ['Sugarcane', 'Use healthy setts, maintain furrow irrigation, and earth-up at the right stage.', 'borers and red rot'],
            banana: ['Banana', 'Use disease-free planting material, mulch, and support heavy plants.', 'sigatoka and rhizome pests']
        };
        const cropMatch = Object.keys(crops).find((crop) => q.includes(crop));
        if (cropMatch) {
            const [name, practice, risk] = crops[cropMatch];
            return `**${name} guidance:**\n- ${practice}\n- Watch for ${risk}.\n- Check the crop stage before choosing any input.\n- Share your state and symptom for more targeted local guidance.`;
        }
        if (/(wheat|rust)/.test(q)) return '**Wheat guidance:**\n- Inspect leaves for rust and confirm it locally.\n- Use locally recommended resistant seed.\n- Avoid excess nitrogen and keep field airflow good.\n- Follow only label-approved treatments for your state.';
        if (/(tomato|leaf curl|whitefly|yellow leaf)/.test(q)) return '**Tomato leaf-curl guidance:**\n- Whiteflies commonly spread leaf-curl viruses.\n- Use yellow sticky traps and remove badly affected plants.\n- Use neem-based products only as labelled.\n- Ask a local agriculture officer for crop-specific treatment when severe.';
        if (/(kharif|monsoon|rainy)/.test(q)) return '**Kharif planning:**\n- Consider paddy, maize, soybean, or cotton based on local suitability.\n- Sow after dependable rainfall.\n- Treat seed and plan drainage before sowing.\n- Avoid waterlogging around young plants.';
        if (/(rabi|winter|mustard|gram)/.test(q)) return '**Rabi planning:**\n- Wheat, mustard, gram, and barley are common choices.\n- Use certified seed and sow at the locally advised time.\n- Plan irrigation from soil moisture, not only a calendar.\n- Test soil before applying fertilizer.';
        if (/(drip|irrigation|water|moisture)/.test(q)) return '**Water-saving guidance:**\n- Irrigate when the root zone needs it, not on fixed days.\n- Mulch to reduce evaporation.\n- Check emitters regularly if using drip.\n- Avoid irrigation just before forecast rain.';
        if (/(weather|forecast|temperature|heat|frost|wind)/.test(q)) return '**Weather planning:**\n- Check the local forecast before sowing, irrigating, or spraying.\n- Avoid spraying in strong wind or before rain.\n- During heat, irrigate at cooler times and protect young plants.\n- During frost risk, follow local crop-protection advice.';
        if (/(seed|sowing|planting|nursery|germination)/.test(q)) return '**Seed and sowing guidance:**\n- Use certified seed suited to your area and season.\n- Prepare a fine, moist seedbed with good drainage.\n- Treat seed only with products approved for that crop.\n- Keep the correct spacing and sowing depth.';
        if (/(organic|natural farming|bio.?fertili[sz]er|vermicompost|jeevamrit)/.test(q)) return '**Natural-farming guidance:**\n- Build soil organic matter with well-decomposed compost and crop residue.\n- Use bio-inputs only at recommended rates and keep records of results.\n- Rotate crops and include legumes where suitable.\n- Do not assume natural inputs are risk-free; use clean water and hygienic preparation.';
        if (/(dairy|cow|buffalo|milk|cattle)/.test(q)) return '**Dairy guidance:**\n- Provide clean water, balanced feed, mineral mixture, and dry bedding.\n- Keep milking equipment and udders clean.\n- Isolate a sick animal and contact a veterinarian for fever, poor appetite, injury, or reduced milk.\n- Maintain vaccination and deworming records with local veterinary advice.';
        if (/(goat|sheep|poultry|chicken|hen|fish|aquaculture)/.test(q)) return '**Livestock guidance:**\n- Keep housing dry, clean, ventilated, and protected from predators.\n- Provide species-appropriate feed and clean water.\n- Quarantine new or sick animals.\n- Use a veterinarian or fisheries officer for vaccination, disease, or medicine decisions.';
        if (/(tractor|machine|implement|pump|equipment|sprayer)/.test(q)) return '**Farm-equipment guidance:**\n- Inspect guards, hoses, tyres, belts, and fluid levels before use.\n- Calibrate seeders and sprayers before working in the field.\n- Clean and dry equipment after use.\n- Use protective equipment and follow the manufacturer manual.';
        if (/(loan|credit|debt|insurance|pmfby|kcc|bank)/.test(q)) return '**Farm finance guidance:**\n- Compare the total cost, repayment date, and interest before borrowing.\n- Keep records of inputs, sales, and receipts.\n- Check eligibility directly with the bank or official scheme portal.\n- Crop-insurance claims need timely reporting and supporting documents.';
        if (/(harvest|harvesting|thresh|storage|warehouse|post.?harvest|grain|cold storage)/.test(q)) return '**Harvest and storage guidance:**\n- Harvest at the correct maturity and avoid handling produce when wet.\n- Dry grains to a safe moisture level before storage.\n- Use clean, pest-proof containers and inspect stocks regularly.\n- Separate damaged produce to reduce spoilage.';
        if (/(weed|weeding|herbicide)/.test(q)) return '**Weed-management guidance:**\n- Identify the weed before choosing a method.\n- Use timely hand weeding, mulch, or mechanical control where practical.\n- If using a herbicide, select one approved for the crop and growth stage.\n- Follow its label, dose, waiting period, and protective-equipment instructions.';
        if (/(land|lease|tenancy|farm plan|rotation|field)/.test(q)) return '**Farm-planning guidance:**\n- Match the crop plan to soil, water availability, labour, and market access.\n- Rotate crops to break pest cycles and improve soil health.\n- Keep field maps and records of inputs, pest issues, and yields.\n- Avoid taking a high-cost decision without checking local suitability.';
        if (/(labou?r|worker|safety|accident|poison|spray)/.test(q)) return '**Farm-safety guidance:**\n- Use gloves, footwear, eye protection, and a mask when required by the product label.\n- Keep children and animals away from treated areas.\n- Store chemicals in original labelled containers, locked away from food and water.\n- Seek urgent medical help after a suspected poisoning or serious injury.';
        if (/(market|price|sell|mandi|profit)/.test(q)) return '**Market guidance:**\n- Compare nearby mandi prices and transport costs before selling.\n- Grade and sort produce where possible.\n- Keep harvest and input records to estimate your true margin.\n- Check official local market sources for current prices.';
        if (/(fertili[sz]er|npk|soil|compost|manure)/.test(q)) return '**Soil and nutrition guidance:**\n- Start with a soil test before major fertilizer use.\n- Add well-decomposed organic matter where suitable.\n- Split nitrogen applications instead of applying it all at once.\n- Follow the state recommendation for your crop and field.';
        if (/(pest|insect|aphid|worm|borer|disease)/.test(q)) return '**Pest-management guidance:**\n- Identify the pest before spraying.\n- Remove heavily infested plant material safely.\n- Use traps and bio-controls where appropriate.\n- Choose only a crop-approved product and follow its label exactly.';
        if (/(scheme|subsidy|pm[- ]?kisan|pmfby|kcc)/.test(q)) return '**Government support:**\n- PM-KISAN, PMFBY, and KCC may be relevant.\n- Eligibility and benefits can change.\n- Check the official portal or your local agriculture office before applying.';
        if (/(hello|hi|namaste)/.test(q)) return '**Namaste!** Ask me about crops, pests, irrigation, soil health, or farming schemes.';
        return `**About your question:** “${query.slice(0, 110)}”\n- I can give reliable local guidance when I know the crop, its growth stage, your state, and the symptom or goal.\n- Example: “Tomato leaves are curling at flowering stage in Gujarat.”\n- For an urgent pest, disease, or spray decision, please confirm with a local agriculture officer.`;
    }

    async function callAssistant(message) {
        let endpoint = CHAT_ENDPOINT;
        if (window.location.protocol === 'file:' || (window.location.port && window.location.port !== '3000')) {
            endpoint = 'http://localhost:3000/api/chat';
        }
        let response;
        try {
            response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({
                    message,
                    history: chatHistory.slice(-MAX_HISTORY_SENT)
                })
            });
        } catch (err) {
            if (endpoint !== CHAT_ENDPOINT) throw err;
            response = await fetch('http://localhost:3000/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({
                    message,
                    history: chatHistory.slice(-MAX_HISTORY_SENT)
                })
            });
        }
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || typeof payload.reply !== 'string' || !payload.reply.trim()) {
            throw new Error(payload.error || 'Chat service is unavailable.');
        }
        return payload.reply.trim();
    }

    function mount() {
        let root = document.getElementById('khetmitra-chat-container');
        if (!root) {
            root = document.createElement('div');
            root.id = 'khetmitra-chat-container';
            document.body.appendChild(root);
        }
        if (root.dataset.ready) return;
        root.dataset.ready = 'true';
        root.innerHTML = `
            <div id="khetmitra-chat-widget">
                <button id="chat-toggle-btn" type="button" aria-label="Open KhetMitra farming assistant" aria-expanded="false" aria-controls="khetmitra-chat-panel" class="group relative w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-leaf-600 via-leaf-700 to-leaf-900 text-white flex items-center justify-center shadow-xl border-2 border-sun-400/60 hover:scale-105 transition cursor-pointer">
                    <span class="text-2xl" aria-hidden="true">&#127806;</span><span class="hidden sm:block absolute right-full mr-3 whitespace-nowrap rounded-xl border border-leaf-400/30 bg-leaf-950 px-3 py-1.5 text-xs">Ask KhetMitra</span>
                </button>
            </div>
            <section id="khetmitra-chat-panel" class="chat-closed rounded-3xl overflow-hidden border border-leaf-400/30 bg-gradient-to-b from-[#052813] via-[#08381c] to-[#041a0d]" role="dialog" aria-modal="false" aria-labelledby="chat-title">
                <header class="px-4 py-3.5 bg-leaf-900/90 border-b border-leaf-500/20 flex items-center justify-between"><div><h3 id="chat-title" class="font-display font-bold text-sm text-white">KhetMitra Sahayak</h3><p id="chat-status" class="text-[11px] text-leaf-200/80">AI farming assistant</p></div><div class="flex gap-1"><button id="chat-clear-btn" type="button" class="p-2 text-white/70 hover:text-white" aria-label="Clear chat" title="Clear chat">&#128465;</button><button id="chat-close-btn" type="button" class="p-2 text-white/70 hover:text-white" aria-label="Close chat" title="Close chat">&#10005;</button></div></header>
                <div id="chat-messages" class="flex-1 p-4 overflow-y-auto space-y-3.5 text-xs sm:text-sm" aria-live="polite"></div><div id="chat-typing" class="hidden px-4 py-2 text-xs text-leaf-300">KhetMitra is preparing guidance&hellip;</div>
                <footer class="p-3 bg-leaf-950/90 border-t border-leaf-500/20"><form id="chat-form" class="flex items-center gap-2"><input id="chat-input" type="text" maxlength="500" autocomplete="off" placeholder="Ask about crops, soil, pests..." class="flex-1 bg-white/5 border border-white/15 focus:border-leaf-400 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder:text-white/40 outline-none"><button id="chat-send-btn" type="submit" class="p-2.5 rounded-xl bg-gradient-to-r from-leaf-600 to-leaf-500 text-white cursor-pointer" aria-label="Send message">&#10148;</button></form><p class="mt-2 text-center text-[10px] text-leaf-300/70"><span class="text-leaf-300">&bull;</span> Instant farm guidance</p></footer>
            </section>`;

        const panel = root.querySelector('#khetmitra-chat-panel');
        const toggle = root.querySelector('#chat-toggle-btn');
        const input = root.querySelector('#chat-input');
        const messages = root.querySelector('#chat-messages');
        const typing = root.querySelector('#chat-typing');
        const form = root.querySelector('#chat-form');
        const send = root.querySelector('#chat-send-btn');
        const status = root.querySelector('#chat-status');

        function addMessage(role, text) {
            const isUser = role === 'user';
            const bubble = document.createElement('div');
            bubble.className = isUser ? 'flex justify-end ml-auto max-w-[85%]' : 'flex items-start gap-2.5 mr-auto max-w-[92%]';
            bubble.innerHTML = isUser
                ? `<div class="bg-gradient-to-r from-leaf-600 to-leaf-500 text-white rounded-2xl rounded-tr-sm px-3.5 py-2.5 shadow-md"><p>${escapeHtml(text)}</p><div class="text-[9px] text-leaf-100/70 text-right mt-1">${timeNow()}</div></div>`
                : `<span class="w-7 h-7 rounded-full bg-leaf-700 border border-leaf-400/30 flex items-center justify-center shrink-0" aria-hidden="true">&#127806;</span><div class="bg-white/[.08] border border-leaf-400/20 text-white rounded-2xl rounded-tl-sm px-3.5 py-2.5 shadow-md leading-relaxed"><div>${formatMessage(text)}</div><div class="text-[9px] text-white/40 text-right mt-1.5">${timeNow()}</div></div>`;
            messages.appendChild(bubble);
            messages.scrollTop = messages.scrollHeight;
        }

        function setOpen(open) {
            panel.classList.toggle('chat-open', open);
            panel.classList.toggle('chat-closed', !open);
            toggle.setAttribute('aria-expanded', String(open));
            if (open) window.setTimeout(() => input.focus(), 100);
        }

        function reset() {
            chatHistory = [];
            messages.replaceChildren();
            addMessage('assistant', '**Namaste!** I can help with crop planning, pests, irrigation, soil health, or farming schemes. What would you like to know?');
        }

        toggle.addEventListener('click', () => setOpen(!panel.classList.contains('chat-open')));
        root.querySelector('#chat-close-btn').addEventListener('click', () => setOpen(false));
        root.querySelector('#chat-clear-btn').addEventListener('click', reset);
        document.addEventListener('keydown', (event) => { if (event.key === 'Escape') setOpen(false); });
        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            const query = input.value.trim().slice(0, MAX_QUERY_LENGTH);
            if (!query || send.disabled) return;
            input.value = '';
            send.disabled = true;
            addMessage('user', query);
            typing.classList.remove('hidden');
            let reply;
            try {
                reply = await callAssistant(query);
                status.textContent = 'AI farming assistant';
            } catch (error) {
                console.warn('Chat API unavailable:', error.message);
                reply = answerFor(query);
                status.textContent = 'Offline guidance mode';
            }
            typing.classList.add('hidden');
            addMessage('assistant', reply);
            chatHistory.push({ role: 'user', text: query }, { role: 'assistant', text: reply });
            if (chatHistory.length > MAX_HISTORY_MESSAGES) chatHistory = chatHistory.slice(-MAX_HISTORY_MESSAGES);
            send.disabled = false;
            input.focus();
        });
        reset();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
    else mount();
}());
