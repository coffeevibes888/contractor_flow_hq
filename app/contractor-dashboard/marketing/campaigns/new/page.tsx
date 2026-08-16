'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Send } from 'lucide-react';
import Link from 'next/link';

export default function NewCampaignPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultType = searchParams.get('type') || 'email';

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: defaultType,
    subject: '',
    message: '',
    targetAudience: 'all',
    scheduledFor: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/contractor/marketing/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to create campaign');

      const { campaign } = await response.json();
      router.push(`/contractor-dashboard/marketing/campaigns/${campaign.id}`);
    } catch (error) {
      console.error('Error creating campaign:', error);
      alert('Failed to create campaign');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/contractor-dashboard/marketing">
          <Button variant="outline" size="icon" className="border-slate-400 text-slate-900 hover:bg-white/20 font-bold">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-blue-600">Create Campaign</h1>
          <p className="text-gray-600 mt-1">Send emails or SMS to your customers</p>
        </div>
      </div>

      <Card className="border-2 border-gray-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-gray-900">Campaign Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-slate-900 font-bold">Campaign Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Spring Promotion 2026"
                  required
                  className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-500 focus:ring-blue-600"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type" className="text-slate-900 font-bold">Campaign Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger className="bg-white border-slate-300 text-slate-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.type === 'email' && (
              <div className="space-y-2">
                <Label htmlFor="subject" className="text-slate-900 font-bold">Email Subject</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Special Offer Just for You!"
                  required
                  className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-500 focus:ring-blue-600"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="message" className="text-slate-900 font-bold">Message</Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder={formData.type === 'email' ? 'Write your email content...' : 'Write your SMS message (160 characters max)...'}
                rows={8}
                required
                maxLength={formData.type === 'sms' ? 160 : undefined}
                className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-500 focus:ring-blue-600"
              />
              {formData.type === 'sms' && (
                <p className="text-sm text-slate-600">{formData.message.length}/160 characters</p>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="targetAudience" className="text-slate-900 font-bold">Target Audience</Label>
                <Select
                  value={formData.targetAudience}
                  onValueChange={(value) => setFormData({ ...formData, targetAudience: value })}
                >
                  <SelectTrigger className="bg-white border-slate-300 text-slate-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Customers</SelectItem>
                    <SelectItem value="active">Active Customers</SelectItem>
                    <SelectItem value="leads">Leads Only</SelectItem>
                    <SelectItem value="past">Past Customers</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="scheduledFor" className="text-slate-900 font-bold">Schedule For (Optional)</Label>
                <Input
                  id="scheduledFor"
                  type="datetime-local"
                  value={formData.scheduledFor}
                  onChange={(e) => setFormData({ ...formData, scheduledFor: e.target.value })}
                  className="bg-white border-slate-300 text-slate-900 focus:ring-blue-600"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={loading}
                className="bg-violet-600 hover:bg-violet-700 text-gray-900"
              >
                <Send className="h-4 w-4 mr-2" />
                {loading ? 'Creating...' : formData.scheduledFor ? 'Schedule Campaign' : 'Send Now'}
              </Button>
              <Link href="/contractor-dashboard/marketing">
                <Button type="button" variant="outline" className="border-gray-300 text-gray-900 hover:bg-gray-100">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
