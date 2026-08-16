"use client";

import { useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Paperclip, File, Image as ImageIcon, Bold, Italic, Palette } from 'lucide-react';

export default function EmailComposeForm() {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [html, setHtml] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [fontFamily, setFontFamily] = useState<'sans-serif' | 'serif' | 'monospace'>('sans-serif');

  const handleToolbarClick = (command: string, value?: string) => {
    if (typeof document === 'undefined') return;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    document.execCommand(command, false, value ?? null);
    if (editorRef.current) {
      setHtml(editorRef.current.innerHTML);
    }
  };

  const triggerFilePicker = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list) {
      setFiles([]);
      return;
    }
    const next: File[] = [];
    for (let i = 0; i < list.length; i += 1) {
      next.push(list.item(i) as File);
    }
    setFiles(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmedTo = to.trim();
    const trimmedSubject = subject.trim();
    const trimmedHtml = html.trim();

    if (!trimmedTo || !trimmedSubject || !trimmedHtml) {
      setError('To, subject, and message are required.');
      return;
    }

    try {
      setIsSubmitting(true);
      const formData = new FormData();
      formData.append('to', trimmedTo);
      formData.append('subject', trimmedSubject);
      formData.append('html', trimmedHtml);
      files.forEach((file) => formData.append('attachments', file));

      const res = await fetch('/api/email/send', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.error || 'Failed to send email.');
        return;
      }

      setSuccess('Email sent.');
      setHtml('');
      if (editorRef.current) {
        editorRef.current.innerHTML = '';
      }
      setFiles([]);
    } catch {
      setError('Failed to send email.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2 text-xs text-slate-200/90">
      <div className="space-y-1">
        <label className="block text-[11px] uppercase tracking-[0.18em] text-slate-400">To</label>
        <Input
          type="email"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="someone@example.com"
          className="h-8 text-xs bg-slate-950/80 border-slate-700"
        />
      </div>
      <div className="space-y-1">
        <label className="block text-[11px] uppercase tracking-[0.18em] text-slate-400">Subject</label>
        <Input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject"
          className="h-8 text-xs bg-slate-950/80 border-slate-700"
        />
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between mb-1">
          <label className="block text-[11px] uppercase tracking-[0.18em] text-slate-400">Message</label>
          <span className="text-[10px] text-slate-500">Rich text</span>
        </div>
        <div
          ref={editorRef}
          className="min-h-[120px] text-xs bg-slate-950/80 border border-slate-700 rounded-md px-2 py-1 overflow-y-auto focus:outline-none"
          contentEditable
          onInput={(e) => setHtml((e.target as HTMLDivElement).innerHTML)}
        />
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <label className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Attachments</label>
          <button
            type="button"
            className="p-1 rounded hover:bg-slate-800 text-slate-200"
            onClick={triggerFilePicker}
            aria-label="Attach file"
          >
            <Paperclip className="w-4 h-4" />
          </button>
          <button
            type="button"
            className="p-1 rounded hover:bg-slate-800 text-slate-200"
            onClick={triggerFilePicker}
            aria-label="Attach document"
          >
            <File className="w-4 h-4" />
          </button>
          <button
            type="button"
            className="p-1 rounded hover:bg-slate-800 text-slate-200"
            onClick={triggerFilePicker}
            aria-label="Attach image"
          >
            <ImageIcon className="w-4 h-4" />
          </button>
          <select
            className="h-6 rounded bg-slate-900 border border-slate-700 px-1 text-[10px]"
            value={fontFamily}
            onChange={(e) => {
              const value = e.target.value as 'sans-serif' | 'serif' | 'monospace';
              setFontFamily(value);
              handleToolbarClick('fontName', value);
            }}
          >
            <option value="sans-serif">Sans</option>
            <option value="serif">Serif</option>
            <option value="monospace">Mono</option>
          </select>
          <button
            type="button"
            className="p-1 rounded hover:bg-slate-800 text-slate-200"
            onClick={() => handleToolbarClick('bold')}
            aria-label="Bold"
          >
            <Bold className="w-3 h-3" />
          </button>
          <button
            type="button"
            className="p-1 rounded hover:bg-slate-800 text-slate-200"
            onClick={() => handleToolbarClick('italic')}
            aria-label="Italic"
          >
            <Italic className="w-3 h-3" />
          </button>
          <label className="flex items-center gap-1 p-1 rounded hover:bg-slate-800 cursor-pointer">
            <Palette className="w-3 h-3" />
            <input
              type="color"
              className="w-4 h-4 border-0 bg-transparent p-0 cursor-pointer"
              onChange={(e) => handleToolbarClick('foreColor', e.target.value)}
            />
          </label>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFilesChange}
            className="hidden"
          />
        </div>
        {files.length > 0 && (
          <p className="text-[10px] text-slate-400">{files.length} file(s) selected</p>
        )}
      </div>
      {error && <p className="text-[11px] text-red-400">{error}</p>}
      {success && <p className="text-[11px] text-emerald-400">{success}</p>}
      <div className="flex justify-end">
        <Button
          type="submit"
          size="sm"
          className="px-3 h-8 text-[11px] bg-violet-500 hover:bg-violet-400 text-white"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Sending…' : 'Send email'}
        </Button>
      </div>
    </form>
  );
}
