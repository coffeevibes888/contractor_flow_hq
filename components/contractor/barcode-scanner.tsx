'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Camera, CameraOff, Keyboard, X, ScanLine, CheckCircle2, AlertTriangle } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (value: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  autoFocusInput?: boolean;
}

type ScanMode = 'camera' | 'keyboard';

export function BarcodeScanner({
  onScan,
  placeholder = 'Scan barcode or type manually...',
  label = 'Scan',
  className = '',
  autoFocusInput = false,
}: BarcodeScannerProps) {
  const [mode, setMode] = useState<ScanMode>('keyboard');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [manualValue, setManualValue] = useState('');
  const [scanFlash, setScanFlash] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const readerRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const triggerFlash = (value: string) => {
    setLastScanned(value);
    setScanFlash(true);
    setTimeout(() => setScanFlash(false), 800);
  };

  const handleScan = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return;
      triggerFlash(trimmed);
      onScan(trimmed);
    },
    [onScan]
  );

  const stopCamera = useCallback(() => {
    if (readerRef.current) {
      try {
        readerRef.current.reset();
      } catch {}
      readerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const { BrowserMultiFormatReader } = await import('@zxing/browser');
      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraActive(true);

      reader.decodeFromStream(stream, videoRef.current!, (result, err) => {
        if (result) {
          handleScan(result.getText());
        }
      });
    } catch (err: any) {
      const msg =
        err?.name === 'NotAllowedError'
          ? 'Camera permission denied. Use keyboard mode instead.'
          : err?.name === 'NotFoundError'
          ? 'No camera found on this device.'
          : 'Camera unavailable. Use keyboard mode instead.';
      setCameraError(msg);
      setCameraActive(false);
    }
  }, [handleScan]);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  useEffect(() => {
    if (mode === 'keyboard' && autoFocusInput) {
      inputRef.current?.focus();
    }
    if (mode === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
  }, [mode, autoFocusInput, startCamera, stopCamera]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualValue.trim()) {
      handleScan(manualValue);
      setManualValue('');
    }
  };

  const handleManualKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleManualSubmit(e as any);
    }
  };

  return (
    <div className={`rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/60 p-4 space-y-3 ${className}`}>
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ScanLine className="h-4 w-4 text-emerald-600" />
          <span className="text-sm font-semibold text-slate-700">{label}</span>
          <span className="text-xs text-slate-400">
            {mode === 'camera' ? '— Camera active' : '— Type or use hardware scanner'}
          </span>
        </div>
        <div className="flex gap-1">
          <Button
            type="button"
            size="sm"
            variant={mode === 'keyboard' ? 'default' : 'outline'}
            className={`h-7 px-2 text-xs ${mode === 'keyboard' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
            onClick={() => setMode('keyboard')}
          >
            <Keyboard className="h-3.5 w-3.5 mr-1" />
            Manual
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === 'camera' ? 'default' : 'outline'}
            className={`h-7 px-2 text-xs ${mode === 'camera' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
            onClick={() => setMode(mode === 'camera' ? 'keyboard' : 'camera')}
          >
            {cameraActive ? (
              <CameraOff className="h-3.5 w-3.5 mr-1" />
            ) : (
              <Camera className="h-3.5 w-3.5 mr-1" />
            )}
            Camera
          </Button>
        </div>
      </div>

      {/* Camera view */}
      {mode === 'camera' && (
        <div className="relative rounded-lg overflow-hidden bg-black aspect-video max-h-52">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            muted
            playsInline
          />
          {/* Scan guide overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-2/3 h-1/2 border-2 border-emerald-400 rounded-lg relative">
              <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-emerald-400 rounded-tl" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-emerald-400 rounded-tr" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-emerald-400 rounded-bl" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-emerald-400 rounded-br" />
              <div
                className={`absolute inset-x-0 top-1/2 h-0.5 bg-emerald-400/70 transition-opacity duration-300 ${
                  scanFlash ? 'opacity-100' : 'opacity-50'
                }`}
              />
            </div>
          </div>
          {/* Flash overlay */}
          {scanFlash && (
            <div className="absolute inset-0 bg-emerald-400/30 transition-opacity duration-300 pointer-events-none" />
          )}
          {/* Stop button */}
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="absolute top-2 right-2 h-7 px-2 text-xs opacity-80"
            onClick={() => setMode('keyboard')}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Camera error */}
      {cameraError && (
        <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
          {cameraError}
        </div>
      )}

      {/* Manual/keyboard input — also works for hardware scanners */}
      {mode === 'keyboard' && (
        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <Input
            ref={inputRef}
            value={manualValue}
            onChange={(e) => setManualValue(e.target.value)}
            onKeyDown={handleManualKeyDown}
            placeholder={placeholder}
            className="flex-1 h-9 text-sm font-mono"
            autoComplete="off"
            spellCheck={false}
          />
          <Button
            type="submit"
            size="sm"
            className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white px-3"
            disabled={!manualValue.trim()}
          >
            <ScanLine className="h-4 w-4" />
          </Button>
        </form>
      )}

      {/* Last scanned badge */}
      {lastScanned && (
        <div className={`flex items-center gap-2 text-xs transition-all duration-300 ${scanFlash ? 'text-emerald-700' : 'text-slate-500'}`}>
          <CheckCircle2 className={`h-3.5 w-3.5 ${scanFlash ? 'text-emerald-600' : 'text-slate-400'}`} />
          <span>Last scanned: <span className="font-mono font-semibold">{lastScanned}</span></span>
        </div>
      )}

      {/* Hardware scanner hint */}
      {mode === 'keyboard' && (
        <p className="text-xs text-slate-400">
          💡 Bluetooth or USB scanners work automatically — just focus the field and scan.
        </p>
      )}
    </div>
  );
}
