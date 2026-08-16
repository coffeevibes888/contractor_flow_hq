'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight, Copy, Check, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="h-8 w-8 flex items-center justify-center rounded text-white/60 hover:text-white hover:bg-white/10 transition-colors">
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}

function CodeBlock({ code }: { code: string }) {
  return (
    <div className="relative">
      <pre className="bg-black/40 text-white/90 p-4 rounded-lg overflow-x-auto text-sm border border-white/10"><code>{code}</code></pre>
      <div className="absolute top-2 right-2"><CopyButton text={code} /></div>
    </div>
  );
}

function EndpointCard({ method, path, description, scopes, children }: {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE'; path: string; description: string; scopes: string[]; children?: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const colors = { GET: 'bg-blue-500', POST: 'bg-green-500', PATCH: 'bg-yellow-500', DELETE: 'bg-red-500' };
  return (
    <div className="bg-white/10 border border-white/20 rounded-lg overflow-hidden">
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center gap-3 p-4 hover:bg-white/5 transition-colors text-left">
        <Badge className={cn('font-mono', colors[method])}>{method}</Badge>
        <code className="text-sm font-medium text-white">{path}</code>
        <span className="text-sm text-white/60 ml-auto mr-2">{description}</span>
        {expanded ? <ChevronDown className="h-4 w-4 text-white/60" /> : <ChevronRight className="h-4 w-4 text-white/60" />}
      </button>
      {expanded && (
        <div className="border-t border-white/10 p-4 bg-white/5">
          <div className="mb-3">
            <p className="text-sm font-medium mb-2 text-white">Required Scopes:</p>
            <div className="flex gap-2">{scopes.map(s => <Badge key={s} variant="outline" className="border-white/30 text-white/80">{s}</Badge>)}</div>
          </div>
          <div className="text-white/70 text-sm">{children}</div>
        </div>
      )}
    </div>
  );
}

const BASE = 'https://www.propertyflowhq.com/api/v1/contractor';

const webhookEvents = [
  { event: 'job.created', description: 'New job created' },
  { event: 'job.updated', description: 'Job status or details changed' },
  { event: 'job.completed', description: 'Job marked as complete' },
  { event: 'job.cancelled', description: 'Job was cancelled' },
  { event: 'invoice.created', description: 'New invoice created' },
  { event: 'invoice.paid', description: 'Invoice payment received' },
  { event: 'invoice.overdue', description: 'Invoice past due date' },
  { event: 'customer.created', description: 'New customer added' },
  { event: 'booking.confirmed', description: 'Instant booking confirmed' },
  { event: 'booking.cancelled', description: 'Booking was cancelled' },
  { event: 'payment.received', description: 'Payment received for any invoice' },
  { event: 'review.received', description: 'New review submitted by a client' },
];

export default function ContractorApiDocsPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <Link href="/docs/api" className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-6 text-sm">
        <ArrowLeft className="h-4 w-4" /> Back to API Docs
      </Link>

      <h1 className="text-4xl font-bold mb-2 text-white">Contractor API & Webhooks</h1>
      <p className="text-xl text-white/70 mb-2">
        Automate your contractor business. Sync jobs, invoices, and customers with your own systems.
      </p>
      <div className="inline-flex items-center gap-2 bg-amber-500/20 border border-amber-500/40 rounded-full px-3 py-1 text-amber-300 text-sm mb-8">
        Enterprise plan required ($199/month)
      </div>

      <Tabs defaultValue="api" className="w-full">
        <TabsList className="bg-white/10 border-white/20 mb-8">
          <TabsTrigger value="api" className="data-[state=active]:bg-white/20 text-white px-6">API Reference</TabsTrigger>
          <TabsTrigger value="webhooks" className="data-[state=active]:bg-white/20 text-white px-6">Webhooks</TabsTrigger>
        </TabsList>

        <TabsContent value="api" className="space-y-8">
          <section>
            <h2 className="text-2xl font-bold mb-4 text-white">Authentication</h2>
            <p className="text-white/70 mb-4">
              Contractor API keys start with <code className="bg-white/10 px-1 rounded text-cyan-300">pfhq_c_</code> to distinguish them from Property Manager keys.
              Create keys in your dashboard under <strong>Settings → API & Webhooks</strong>.
            </p>
            <CodeBlock code={`Authorization: Bearer pfhq_c_your_contractor_api_key`} />

            <h3 className="text-lg font-semibold mt-6 mb-4 text-white">Available Scopes</h3>
            <div className="overflow-x-auto bg-white/10 border border-white/20 rounded-lg">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-white/20">
                  <th className="text-left py-3 px-4 text-white">Scope</th>
                  <th className="text-left py-3 px-4 text-white">Description</th>
                </tr></thead>
                <tbody>
                  {[
                    ['*', 'Full access — all read and write permissions'],
                    ['jobs:read', 'List and view jobs'],
                    ['jobs:write', 'Create and update jobs'],
                    ['invoices:read', 'List and view invoices'],
                    ['invoices:write', 'Create and update invoices'],
                    ['customers:read', 'List and view customers'],
                    ['customers:write', 'Create and update customers'],
                  ].map(([scope, desc]) => (
                    <tr key={scope} className="border-b border-white/10">
                      <td className="py-3 px-4"><code className="bg-white/10 px-1 rounded text-cyan-300">{scope}</code></td>
                      <td className="py-3 px-4 text-white/70">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-white">Base URL</h2>
            <CodeBlock code={BASE} />
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-white">Endpoints</h2>

            <h3 className="text-xl font-semibold mt-6 mb-3 text-white">Jobs</h3>
            <div className="space-y-2">
              <EndpointCard method="GET" path="/api/v1/contractor/jobs" description="List all jobs" scopes={['jobs:read']}>
                <p>Query params: <code>status</code>, <code>page</code>, <code>limit</code> (max 100)</p>
              </EndpointCard>
            </div>

            <h3 className="text-xl font-semibold mt-6 mb-3 text-white">Invoices</h3>
            <div className="space-y-2">
              <EndpointCard method="GET" path="/api/v1/contractor/invoices" description="List all invoices" scopes={['invoices:read']}>
                <p>Query params: <code>status</code> (draft, sent, paid, overdue), <code>page</code>, <code>limit</code></p>
              </EndpointCard>
            </div>

            <h3 className="text-xl font-semibold mt-6 mb-3 text-white">Customers</h3>
            <div className="space-y-2">
              <EndpointCard method="GET" path="/api/v1/contractor/customers" description="List all customers" scopes={['customers:read']}>
                <p>Query params: <code>page</code>, <code>limit</code></p>
              </EndpointCard>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-white">Code Examples</h2>
            <Tabs defaultValue="curl">
              <TabsList className="bg-white/10 border-white/20">
                <TabsTrigger value="curl" className="data-[state=active]:bg-white/20 text-white">cURL</TabsTrigger>
                <TabsTrigger value="js" className="data-[state=active]:bg-white/20 text-white">JavaScript</TabsTrigger>
                <TabsTrigger value="python" className="data-[state=active]:bg-white/20 text-white">Python</TabsTrigger>
              </TabsList>
              <TabsContent value="curl" className="mt-4">
                <CodeBlock code={`# List your jobs
curl "${BASE}/jobs" \\
  -H "Authorization: Bearer pfhq_c_your_key"

# List paid invoices
curl "${BASE}/invoices?status=paid" \\
  -H "Authorization: Bearer pfhq_c_your_key"`} />
              </TabsContent>
              <TabsContent value="js" className="mt-4">
                <CodeBlock code={`const API_KEY = 'pfhq_c_your_key';
const BASE = '${BASE}';

async function getJobs(status) {
  const url = status ? \`\${BASE}/jobs?status=\${status}\` : \`\${BASE}/jobs\`;
  const res = await fetch(url, {
    headers: { 'Authorization': \`Bearer \${API_KEY}\` },
  });
  return res.json();
}

// Get all completed jobs
const jobs = await getJobs('completed');
console.log(jobs.data);`} />
              </TabsContent>
              <TabsContent value="python" className="mt-4">
                <CodeBlock code={`import requests

API_KEY = 'pfhq_c_your_key'
BASE = '${BASE}'
headers = {'Authorization': f'Bearer {API_KEY}'}

def get_jobs(status=None):
    params = {'status': status} if status else {}
    return requests.get(f'{BASE}/jobs', headers=headers, params=params).json()

jobs = get_jobs('completed')
print(jobs['data'])`} />
              </TabsContent>
            </Tabs>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-white">Rate Limiting</h2>
            <p className="text-white/70 mb-4">1,000 requests per hour per API key. Headers included in every response:</p>
            <CodeBlock code={`X-RateLimit-Limit: 1000\nX-RateLimit-Remaining: 998\nX-RateLimit-Reset: 1704067200`} />
          </section>
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-8">
          <section>
            <h2 className="text-2xl font-bold mb-4 text-white">Setting Up Webhooks</h2>
            <ol className="space-y-3">
              {['Go to Settings → API & Webhooks in your contractor dashboard', 'Add your HTTPS endpoint URL', 'Select which events to receive', 'Copy and securely store the signing secret — it\'s shown once'].map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="bg-violet-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium shrink-0">{i + 1}</span>
                  <p className="text-white/80">{step}</p>
                </li>
              ))}
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-white">Payload Format</h2>
            <CodeBlock code={`{
  "id": "evt_abc123",
  "type": "job.completed",
  "created": 1704067200,
  "data": {
    "jobId": "job_xyz789",
    "title": "Kitchen Renovation",
    "completedAt": "2025-01-01T12:00:00Z"
  }
}`} />
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-white">Signature Verification</h2>
            <p className="text-white/70 mb-4">Always verify the <code className="bg-white/10 px-1 rounded text-cyan-300">X-PFHQ-Signature</code> header:</p>
            <Tabs defaultValue="node">
              <TabsList className="bg-white/10 border-white/20">
                <TabsTrigger value="node" className="data-[state=active]:bg-white/20 text-white">Node.js</TabsTrigger>
                <TabsTrigger value="python" className="data-[state=active]:bg-white/20 text-white">Python</TabsTrigger>
              </TabsList>
              <TabsContent value="node" className="mt-4">
                <CodeBlock code={`const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const [t, sig] = signature.split(',').map(p => p.split('=')[1]);
  const expected = crypto.createHmac('sha256', secret)
    .update(\`\${t}.\${payload}\`).digest('hex');
  return sig === expected;
}`} />
              </TabsContent>
              <TabsContent value="python" className="mt-4">
                <CodeBlock code={`import hmac, hashlib

def verify_webhook(payload, signature, secret):
    parts = dict(p.split('=') for p in signature.split(','))
    expected = hmac.new(secret.encode(),
        f"{parts['t']}.{payload}".encode(), hashlib.sha256).hexdigest()
    return parts['v1'] == expected`} />
              </TabsContent>
            </Tabs>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-white">Available Events</h2>
            <div className="overflow-x-auto bg-white/10 border border-white/20 rounded-lg">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-white/20">
                  <th className="text-left py-3 px-4 text-white">Event</th>
                  <th className="text-left py-3 px-4 text-white">Description</th>
                </tr></thead>
                <tbody>
                  {webhookEvents.map(({ event, description }) => (
                    <tr key={event} className="border-b border-white/10">
                      <td className="py-3 px-4"><code className="bg-white/10 px-1 rounded text-xs text-cyan-300">{event}</code></td>
                      <td className="py-3 px-4 text-white/70">{description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <Card className="bg-white/10 border-white/20">
            <CardHeader><CardTitle className="text-white">Best Practices</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-white/80">
                <li>✓ Always verify webhook signatures before processing</li>
                <li>✓ Respond with HTTP 200 immediately, process async</li>
                <li>✓ Use the event <code className="bg-white/10 px-1 rounded">id</code> to deduplicate deliveries</li>
                <li>✓ Failed deliveries are retried up to 5 times with exponential backoff</li>
                <li>✓ Log all webhook payloads for debugging</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-12 text-center">
        <Link href="/contractor/settings/api">
          <Button className="bg-violet-600 hover:bg-violet-700 text-white">
            Manage API Keys & Webhooks →
          </Button>
        </Link>
      </div>
    </div>
  );
}
