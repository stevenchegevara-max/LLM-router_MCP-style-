import 'dotenv/config';
import express from 'express';
import fetch from 'node-fetch';
import { z } from 'zod';
import OpenAI from 'openai';
import Groq from 'groq-sdk';

const app = express();
app.use(express.json({ limit: '1mb' }));

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const RequestSchema = z.object({
  prompt: z.string().min(1),
  quality: z.enum(['free', 'cheap', 'best']).default('free'),
  max_tokens: z.number().int().min(16).max(2048).default(512),
});

function pickProvider({ quality }) {
  if (quality === 'best') return 'openai';
  if (quality === 'cheap') return 'groq';
  return 'groq'; // free => groq
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

async function callGroq(prompt, max_tokens) {
  const res = await groq.chat.completions.create({
    model: 'llama3-8b-8192',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2,
    max_tokens,
  });
  return res.choices[0].message.content;
}

async function callOpenAI(prompt, max_tokens) {
  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2,
    max_tokens,
  });
  return res.choices[0].message.content;
}

// Simple UI for browser + extension
app.get('/ui', async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) {
    return res.send(`
      <html><body style="font-family: sans-serif; max-width: 900px; margin: 40px auto;">
        <h2>LLM Router</h2>
        <form method="GET" action="/ui">
          <input name="q" style="width: 100%; padding: 12px; font-size: 16px;" placeholder="Ask something..." />
          <button style="margin-top: 12px; padding: 10px 14px;">Ask</button>
        </form>
      </body></html>
    `);
  }

  const body = { prompt: q, quality: 'free', max_tokens: 500 };

  const r = await fetch('http://localhost:8787/route', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await r.json();

  const safe = (s) =>
    String(s || '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[c]));

  return res.send(`
    <html><body style="font-family: sans-serif; max-width: 900px; margin: 40px auto;">
      <h2>LLM Router</h2>
      <form method="GET" action="/ui">
        <input name="q" value="${safe(q)}" style="width: 100%; padding: 12px; font-size: 16px;" />
        <button style="margin-top: 12px; padding: 10px 14px;">Ask</button>
      </form>
      <p style="color:#666;">Provider: <b>${safe(data.provider_used)}</b> • Latency: <b>${safe(data.latency_ms)}</b> ms</p>
      <pre style="white-space: pre-wrap; font-size: 15px; line-height: 1.4; padding: 14px; background: #f6f6f6; border-radius: 10px;">${safe(data.answer)}</pre>
    </body></html>
  `);
});

// API endpoint for n8n and programmatic use
app.post('/route', async (req, res) => {
  const started = Date.now();
  try {
    const data = RequestSchema.parse(req.body);
    const provider = pickProvider(data);

    if (provider === 'groq') {
      try {
        const answer = await withTimeout(callGroq(data.prompt, data.max_tokens), 12000);
        return res.json({
          provider_used: 'groq',
          latency_ms: Date.now() - started,
          answer,
        });
      } catch (e) {
        const answer = await withTimeout(callOpenAI(data.prompt, data.max_tokens), 20000);
        return res.json({
          provider_used: 'openai',
          fallback_from: 'groq',
          error_from_primary: String(e?.message || e),
          latency_ms: Date.now() - started,
          answer,
        });
      }
    }

    const answer = await withTimeout(callOpenAI(data.prompt, data.max_tokens), 20000);
    return res.json({
      provider_used: 'openai',
      latency_ms: Date.now() - started,
      answer,
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

app.listen(8787, () => {
  console.log('LLM Router (Groq-first + OpenAI fallback) running at http://localhost:8787');
});
