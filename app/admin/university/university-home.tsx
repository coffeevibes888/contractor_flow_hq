'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { UNIVERSITY_CATEGORIES, UNIVERSITY_ARTICLES, searchArticles } from '@/lib/constants/university-content';
import { Search, Clock, ChevronRight, GraduationCap, Zap, Star, Lock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const DIFFICULTY_COLOR = {
  beginner: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  intermediate: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  advanced: 'bg-red-500/20 text-red-300 border-red-500/30',
};

export function UniversityHome() {
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    if (!query.trim()) return null;
    return searchArticles(query);
  }, [query]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-white/10 bg-gradient-to-r from-violet-900/40 via-slate-900 to-indigo-900/40">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-600/10 via-transparent to-transparent" />
        <div className="relative max-w-4xl mx-auto px-6 py-16 text-center">
          <div className="inline-flex items-center gap-2 bg-violet-500/20 border border-violet-500/30 rounded-full px-4 py-1.5 text-violet-300 text-sm font-medium mb-6">
            <GraduationCap className="h-4 w-4" />
            PM University
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
            Everything you need to know,<br />
            <span className="text-violet-400">in one place.</span>
          </h1>
          <p className="text-slate-400 text-lg mb-8 max-w-2xl mx-auto">
            Step-by-step guides, interactive walkthroughs, and answers to every question — built specifically for property managers using this platform.
          </p>

          {/* Search */}
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search guides, features, FAQs…"
              className="pl-12 h-14 text-base bg-slate-800/80 border-white/10 text-white placeholder:text-slate-500 rounded-xl focus:border-violet-500 focus:ring-violet-500/20"
            />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12 space-y-14">

        {/* Search Results */}
        {results !== null && (
          <section>
            <h2 className="text-lg font-semibold text-white mb-4">
              {results.length === 0
                ? 'No results found'
                : `${results.length} result${results.length !== 1 ? 's' : ''} for "${query}"`}
            </h2>
            {results.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {results.map((article) => (
                  <ArticleCard key={article.slug} article={article} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Quick Start */}
        {results === null && (
          <>
            <section>
              <div className="flex items-center gap-2 mb-6">
                <Zap className="h-5 w-5 text-amber-400" />
                <h2 className="text-xl font-semibold text-white">Start Here</h2>
                <span className="text-slate-500 text-sm">— new to the platform? do these first</span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {['add-first-property', 'setup-stripe-connect', 'invite-tenant-qr', 'branding-setup'].map((slug, i) => {
                  const article = UNIVERSITY_ARTICLES.find((a) => a.slug === slug);
                  if (!article) return null;
                  return (
                    <Link
                      key={slug}
                      href={`/admin/university/article/${slug}`}
                      className="group relative rounded-2xl border border-white/10 bg-slate-900/60 p-5 hover:border-violet-500/50 hover:bg-slate-900 transition-all"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-500/20 text-violet-300 text-xs font-bold">
                          {i + 1}
                        </span>
                        <span className="text-2xl">{article.emoji}</span>
                      </div>
                      <h3 className="text-white font-semibold text-sm leading-snug mb-1 group-hover:text-violet-300 transition-colors">
                        {article.title}
                      </h3>
                      <p className="text-slate-500 text-xs line-clamp-2">{article.description}</p>
                      <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600 group-hover:text-violet-400 transition-colors" />
                    </Link>
                  );
                })}
              </div>
            </section>

            {/* Categories */}
            {UNIVERSITY_CATEGORIES.map((category) => {
              const articles = category.articleSlugs
                .map((s) => UNIVERSITY_ARTICLES.find((a) => a.slug === s))
                .filter(Boolean) as typeof UNIVERSITY_ARTICLES;

              return (
                <section key={category.id}>
                  <div className="flex items-center gap-3 mb-6">
                    <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${category.color} flex items-center justify-center text-lg`}>
                      {category.emoji}
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-white">{category.title}</h2>
                      <p className="text-slate-500 text-sm">{category.description}</p>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {articles.map((article) => (
                      <ArticleCard key={article.slug} article={article} />
                    ))}
                  </div>
                </section>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

function ArticleCard({ article }: { article: typeof UNIVERSITY_ARTICLES[number] }) {
  return (
    <Link
      href={`/admin/university/article/${article.slug}`}
      className="group flex flex-col rounded-xl border border-white/10 bg-slate-900/60 p-5 hover:border-violet-500/40 hover:bg-slate-900 transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-2xl">{article.emoji}</span>
        <div className="flex items-center gap-1.5">
          {article.proRequired && (
            <span className="flex items-center gap-1 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full px-2 py-0.5">
              <Star className="h-3 w-3" /> Pro
            </span>
          )}
          <Badge variant="outline" className={`text-xs ${DIFFICULTY_COLOR[article.difficulty]}`}>
            {article.difficulty}
          </Badge>
        </div>
      </div>
      <h3 className="text-white font-semibold text-sm leading-snug mb-1.5 group-hover:text-violet-300 transition-colors">
        {article.title}
      </h3>
      <p className="text-slate-500 text-xs line-clamp-2 flex-1">{article.description}</p>
      <div className="flex items-center gap-1 mt-3 text-slate-600 text-xs">
        <Clock className="h-3 w-3" />
        {article.readTime} min read
        <span className="ml-auto text-slate-600 group-hover:text-violet-400 transition-colors">
          <ChevronRight className="h-4 w-4" />
        </span>
      </div>
    </Link>
  );
}
