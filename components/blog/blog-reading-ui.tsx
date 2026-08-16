'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';

// ── Reading Progress Bar ─────────────────────────────────────────────────────
export function ReadingProgressBar() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const update = () => {
      const el = document.documentElement;
      const scrollTop = el.scrollTop || document.body.scrollTop;
      const scrollHeight = el.scrollHeight - el.clientHeight;
      setProgress(scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0);
    };
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-[3px] bg-slate-100">
      <div
        className="h-full bg-gradient-to-r from-sky-500 to-cyan-400 transition-[width] duration-100"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

// ── Table of Contents (sticky sidebar) ───────────────────────────────────────
interface TocItem {
  id: string;
  text: string;
  level: number;
}

export function TableOfContents({ contentHtml }: { contentHtml: string }) {
  const [headings, setHeadings] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>('');

  // Parse headings from the rendered DOM (not the raw HTML) so IDs match
  useEffect(() => {
    const article = document.getElementById('blog-article-body');
    if (!article) return;

    const els = Array.from(article.querySelectorAll('h1, h2, h3'));
    const items: TocItem[] = els.map((el, i) => {
      const id = el.id || `heading-${i}`;
      if (!el.id) el.id = id;
      return {
        id,
        text: el.textContent?.trim() || '',
        level: parseInt(el.tagName[1]),
      };
    });
    setHeadings(items);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentHtml]);

  // Intersection observer to highlight the visible heading
  useEffect(() => {
    if (headings.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((e) => e.isIntersecting);
        if (visible) setActiveId(visible.target.id);
      },
      { rootMargin: '0px 0px -60% 0px', threshold: 0.1 }
    );
    headings.forEach((h) => {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [headings]);

  if (headings.length < 2) return null;

  return (
    <nav className="hidden xl:block sticky top-24 w-56 shrink-0 self-start">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-3">
        On this page
      </p>
      <ul className="space-y-1 border-l border-slate-200">
        {headings.map((h) => (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(h.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className={`block text-xs leading-snug py-1 transition-colors
                ${h.level === 1 ? 'pl-3' : h.level === 2 ? 'pl-3' : 'pl-6'}
                ${activeId === h.id
                  ? 'text-cyan-600 font-semibold border-l-2 border-cyan-500 -ml-px'
                  : 'text-slate-500 hover:text-slate-800'
                }
              `}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

// ── Like Button (interactive) ─────────────────────────────────────────────────
export function LikeButton({
  postId,
  initialCount,
  initialLiked,
  isLoggedIn,
}: {
  postId: string;
  initialCount: number;
  initialLiked: boolean;
  isLoggedIn: boolean;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [pending, setPending] = useState(false);

  const handleLike = async () => {
    if (!isLoggedIn || pending) return;
    setPending(true);
    // Optimistic update
    setLiked((v) => !v);
    setCount((c) => (liked ? c - 1 : c + 1));
    try {
      const { toggleBlogLike } = await import('@/lib/actions/blog.actions');
      await toggleBlogLike(postId);
    } catch {
      // Revert on error
      setLiked((v) => !v);
      setCount((c) => (liked ? c + 1 : c - 1));
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      onClick={handleLike}
      disabled={!isLoggedIn || pending}
      title={isLoggedIn ? (liked ? 'Unlike' : 'Like this post') : 'Sign in to like'}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium transition-all
        ${liked
          ? 'border-rose-300 bg-rose-50 text-rose-600 hover:bg-rose-100'
          : 'border-slate-200 bg-white text-slate-600 hover:border-rose-200 hover:text-rose-500'
        }
        ${!isLoggedIn ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <span className="text-base">{liked ? '♥' : '♡'}</span>
      <span>{count}</span>
    </button>
  );
}
