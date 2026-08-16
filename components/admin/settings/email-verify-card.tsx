'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { MailCheck, Mail, Loader2 } from 'lucide-react';
import { sendVerificationEmailToken } from '@/lib/actions/auth.actions';

interface EmailVerifyCardProps {
  emailVerified: boolean;
  email: string;
}

/**
 * Unobtrusive card surfaced on the Profile settings tab.
 *
 * Verifying email is no longer a hard gate for trial / dashboard access
 * (Stripe + the role picker are the real abuse barriers), but verification
 * is still required for outbound actions (tenant invites, rent reminders,
 * password recovery). This card lets the user resend the link on demand
 * and shows a confirmation once their email is verified.
 */
export function EmailVerifyCard({ emailVerified, email }: EmailVerifyCardProps) {
  const { toast } = useToast();
  const [sending, setSending] = useState(false);
  const [sentRecently, setSentRecently] = useState(false);

  if (emailVerified) {
    return (
      <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 flex items-center gap-2">
        <MailCheck className="w-4 h-4 text-emerald-600 shrink-0" />
        <p className="text-xs text-emerald-800">
          Email verified — outbound notifications, tenant invites, and account
          recovery are all enabled.
        </p>
      </div>
    );
  }

  const handleResend = async () => {
    setSending(true);
    try {
      const result = await sendVerificationEmailToken(email);
      if (result?.success !== false) {
        toast({
          title: 'Verification email sent',
          description: `Check ${email} for a link to verify your account.`,
        });
        setSentRecently(true);
      } else {
        toast({
          title: 'Could not send verification email',
          description: result?.message || 'Please try again in a moment.',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Could not send verification email',
        description: 'Please try again in a moment.',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
      <Mail className="w-4 h-4 text-amber-600 shrink-0 hidden sm:block" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-amber-900 font-medium">
          Verify your email to enable tenant invites & rent reminders
        </p>
        <p className="text-[11px] text-amber-800/80 mt-0.5">
          We sent a link to <span className="font-medium">{email}</span>. You
          can keep using the dashboard while we wait.
        </p>
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={handleResend}
        disabled={sending || sentRecently}
        className="h-7 px-2.5 text-xs border-amber-400 bg-white text-amber-900 hover:bg-amber-100 shrink-0"
      >
        {sending ? (
          <>
            <Loader2 className="w-3 h-3 animate-spin mr-1" /> Sending
          </>
        ) : sentRecently ? (
          'Sent ✓'
        ) : (
          'Resend link'
        )}
      </Button>
    </div>
  );
}
