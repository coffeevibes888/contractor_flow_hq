'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Share2,
  QrCode,
  Copy,
  Check,
  Mail,
  MessageSquare,
  ExternalLink,
  Smartphone,
  KeyRound,
  Users,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface InviteTenantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantStartUrl: string;
  inviteCode: string;
  landlordEmail: string;
}

export default function InviteTenantDialog({
  open,
  onOpenChange,
  tenantStartUrl,
  inviteCode,
  landlordEmail,
}: InviteTenantDialogProps) {
  const [urlCopied, setUrlCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(tenantStartUrl)}`;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(tenantStartUrl);
      setUrlCopied(true);
      toast({ title: 'Link copied!', description: 'Tenant sign-up URL copied to clipboard' });
      setTimeout(() => setUrlCopied(false), 2000);
    } catch {
      toast({ title: 'Failed to copy', variant: 'destructive' });
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCodeCopied(true);
      toast({ title: 'Code copied!', description: 'Invite code copied to clipboard' });
      setTimeout(() => setCodeCopied(false), 2000);
    } catch {
      toast({ title: 'Failed to copy', variant: 'destructive' });
    }
  };

  const handleSendText = () => {
    if (!phoneNumber.trim()) {
      toast({ title: 'Enter a phone number', variant: 'destructive' });
      return;
    }

    const message = `Hey! You can now pay rent online, submit maintenance requests, and sign leases digitally through our tenant portal.\n\nSign up here: ${tenantStartUrl}\n\nUse invite code: ${inviteCode}\nOr enter my email: ${landlordEmail}`;
    const smsUrl = `sms:${phoneNumber}?body=${encodeURIComponent(message)}`;
    window.open(smsUrl, '_blank');

    toast({ title: 'Opening SMS app...', description: 'Complete sending in your messaging app' });
  };

  const handleSendEmail = () => {
    if (!email.trim()) {
      toast({ title: 'Enter an email address', variant: 'destructive' });
      return;
    }

    const subject = 'Set Up Your Tenant Portal — Pay Rent Online';
    const body = `Hi,\n\nI've set up an online portal where you can pay rent, submit maintenance requests, and sign leases digitally.\n\nSign up here: ${tenantStartUrl}\n\nWhen signing up, use one of the following to connect to my account:\n- Invite code: ${inviteCode}\n- My email: ${landlordEmail}\n\nOnce you're signed up, I'll assign you to your unit and you'll be all set.\n\nThanks!`;
    const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoUrl, '_blank');

    toast({ title: 'Opening email app...', description: 'Complete sending in your email app' });
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Tenant Portal Sign Up',
          text: `Sign up for the tenant portal. Use invite code: ${inviteCode}`,
          url: tenantStartUrl,
        });
      } catch {
        // User cancelled
      }
    } else {
      handleCopyUrl();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md max-h-[85vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <Users className='h-5 w-5 text-blue-500' />
            Invite Tenant
          </DialogTitle>
          <DialogDescription className='text-gray-500'>
            Send your tenant the sign-up link so they can connect to your account, pay rent online, and submit maintenance requests.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4 py-4'>
          {/* Invite Code */}
          <div className='space-y-2'>
            <label className='text-xs font-medium text-gray-600'>Invite Code</label>
            <div className='flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5'>
              <KeyRound className='h-4 w-4 text-blue-500 shrink-0' />
              <span className='text-sm font-mono font-bold tracking-widest text-gray-900 flex-1'>
                {inviteCode}
              </span>
              <Button
                onClick={handleCopyCode}
                variant='ghost'
                size='sm'
                className='h-7 w-7 p-0'
              >
                {codeCopied ? <Check className='h-3.5 w-3.5 text-emerald-500' /> : <Copy className='h-3.5 w-3.5 text-gray-400' />}
              </Button>
            </div>
          </div>

          {/* Tenant Start URL */}
          <div className='space-y-2'>
            <label className='text-xs font-medium text-gray-600'>Tenant Sign-Up URL</label>
            <div className='flex gap-2'>
              <Input
                value={tenantStartUrl}
                readOnly
                className='bg-gray-50 border-gray-200 text-gray-800 text-sm font-mono'
              />
              <Button
                onClick={handleCopyUrl}
                variant='outline'
                size='sm'
                className='border-gray-200 px-3 shrink-0'
              >
                {urlCopied ? <Check className='h-4 w-4 text-emerald-500' /> : <Copy className='h-4 w-4' />}
              </Button>
            </div>
          </div>

          {/* QR Code */}
          <Button
            onClick={() => setShowQR(!showQR)}
            variant='outline'
            className='w-full border-gray-200 justify-start gap-2'
          >
            <QrCode className='h-4 w-4 text-blue-500' />
            {showQR ? 'Hide QR Code' : 'Show QR Code'}
          </Button>

          {showQR && (
            <div className='flex flex-col items-center p-4 bg-gray-50 rounded-xl border border-gray-100'>
              <img
                src={qrCodeUrl}
                alt='QR Code for tenant sign-up'
                className='w-48 h-48'
              />
              <p className='text-xs text-gray-500 mt-2 text-center'>
                Tenant scans this to sign up
              </p>
            </div>
          )}

          {/* Native Share (mobile) */}
          {'share' in (typeof navigator !== 'undefined' ? navigator : {}) && (
            <Button
              onClick={handleNativeShare}
              className='w-full bg-blue-600 hover:bg-blue-500 gap-2'
            >
              <Smartphone className='h-4 w-4' />
              Share via Apps
            </Button>
          )}

          {/* Send via Text */}
          <div className='space-y-2'>
            <label className='text-xs font-medium text-gray-600'>Send via Text Message</label>
            <div className='flex gap-2'>
              <Input
                type='tel'
                placeholder='Phone number'
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className='bg-gray-50 border-gray-200 text-gray-800 text-sm'
              />
              <Button
                onClick={handleSendText}
                variant='outline'
                size='sm'
                className='border-gray-200 px-3 shrink-0'
              >
                <MessageSquare className='h-4 w-4' />
              </Button>
            </div>
          </div>

          {/* Send via Email */}
          <div className='space-y-2'>
            <label className='text-xs font-medium text-gray-600'>Send via Email</label>
            <div className='flex gap-2'>
              <Input
                type='email'
                placeholder='Email address'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className='bg-gray-50 border-gray-200 text-gray-800 text-sm'
              />
              <Button
                onClick={handleSendEmail}
                variant='outline'
                size='sm'
                className='border-gray-200 px-3 shrink-0'
              >
                <Mail className='h-4 w-4' />
              </Button>
            </div>
          </div>

          {/* Preview Link */}
          <Button
            onClick={() => window.open(tenantStartUrl, '_blank')}
            variant='outline'
            className='w-full border-gray-200 gap-2'
          >
            <ExternalLink className='h-4 w-4' />
            Preview Tenant Sign-Up Page
          </Button>

          {/* How it works */}
          <div className='rounded-lg bg-blue-50 border border-blue-100 p-3 space-y-1'>
            <p className='text-xs font-semibold text-blue-800'>How it works</p>
            <p className='text-xs text-blue-700 leading-relaxed'>
              Your tenant visits the sign-up link and enters your email ({landlordEmail}), phone number, or invite code to connect to your account. Once they sign up, they&apos;ll appear in your Tenants page where you can assign them to a property and unit.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
