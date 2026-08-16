import { getPublishedBlogPosts } from '@/lib/actions/blog.actions';
import Link from 'next/link';
import { Metadata } from 'next';
import { formatDateTime } from '@/lib/utils';
import { canonicalUrl } from '@/lib/seo';
import { Clock, Tag, ArrowRight } from 'lucide-react';

// Cache blog list for 5 minutes
export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Blog — Property Management & Landlord Guides | Property Flow HQ',
  description:
    'Practical guides for landlords, property managers, and contractors. Tips on rent collection, tenant screening, maintenance, and growing your rental business.',
  alternates: { canonical: canonicalUrl('/blog') },
  openGraph: {
    type: 'website',
    title: 'Property Flow HQ Blog — Landlord & Property Management Guides',
    description:
      'Practical guides for landlords, property managers, and contractors. Tips on rent collection, tenant screening, maintenance, and growing your business.',
    url: canonicalUrl('/blog'),
    siteName: 'Property Flow HQ',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Property Flow HQ Blog',
    description:
      'Practical guides for landlords, property managers, and contractors.',
  },
};

/** Rough reading time from HTML string */
function readingTimeMinutes(html: string): number {
  const words = html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

type BlogListPost = Awaited<ReturnType<typeof getPublishedBlogPosts>>[number] & {
  reactions?: { type: string }[];
  comments?: { id: string }[];
  tags?: string[];
  contentHtml?: string;
  author?: {
    name?: string | null;
    image?: string | null;
  } | null;
};

const BlogPage = async () => {
  const posts = await getPublishedBlogPosts();

  return (
    <main className="w-full min-h-screen bg-white">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <section className="relative w-full pt-14 pb-10 px-4 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-b from-sky-100/50 via-cyan-50/20 to-transparent rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto space-y-3">
          <span className="inline-flex items-center gap-1.5 bg-cyan-50 text-cyan-700 text-xs font-bold px-3 py-1.5 rounded-full border border-cyan-200 tracking-wide uppercase">
            Blog
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-black tracking-tight">
            Landlord &amp; Property Management Guides
          </h1>
          <p className="text-black text-base md:text-lg max-w-2xl font-normal leading-[1.9]">
            Practical tips on rent collection, tenant screening, leases, maintenance, and growing your rental portfolio — from someone who&apos;s done it.
          </p>
        </div>
      </section>

      {/* ── Post list ──────────────────────────────────────────────── */}
      <section className="w-full px-4 pb-20">
        <div className="max-w-4xl mx-auto">

          {posts.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-8 py-16 text-center">
              <p className="text-slate-500 text-sm">No posts yet. Check back soon.</p>
            </div>
          )}

          <div className="flex flex-col gap-6">
            {posts.map((rawPost, idx) => {
              const post = rawPost as BlogListPost;
              const created = formatDateTime(post.createdAt);
              const likeCount = Array.isArray(post.reactions)
                ? post.reactions.filter((r) => r.type === 'like').length
                : 0;
              const commentCount = Array.isArray(post.comments) ? post.comments.length : 0;
              const readTime = post.contentHtml ? readingTimeMinutes(post.contentHtml) : null;
              const isFeatured = idx === 0;

              return (
                <article
                  key={post.id}
                  className={`group w-full bg-white border rounded-2xl overflow-hidden shadow-sm hover:shadow-lg hover:border-cyan-200 transition-all duration-200
                    ${isFeatured ? 'border-slate-200' : 'border-slate-200'}
                  `}
                >
                  <Link href={`/blog/${post.slug}`} className="block">
                    <div className={`flex ${isFeatured ? 'flex-col' : 'flex-col md:flex-row'} items-stretch`}>

                      {/* Cover image */}
                      <div className={`shrink-0 overflow-hidden bg-slate-100 ${isFeatured ? 'w-full h-52 md:h-64' : 'md:w-52 h-44 md:h-auto'}`}>
                        {post.coverImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={post.coverImage}
                            alt={post.title}
                            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-sky-50 to-cyan-50 border-b md:border-b-0 md:border-r border-slate-100">
                            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-sky-400 to-cyan-400 flex items-center justify-center mb-2">
                              <span className="text-white text-lg font-bold">PF</span>
                            </div>
                            <p className="text-xs text-slate-400 font-medium">Property Flow HQ</p>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className={`flex-1 flex flex-col justify-between p-5 md:p-6 min-w-0 ${isFeatured ? '' : ''}`}>
                        <div className="space-y-2.5">

                          {/* Meta row */}
                          <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-500">
                            <span>{created.dateOnly}</span>
                            {readTime && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {readTime} min read
                              </span>
                            )}
                            {post.tags && post.tags.length > 0 && (
                              <span className="flex flex-wrap gap-1">
                                {post.tags.slice(0, 2).map((tag) => (
                                  <span
                                    key={tag}
                                    className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-100 text-[10px] font-semibold uppercase tracking-wide"
                                  >
                                    <Tag className="h-2 w-2" />
                                    {tag}
                                  </span>
                                ))}
                              </span>
                            )}
                            {likeCount > 0 && (
                              <span className="flex items-center gap-1 text-rose-500">
                                <span>♥</span>
                                <span className="text-slate-600">{likeCount}</span>
                              </span>
                            )}
                            {commentCount > 0 && (
                              <span className="text-slate-500">{commentCount} comment{commentCount !== 1 ? 's' : ''}</span>
                            )}
                          </div>

                          <h2 className={`font-bold text-black leading-snug group-hover:text-cyan-700 transition-colors
                            ${isFeatured ? 'text-2xl md:text-3xl' : 'text-xl md:text-2xl'}
                          `}>
                            {post.title}
                          </h2>

                          {post.excerpt && (
                            <p className="text-sm md:text-base text-black font-normal leading-[1.9] line-clamp-3">
                              {post.excerpt}
                            </p>
                          )}
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                          <div className="flex items-center gap-2">
                            {post.author?.image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={post.author.image}
                                alt={post.author?.name || 'Author'}
                                className="w-7 h-7 rounded-full object-cover border border-slate-200"
                              />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-sky-500 to-cyan-400 flex items-center justify-center text-white text-[10px] font-bold">
                                {(post.author?.name || 'P')[0].toUpperCase()}
                              </div>
                            )}
                            <span className="text-xs font-semibold text-black">
                              {post.author?.name || 'Property Flow HQ'}
                            </span>
                          </div>
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-600 group-hover:gap-2 transition-all">
                            Read article
                            <ArrowRight className="h-3.5 w-3.5" />
                          </span>
                        </div>
                      </div>

                    </div>
                  </Link>
                </article>
              );
            })}
          </div>
        </div>
      </section>

    </main>
  );
};

export default BlogPage;
