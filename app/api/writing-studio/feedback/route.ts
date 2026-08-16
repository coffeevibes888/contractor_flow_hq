import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are an expert creative writing coach and developmental editor specialising in fantasy, science fiction, and genre fiction. You give honest, detailed, actionable feedback.

When given a passage of writing, analyse and comment on ALL of the following that are present:

1. **PROSE STYLE** — sentence rhythm, word choice, variety, clarity, purple prose, clichés
2. **PACING** — is it too fast/slow? where should it breathe or accelerate?
3. **CHARACTERS** — are they distinct? believable motivations? strong voices in dialogue?
4. **NAMES** — do character/place names feel consistent with the world's tone and culture?
5. **DIALOGUE** — does it sound natural? does each character have a distinct voice?
6. **PLOT & STRUCTURE** — story logic, cause/effect, setup and payoff, holes
7. **WORLD-BUILDING** — is the setting vivid? are rules of magic/tech consistent?
8. **SHOW VS TELL** — are emotions and action shown through scene, or stated flatly?
9. **TENSION & STAKES** — is there compelling conflict? do we feel what is at risk?
10. **STANDOUT MOMENTS** — note at least 2–3 lines or passages that genuinely work well

Format your response with clear section headers using markdown bold (**Section Name**). Be specific — quote lines from the text when praising or critiquing. Be encouraging but do not soften real problems. End with a short **Overall Verdict** and a **Top 3 Priorities** the writer should focus on next.`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildUserPrompt(text: string, title?: string, author?: string): string {
  const context = [
    title ? `Book title: "${title}"` : '',
    author ? `Author: "${author}"` : '',
  ].filter(Boolean).join('\n');
  return `${context ? context + '\n\n' : ''}Here is the writing passage to analyse:\n\n---\n${text.slice(0, 12000)}\n---`;
}

function errorResponse(message: string, status = 502): Response {
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: { 'Content-Type': 'application/json' } }
  );
}

const STREAM_HEADERS = {
  'Content-Type': 'text/plain; charset=utf-8',
  'Cache-Control': 'no-cache',
  'X-Accel-Buffering': 'no',
};

// ─── Gemini streaming ─────────────────────────────────────────────────────────
// Uses the REST streamGenerateContent endpoint — no SDK needed.
// Gemini SSE lines are JSON objects; the text is in candidates[0].content.parts[0].text

// Try these models in order until one works
const GEMINI_MODELS = [
  'gemini-2.0-flash',
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash',
  'gemini-1.0-pro',
];

async function streamFromGemini(
  apiKey: string,
  userPrompt: string,
): Promise<Response | null> {
  // Try each model name until the API accepts one
  for (const model of GEMINI_MODELS) {
    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent` +
      `?alt=sse&key=${apiKey}`;

    let geminiRes: Response;
    try {
      geminiRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: { maxOutputTokens: 2048, temperature: 0.75 },
        }),
      });
    } catch {
      continue; // network error, try next model
    }

    // 404 = model not found on this API version — try next
    if (geminiRes.status === 404) continue;

    if (!geminiRes.ok) {
      // Any other error (401 bad key, 429 quota, etc.) — return null so caller can fall back
      return null;
    }

    // Model accepted — stream the response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const reader = geminiRes.body?.getReader();
        if (!reader) { controller.close(); return; }
        const dec = new TextDecoder();
        let buf = '';
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buf += dec.decode(value, { stream: true });
            const lines = buf.split('\n');
            buf = lines.pop() ?? '';
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith('data:')) continue;
              const data = trimmed.slice(5).trim();
              if (!data || data === '[DONE]') continue;
              try {
                type GeminiChunk = {
                  candidates?: { content?: { parts?: { text?: string }[] } }[];
                };
                const parsed = JSON.parse(data) as GeminiChunk;
                const chunk = parsed.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
                if (chunk) controller.enqueue(encoder.encode(chunk));
              } catch { /* skip malformed line */ }
            }
          }
        } catch (err: unknown) {
          controller.enqueue(encoder.encode(`\n\n**Error:** ${(err as Error).message}`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, { headers: STREAM_HEADERS });
  }

  // All models exhausted with no success
  return null;
}

// ─── OpenAI streaming ─────────────────────────────────────────────────────────

async function streamFromOpenAI(
  apiKey: string,
  userPrompt: string,
): Promise<Response> {
  const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      stream: true,
      max_tokens: 2000,
      temperature: 0.75,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!openaiRes.ok) {
    const errText = await openaiRes.text();
    let message = `OpenAI error ${openaiRes.status}`;
    try {
      const parsed = JSON.parse(errText) as { error?: { message?: string } };
      if (parsed?.error?.message) message = parsed.error.message;
    } catch { /* use raw */ }
    return errorResponse(message);
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const reader = openaiRes.body?.getReader();
      if (!reader) { controller.close(); return; }
      const dec = new TextDecoder();
      let buf = '';
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          const lines = buf.split('\n');
          buf = lines.pop() ?? '';
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            const data = trimmed.slice(5).trim();
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data) as {
                choices?: { delta?: { content?: string } }[];
              };
              const chunk = parsed.choices?.[0]?.delta?.content ?? '';
              if (chunk) controller.enqueue(encoder.encode(chunk));
            } catch { /* skip malformed line */ }
          }
        }
      } catch (err: unknown) {
        controller.enqueue(encoder.encode(`\n\n**Error:** ${(err as Error).message}`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: STREAM_HEADERS });
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const body = await req.json() as { text?: string; title?: string; author?: string };
  const { text, title, author } = body;

  if (!text || text.trim().length < 20) {
    return errorResponse('Not enough text to analyse. Write a bit more first.', 400);
  }

  const userPrompt = buildUserPrompt(text, title, author);
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  // Gemini is primary — try it if a key is present; returns null on any failure
  if (geminiKey) {
    const geminiResponse = await streamFromGemini(geminiKey, userPrompt);
    if (geminiResponse) return geminiResponse;
    // Gemini failed (bad key, quota, model unavailable) — fall through to OpenAI
  }

  // OpenAI fallback
  if (openaiKey) {
    return streamFromOpenAI(openaiKey, userPrompt);
  }

  // Neither key is configured or working
  return errorResponse(
    'No AI key configured. Add GEMINI_API_KEY (or OPENAI_API_KEY as fallback) to your .env.local file.',
    503,
  );
}
