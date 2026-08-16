/**
 * IndexNow — instant indexing protocol supported by Bing, Yandex,
 * Seznam, and (read-through) by ChatGPT/Brave/DuckDuckGo. Google does
 * NOT participate, so this complements Search Console rather than
 * replacing it.
 *
 * Why bother: when a contractor signs up, a property gets listed, or a
 * blog post is published, we ping IndexNow with the new URL and Bing
 * starts crawling it within minutes (vs. days for organic discovery).
 * It's a free uplift on Bing/DuckDuckGo traffic plus a stronger signal
 * to LLM search aggregators.
 *
 * Setup
 *  1. Generate a 32+ character lowercase hex key (`openssl rand -hex 16`).
 *  2. Set env var INDEXNOW_KEY=<that hex string>.
 *  3. Restart the server. The key is served at `/indexnow-key` and we
 *     pass `keyLocation` in every submission so Bing reads it from there.
 *
 * Usage
 *   await indexNowSubmit('https://www.propertyflowhq.com/coffeevibes');
 *   await indexNowSubmit([url1, url2, url3]);
 *
 * The submit fails gracefully on missing config or network errors —
 * never throws. Indexing is a best-effort signal, not a critical path.
 */

const INDEXNOW_HOST = 'api.indexnow.org';
const HOST = (
  process.env.NEXT_PUBLIC_SERVER_URL || 'https://www.propertyflowhq.com'
).replace(/^https?:\/\//, '').replace(/\/+$/, '');

export async function indexNowSubmit(urls: string | string[]): Promise<void> {
  const key = process.env.INDEXNOW_KEY;
  if (!key) {
    // Silent — the feature is opt-in via env var. Logging once would be
    // noise on every signup if the user hasn't configured it.
    return;
  }

  const list = (Array.isArray(urls) ? urls : [urls])
    .filter((u) => typeof u === 'string' && u.length > 0)
    // Only submit URLs on the canonical host. IndexNow rejects mixed
    // hosts in a single submission.
    .filter((u) => {
      try {
        return new URL(u).host === HOST;
      } catch {
        return false;
      }
    });

  if (list.length === 0) return;

  try {
    await fetch(`https://${INDEXNOW_HOST}/indexnow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: HOST,
        key,
        keyLocation: `https://${HOST}/indexnow-key`,
        urlList: list,
      }),
      // Tight timeout — this is best-effort fire-and-forget.
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    // Network failures are acceptable; they don't affect the user-facing
    // operation that triggered the ping.
  }
}
