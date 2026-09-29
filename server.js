const http = require('node:http');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');

function loadLocalEnv() {
    try {
        const lines = fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split(/\r?\n/);
        for (const line of lines) {
            const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
            if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
        }
    } catch (error) {
        if (error.code !== 'ENOENT') console.warn('Could not read .env:', error.message);
    }
}

loadLocalEnv();

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const MAX_BODY_BYTES = 8 * 1024;
const MAX_MESSAGE_CHARS = 500;
const MAX_HISTORY_MESSAGES = 6;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 15;
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = process.env.GROQ_MODEL || 'qwen/qwen3.8-27b';
const requestsByIp = new Map();

const SYSTEM_PROMPT = [
    'You are KhetMitra, a helpful agricultural advisor for Indian farmers.',
    'Answer the user’s farming question directly in no more than 90 words.',
    'Use 3–5 concise bullets when giving steps.',
    'Ask one brief follow-up only when the crop, location, stage, or symptom is essential.',
    'For pesticide, fertilizer, veterinary, health, legal, price, or scheme matters, give general safety guidance and tell the user to verify current local official advice.',
    'Do not invent product dosages, current prices, government benefits, weather, or diagnoses.'
].join(' ');

function sendJson(response, status, value) {
    response.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    });
    response.end(JSON.stringify(value));
}

function clientIp(request) {
    return request.socket.remoteAddress || 'unknown';
}

function isRateLimited(ip) {
    const now = Date.now();
    const recent = (requestsByIp.get(ip) || []).filter((time) => now - time < RATE_LIMIT_WINDOW_MS);
    recent.push(now);
    requestsByIp.set(ip, recent);
    return recent.length > RATE_LIMIT_MAX_REQUESTS;
}

function readJson(request) {
    return new Promise((resolve, reject) => {
        let size = 0;
        let body = '';
        request.setEncoding('utf8');
        request.on('data', (chunk) => {
            size += Buffer.byteLength(chunk);
            if (size > MAX_BODY_BYTES) {
                reject(new Error('Request too large'));
                request.destroy();
                return;
            }
            body += chunk;
        });
        request.on('end', () => {
            try { resolve(JSON.parse(body || '{}')); } catch { reject(new Error('Invalid JSON')); }
        });
        request.on('error', reject);
    });
}

function cleanHistory(history) {
    if (!Array.isArray(history)) return [];
    return history.slice(-MAX_HISTORY_MESSAGES).flatMap((item) => {
        if (!item || !['user', 'assistant'].includes(item.role) || typeof item.text !== 'string') return [];
        const text = item.text.trim().slice(0, MAX_MESSAGE_CHARS);
        return text ? [{ role: item.role, content: text }] : [];
    });
}

async function handleChat(request, response) {
    if (!process.env.GROQ_API_KEY) {
        sendJson(response, 503, { error: 'Chat service is not configured.' });
        return;
    }
    if (isRateLimited(clientIp(request))) {
        sendJson(response, 429, { error: 'Too many requests. Please wait a few minutes.' });
        return;
    }

    let body;
    try { body = await readJson(request); } catch (error) {
        sendJson(response, error.message === 'Request too large' ? 413 : 400, { error: error.message });
        return;
    }
    const message = typeof body.message === 'string' ? body.message.trim().slice(0, MAX_MESSAGE_CHARS) : '';
    if (!message) {
        sendJson(response, 400, { error: 'Please enter a farming question.' });
        return;
    }

    try {
        const groqResponse = await fetch(GROQ_ENDPOINT, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: MODEL,
                messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...cleanHistory(body.history), { role: 'user', content: message }],
                temperature: 0.35,
                max_completion_tokens: 180
            }),
            signal: AbortSignal.timeout(20_000)
        });
        const result = await groqResponse.json().catch(() => ({}));
        const reply = result?.choices?.[0]?.message?.content;
        if (!groqResponse.ok || typeof reply !== 'string' || !reply.trim()) {
            console.error('Groq request failed:', groqResponse.status, result?.error?.message || 'unknown error');
            sendJson(response, 502, { error: 'The AI service could not answer right now.' });
            return;
        }
        sendJson(response, 200, { reply: reply.trim().slice(0, 4_000) });
    } catch (error) {
        console.error('Groq request failed:', error.name, error.message);
        sendJson(response, 502, { error: 'The AI service is temporarily unavailable.' });
    }
}

const mimeTypes = { '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ico': 'image/x-icon' };

async function serveStatic(request, response) {
    const urlPath = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
    const relativePath = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
    const filePath = path.resolve(ROOT, relativePath);
    if (!filePath.startsWith(`${ROOT}${path.sep}`) || path.basename(filePath).startsWith('.')) {
        response.writeHead(403).end();
        return;
    }
    try {
        const file = await fsp.readFile(filePath);
        response.writeHead(200, { 'Content-Type': mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream' });
        response.end(file);
    } catch {
        response.writeHead(404).end('Not found');
    }
}

http.createServer((request, response) => {
    if (request.method === 'OPTIONS') {
        response.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'POST, OPTIONS'
        });
        return response.end();
    }
    if (request.method === 'POST' && request.url === '/api/chat') return handleChat(request, response);
    if (request.method === 'GET' || request.method === 'HEAD') return serveStatic(request, response);
    response.writeHead(405, { Allow: 'GET, HEAD, POST, OPTIONS' }).end();
}).listen(PORT, () => console.log(`KhetMitra is running at http://localhost:${PORT}`));
