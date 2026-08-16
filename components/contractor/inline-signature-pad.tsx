'use client';

/**
 * InlineSignaturePad
 *
 * Lightweight canvas signature capture. Calls `onCapture` with a PNG data URL
 * when the user accepts. Works with mouse and touch. Unlike the milestone
 * SignaturePad, this does not upload anywhere itself — the parent decides what
 * to do with the data URL (e.g. POST it to /api/upload then to sign-off).
 */

import { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { RotateCcw, Check } from 'lucide-react';

interface Props {
  onCapture: (dataUrl: string) => void;
  disabled?: boolean;
}

export function InlineSignaturePad({ onCapture, disabled }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [isEmpty, setIsEmpty] = useState(true);

  const prepareCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  useEffect(() => { prepareCanvas(); }, [prepareCanvas]);

  const pos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const start = (e: React.MouseEvent | React.TouchEvent) => {
    if (disabled) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    drawing.current = true;
    setIsEmpty(false);
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const move = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing.current || disabled) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const end = () => { drawing.current = false; };

  const clear = () => {
    prepareCanvas();
    setIsEmpty(true);
  };

  const accept = () => {
    const canvas = canvasRef.current;
    if (!canvas || isEmpty) return;
    onCapture(canvas.toDataURL('image/png'));
  };

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        className="w-full h-36 rounded-lg border-2 border-dashed border-gray-300 bg-white touch-none cursor-crosshair"
        onMouseDown={start}
        onMouseMove={move}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={start}
        onTouchMove={move}
        onTouchEnd={end}
      />
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-gray-400">Sign above with mouse or finger</p>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" onClick={clear}
            className="border-gray-200 text-xs h-7">
            <RotateCcw className="h-3 w-3 mr-1" /> Clear
          </Button>
          <Button type="button" size="sm" onClick={accept} disabled={isEmpty || disabled}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7">
            <Check className="h-3 w-3 mr-1" /> Use Signature
          </Button>
        </div>
      </div>
    </div>
  );
}
