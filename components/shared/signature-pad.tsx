'use client';

import { useRef, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileSignature, 
  RotateCcw, 
  CheckCircle2,
  Loader2,
  Download
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SignaturePadProps {
  milestoneId: string;
  signerRole: 'contractor' | 'customer';
  signerName: string;
  existingSignature?: string;
  onSigned: (signatureUrl: string) => void;
}

export function SignaturePad({
  milestoneId,
  signerRole,
  signerName,
  existingSignature,
  onSigned
}: SignaturePadProps) {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [signature, setSignature] = useState<string | null>(existingSignature || null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Set drawing style
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Fill white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setIsEmpty(false);

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
    setSignature(null);
  };

  const saveSignature = async () => {
    const canvas = canvasRef.current;
    if (!canvas || isEmpty) return;

    setIsSaving(true);

    try {
      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to create blob'));
        }, 'image/png');
      });

      // Create form data
      const formData = new FormData();
      formData.append('signature', blob, 'signature.png');
      formData.append('signerRole', signerRole);
      formData.append('signerName', signerName);

      // Upload to API
      const response = await fetch(`/api/milestones/${milestoneId}/sign`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save signature');
      }

      setSignature(data.signatureUrl);
      
      toast({
        description: '✅ Signature saved successfully!'
      });

      onSigned(data.signatureUrl);
    } catch (error) {
      console.error('Save error:', error);
      toast({
        variant: 'destructive',
        description: error instanceof Error ? error.message : 'Failed to save signature'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const downloadSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `signature-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  if (signature) {
    return (
      <Card className="border-2 border-emerald-300 bg-emerald-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              Signature Complete
            </CardTitle>
            <Badge className="bg-emerald-500">
              Signed
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-white border-2 border-emerald-200">
            <img
              src={signature}
              alt="Signature"
              className="w-full h-32 object-contain"
            />
          </div>
          <div className="text-sm text-emerald-900">
            <p><strong>Signed by:</strong> {signerName}</p>
            <p><strong>Role:</strong> {signerRole === 'contractor' ? 'Contractor' : 'Customer'}</p>
            <p><strong>Date:</strong> {new Date().toLocaleString()}</p>
          </div>
          <Button
            variant="outline"
            onClick={() => setSignature(null)}
            className="w-full border-2 border-gray-300"
          >
            Sign Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-gray-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSignature className="h-5 w-5 text-blue-600" />
          Digital Signature
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Instructions */}
        <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
          <p className="text-sm text-gray-700">
            <strong>Instructions:</strong> Sign in the box below using your mouse or finger.
            Your signature confirms that you approve this milestone.
          </p>
        </div>

        {/* Signer Info */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 border border-blue-200">
          <div>
            <p className="text-sm text-gray-600">Signing as:</p>
            <p className="font-medium text-gray-900">{signerName}</p>
          </div>
          <Badge variant="outline">
            {signerRole === 'contractor' ? 'Contractor' : 'Customer'}
          </Badge>
        </div>

        {/* Canvas */}
        <div className="relative">
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="w-full h-48 border-2 border-gray-300 rounded-lg cursor-crosshair touch-none bg-white"
            style={{ touchAction: 'none' }}
          />
          {isEmpty && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-gray-400 text-sm">Sign here</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={clearSignature}
            disabled={isEmpty || isSaving}
            className="flex-1 border-2 border-gray-300"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Clear
          </Button>
          <Button
            variant="outline"
            onClick={downloadSignature}
            disabled={isEmpty || isSaving}
            className="border-2 border-gray-300"
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button
            onClick={saveSignature}
            disabled={isEmpty || isSaving}
            className="flex-1 bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-600 hover:to-violet-600 text-white"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Save Signature
              </>
            )}
          </Button>
        </div>

        {/* Legal Notice */}
        <div className="text-xs text-gray-500 text-center">
          <p>
            By signing, you agree that this digital signature has the same legal effect
            as a handwritten signature.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
