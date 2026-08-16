'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Key, Webhook, Copy, Eye, EyeOff, Trash2, Plus,
  CheckCircle, XCircle, Clock, AlertCircle, Code
} from 'lucide-react';
import { toast } from 'sonner';

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  createdAt: string;
  isActive: boolean;
}

interface WebhookEndpoint {
  id: string;
  url: string;
  description: string | null;
  events: string[];
  isActive: boolean;
  failureCount: number;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  createdAt: string;
}

export function DeveloperSettings() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([]);
  const [showCreateKey, setShowCreateKey] = useState(false);
  const [showCreateWebhook, setShowCreateWebhook] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeySecret, setNewKeySecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [keysRes, webhooksRes] = await Promise.all([
        fetch('/api/admin/developer/api-keys'),
        fetch('/api/admin/developer/webhooks'),
      ]);

      const keysData = await keysRes.json();
      const webhooksData = await webhooksRes.json();

      if (keysData.success) setApiKeys(keysData.apiKeys);
      if (webhooksData.success) setWebhooks(webhooksData.webhooks);
    } catch (error) {
      toast.error('Failed to load developer settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateApiKey = async () => {
    if (!newKeyName.trim()) {
      toast.error('Please enter a key name');
      return;
    }

    try {
      const res = await fetch('/api/admin/developer/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName }),
      });

      const data = await res.json();

      if (data.success) {
        setNewKeySecret(data.apiKey);
        setApiKeys([data.keyData, ...apiKeys]);
        setNewKeyName('');
        toast.success('API key created successfully');
      } else {
        toast.error(data.message || 'Failed to create API key');
      }
    } catch {
      toast.error('Failed to create API key');
    }
  };

  const handleDeleteApiKey = async (keyId: string) => {
    if (!confirm('Are you sure? This will immediately revoke access for this API key.')) return;

    try {
      const res = await fetch(`/api/admin/developer/api-keys/${keyId}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (data.success) {
        setApiKeys(apiKeys.filter(k => k.id !== keyId));
        toast.success('API key deleted');
      } else {
        toast.error(data.message || 'Failed to delete API key');
      }
    } catch {
      toast.error('Failed to delete API key');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Developer Settings</h1>
        <p className="text-slate-400">
          Manage API keys and webhooks for integrating with external systems
        </p>
      </div>

      <Tabs defaultValue="api-keys" className="w-full">
        <TabsList className="bg-slate-900/60 border border-white/10">
          <TabsTrigger value="api-keys" className="data-[state=active]:bg-violet-600">
            <Key className="h-4 w-4 mr-2" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="data-[state=active]:bg-violet-600">
            <Webhook className="h-4 w-4 mr-2" />
            Webhooks
          </TabsTrigger>
          <TabsTrigger value="docs" className="data-[state=active]:bg-violet-600">
            <Code className="h-4 w-4 mr-2" />
            Documentation
          </TabsTrigger>
        </TabsList>

        {/* API Keys Tab */}
        <TabsContent value="api-keys" className="space-y-4">
          <Card className="border-white/10 bg-slate-900/60">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">API Keys</CardTitle>
                  <CardDescription className="text-slate-400">
                    Create and manage API keys for programmatic access
                  </CardDescription>
                </div>
                <Button
                  onClick={() => setShowCreateKey(true)}
                  className="bg-violet-600 hover:bg-violet-500"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create API Key
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-slate-400">Loading...</div>
              ) : apiKeys.length === 0 ? (
                <div className="text-center py-8">
                  <Key className="h-12 w-12 text-slate-500 mx-auto mb-3" />
                  <p className="text-slate-400">No API keys yet</p>
                  <p className="text-sm text-slate-500 mt-1">Create your first API key to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {apiKeys.map((key) => (
                    <div
                      key={key.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-slate-800/60 border border-white/10"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-white font-medium">{key.name}</h3>
                          <Badge variant={key.isActive ? 'default' : 'secondary'} className="text-xs">
                            {key.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-400 font-mono">{key.keyPrefix}••••••••••••••••</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                          <span>Created {new Date(key.createdAt).toLocaleDateString()}</span>
                          {key.lastUsedAt && (
                            <span>Last used {new Date(key.lastUsedAt).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteApiKey(key.id)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Webhooks Tab */}
        <TabsContent value="webhooks" className="space-y-4">
          <Card className="border-white/10 bg-slate-900/60">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">Webhook Endpoints</CardTitle>
                  <CardDescription className="text-slate-400">
                    Receive real-time notifications for events
                  </CardDescription>
                </div>
                <Button
                  onClick={() => setShowCreateWebhook(true)}
                  className="bg-violet-600 hover:bg-violet-500"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Endpoint
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {webhooks.length === 0 ? (
                <div className="text-center py-8">
                  <Webhook className="h-12 w-12 text-slate-500 mx-auto mb-3" />
                  <p className="text-slate-400">No webhook endpoints configured</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {webhooks.map((webhook) => (
                    <div
                      key={webhook.id}
                      className="p-4 rounded-lg bg-slate-800/60 border border-white/10"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-white font-medium font-mono text-sm">{webhook.url}</h3>
                            <Badge variant={webhook.isActive ? 'default' : 'secondary'} className="text-xs">
                              {webhook.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          {webhook.description && (
                            <p className="text-sm text-slate-400 mb-2">{webhook.description}</p>
                          )}
                          <div className="flex flex-wrap gap-2">
                            {webhook.events.map((event) => (
                              <Badge key={event} variant="outline" className="text-xs">
                                {event}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                        {webhook.lastSuccessAt && (
                          <span className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3 text-green-400" />
                            Last success {new Date(webhook.lastSuccessAt).toLocaleString()}
                          </span>
                        )}
                        {webhook.failureCount > 0 && (
                          <span className="flex items-center gap-1 text-red-400">
                            <XCircle className="h-3 w-3" />
                            {webhook.failureCount} failures
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documentation Tab */}
        <TabsContent value="docs" className="space-y-4">
          <Card className="border-white/10 bg-slate-900/60">
            <CardHeader>
              <CardTitle className="text-white">API Documentation</CardTitle>
              <CardDescription className="text-slate-400">
                Learn how to integrate with Property Flow HQ API
              </CardDescription>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none">
              <h3 className="text-white">Authentication</h3>
              <p className="text-slate-300">
                Include your API key in the request header:
              </p>
              <pre className="bg-slate-800 p-4 rounded-lg text-sm">
                <code className="text-green-400">
                  {`curl https://api.propertyflowhq.com/v1/properties \\
  -H "Authorization: Bearer YOUR_API_KEY"`}
                </code>
              </pre>

              <h3 className="text-white mt-6">Available Endpoints</h3>
              <ul className="text-slate-300 space-y-2">
                <li><code className="text-violet-400">GET /v1/properties</code> - List all properties</li>
                <li><code className="text-violet-400">GET /v1/tenants</code> - List all tenants</li>
                <li><code className="text-violet-400">GET /v1/leases</code> - List all leases</li>
                <li><code className="text-violet-400">POST /v1/payments</code> - Record a payment</li>
              </ul>

              <h3 className="text-white mt-6">Webhook Events</h3>
              <ul className="text-slate-300 space-y-2">
                <li><code className="text-cyan-400">payment.completed</code> - Payment received</li>
                <li><code className="text-cyan-400">lease.created</code> - New lease signed</li>
                <li><code className="text-cyan-400">tenant.created</code> - New tenant added</li>
                <li><code className="text-cyan-400">maintenance.created</code> - Maintenance request submitted</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create API Key Dialog */}
      <Dialog open={showCreateKey} onOpenChange={setShowCreateKey}>
        <DialogContent className="bg-slate-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Create API Key</DialogTitle>
            <DialogDescription className="text-slate-400">
              {newKeySecret ? 'Save this key securely - you won\'t be able to see it again!' : 'Give your API key a descriptive name'}
            </DialogDescription>
          </DialogHeader>

          {newKeySecret ? (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-slate-800 border border-white/10">
                <Label className="text-slate-300 text-sm mb-2 block">Your API Key</Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-green-400 font-mono text-sm break-all">
                    {showSecret ? newKeySecret : '••••••••••••••••••••••••••••••••'}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSecret(!showSecret)}
                  >
                    {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(newKeySecret)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <p className="text-sm text-amber-400 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  Make sure to copy your API key now. You won't be able to see it again!
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Key Name</Label>
                <Input
                  placeholder="e.g., Production API, Development"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="bg-slate-800 border-white/10 text-white"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            {newKeySecret ? (
              <Button
                onClick={() => {
                  setShowCreateKey(false);
                  setNewKeySecret('');
                  setShowSecret(false);
                }}
                className="bg-violet-600 hover:bg-violet-500"
              >
                Done
              </Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => setShowCreateKey(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateApiKey}
                  disabled={!newKeyName.trim()}
                  className="bg-violet-600 hover:bg-violet-500"
                >
                  Create Key
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
