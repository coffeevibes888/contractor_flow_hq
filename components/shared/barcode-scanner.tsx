'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, X, ScanLine, AlertCircle, Keyboard, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Barcode/QR scanner that supports three input methods, picking whichever works:
 *
 *  1. **Hardware scanner (USB / Bluetooth)** — most consumer scanners are HID
 *     "keyboard wedge" devices. They type the barcode + Enter. We listen for
 *     fast keystroke bursts ending with Enter to detect them passively.
 *  2. **Camera scan** — uses the native `BarcodeDetector` API (Chrome/Edge/
 *     Android). Falls back to a notice when unavailable (Safari/Firefox).
 *  3. **Manual entry** — always available.
 *
 * The component is a controlled overlay. Open it with `open={true}` and handle
 * `onScan(value)` to receive the scanned code.
 */

interface BarcodeScannerProps {
  open: boolean;
  onClose: () => void;
  onScan: (value: string) => void;
  /** Display title in the modal header. */
  title?: string;
  /** Helper text shown above the scanner UI. */
  description?: string;
}

type ScanMode = 'idle' | 'camera' | 'manual';

const HARDWARE_SCAN_BURST_MS = 60; // keystrokes faster than this are likely from a scanner
const HARDWARE_SCAN_MIN_LENGTH = 3;

export default function BarcodeScanner({
  open,
  onClose,
  onScan,
  title = 'Scan a barcode or QR code',
  description = 'Point your camera at a code, use a USB/Bluetooth scanner, or type the value manually.',
}: BarcodeScannerProps) {
  const [mode, setMode] = useState<ScanMode>('idle');
  const [manualValue, setManualValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [hardwareDetected, setHardwareDetected] = useState(false);
  const [lastScan, setLastScan] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectingRef = useRef(false);
  const hwBufferRef = useRef<string>('');
  const hwLastKeyTimeRef = useRef<number>(0);
  const hwTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleScanComplete = useCallback(
    (value: string) => {
      const cleaned = value.trim();
      if (!cleaned) return;
      setLastScan(cleaned);
      onScan(cleaned);
    },
    [onScan]
  );

  // ── Hardware scanner detection (keyboard wedge) ──────────────────────────
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when typing in the manual input
      const target = e.target as HTMLElement | null;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') {
        return;
      }

      const now = Date.now();
      const sinceLast = now - hwLastKeyTimeRef.current;
      hwLastKeyTimeRef.current = now;

      if (e.key === 'Enter') {
        if (hwBufferRef.current.length >= HARDWARE_SCAN_MIN_LENGTH) {
          handleScanComplete(hwBufferRef.current);
          setHardwareDetected(true);
        }
        hwBufferRef.current = '';
        return;
      }

      // Reset buffer if too slow between keystrokes (human typing)
      if (sinceLast > 200 && hwBufferRef.current.length > 0) {
        hwBufferRef.current = '';
      }

      if (e.key.length === 1) {
        hwBufferRef.current += e.key;

        // Clear stale buffers
        if (hwTimeoutRef.current) clearTimeout(hwTimeoutRef.current);
        hwTimeoutRef.current = setTimeout(() => {
          hwBufferRef.current = '';
        }, 300);

        // Light heuristic to flag fast bursts as a scanner
        if (sinceLast < HARDWARE_SCAN_BURST_MS && hwBufferRef.current.length > 4) {
          setHardwareDetected(true);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      if (hwTimeoutRef.current) clearTimeout(hwTimeoutRef.current);
    };
  }, [open, handleScanComplete]);

  // ── Camera scanning ──────────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    detectingRef.current = false;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    setError(null);

    // @ts-expect-error - BarcodeDetector is not in TS lib yet but is a Web API
    const BarcodeDetectorCtor = typeof window !== 'undefined' ? (window as any).BarcodeDetector : undefined;

    if (!BarcodeDetectorCtor) {
      setError(
        'Camera scanning needs Chrome or Edge on desktop, or Chrome on Android. On iPhone or Firefox, plug in a USB/Bluetooth scanner or type the value below.'
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const detector = new BarcodeDetectorCtor({
        formats: [
          'qr_code',
          'code_128',
          'code_39',
          'code_93',
          'codabar',
          'data_matrix',
          'ean_13',
          'ean_8',
          'itf',
          'pdf417',
          'upc_a',
          'upc_e',
          'aztec',
        ],
      });

      detectingRef.current = true;
      setMode('camera');

      const detect = async () => {
        if (!detectingRef.current || !videoRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes.length > 0) {
            const value = codes[0].rawValue;
            if (value) {
              handleScanComplete(value);
              stopCamera();
              return;
            }
          }
        } catch {
          // Detection errors are usually transient (no frame yet) — keep looping
        }
        if (detectingRef.current) {
          requestAnimationFrame(detect);
        }
      };

      requestAnimationFrame(detect);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Camera access denied. Allow permission and try again.';
      setError(message);
      stopCamera();
    }
  }, [handleScanComplete, stopCamera]);

  // Cleanup when closed
  useEffect(() => {
    if (!open) {
      stopCamera();
      setMode('idle');
      setError(null);
      setManualValue('');
      setHardwareDetected(false);
      setLastScan(null);
    }
  }, [open, stopCamera]);

  if (!open) return null;

  return (
    <div className='fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm'>
      <div className='relative w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden'>
        {/* Header */}
        <div className='flex items-start justify-between gap-3 p-4 border-b border-gray-100'>
          <div className='flex items-start gap-3 min-w-0'>
            <div className='shrink-0 h-10 w-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center'>
              <ScanLine className='h-5 w-5 text-white' />
            </div>
            <div className='min-w-0'>
              <h2 className='text-base font-bold text-gray-900 truncate'>{title}</h2>
              <p className='text-xs text-gray-500'>{description}</p>
            </div>
          </div>
          <button
            type='button'
            onClick={onClose}
            className='shrink-0 h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-50'
            aria-label='Close scanner'
          >
            <X className='h-4 w-4' />
          </button>
        </div>

        {/* Hardware-scanner detected banner */}
        {hardwareDetected && (
          <div className='px-4 py-2 bg-emerald-50 border-b border-emerald-100 flex items-center gap-2'>
            <CheckCircle2 className='h-4 w-4 text-emerald-600 shrink-0' />
            <p className='text-xs text-emerald-800'>
              Hardware scanner detected. Just scan — we'll capture it automatically.
            </p>
          </div>
        )}

        <div className='p-4 space-y-4'>
          {/* Mode picker */}
          {mode === 'idle' && (
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
              <button
                type='button'
                onClick={startCamera}
                className='flex items-center gap-3 rounded-xl border border-gray-200 bg-white hover:border-violet-300 hover:shadow-sm p-4 text-left transition-all'
              >
                <div className='h-10 w-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center shrink-0'>
                  <Camera className='h-5 w-5 text-white' />
                </div>
                <div className='min-w-0'>
                  <p className='text-sm font-bold text-gray-900'>Use Camera</p>
                  <p className='text-[11px] text-gray-500'>Phone or webcam</p>
                </div>
              </button>

              <button
                type='button'
                onClick={() => setMode('manual')}
                className='flex items-center gap-3 rounded-xl border border-gray-200 bg-white hover:border-violet-300 hover:shadow-sm p-4 text-left transition-all'
              >
                <div className='h-10 w-10 rounded-lg bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center shrink-0'>
                  <Keyboard className='h-5 w-5 text-white' />
                </div>
                <div className='min-w-0'>
                  <p className='text-sm font-bold text-gray-900'>Type It</p>
                  <p className='text-[11px] text-gray-500'>Enter manually</p>
                </div>
              </button>
            </div>
          )}

          {/* Camera view */}
          {mode === 'camera' && (
            <div className='space-y-3'>
              <div className='relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-black'>
                <video
                  ref={videoRef}
                  className='w-full h-full object-cover'
                  playsInline
                  muted
                />
                {/* Targeting overlay */}
                <div className='absolute inset-0 flex items-center justify-center pointer-events-none'>
                  <div className='w-3/5 aspect-square border-2 border-violet-400 rounded-xl shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]'>
                    <div className='absolute top-1/2 left-0 right-0 h-0.5 bg-violet-400 animate-pulse' />
                  </div>
                </div>
              </div>
              <p className='text-xs text-center text-gray-500'>
                Hold steady. Detection happens automatically.
              </p>
              <Button
                type='button'
                variant='outline'
                onClick={() => {
                  stopCamera();
                  setMode('idle');
                }}
                className='w-full'
              >
                Cancel camera
              </Button>
            </div>
          )}

          {/* Manual input */}
          {mode === 'manual' && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (manualValue.trim()) {
                  handleScanComplete(manualValue);
                  setManualValue('');
                }
              }}
              className='space-y-3'
            >
              <label className='text-xs font-semibold text-gray-700'>
                Barcode or QR code value
              </label>
              <input
                type='text'
                value={manualValue}
                onChange={(e) => setManualValue(e.target.value)}
                autoFocus
                placeholder='e.g. CON-0001'
                className='w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300'
              />
              <div className='flex gap-2'>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => setMode('idle')}
                  className='flex-1'
                >
                  Back
                </Button>
                <Button
                  type='submit'
                  disabled={!manualValue.trim()}
                  className='flex-1 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white'
                >
                  Submit
                </Button>
              </div>
            </form>
          )}

          {/* Error */}
          {error && (
            <div className='rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-start gap-2'>
              <AlertCircle className='h-4 w-4 text-amber-600 shrink-0 mt-0.5' />
              <p className='text-xs text-amber-800'>{error}</p>
            </div>
          )}

          {/* Last scan confirmation */}
          {lastScan && (
            <div className='rounded-lg border border-emerald-200 bg-emerald-50 p-3 flex items-center gap-2'>
              <CheckCircle2 className='h-4 w-4 text-emerald-600 shrink-0' />
              <p className='text-xs text-emerald-800 font-mono break-all'>
                Scanned: <strong>{lastScan}</strong>
              </p>
            </div>
          )}

          {/* Help text */}
          <div
            className={cn(
              'rounded-lg p-3 border text-[11px] leading-relaxed',
              hardwareDetected
                ? 'border-emerald-100 bg-emerald-50/50 text-emerald-800'
                : 'border-gray-100 bg-gray-50 text-gray-600'
            )}
          >
            <strong className='text-gray-900'>Don't have a scanner?</strong> Most $30 USB barcode scanners just work — plug
            in and scan. We also support Bluetooth scanners and the camera in your phone.{' '}
            <a
              href='/contractor-dashboard/shop'
              className='text-violet-600 hover:text-violet-700 font-semibold underline underline-offset-2'
            >
              See recommended scanners →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
