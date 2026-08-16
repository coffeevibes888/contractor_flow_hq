import 'dotenv/config';
import Imap from 'imap';
import { simpleParser } from 'mailparser';
import fetch from 'node-fetch';

const {
  ZOHO_IMAP_HOST,
  ZOHO_IMAP_PORT,
  ZOHO_IMAP_USER,
  ZOHO_IMAP_PASS,
  INBOUND_EMAIL_SECRET,
  NEXT_PUBLIC_SERVER_URL,
} = process.env as Record<string, string | undefined>;

if (!ZOHO_IMAP_HOST || !ZOHO_IMAP_PORT || !ZOHO_IMAP_USER || !ZOHO_IMAP_PASS) {
  console.error('ZOHO_IMAP_* env vars are required');
  process.exit(1);
}

if (!INBOUND_EMAIL_SECRET) {
  console.error('INBOUND_EMAIL_SECRET env var is required');
  process.exit(1);
}

if (!NEXT_PUBLIC_SERVER_URL) {
  console.error('NEXT_PUBLIC_SERVER_URL env var is required');
  process.exit(1);
}

const imap = new Imap({
  user: ZOHO_IMAP_USER,
  password: ZOHO_IMAP_PASS,
  host: ZOHO_IMAP_HOST,
  port: Number(ZOHO_IMAP_PORT),
  tls: true,
});

function openInbox(cb: (err: Error | null, box?: Imap.Box) => void) {
  imap.openBox('INBOX', false, cb);
}

imap.once('ready', () => {
  openInbox((err) => {
    if (err) {
      console.error('Failed to open INBOX', err);
      imap.end();
      return;
    }

    imap.search(['UNSEEN'], (searchErr: any, results: any) => {
      if (searchErr) {
        console.error('Search error', searchErr);
        imap.end();
        return;
      }

      if (!results || results.length === 0) {
        console.log('No unseen messages');
        imap.end();
        return;
      }

      const f = imap.fetch(results, { bodies: '' });

      f.on('message', (msg: any) => {
        let buffer = '';

        msg.on('body', (stream: any) => {
          stream.on('data', (chunk: any) => {
            buffer += chunk.toString('utf8');
          });
        });

        msg.once('end', async () => {
          try {
            const parsed = await simpleParser(buffer);

            const anyParsed: any = parsed as any;
            const to = anyParsed.to?.text || anyParsed.to?.toString?.() || '';
            const from = anyParsed.from?.text || anyParsed.from?.toString?.() || '';
            const subject = parsed.subject || '';
            const text = parsed.text || '';
            const html = parsed.html || undefined;

            const res = await fetch(`${NEXT_PUBLIC_SERVER_URL}/api/email/inbound`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-inbound-secret': INBOUND_EMAIL_SECRET,
              },
              body: JSON.stringify({ to, from, subject, text, html }),
            });

            if (!res.ok) {
              console.error('Inbound API error', await res.text());
            } else {
              console.log('Synced message from', from, 'subject:', subject);
            }
          } catch (e) {
            console.error('Failed to parse or sync message', e);
          }
        });
      });

      f.once('error', (fetchErr: any) => {
        console.error('Fetch error', fetchErr);
      });

      f.once('end', () => {
        console.log('Done fetching unseen messages');
        imap.end();
      });
    });
  });
});

imap.once('error', (err: any) => {
  console.error('IMAP error', err);
});

imap.once('end', () => {
  console.log('Connection ended');
});

imap.connect();
