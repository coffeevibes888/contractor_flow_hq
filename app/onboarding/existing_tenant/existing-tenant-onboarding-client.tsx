'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Key, CheckCircle2, Loader2, ArrowLeft } from 'lucide-react';

export default function ExistingTenantOnboardingClient() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    inviteCode: '',
    landlordEmail: '',
  });

  const handleComplete = async () => {
    setIsSubmitting(true);
    setError('');
    
    try {
      const response = await fetch('/api/onboarding/existing-tenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        router.push('/user/dashboard');
      } else {
        setError(data.error || 'Something went wrong. Please try again.');
      }
    } catch (error) {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/onboarding/existing-tenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skip: true }),
      });

      if (response.ok) {
        router.push('/user/dashboard');
      }
    } catch (error) {
      console.error('Skip error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-900/20 to-slate-950 text-white flex items-center justify-center px-4 py-10">
      <div className="max-w-md w-full space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <div className="text-center space-y-3">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-400">
              <Key className="h-8 w-8" />
            </div>
            <h1 className="text-3xl font-bold">Connect to your landlord</h1>
            <p className="text-slate-400">
              If your landlord gave you an invite code, enter it below. Otherwise, you can skip this step.
            </p>
          </div>

          <div className="space-y-5">
            <div className="space-y-2">
              <Label className="text-slate-300">Invite code (optional)</Label>
              <Input
                placeholder="Enter your invite code"
                value={formData.inviteCode}
                onChange={(e) => setFormData({ ...formData, inviteCode: e.target.value })}
                className="bg-slate-900/50 border-white/10 text-white placeholder:text-slate-500"
              />
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-slate-950 px-2 text-slate-500">or</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Landlord's email (optional)</Label>
              <Input
                type="email"
                placeholder="landlord@example.com"
                value={formData.landlordEmail}
                onChange={(e) => setFormData({ ...formData, landlordEmail: e.target.value })}
                className="bg-slate-900/50 border-white/10 text-white placeholder:text-slate-500"
              />
              <p className="text-xs text-slate-500">
                We'll notify them that you've signed up
              </p>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="space-y-3">
            <Button 
              onClick={handleComplete} 
              disabled={isSubmitting || (!formData.inviteCode && !formData.landlordEmail)}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  Connect Account
                  <CheckCircle2 className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>

            <Button 
              variant="ghost" 
              onClick={handleSkip}
              disabled={isSubmitting}
              className="w-full text-slate-400"
            >
              Skip for now
            </Button>

            <Button
              variant="ghost"
              onClick={() => router.push('/onboarding')}
              className="w-full text-slate-500"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to role selection
            </Button>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
