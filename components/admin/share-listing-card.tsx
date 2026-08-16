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
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Share2, 
  QrCode, 
  Copy, 
  Check, 
  Mail, 
  MessageSquare,
  ExternalLink,
  Smartphone
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ShareListingCardProps {
  listingUrl: string;
  landlordName: string;
}

export default function ShareListingCard({ listingUrl, landlordName }: ShareListingCardProps) {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(listingUrl)}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(listingUrl);
      setCopied(true);
      toast({ title: 'Link copied!', description: 'Listing URL copied to clipboard' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Failed to copy', variant: 'destructive' });
    }
  };

  const handleSendText = async () => {
    if (!phoneNumber.trim()) {
      toast({ title: 'Enter a phone number', variant: 'destructive' });
      return;
    }

    // Open SMS app with pre-filled message
    const message = `Check out available rentals from ${landlordName}: ${listingUrl}`;
    const smsUrl = `sms:${phoneNumber}?body=${encodeURIComponent(message)}`;
    window.open(smsUrl, '_blank');
    
    toast({ title: 'Opening SMS app...', description: 'Complete sending in your messaging app' });
  };

  const handleSendEmail = async () => {
    if (!email.trim()) {
      toast({ title: 'Enter an email address', variant: 'destructive' });
      return;
    }

    const subject = `Available Rentals from ${landlordName}`;
    const body = `Hi,\n\nCheck out our available rental properties:\n\n${listingUrl}\n\nBest regards,\n${landlordName}`;
    const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoUrl, '_blank');
    
    toast({ title: 'Opening email app...', description: 'Complete sending in your email app' });
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${landlordName} - Available Rentals`,
          text: `Check out available rentals from ${landlordName}`,
          url: listingUrl,
        });
      } catch (err) {
        // User cancelled or share failed
      }
    } else {
      handleCopy();
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className='inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all text-xs'>
          <div className='h-6 w-6 rounded-md bg-gradient-to-br from-cyan-400 to-blue-400 flex items-center justify-center text-white shrink-0'>
            <Share2 className='h-3 w-3' />
          </div>
          <span className='font-medium text-gray-700'>Share Listing</span>
          <QrCode className='h-3.5 w-3.5 text-gray-400' />
        </button>
      </DialogTrigger>
      
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <Share2 className='h-5 w-5 text-cyan-500' />
            Share Your Listings
          </DialogTitle>
          <DialogDescription className='text-gray-500'>
            Send your property listing link to potential tenants
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4 py-4'>
          {/* Copy Link */}
          <div className='space-y-2'>
            <label className='text-xs font-medium text-gray-600'>Your Listing URL</label>
            <div className='flex gap-2'>
              <Input
                value={listingUrl}
                readOnly
                className='bg-gray-50 border-gray-200 text-gray-800 text-sm'
              />
              <Button
                onClick={handleCopy}
                variant='outline'
                size='sm'
                className='border-gray-200 bg-slate-800 hover:bg-slate-700 px-3'
              >
                {copied ? <Check className='h-4 w-4 text-emerald-400' /> : <Copy className='h-4 w-4' />}
              </Button>
            </div>
          </div>

          {/* QR Code */}
          <div className='space-y-2'>
            <Button
              onClick={() => setShowQR(!showQR)}
              variant='outline'
              className='w-full border-gray-200 bg-slate-800 hover:bg-slate-700 justify-start gap-2'
            >
              <QrCode className='h-4 w-4 text-cyan-500' />
              {showQR ? 'Hide QR Code' : 'Show QR Code'}
            </Button>
            
            {showQR && (
              <div className='flex flex-col items-center p-4 bg-white rounded-xl'>
                <img
                  src={qrCodeUrl}
                  alt='QR Code for listing'
                  className='w-48 h-48'
                />
                <p className='text-xs text-slate-600 mt-2 text-center'>
                  Scan to view listings
                </p>
              </div>
            )}
          </div>

          {/* Native Share (mobile) */}
          {'share' in navigator && (
            <Button
              onClick={handleNativeShare}
              className='w-full bg-cyan-600 hover:bg-cyan-500 gap-2'
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
                className='border-gray-200 bg-slate-800 hover:bg-slate-700 px-3'
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
                className='border-gray-200 bg-slate-800 hover:bg-slate-700 px-3'
              >
                <Mail className='h-4 w-4' />
              </Button>
            </div>
          </div>

          {/* Open Link */}
          <Button
            onClick={() => window.open(listingUrl, '_blank')}
            variant='outline'
            className='w-full border-gray-200 bg-slate-800 hover:bg-slate-700 gap-2'
          >
            <ExternalLink className='h-4 w-4' />
            Preview Your Listing Page
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
