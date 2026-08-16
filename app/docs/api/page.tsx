'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button variant="ghost" size="sm" onClick={copy} className="h-8 w-8 p-0 text-white/60 hover:text-white hover:bg-white/10">
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </Button>
  );
}

function CodeBlock({ code }: { code: string }) {
  return (
    <div className="relative">
      <pre className="bg-black/40 backdrop-blur-sm text-white/90 p-4 rounded-lg overflow-x-auto text-sm border border-white/10">
        <code>{code}</code>
      </pre>
      <div className="absolute top-2 right-2">
        <CopyButton text={code} />
      </div>
    </div>
  );
}

function EndpointCard({
  method,
  path,
  description,
  scopes,
  children,
}: {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  description: string;
  scopes: string[];
  children?: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const methodColors = {
    GET: 'bg-blue-500',
    POST: 'bg-green-500',
    PATCH: 'bg-yellow-500',
    DELETE: 'bg-red-500',
  };

  return (
    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 hover:bg-white/5 transition-colors text-left"
      >
        <Badge className={cn('font-mono', methodColors[method])}>{method}</Badge>
        <code className="text-sm font-medium text-white">{path}</code>
        <span className="text-sm text-white/60 ml-auto mr-2">{description}</span>
        {expanded ? <ChevronDown className="h-4 w-4 text-white/60" /> : <ChevronRight className="h-4 w-4 text-white/60" />}
      </button>
      {expanded && (
        <div className="border-t border-white/10 p-4 bg-white/5">
          <div className="mb-4">
            <p className="text-sm font-medium mb-2 text-white">Required Scopes:</p>
            <div className="flex gap-2">
              {scopes.map(scope => (
                <Badge key={scope} variant="outline" className="border-white/30 text-white/80">{scope}</Badge>
              ))}
            </div>
          </div>
          <div className="text-white/70">{children}</div>
        </div>
      )}
    </div>
  );
}

const webhookEvents = [
  { event: 'payment.completed', description: 'Rent payment completed successfully' },
  { event: 'payment.failed', description: 'Rent payment failed' },
  { event: 'payment.refunded', description: 'Payment was refunded' },
  { event: 'lease.created', description: 'New lease created' },
  { event: 'lease.signed', description: 'Lease signed by tenant' },
  { event: 'lease.renewed', description: 'Lease was renewed' },
  { event: 'lease.terminated', description: 'Lease was terminated' },
  { event: 'tenant.created', description: 'New tenant added' },
  { event: 'tenant.moved_out', description: 'Tenant moved out' },
  { event: 'maintenance.created', description: 'New maintenance ticket created' },
  { event: 'maintenance.resolved', description: 'Ticket was resolved' },
  { event: 'work_order.created', description: 'New work order created' },
  { event: 'work_order.completed', description: 'Work order completed' },
  { event: 'property.created', description: 'New property added' },
  { event: 'unit.available', description: 'Unit became available' },
];

export default function ApiWebhooksPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <h1 className="text-4xl font-bold mb-4 text-white">API & Webhooks</h1>
      <p className="text-xl text-white/70 mb-8">
        Complete documentation for integrating with PropertyFlow HQ.
      </p>

      {/* Main Tabs */}
      <Tabs defaultValue="api" className="w-full">
        <TabsList className="bg-white/10 border-white/20 mb-8">
          <TabsTrigger value="api" className="data-[state=active]:bg-white/20 text-white px-6">
            API Reference
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="data-[state=active]:bg-white/20 text-white px-6">
            Webhooks
          </TabsTrigger>
        </TabsList>

        {/* API Tab */}
        <TabsContent value="api" className="space-y-8">
          {/* Authentication */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-white">Authentication</h2>
            <p className="text-white/70 mb-4">
              All API requests require authentication using an API key. Include your key in the Authorization header:
            </p>
            <CodeBlock code={`Authorization: Bearer pk_live_your_api_key_here`} />
            
            <h3 className="text-lg font-semibold mt-6 mb-4 text-white">API Key Scopes</h3>
            <div className="overflow-x-auto bg-white/10 backdrop-blur-md border border-white/20 rounded-lg">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="text-left py-3 px-4 text-white">Scope</th>
                    <th className="text-left py-3 px-4 text-white">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['properties:read', 'Read property information'],
                    ['properties:write', 'Create and update properties'],
                    ['units:read', 'Read unit information'],
                    ['units:write', 'Create and update units'],
                    ['tenants:read', 'Read tenant information'],
                    ['leases:read', 'Read lease information'],
                    ['leases:write', 'Create and manage leases'],
                    ['payments:read', 'Read payment history'],
                    ['maintenance:read', 'Read maintenance tickets'],
                    ['maintenance:write', 'Create and update tickets'],
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

          {/* Rate Limiting */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-white">Rate Limiting</h2>
            <p className="text-white/70 mb-4">
              API requests are rate limited to 1,000 requests per hour. Rate limit headers are included in every response:
            </p>
            <CodeBlock code={`X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1704067200`} />
          </section>

          {/* Endpoints */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-white">Endpoints</h2>

            <h3 className="text-xl font-semibold mt-6 mb-4 text-white">Properties</h3>
            <div className="space-y-2">
              <EndpointCard method="GET" path="/api/v1/properties" description="List all properties" scopes={['properties:read']}>
                <p className="text-sm">Query: <code>status</code>, <code>type</code>, <code>page</code>, <code>limit</code></p>
              </EndpointCard>
              <EndpointCard method="POST" path="/api/v1/properties" description="Create a property" scopes={['properties:write']}>
                <p className="text-sm">Required: <code>name</code>, <code>address</code>, <code>type</code></p>
              </EndpointCard>
              <EndpointCard method="GET" path="/api/v1/properties/:id" description="Get property details" scopes={['properties:read']} />
              <EndpointCard method="PATCH" path="/api/v1/properties/:id" description="Update a property" scopes={['properties:write']} />
              <EndpointCard method="DELETE" path="/api/v1/properties/:id" description="Delete a property" scopes={['properties:write']} />
            </div>

            <h3 className="text-xl font-semibold mt-6 mb-4 text-white">Units</h3>
            <div className="space-y-2">
              <EndpointCard method="GET" path="/api/v1/units" description="List all units" scopes={['units:read']}>
                <p className="text-sm">Query: <code>propertyId</code>, <code>isAvailable</code>, <code>type</code></p>
              </EndpointCard>
              <EndpointCard method="POST" path="/api/v1/units" description="Create a unit" scopes={['units:write']}>
                <p className="text-sm">Required: <code>propertyId</code>, <code>name</code>, <code>type</code>, <code>rentAmount</code></p>
              </EndpointCard>
            </div>

            <h3 className="text-xl font-semibold mt-6 mb-4 text-white">Leases</h3>
            <div className="space-y-2">
              <EndpointCard method="GET" path="/api/v1/leases" description="List all leases" scopes={['leases:read']}>
                <p className="text-sm">Query: <code>propertyId</code>, <code>unitId</code>, <code>status</code></p>
              </EndpointCard>
              <EndpointCard method="POST" path="/api/v1/leases" description="Create a lease" scopes={['leases:write']}>
                <p className="text-sm">Required: <code>unitId</code>, <code>tenantId</code>, <code>startDate</code>, <code>rentAmount</code></p>
              </EndpointCard>
            </div>

            <h3 className="text-xl font-semibold mt-6 mb-4 text-white">Payments</h3>
            <div className="space-y-2">
              <EndpointCard method="GET" path="/api/v1/payments" description="List payment history" scopes={['payments:read']}>
                <p className="text-sm">Query: <code>leaseId</code>, <code>tenantId</code>, <code>status</code>, <code>startDate</code>, <code>endDate</code></p>
              </EndpointCard>
            </div>

            <h3 className="text-xl font-semibold mt-6 mb-4 text-white">Maintenance</h3>
            <div className="space-y-2">
              <EndpointCard method="GET" path="/api/v1/maintenance" description="List maintenance tickets" scopes={['maintenance:read']}>
                <p className="text-sm">Query: <code>unitId</code>, <code>status</code>, <code>priority</code></p>
              </EndpointCard>
              <EndpointCard method="POST" path="/api/v1/maintenance" description="Create a ticket" scopes={['maintenance:write']}>
                <p className="text-sm">Required: <code>title</code>, <code>description</code></p>
              </EndpointCard>
            </div>
          </section>

          {/* Code Examples */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-white">Code Examples</h2>
            <Tabs defaultValue="curl" className="w-full">
              <TabsList className="bg-white/10 border-white/20">
                <TabsTrigger value="curl" className="data-[state=active]:bg-white/20 text-white">cURL</TabsTrigger>
                <TabsTrigger value="javascript" className="data-[state=active]:bg-white/20 text-white">JavaScript</TabsTrigger>
                <TabsTrigger value="python" className="data-[state=active]:bg-white/20 text-white">Python</TabsTrigger>
              </TabsList>

              <TabsContent value="curl" className="mt-4">
                <CodeBlock code={`# List properties
curl -X GET "https://your-domain.com/api/v1/properties" \\
  -H "Authorization: Bearer pk_live_your_api_key"

# Create a maintenance ticket
curl -X POST "https://your-domain.com/api/v1/maintenance" \\
  -H "Authorization: Bearer pk_live_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"title": "Broken AC", "description": "Not working"}'`} />
              </TabsContent>

              <TabsContent value="javascript" className="mt-4">
                <CodeBlock code={`const API_KEY = 'pk_live_your_api_key';

async function listProperties() {
  const res = await fetch('https://your-domain.com/api/v1/properties', {
    headers: { 'Authorization': \`Bearer \${API_KEY}\` },
  });
  return res.json();
}`} />
              </TabsContent>

              <TabsContent value="python" className="mt-4">
                <CodeBlock code={`import requests

API_KEY = 'pk_live_your_api_key'
headers = {'Authorization': f'Bearer {API_KEY}'}

def list_properties():
    res = requests.get('https://your-domain.com/api/v1/properties', headers=headers)
    return res.json()`} />
              </TabsContent>
            </Tabs>
          </section>
        </TabsContent>

        {/* Webhooks Tab */}
        <TabsContent value="webhooks" className="space-y-8">
          {/* Setup */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-white">Setting Up Webhooks</h2>
            <ol className="space-y-4">
              {[
                { step: 'Navigate to Admin → Settings → Webhooks' },
                { step: 'Add your HTTPS endpoint URL' },
                { step: 'Select which events to receive' },
                { step: 'Copy and securely store the webhook secret' },
              ].map((item, i) => (
                <li key={i} className="flex gap-3">
                  <span className="bg-cyan-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium shrink-0">{i + 1}</span>
                  <p className="text-white/80">{item.step}</p>
                </li>
              ))}
            </ol>
          </section>

          {/* Payload */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-white">Webhook Payload</h2>
            <p className="text-white/70 mb-4">All webhooks are sent as POST requests with JSON:</p>
            <CodeBlock code={`{
  "id": "evt_abc123def456",
  "type": "payment.completed",
  "created": 1704067200,
  "data": {
    "paymentId": "pay_xyz789",
    "amount": 1500.00,
    "tenantId": "usr_tenant123"
  }
}`} />
          </section>

          {/* Signature Verification */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-white">Signature Verification</h2>
            <p className="text-white/70 mb-4">Always verify webhook signatures. The signature header format:</p>
            <CodeBlock code={`t=1704067200,v1=5257a869e7ecebeda32affa62cdca3fa51cad7e77a0e56ff536d0ce8e108d8bd`} />
            
            <div className="mt-4">
              <Tabs defaultValue="node" className="w-full">
                <TabsList className="bg-white/10 border-white/20">
                  <TabsTrigger value="node" className="data-[state=active]:bg-white/20 text-white">Node.js</TabsTrigger>
                  <TabsTrigger value="python" className="data-[state=active]:bg-white/20 text-white">Python</TabsTrigger>
                </TabsList>

                <TabsContent value="node" className="mt-4">
                  <CodeBlock code={`const crypto = require('crypto');

function verifySignature(payload, signature, secret) {
  const [t, sig] = signature.split(',').map(p => p.split('=')[1]);
  const expected = crypto.createHmac('sha256', secret)
    .update(\`\${t}.\${payload}\`).digest('hex');
  return sig === expected;
}`} />
                </TabsContent>

                <TabsContent value="python" className="mt-4">
                  <CodeBlock code={`import hmac, hashlib

def verify_signature(payload, signature, secret):
    parts = dict(p.split('=') for p in signature.split(','))
    expected = hmac.new(secret.encode(), 
        f"{parts['t']}.{payload}".encode(), hashlib.sha256).hexdigest()
    return parts['v1'] == expected`} />
                </TabsContent>
              </Tabs>
            </div>
          </section>

          {/* Events */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-white">Available Events</h2>
            <div className="overflow-x-auto bg-white/10 backdrop-blur-md border border-white/20 rounded-lg">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="text-left py-3 px-4 text-white">Event</th>
                    <th className="text-left py-3 px-4 text-white">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {webhookEvents.map(({ event, description }) => (
                    <tr key={event} className="border-b border-white/10">
                      <td className="py-3 px-4">
                        <code className="bg-white/10 px-1 rounded text-xs text-cyan-300">{event}</code>
                      </td>
                      <td className="py-3 px-4 text-white/70">{description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Retry Policy */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-white">Retry Policy</h2>
            <p className="text-white/70 mb-4">Failed webhooks are retried with exponential backoff:</p>
            <ul className="space-y-2 text-sm">
              {[
                { attempt: 2, delay: '1 minute' },
                { attempt: 3, delay: '5 minutes' },
                { attempt: 4, delay: '30 minutes' },
                { attempt: 5, delay: '2 hours' },
              ].map(({ attempt, delay }) => (
                <li key={attempt} className="flex items-center gap-2">
                  <Badge variant="outline" className="border-white/30 text-white/80">Attempt {attempt}</Badge>
                  <span className="text-white/70">{delay} after failure</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Best Practices */}
          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardHeader>
              <CardTitle className="text-white">Best Practices</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-white/80">
                <li>✓ Always verify webhook signatures</li>
                <li>✓ Respond with 200 quickly, process async if needed</li>
                <li>✓ Handle duplicate deliveries (use event ID)</li>
                <li>✓ Log webhook payloads for debugging</li>
                <li>✓ Set up monitoring for webhook failures</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
