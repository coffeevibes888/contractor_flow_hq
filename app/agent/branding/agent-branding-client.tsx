'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Palette, Globe, Image as ImageIcon, Save, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Link from 'next/link';
import Image from 'next/image';

interface Agent {
  id: string;
  name: string;
  subdomain: string;
  logoUrl: string | null;
  companyName: string | null;
  companyEmail: string | null;
  companyPhone: string | null;
  companyAddress: string | null;
  themeColor: string;
  heroImages: string[];
  aboutBio: string | null;
  aboutPhoto: string | null;
  website: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  linkedinUrl: string | null;
}

interface AgentBrandingClientProps {
  agent: Agent;
}

const themeColors = [
  { name: 'Amber', value: 'amber', class: 'bg-amber-500' },
  { name: 'Violet', value: 'violet', class: 'bg-violet-500' },
  { name: 'Emerald', value: 'emerald', class: 'bg-emerald-500' },
  { name: 'Blue', value: 'blue', class: 'bg-blue-500' },
  { name: 'Rose', value: 'rose', class: 'bg-rose-500' },
  { name: 'Slate', value: 'slate', class: 'bg-slate-700' },
];

export default function AgentBrandingClient({ agent }: AgentBrandingClientProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    companyName: agent.companyName || '',
    companyEmail: agent.companyEmail || '',
    companyPhone: agent.companyPhone || '',
    companyAddress: agent.companyAddress || '',
    themeColor: agent.themeColor,
    aboutBio: agent.aboutBio || '',
    website: agent.website || '',
    facebookUrl: agent.facebookUrl || '',
    instagramUrl: agent.instagramUrl || '',
    linkedinUrl: agent.linkedinUrl || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/agent/branding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        router.refresh();
      }
    } catch (error) {
      console.error('Failed to update branding:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Branding</h1>
          <p className="text-slate-600 mt-1">Customize your public profile and agent page</p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/${agent.subdomain}`} target="_blank">
            <ExternalLink className="h-4 w-4 mr-2" />
            View Public Profile
          </Link>
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Public URL */}
        <Card className="bg-white/80 backdrop-blur-sm border-white/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-amber-600" />
              Your Public URL
            </CardTitle>
            <CardDescription>
              Share this link with clients to view your listings and contact you
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 p-3 bg-slate-100 rounded-lg">
              <span className="text-slate-600">propertyflowhq.com/</span>
              <span className="font-semibold text-slate-900">{agent.subdomain}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="ml-auto"
                onClick={() => navigator.clipboard.writeText(`https://propertyflowhq.com/${agent.subdomain}`)}
              >
                Copy
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Business Info */}
        <Card className="bg-white/80 backdrop-blur-sm border-white/20">
          <CardHeader>
            <CardTitle>Business Information</CardTitle>
            <CardDescription>
              This information will be displayed on your public profile
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Display Name / Company</Label>
                <Input
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  placeholder={agent.name}
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label>Contact Email</Label>
                <Input
                  type="email"
                  value={formData.companyEmail}
                  onChange={(e) => setFormData({ ...formData, companyEmail: e.target.value })}
                  placeholder="agent@example.com"
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input
                  value={formData.companyPhone}
                  onChange={(e) => setFormData({ ...formData, companyPhone: e.target.value })}
                  placeholder="(702) 555-0123"
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label>Office Address</Label>
                <Input
                  value={formData.companyAddress}
                  onChange={(e) => setFormData({ ...formData, companyAddress: e.target.value })}
                  placeholder="123 Main St, Las Vegas, NV"
                  className="bg-white"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>About / Bio</Label>
              <Textarea
                value={formData.aboutBio}
                onChange={(e) => setFormData({ ...formData, aboutBio: e.target.value })}
                placeholder="Tell potential clients about yourself and your experience..."
                rows={4}
                className="bg-white"
              />
            </div>
          </CardContent>
        </Card>

        {/* Theme Color */}
        <Card className="bg-white/80 backdrop-blur-sm border-white/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-amber-600" />
              Theme Color
            </CardTitle>
            <CardDescription>
              Choose a color theme for your public profile
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {themeColors.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, themeColor: color.value })}
                  className={`
                    w-12 h-12 rounded-lg ${color.class} transition-all
                    ${formData.themeColor === color.value
                      ? 'ring-2 ring-offset-2 ring-slate-900 scale-110'
                      : 'hover:scale-105'
                    }
                  `}
                  title={color.name}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Social Links */}
        <Card className="bg-white/80 backdrop-blur-sm border-white/20">
          <CardHeader>
            <CardTitle>Social & Website Links</CardTitle>
            <CardDescription>
              Connect your social profiles and website
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Website</Label>
                <Input
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://yourwebsite.com"
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label>Facebook</Label>
                <Input
                  value={formData.facebookUrl}
                  onChange={(e) => setFormData({ ...formData, facebookUrl: e.target.value })}
                  placeholder="https://facebook.com/yourpage"
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label>Instagram</Label>
                <Input
                  value={formData.instagramUrl}
                  onChange={(e) => setFormData({ ...formData, instagramUrl: e.target.value })}
                  placeholder="https://instagram.com/yourhandle"
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label>LinkedIn</Label>
                <Input
                  value={formData.linkedinUrl}
                  onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
                  placeholder="https://linkedin.com/in/yourprofile"
                  className="bg-white"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
