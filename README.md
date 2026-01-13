# Local LLM Router (Groq + OpenAI) — MCP-style Control Plane

A local, MCP-inspired routing layer that chooses between Groq and OpenAI
based on cost and quality signals, with timeouts, automatic fallback,
latency tracking, a browser UI, and a Chrome omnibox extension.

This project treats LLMs as interchangeable infrastructure, not hardcoded vendors.

============================================================

WHY THIS EXISTS

Real-world AI systems need:

- Cost control (cheap models for routine queries)
- Reliability (fallback on failure or timeout)
- Latency awareness (fast responses by default)
- Vendor independence (no lock-in)

This project demonstrates a minimal, production-minded
multi-LLM control plane.

============================================================

ARCHITECTURE

Browser / n8n / API Client
        |
        v
Local Router (Node.js / Express)
        |
        v
Groq (fast / cheap)
        |
        v  (fallback on error or timeout)
OpenAI (higher-quality reasoning)

============================================================

ROUTING BEHAVIOR

- quality = free   -> Groq
- quality = cheap  -> Groq
- quality = best   -> OpenAI
- Automatic fallback from Groq to OpenAI

Each response includes:
- provider_used
- optional fallback_from
- latency_ms
- answer

============================================================

API

POST /route

Request example:

{
  "prompt": "Say OK",
  "quality": "free",
  "max_tokens": 50
}

Response example:

{
  "provider_used": "groq",
  "latency_ms": 1234,
  "answer": "OK"
}

============================================================

LOCAL UI

Open in browser:

http://localhost:8787/ui

Acts like a local AI-powered search bar routed through the control plane.

============================================================

SETUP

npm install
cp .env.example .env
npm start

============================================================

CHROME EXTENSION

Load unpacked from:

chrome-extension/

Use omnibox keyword:

ai explain MCP in simple terms

============================================================

NOTES

- Groq is used for speed and cost efficiency
- OpenAI is used for higher-quality reasoning or fallback
- The router is designed to extend to other providers
  such as Claude, Gemini, or DeepSeek

============================================================

LICENSE

MIT
