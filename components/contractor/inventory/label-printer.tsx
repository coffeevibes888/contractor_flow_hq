'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Printer, Download, QrCode, Barcode } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';

interface LabelPrinterProps {
  item: {
    id: string;
    name: string;
    sku?: string | null;
    barcode?: string | null;
    category?: string | null;
    location?: string | null;
  };
  onClose: () => void;
  isOpen: boolean;
}

export function LabelPrinter({ item, onClose, isOpen }: LabelPrinterProps) {
  const { toast } = useToast();
  const [labelType, setLabelType] = useState<'barcode' | 'qr'>('barcode');
  const [labelSize, setLabelSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [includeDetails, setIncludeDetails] = useState(true);

  const generateBarcode = async () => {
    const canvas = document.createElement('canvas');
    const code = item.barcode || item.sku || item.id;
    
    try {
      JsBarcode(canvas, code, {
        format: 'CODE128',
        width: labelSize === 'small' ? 1 : labelSize === 'medium' ? 2 : 3,
        height: labelSize === 'small' ? 40 : labelSize === 'medium' ? 60 : 80,
        displayValue: true,
      });
      return canvas.toDataURL();
    } catch (err) {
      console.error('Barcode generation failed:', err);
      return null;
    }
  };

  const generateQRCode = async () => {
    const data = JSON.stringify({
      id: item.id,
      name: item.name,
      sku: item.sku,
      barcode: item.barcode,
    });
    
    try {
      const size = labelSize === 'small' ? 128 : labelSize === 'medium' ? 256 : 384;
      return await QRCode.toDataURL(data, { width: size });
    } catch (err) {
      console.error('QR code generation failed:', err);
      return null;
    }
  };

  const handlePrint = async () => {
    const codeImage = labelType === 'barcode' 
      ? await generateBarcode() 
      : await generateQRCode();
    
    if (!codeImage) {
      toast({ title: 'Error', description: 'Failed to generate label', variant: 'destructive' });
      return;
    }

    // Create print window
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Label - ${item.name}</title>
          <style>
            @media print {
              @page { margin: 0; }
              body { margin: 1cm; }
            }
            body {
              font-family: Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
            }
            .label {
              border: 2px solid #000;
              padding: 20px;
              text-align: center;
              background: white;
              max-width: ${labelSize === 'small' ? '300px' : labelSize === 'medium' ? '400px' : '500px'};
            }
            .label img {
              max-width: 100%;
              height: auto;
            }
            .label h2 {
              margin: 10px 0;
              font-size: ${labelSize === 'small' ? '14px' : labelSize === 'medium' ? '18px' : '24px'};
            }
            .label p {
              margin: 5px 0;
              font-size: ${labelSize === 'small' ? '10px' : labelSize === 'medium' ? '12px' : '14px'};
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="label">
            <img src="${codeImage}" alt="Label" />
            ${includeDetails ? `
              <h2>${item.name}</h2>
              ${item.sku ? `<p><strong>SKU:</strong> ${item.sku}</p>` : ''}
              ${item.category ? `<p><strong>Category:</strong> ${item.category}</p>` : ''}
              ${item.location ? `<p><strong>Location:</strong> ${item.location}</p>` : ''}
            ` : ''}
          </div>
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 100);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleDownload = async () => {
    const codeImage = labelType === 'barcode' 
      ? await generateBarcode() 
      : await generateQRCode();
    
    if (!codeImage) {
      toast({ title: 'Error', description: 'Failed to generate label', variant: 'destructive' });
      return;
    }

    const link = document.createElement('a');
    link.download = `label-${item.sku || item.id}.png`;
    link.href = codeImage;
    link.click();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Print Label
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Label Type */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Label Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={labelType === 'barcode' ? 'default' : 'outline'}
                onClick={() => setLabelType('barcode')}
                className="w-full"
              >
                <Barcode className="h-4 w-4 mr-2" />
                Barcode
              </Button>
              <Button
                type="button"
                variant={labelType === 'qr' ? 'default' : 'outline'}
                onClick={() => setLabelType('qr')}
                className="w-full"
              >
                <QrCode className="h-4 w-4 mr-2" />
                QR Code
              </Button>
            </div>
          </div>

          {/* Label Size */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Label Size
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['small', 'medium', 'large'] as const).map((size) => (
                <Button
                  key={size}
                  type="button"
                  variant={labelSize === size ? 'default' : 'outline'}
                  onClick={() => setLabelSize(size)}
                  className="w-full capitalize"
                >
                  {size}
                </Button>
              ))}
            </div>
          </div>

          {/* Include Details */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="includeDetails"
              checked={includeDetails}
              onChange={(e) => setIncludeDetails(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <label htmlFor="includeDetails" className="text-sm text-gray-700">
              Include item details on label
            </label>
          </div>

          {/* Preview */}
          <div className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50">
            <p className="text-xs text-gray-500 mb-2 text-center">Preview</p>
            <div className="bg-white border-2 border-black p-4 text-center">
              <div className="h-20 bg-gray-200 rounded flex items-center justify-center mb-2">
                {labelType === 'barcode' ? (
                  <Barcode className="h-8 w-8 text-gray-400" />
                ) : (
                  <QrCode className="h-8 w-8 text-gray-400" />
                )}
              </div>
              {includeDetails && (
                <>
                  <p className="font-semibold text-sm">{item.name}</p>
                  {item.sku && <p className="text-xs text-gray-600">SKU: {item.sku}</p>}
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={handleDownload}
              variant="outline"
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button
              onClick={handlePrint}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>

          <p className="text-xs text-gray-500 text-center">
            Compatible with standard label printers (Dymo, Brother, Zebra)
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
