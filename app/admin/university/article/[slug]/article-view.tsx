'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UniversityArticle, getArticle } from '@/lib/constants/university-content';
import {
  ChevronLeft, ChevronRight, Clock, GraduationCap, Star, Play,
  CheckCircle2, Circle, ChevronDown, ChevronUp, Zap, ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const DIFFICULTY_COLOR = {
  beginner: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  intermediate: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  advanced: 'bg-red-500/20 text-red-300 border-red-500/30',
};

interface ArticleViewProps {
  article: UniversityArticle;
}

export function ArticleView({ article }: ArticleViewProps) {
  const router = useRouter();
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [activeStep, setActiveStep] = useState(0);
  const [openFaqs, setOpenFaqs] = useState<Set<number>>(new Set());
  const [tourActive, setTourActive] = useState(false);

  const toggleStep = (i: number) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const toggleFaq = (i: number) => {
    setOpenFaqs((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const startTour = useCallback(async () => {
    if (article.tourSteps.length === 0) return;
    setTourActive(true);

    // Dynamically import Shepherd to avoid SSR issues
    const Shepherd = (await import('shepherd.js')).default;

    const tour = new Shepherd.Tour({
      useModalOverlay: true,
      defaultStepOptions: {
        classes: 'pfhq-tour-step',
        scrollTo: { behavior: 'smooth', block: 'center' },
        cancelIcon: { enabled: true },
        modalOverlayOpeningPadding: 8,
        modalOverlayOpeningRadius: 8,
      },
    });

    article.tourSteps.forEach((step, index) => {
      const isLast = index === article.tourSteps.length - 1;

      tour.addStep({
        id: `step-${index}`,
        title: step.title,
        text: step.content,
        attachTo: { element: step.target, on: step.placement || 'auto' },
        buttons: [
          ...(index > 0
            ? [{ text: '← Back', action: tour.back, classes: 'shepherd-btn-secondary' }]
            : []),
          {
            text: isLast ? 'Done ✓' : 'Next →',
            action: isLast ? tour.complete : tour.next,
            classes: 'shepherd-btn-primary',
          },
        ],
        when: {
          show() {
            // If this step requires a route change, navigate first
            if (step.route && typeof window !== 'undefined') {
              const current = window.location.pathname;
              if (!current.startsWith(step.route)) {
                router.push(step.route);
              }
            }
          },
        },
      });
    });

    tour.on('complete', () => setTourActive(false));
    tour.on('cancel', () => setTourActive(false));

    // If first step has a route, navigate there first
    const firstRoute = article.tourSteps[0]?.route;
    if (firstRoute) {
      router.push(firstRoute);
      // Small delay to let the page render before starting tour
      setTimeout(() => tour.start(), 600);
    } else {
      tour.start();
    }
  }, [article.tourSteps, router]);

  const progress = article.steps.length > 0
    ? Math.round((completedSteps.size / article.steps.length) * 100)
    : 0;

  const relatedArticles = (article.relatedSlugs || [])
    .map((s) => getArticle(s))
    .filter(Boolean) as UniversityArticle[];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Top bar */}
      <div className="sticky top-0 z-10 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center gap-4">
          <Link
            href="/admin/university"
            className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            PM University
          </Link>
          <span className="text-slate-700">/</span>
          <span className="text-slate-300 text-sm truncate">{article.title}</span>
          {progress > 0 && (
            <div className="ml-auto flex items-center gap-2">
              <div className="h-1.5 w-24 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-violet-500 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs text-slate-500">{progress}%</span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-10">

        {/* Article header */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={DIFFICULTY_COLOR[article.difficulty]}>
              {article.difficulty}
            </Badge>
            {article.proRequired && (
              <span className="flex items-center gap-1 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full px-2.5 py-0.5">
                <Star className="h-3 w-3" /> Pro plan required
              </span>
            )}
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <Clock className="h-3 w-3" /> {article.readTime} min read
            </span>
          </div>

          <div className="flex items-start gap-4">
            <span className="text-5xl">{article.emoji}</span>
            <div>
              <h1 className="text-3xl font-bold text-white leading-tight">{article.title}</h1>
              <p className="text-slate-400 mt-2 text-base">{article.description}</p>
            </div>
          </div>

          {/* Live tour CTA */}
          {article.tourSteps.length > 0 && (
            <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                <Play className="h-5 w-5 text-violet-300" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium text-sm">Interactive Walkthrough Available</p>
                <p className="text-violet-300/70 text-xs mt-0.5">
                  Launch a live tour that highlights the exact buttons and sections on your dashboard.
                </p>
              </div>
              <Button
                onClick={startTour}
                disabled={tourActive}
                className="bg-violet-600 hover:bg-violet-500 text-white flex-shrink-0"
                size="sm"
              >
                <Zap className="h-4 w-4 mr-1.5" />
                {tourActive ? 'Tour running…' : 'Start Tour'}
              </Button>
            </div>
          )}
        </div>

        {/* Steps */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-violet-400" />
            Step-by-Step Guide
          </h2>
          <div className="space-y-3">
            {article.steps.map((step, i) => {
              const done = completedSteps.has(i);
              const isActive = activeStep === i;

              return (
                <div
                  key={i}
                  className={cn(
                    'rounded-xl border transition-all cursor-pointer',
                    done
                      ? 'border-emerald-500/30 bg-emerald-500/5'
                      : isActive
                      ? 'border-violet-500/50 bg-violet-500/10'
                      : 'border-white/10 bg-slate-900/60 hover:border-white/20'
                  )}
                  onClick={() => setActiveStep(isActive ? -1 : i)}
                >
                  <div className="flex items-start gap-4 p-4">
                    {/* Step number / check */}
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleStep(i); }}
                      className="flex-shrink-0 mt-0.5"
                      aria-label={done ? 'Mark incomplete' : 'Mark complete'}
                    >
                      {done ? (
                        <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                      ) : (
                        <div className="h-6 w-6 rounded-full border-2 border-slate-600 flex items-center justify-center text-xs text-slate-500 font-bold">
                          {i + 1}
                        </div>
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className={cn(
                          'font-semibold text-sm',
                          done ? 'text-emerald-300 line-through opacity-70' : 'text-white'
                        )}>
                          {step.title}
                        </h3>
                        {isActive
                          ? <ChevronUp className="h-4 w-4 text-slate-500 flex-shrink-0" />
                          : <ChevronDown className="h-4 w-4 text-slate-500 flex-shrink-0" />
                        }
                      </div>

                      {isActive && (
                        <div className="mt-3 space-y-3">
                          <p className="text-slate-300 text-sm leading-relaxed">{step.description}</p>

                          {/* Callout annotations rendered as SVG overlay on image */}
                          {step.image && (
                            <div className="relative rounded-lg overflow-hidden border border-white/10 bg-slate-800">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={step.image}
                                alt={step.title}
                                className="w-full h-auto"
                              />
                              {step.callouts && step.callouts.length > 0 && (
                                <svg
                                  className="absolute inset-0 w-full h-full pointer-events-none"
                                  viewBox="0 0 100 100"
                                  preserveAspectRatio="none"
                                >
                                  {step.callouts.map((c, ci) => (
                                    <g key={ci}>
                                      {c.type === 'circle' && (
                                        <>
                                          <circle
                                            cx={c.x}
                                            cy={c.y}
                                            r="4"
                                            fill="none"
                                            stroke={c.color || '#8b5cf6'}
                                            strokeWidth="0.8"
                                            opacity="0.9"
                                          />
                                          <circle
                                            cx={c.x}
                                            cy={c.y}
                                            r="1.5"
                                            fill={c.color || '#8b5cf6'}
                                            opacity="0.9"
                                          />
                                        </>
                                      )}
                                      {c.type === 'arrow' && (
                                        <path
                                          d={`M ${c.x - 8} ${c.y - 8} L ${c.x} ${c.y}`}
                                          stroke={c.color || '#f59e0b'}
                                          strokeWidth="0.8"
                                          fill="none"
                                          markerEnd="url(#arrowhead)"
                                          opacity="0.9"
                                        />
                                      )}
                                      {c.type === 'badge' && (
                                        <>
                                          <rect
                                            x={c.x - 6}
                                            y={c.y - 3}
                                            width="12"
                                            height="6"
                                            rx="1"
                                            fill={c.color || '#8b5cf6'}
                                            opacity="0.9"
                                          />
                                          <text
                                            x={c.x}
                                            y={c.y + 1.5}
                                            textAnchor="middle"
                                            fontSize="3"
                                            fill="white"
                                          >
                                            {c.label}
                                          </text>
                                        </>
                                      )}
                                    </g>
                                  ))}
                                  <defs>
                                    <marker id="arrowhead" markerWidth="4" markerHeight="4" refX="2" refY="2" orient="auto">
                                      <polygon points="0 0, 4 2, 0 4" fill="#f59e0b" />
                                    </marker>
                                  </defs>
                                </svg>
                              )}
                            </div>
                          )}

                          <button
                            onClick={(e) => { e.stopPropagation(); toggleStep(i); setActiveStep(i + 1); }}
                            className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-colors"
                          >
                            {done ? 'Mark incomplete' : 'Mark as done'}
                            <ChevronRight className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {completedSteps.size === article.steps.length && article.steps.length > 0 && (
            <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-emerald-400 flex-shrink-0" />
              <div>
                <p className="text-emerald-300 font-semibold text-sm">All steps complete!</p>
                <p className="text-emerald-400/70 text-xs">You've finished this guide. Check out related articles below.</p>
              </div>
            </div>
          )}
        </section>

        {/* FAQ */}
        {article.faqs.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-white mb-4">Frequently Asked Questions</h2>
            <div className="space-y-2">
              {article.faqs.map((faq, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-white/10 bg-slate-900/60 overflow-hidden"
                >
                  <button
                    onClick={() => toggleFaq(i)}
                    className="w-full flex items-center justify-between gap-4 p-4 text-left hover:bg-white/5 transition-colors"
                  >
                    <span className="text-white text-sm font-medium">{faq.question}</span>
                    {openFaqs.has(i)
                      ? <ChevronUp className="h-4 w-4 text-slate-500 flex-shrink-0" />
                      : <ChevronDown className="h-4 w-4 text-slate-500 flex-shrink-0" />
                    }
                  </button>
                  {openFaqs.has(i) && (
                    <div className="px-4 pb-4 text-slate-400 text-sm leading-relaxed border-t border-white/5 pt-3">
                      {faq.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Related articles */}
        {relatedArticles.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-white mb-4">Related Guides</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {relatedArticles.map((related) => (
                <Link
                  key={related.slug}
                  href={`/admin/university/article/${related.slug}`}
                  className="group flex items-center gap-3 rounded-xl border border-white/10 bg-slate-900/60 p-4 hover:border-violet-500/40 hover:bg-slate-900 transition-all"
                >
                  <span className="text-2xl flex-shrink-0">{related.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium group-hover:text-violet-300 transition-colors truncate">
                      {related.title}
                    </p>
                    <p className="text-slate-500 text-xs flex items-center gap-1 mt-0.5">
                      <Clock className="h-3 w-3" /> {related.readTime} min
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-600 group-hover:text-violet-400 transition-colors flex-shrink-0" />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Back to university */}
        <div className="pt-4 border-t border-white/10">
          <Link
            href="/admin/university"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to PM University
          </Link>
        </div>
      </div>
    </div>
  );
}
