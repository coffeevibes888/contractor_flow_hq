'use client';

import Link from 'next/link';
import { ArrowRight, Key, Webhook, Code, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function DocsPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">API Documentation</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Build powerful integrations with our Enterprise API. Manage properties, 
          tenants, leases, and more programmatically.
        </p>
        <div className="mt-6 flex justify-center gap-4">
          <Button asChild>
            <Link href="/docs/api">
              Get Started <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/docs/api#authentication">
              Authentication
            </Link>
          </Button>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <Key className="h-8 w-8 text-primary mb-2" />
            <CardTitle className="text-lg">Authentication</CardTitle>
            <CardDescription>
              Learn how to authenticate API requests with API keys
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/docs/api#authentication" className="text-primary hover:underline text-sm">
              View docs →
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <Code className="h-8 w-8 text-primary mb-2" />
            <CardTitle className="text-lg">API Reference</CardTitle>
            <CardDescription>
              Complete reference for all API endpoints
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/docs/api#api-endpoints" className="text-primary hover:underline text-sm">
              View docs →
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <Webhook className="h-8 w-8 text-primary mb-2" />
            <CardTitle className="text-lg">Webhooks</CardTitle>
            <CardDescription>
              Receive real-time notifications for events
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/docs/webhooks" className="text-primary hover:underline text-sm">
              View docs →
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <BookOpen className="h-8 w-8 text-primary mb-2" />
            <CardTitle className="text-lg">Examples</CardTitle>
            <CardDescription>
              Code examples in multiple languages
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/docs/api#code-examples" className="text-primary hover:underline text-sm">
              View docs →
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Requirements */}
      <Card className="mb-12">
        <CardHeader>
          <CardTitle>Requirements</CardTitle>
          <CardDescription>
            What you need to get started with the API
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <span className="bg-primary/10 text-primary rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium shrink-0">1</span>
              <div>
                <p className="font-medium">Enterprise Subscription</p>
                <p className="text-sm text-muted-foreground">API access is available on the Enterprise plan ($199/month)</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="bg-primary/10 text-primary rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium shrink-0">2</span>
              <div>
                <p className="font-medium">API Key</p>
                <p className="text-sm text-muted-foreground">Create an API key from Admin → Settings → API Keys</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="bg-primary/10 text-primary rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium shrink-0">3</span>
              <div>
                <p className="font-medium">HTTPS Endpoint (for webhooks)</p>
                <p className="text-sm text-muted-foreground">Webhooks require a publicly accessible HTTPS URL</p>
              </div>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Quick Example */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Example</CardTitle>
          <CardDescription>
            Make your first API call
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
            <code>{`curl -X GET "https://your-domain.com/api/v1/properties" \\
  -H "Authorization: Bearer pk_live_your_api_key_here"`}</code>
          </pre>
          <p className="mt-4 text-sm text-muted-foreground">
            Replace <code className="bg-muted px-1 rounded">pk_live_your_api_key_here</code> with your actual API key.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
