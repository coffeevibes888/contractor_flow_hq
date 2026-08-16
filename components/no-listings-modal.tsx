'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Home, ArrowRight, Sparkles, Heart, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const STORAGE_KEY = 'no_listings_modal_dismissed';
const DISMISS_DURATION_DAYS = 3;

interface NoListingsModalProps {
  show: boolean;
}

export default function NoListingsModal({ show }: NoListingsModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    if (!show) return;

    // Check if user has dismissed the modal recently
    const dismissedAt = localStorage.getItem(STORAGE_KEY);
    if (dismissedAt) {
      const dismissedDate = new Date(dismissedAt);
      const now = new Date();
      const daysSinceDismissed = (now.getTime() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < DISMISS_DURATION_DAYS) {
        return; // Don't show modal
      }
    }

    // Show modal after 2 seconds
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, [show]);

  const handleDismiss = () => {
    setIsOpen(false);
    localStorage.setItem(STORAGE_KEY, new Date().toISOString());
  };

  if (!mounted || !isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
        onClick={handleDismiss} 
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-300">
        {/* Gradient Background */}
        <div className="bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-600 p-6 sm:p-8">
          {/* Close Button */}
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          >
            <X className="h-5 w-5 text-white" />
          </button>

          {/* Badge */}
          <div className="flex justify-center mb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-sm font-medium">
              <Sparkles className="h-4 w-4" />
              We're Just Getting Started
            </span>
          </div>

          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
              <Home className="h-8 w-8 text-white" />
            </div>
          </div>

          {/* Content */}
          <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-3">
            No Listings Yet...
          </h2>
          <p className="text-white/90 text-center text-base sm:text-lg mb-6 leading-relaxed">
            We're a brand new platform and properties are being added every day! 
            Want to be among the first tenants and enjoy all the benefits of our platform?
          </p>

          {/* Benefits */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <Heart className="h-6 w-6 text-pink-300 mx-auto mb-1" />
              <span className="text-white/90 text-xs font-medium">Easy Payments</span>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <Shield className="h-6 w-6 text-emerald-300 mx-auto mb-1" />
              <span className="text-white/90 text-xs font-medium">Secure Portal</span>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <Sparkles className="h-6 w-6 text-amber-300 mx-auto mb-1" />
              <span className="text-white/90 text-xs font-medium">Early Access</span>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/sign-up" className="flex-1">
              <Button 
                size="lg" 
                className="w-full bg-white text-violet-600 hover:bg-white/90 font-semibold shadow-lg"
                onClick={handleDismiss}
              >
                Become a Tenant
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
            <Button 
              size="lg" 
              variant="ghost"
              className="flex-1 text-white hover:bg-white/20 border border-white/30"
              onClick={handleDismiss}
            >
              Maybe Later
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
