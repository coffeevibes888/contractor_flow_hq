'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  CheckCircle2,
  Sparkles,
  Calendar,
  MessageCircle,
  ArrowRight,
  Shield,
  Clock,
  Loader2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import confetti from 'canvas-confetti';

export default function PaymentSuccessPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [jobId, setJobId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadParams = async () => {
      const { id } = await params;
      setJobId(id);
      setIsLoading(false);
    };
    loadParams();
  }, [params]);

  useEffect(() => {
    if (!isLoading) {
      // Trigger confetti celebration
      const duration = 3 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

      function randomInRange(min: number, max: number) {
        return Math.random() * (max - min) + min;
      }

      const interval: any = setInterval(function () {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);

        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        });
      }, 250);

      return () => clearInterval(interval);
    }
  }, [isLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-violet-50/20 flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50/30 to-blue-50/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-white/90 backdrop-blur-sm border-white/20 shadow-2xl">
        <CardContent className="p-8 md:p-12 space-y-8">
          {/* Success Icon */}
          <div className="text-center space-y-4">
            <div className="relative inline-block">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center mx-auto animate-bounce">
                <CheckCircle2 className="h-14 w-14 text-white" />
              </div>
              <div className="absolute -top-2 -right-2">
                <Sparkles className="h-8 w-8 text-amber-400 animate-pulse" />
              </div>
            </div>
            <div>
              <h1 className="text-4xl font-bold text-slate-900 mb-2">Payment Successful!</h1>
              <p className="text-lg text-slate-600">
                Your payment has been processed and funds are securely held in escrow
              </p>
            </div>
          </div>

          {/* What Happens Next */}
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="p-6 space-y-4">
              <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                What Happens Next?
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                    1
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Contractor Notified</p>
                    <p className="text-sm text-slate-600">
                      The contractor has been notified and will reach out to schedule the work
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                    2
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Work Begins</p>
                    <p className="text-sm text-slate-600">
                      The contractor will complete the job according to the agreed timeline
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                    3
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Review & Approve</p>
                    <p className="text-sm text-slate-600">
                      Once complete, you'll review the work and approve payment release
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Escrow Protection */}
          <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <Shield className="h-6 w-6 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <h4 className="font-semibold text-emerald-900">Your Payment is Protected</h4>
                  <p className="text-sm text-emerald-800 leading-relaxed">
                    Funds are held securely in escrow and will only be released to the contractor
                    after you approve the completed work, or automatically after 7 days if no issues
                    are reported. You can file a dispute at any time if there are problems.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Link href={`/homeowner/jobs/${jobId}`} className="block">
              <Button className="w-full h-12 text-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                View Job Details
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </Link>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="h-11" asChild>
                <Link href="/homeowner/jobs">
                  <Clock className="h-4 w-4 mr-2" />
                  All Jobs
                </Link>
              </Button>
              <Button variant="outline" className="h-11">
                <MessageCircle className="h-4 w-4 mr-2" />
                Message Contractor
              </Button>
            </div>
          </div>

          {/* Help Text */}
          <div className="text-center pt-4 border-t border-slate-200">
            <p className="text-sm text-slate-600">
              Need help?{' '}
              <Link href="/contact" className="text-blue-600 hover:text-blue-700 font-medium">
                Contact Support
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
