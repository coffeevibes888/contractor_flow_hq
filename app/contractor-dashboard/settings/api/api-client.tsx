'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Key, Webhook, Copy, Check, Trash2, Plus, Lock,
  AlertCircle, CheckCircle, ExternalLink, Code,
} from 'lucide-react';
import Link from 'next/link';

const CONTRACTOR_SCOPES = [
  { value: '*', label: 'Full Access', description: 'All read and write permissions' },
  { value: 'jobs:read', label: 'Jobs Read', description: 'List and view jobs' },
  { value: 'jobs:write', label: 'Jobs Write', description: 'Create and update jobs' },
  { value: 'invoices:read', label: 'Invoices Read', description: 'List and view invoices' },
  { value: 'invoices:write', label: 'Invoices Write', description: 'Create and update invoices' },
  { value: 'customers:read', label: 'Customers Read', description: 'List and view customers' },
  { value: 'customers:write', label: 'Customers Write', description: 'Create and update customers' },
];

const WEBHOOK_EVENTS = [
  'job.created', 'job.updated', 'job.completed', 'job.cancelled',
  'invoice.created', 'invoice.paid', 'invoice.overdue',
  'customer.created', 'booking.confirmed', 'booking.cancelled',
  'payment.received', 'review.received',
];

interface ApiKey {
  id: string; name: string; keyPrefix: string; scopes: string[];
  lastUsedAt: string | null; expiresAt: string | null; createdAt: string;
}

interface WebhookEndpoint {
  id: string; url: string; description: string | null; events: string[];
  isActive: boolean; failureCount: number; lastSuccessAt: string | null; createdAt: string;
}

interface Props {
  isEnterprise: boolean;
  apiKeys: ApiKey[];
  webhooks: WebhookEndpoint[];
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="p-1 rounded hover:bg-slate-100 transition-colors"
    >
      {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4 text-slate-400" />}
    </button>
  );
}

export default function ContractorApiClient({ isEnterprise, apiKeys: initialKeys, webhooks: initialWebhooks }: Props) {
  const [apiKeys, setApiKeys] = useState(initialKeys);
  const [webhooks, setWebhooks] = useState(initialWebhooks);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyScopes, setNewKeyScopes] = useState(['*']);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [newWebhookDesc, setNewWebhookDesc] = useState('');
  const [newWebhookEvents, setNewWebhookEvents] = useState<string[]>([]);
  const [createdWebhookSecret, setCreatedWebhookSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isEnterprise) {
    return (
      <main className="w-full px-4 py-8 md:px-0 max-w-3xl mx-auto">
        <Card className="border-2 border-amber-300 bg-amber-50">
          <CardContent className="p-8 text-center">
            <Lock className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Enterprise Feature</h1>
            <p className="text-slate-600 mb-2">
              API access and webhooks are available on the <strong>Enterprise plan ($199/month)</strong>.
            </p>
            <p className="text-slate-500 text-sm mb-6">
              With the Enterprise plan you get full API access to automate your business — sync jobs to your own systems,
              trigger workflows when invoices are paid, connect to Zapier, and more.
            </p>
            <Link href="/contractor-dashboard/settings/subscription">
              <Button className="bg-amber-600 hover:bg-amber-700 text-white">
                Upgrade to Enterprise
              </Button>
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  const createApiKey = async () => {
    if (!newKeyName.trim()) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/contractor/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName, scopes: newKeyScopes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCreatedKey(data.key);
      setNewKeyName('');
      // Refresh list
      const listRes = await fetch('/api/contractor/api-keys');
      const listData = await listRes.json();
      if (listData.success) setApiKeys(listData.keys);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const revokeKey = async (id: string) => {
    if (!confirm('Revoke this API key? Any integrations using it will stop working.')) return;
    await fetch(`/api/contractor/api-keys/${id}`, { method: 'DELETE' });
    setApiKeys(prev => prev.filter(k => k.id !== id));
  };

  const createWebhook = async () => {
    if (!newWebhookUrl.startsWith('https://')) { setError('URL must start with https://'); return; }
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/contractor/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: newWebhookUrl, description: newWebhookDesc, events: newWebhookEvents }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCreatedWebhookSecret(data.secret);
      setNewWebhookUrl(''); setNewWebhookDesc(''); setNewWebhookEvents([]);
      const listRes = await fetch('/api/contractor/webhooks');
      const listData = await listRes.json();
      if (listData.success) setWebhooks(listData.endpoints);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteWebhook = async (id: string) => {
    if (!confirm('Delete this webhook endpoint?')) return;
    await fetch(`/api/contractor/webhooks/${id}`, { method: 'DELETE' });
    setWebhooks(prev => prev.filter(w => w.id !== id));
  };

  return (
    <main className="w-full px-4 py-8 md:px-0 space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-1">API & Webhooks</h1>
        <p className="text-slate-500">
          Automate your business. Connect PropertyFlowHQ to your own systems.{' '}
          <Link href="/docs/api/contractor" className="text-blue-600 hover:underline inline-flex items-center gap-1">
            View full docs <ExternalLink className="h-3 w-3" />
          </Link>
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-300 p-3 flex items-center gap-2 text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {/* Created key banner */}
      {createdKey && (
        <div className="rounded-xl bg-emerald-50 border-2 border-emerald-400 p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-5 w-5 text-emerald-600" />
            <p className="font-semibold text-emerald-800">API key created — copy it now, it won't be shown again</p>
          </div>
          <div className="flex items-center gap-2 bg-white rounded-lg border border-emerald-300 px-3 py-2 font-mono text-sm">
            <span className="flex-1 truncate">{createdKey}</span>
            <CopyButton text={createdKey} />
          </div>
          <Button variant="ghost" size="sm" className="mt-2 text-emerald-700" onClick={() => setCreatedKey(null)}>
            I've saved it, dismiss
          </Button>
        </div>
      )}

      {/* Created webhook secret banner */}
      {createdWebhookSecret && (
        <div className="rounded-xl bg-emerald-50 border-2 border-emerald-400 p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-5 w-5 text-emerald-600" />
            <p className="font-semibold text-emerald-800">Webhook created — save the signing secret now</p>
          </div>
          <div className="flex items-center gap-2 bg-white rounded-lg border border-emerald-300 px-3 py-2 font-mono text-sm">
            <span className="flex-1 truncate">{createdWebhookSecret}</span>
            <CopyButton text={createdWebhookSecret} />
          </div>
          <Button variant="ghost" size="sm" className="mt-2 text-emerald-700" onClick={() => setCreatedWebhookSecret(null)}>
            I've saved it, dismiss
          </Button>
        </div>
      )}

      {/* API Keys */}
      <Card className="border-2 border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-blue-500" />
            API Keys
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-500">
            Keys start with <code className="bg-slate-100 px-1 rounded">pfhq_c_</code>.
            Include them in the <code className="bg-slate-100 px-1 rounded">Authorization: Bearer</code> header.
          </p>

          {/* Existing keys */}
          {apiKeys.length > 0 && (
            <div className="space-y-2">
              {apiKeys.map(key => (
                <div key={key.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 text-sm">{key.name}</p>
                    <p className="text-xs text-slate-500 font-mono">{key.keyPrefix}••••••••</p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {key.scopes.map(s => (
                      <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400 hidden sm:block">
                    {key.lastUsedAt ? `Used ${new Date(key.lastUsedAt).toLocaleDateString()}` : 'Never used'}
                  </p>
                  <button onClick={() => revokeKey(key.id)} className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Create new key */}
          <div className="border-t pt-4 space-y-3">
            <p className="text-sm font-medium text-slate-700">Create new key</p>
            <div className="flex gap-2">
              <Input
                placeholder="Key name (e.g. Zapier Integration)"
                value={newKeyName}
                onChange={e => setNewKeyName(e.target.value)}
                className="flex-1"
              />
              <Button onClick={createApiKey} disabled={loading || !newKeyName.trim()} className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="h-4 w-4 mr-1" /> Create
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {CONTRACTOR_SCOPES.map(scope => (
                <label key={scope.value} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newKeyScopes.includes(scope.value)}
                    onChange={e => {
                      if (e.target.checked) setNewKeyScopes(prev => [...prev, scope.value]);
                      else setNewKeyScopes(prev => prev.filter(s => s !== scope.value));
                    }}
                    className="rounded"
                  />
                  <span className="text-xs text-slate-600">{scope.label}</span>
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Webhooks */}
      <Card className="border-2 border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5 text-violet-500" />
            Webhook Endpoints
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-500">
            Receive real-time POST requests to your HTTPS endpoint when events happen in your account.
          </p>

          {webhooks.length > 0 && (
            <div className="space-y-2">
              {webhooks.map(wh => (
                <div key={wh.id} className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-sm text-slate-900 truncate">{wh.url}</p>
                      {wh.description && <p className="text-xs text-slate-500 mt-0.5">{wh.description}</p>}
                      <div className="flex flex-wrap gap-1 mt-1">
                        {wh.events.slice(0, 4).map(e => (
                          <Badge key={e} variant="outline" className="text-xs">{e}</Badge>
                        ))}
                        {wh.events.length > 4 && <Badge variant="outline" className="text-xs">+{wh.events.length - 4} more</Badge>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {wh.failureCount > 0 && (
                        <Badge className="bg-red-100 text-red-700 text-xs">{wh.failureCount} failures</Badge>
                      )}
                      <button onClick={() => deleteWebhook(wh.id)} className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="border-t pt-4 space-y-3">
            <p className="text-sm font-medium text-slate-700">Add endpoint</p>
            <Input
              placeholder="https://your-server.com/webhooks/pfhq"
              value={newWebhookUrl}
              onChange={e => setNewWebhookUrl(e.target.value)}
            />
            <Input
              placeholder="Description (optional)"
              value={newWebhookDesc}
              onChange={e => setNewWebhookDesc(e.target.value)}
            />
            <div>
              <p className="text-xs text-slate-500 mb-2">Select events to receive:</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {WEBHOOK_EVENTS.map(event => (
                  <label key={event} className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newWebhookEvents.includes(event)}
                      onChange={e => {
                        if (e.target.checked) setNewWebhookEvents(prev => [...prev, event]);
                        else setNewWebhookEvents(prev => prev.filter(ev => ev !== event));
                      }}
                      className="rounded"
                    />
                    <span className="text-xs text-slate-600 font-mono">{event}</span>
                  </label>
                ))}
              </div>
            </div>
            <Button onClick={createWebhook} disabled={loading || !newWebhookUrl} className="bg-violet-600 hover:bg-violet-700 text-white">
              <Plus className="h-4 w-4 mr-1" /> Add Endpoint
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick reference */}
      <Card className="border-2 border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Code className="h-4 w-4 text-slate-500" />
            Quick Reference
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">Base URL</p>
            <div className="flex items-center gap-2 bg-slate-900 text-emerald-400 rounded-lg px-3 py-2 font-mono text-sm">
              <span className="flex-1">https://www.propertyflowhq.com/api/v1/contractor</span>
              <CopyButton text="https://www.propertyflowhq.com/api/v1/contractor" />
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">Example request</p>
            <div className="bg-slate-900 text-slate-300 rounded-lg px-3 py-2 font-mono text-xs">
              <span className="text-blue-400">curl</span> https://www.propertyflowhq.com/api/v1/contractor/jobs \<br />
              {'  '}<span className="text-yellow-400">-H</span> <span className="text-emerald-400">"Authorization: Bearer pfhq_c_your_key"</span>
            </div>
          </div>
          <Link href="/docs/api/contractor">
            <Button variant="outline" size="sm" className="gap-2">
              <ExternalLink className="h-4 w-4" />
              Full API Documentation
            </Button>
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
