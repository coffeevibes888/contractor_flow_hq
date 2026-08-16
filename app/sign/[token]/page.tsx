'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';

// Dynamically import the custom PDF signing modal to avoid SSR issues with react-pdf
const CustomPDFSigningModal = dynamic(
  () => import('@/components/custom-pdf-signing-modal'),
  { ssr: false, loading: () => <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div> }
);

const LeaseSigningModal = dynamic(
  () => import('@/components/lease-signing-modal'),
  { ssr: false }
);

interface SignatureField {
  id: string;
  type: 'signature' | 'initial' | 'date' | 'name' | 'text';
  role: 'tenant' | 'landlord';
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  required: boolean;
}

interface SignSessionBase {
  leaseId: string;
  role: 'tenant' | 'landlord';
  recipientName: string;
  recipientEmail: string;
}

interface HtmlTemplateSession extends SignSessionBase {
  documentType: 'html_template';
  leaseHtml: string;
}

interface CustomPdfSession extends SignSessionBase {
  documentType: 'custom_pdf';
  documentName: string;
  documentUrl: string;
  signatureFields: SignatureField[];
  leaseDetails: {
    landlordName: string;
    tenantName: string;
    propertyLabel: string;
  };
}

type SignSession = HtmlTemplateSession | CustomPdfSession;

export default function SignPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [session, setSession] = useState<SignSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let canceled = false;
    const run = async () => {
      try {
        const res = await fetch(`/api/sign/${token}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || 'Failed to load signing session');
        }
        const data = await res.json();
        if (canceled) return;
        setSession(data as SignSession);
      } catch (err: any) {
        setError(err.message || 'Unable to load signing session');
      } finally {
        if (!canceled) setLoading(false);
      }
    };
    run();
    return () => { canceled = true; };
  }, [token]);

  const handleClose = () => {
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-violet-400 mx-auto mb-4" />
          <p className="text-slate-400">Loading document...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-400 mb-2">Unable to Load Document</h2>
            <p className="text-slate-400 mb-4">{error}</p>
            <Button onClick={() => router.push('/')} variant="outline">
              Go Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <p className="text-slate-400">No session data</p>
      </div>
    );
  }

  // Render appropriate signing interface based on document type
  if (session.documentType === 'custom_pdf') {
    return (
      <CustomPDFSigningModal
        open={true}
        onClose={handleClose}
        token={token}
        documentUrl={session.documentUrl}
        documentName={session.documentName}
        signatureFields={session.signatureFields}
        recipientName={session.recipientName}
        recipientEmail={session.recipientEmail}
        role={session.role}
        leaseDetails={session.leaseDetails}
      />
    );
  }

  // HTML template - use the existing lease signing modal
  return (
    <LeaseSigningModal
      open={true}
      onClose={handleClose}
      token={token}
    />
  );
}
