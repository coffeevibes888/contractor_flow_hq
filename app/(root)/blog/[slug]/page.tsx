import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { getBlogPostBySlug, addBlogComment } from '@/lib/actions/blog.actions';
import { formatDateTime } from '@/lib/utils';
import { auth } from '@/auth';
import Link from 'next/link';
import { canonicalUrl, articleLd, breadcrumbLd, truncateDescription } from '@/lib/seo';
import JsonLdScript from '@/components/seo/json-ld-script';
import { ReadingProgressBar, TableOfContents, LikeButton } from '@/components/blog/blog-reading-ui';
import { Clock, Tag, ArrowLeft, MessageSquare } from 'lucide-react';

// Each blog post lives under a stable slug — let Next cache the rendered
// HTML for an hour, then refresh on demand.
export const revalidate = 3600;

export async function generateMetadata(props: any): Promise<Metadata> {
  const { params } = props as { params: Promise<{ slug: string }> };
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);

  if (!post || !post.isPublished) {
    return { title: 'Post Not Found', robots: { index: false, follow: false } };
  }

  const url = canonicalUrl(`/blog/${post.slug}`);
  const description = truncateDescription(
    post.excerpt ||
      post.contentHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
    160
  );
  const images = post.coverImage ? [{ url: post.coverImage, alt: post.title }] : undefined;

  return {
    title: `${post.title} — Property Flow HQ Blog`,
    description,
    keywords: post.tags?.length ? post.tags : undefined,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      url,
      title: post.title,
      description,
      siteName: 'Property Flow HQ',
      images,
      publishedTime: post.createdAt.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
      authors: post.author?.name ? [post.author.name] : ['Property Flow HQ'],
      tags: post.tags?.length ? post.tags : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description,
      images: post.coverImage ? [post.coverImage] : undefined,
    },
  };
}

/** Estimate reading time from HTML content */
function readingTimeMinutes(html: string): number {
  const words = html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const BlogPostPage = async (props: any) => {
  const { params } = props as { params: Promise<{ slug: string }> };
  const { slug } = await params;

  const [session, post] = await Promise.all([
    auth(),
    getBlogPostBySlug(slug),
  ]);

  if (!post || !post.isPublished) {
    notFound();
  }

  const created = formatDateTime(post.createdAt);
  const isAdmin = session?.user?.role === 'admin';
  const userId = session?.user?.id as string | undefined;
  const likeCount = post.reactions.filter((r) => r.type === 'like').length;
  const userLiked = !!userId && post.reactions.some((r) => r.type === 'like' && r.userId === userId);
  const readTime = readingTimeMinutes(post.contentHtml);

  const url = canonicalUrl(`/blog/${post.slug}`);
  const description = truncateDescription(
    post.excerpt ||
      post.contentHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
    300
  );
  const structuredData = [
    articleLd({
      url,
      title: post.title,
      description,
      image: post.coverImage || undefined,
      datePublished: post.createdAt,
      dateModified: post.updatedAt,
      authorName: post.author?.name || 'Property Flow HQ',
      authorImage: post.author?.image || undefined,
      tags: post.tags || undefined,
      publisherLogo: canonicalUrl('/images/logo.svg'),
    }),
    breadcrumbLd([
      { name: 'Home', path: '/' },
      { name: 'Blog', path: '/blog' },
      { name: post.title, path: `/blog/${post.slug}` },
    ]),
  ];

  return (
    <main className="w-full min-h-screen bg-white">
      <JsonLdScript data={structuredData} id="blog-post-jsonld" />

      {/* Scroll progress bar — thin cyan line at very top of viewport */}
      <ReadingProgressBar />

      {/* ── Cover image hero ─────────────────────────────────────── */}
      {post.coverImage && (
        <div className="w-full max-h-[480px] overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.coverImage}
            alt={post.title}
            className="w-full h-[480px] object-cover"
          />
        </div>
      )}

      {/* ── Main layout: sidebar ToC + article ───────────────────── */}
      <div className="max-w-7xl mx-auto px-4 py-10 md:py-14">
        <div className="flex gap-12 items-start">

          {/* Article column */}
          <div className="flex-1 min-w-0 max-w-3xl mx-auto xl:mx-0">

            {/* Back link */}
            <Link
              href="/blog"
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 mb-6 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Blog
            </Link>

            {/* ── Header ── */}
            <header className="space-y-4 mb-8">

              {/* Tags */}
              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 border border-violet-100 text-[11px] font-semibold uppercase tracking-wide"
                    >
                      <Tag className="h-2.5 w-2.5" />
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-black leading-[1.15] tracking-tight">
                {post.title}
              </h1>

              {post.excerpt && (
                <p className="text-lg md:text-xl text-black leading-[1.9] font-normal">
                  {post.excerpt}
                </p>
              )}

              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-4 pt-1 border-t border-slate-100">
                <div className="flex items-center gap-2.5">
                  {post.author?.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={post.author.image}
                      alt={post.author.name || 'Author'}
                      className="w-9 h-9 rounded-full object-cover border-2 border-white shadow-sm ring-1 ring-slate-200"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-500 to-cyan-400 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                      {(post.author?.name || 'P')[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-black">
                      {post.author?.name || 'Property Flow HQ'}
                    </p>
                    <p className="text-xs text-black/60">{created.dateOnly}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Clock className="h-3.5 w-3.5" />
                  {readTime} min read
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <MessageSquare className="h-3.5 w-3.5" />
                  {post.comments.length} comment{post.comments.length !== 1 ? 's' : ''}
                </div>

                <div className="ml-auto flex items-center gap-3">
                  {/* Optimistic like button */}
                  <LikeButton
                    postId={post.id}
                    initialCount={likeCount}
                    initialLiked={userLiked}
                    isLoggedIn={!!userId}
                  />

                  {isAdmin && (
                    <div className="flex items-center gap-3 text-xs">
                      <Link
                        href={`/admin/blog/create?edit=${post.slug}`}
                        className="underline text-violet-600 hover:text-violet-700"
                      >
                        Edit
                      </Link>
                      <form
                        action={async () => {
                          'use server';
                          await import('@/lib/actions/blog.actions').then((m) => m.deleteBlogPost(post.id));
                        }}
                      >
                        <button type="submit" className="text-rose-600 hover:text-rose-700 underline">
                          Delete
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            </header>

            {/* ── Article body ── */}
            <article
              id="blog-article-body"
              className="
                prose prose-lg max-w-none
                prose-headings:font-bold prose-headings:tracking-tight prose-headings:scroll-mt-24
                prose-headings:[color:#000000]
                prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl
                prose-p:[color:#000000] prose-p:leading-[1.9] prose-p:font-normal
                prose-a:text-violet-600 prose-a:font-medium prose-a:no-underline hover:prose-a:underline
                prose-strong:[color:#000000] prose-strong:font-bold
                prose-blockquote:border-l-4 prose-blockquote:border-cyan-400 prose-blockquote:bg-cyan-50/50 prose-blockquote:rounded-r-lg prose-blockquote:py-1 prose-blockquote:[color:#000000] prose-blockquote:not-italic
                prose-code:bg-slate-100 prose-code:text-violet-700 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono prose-code:before:content-none prose-code:after:content-none
                prose-pre:bg-slate-900 prose-pre:[color:#ffffff] prose-pre:rounded-xl
                prose-img:rounded-xl prose-img:border prose-img:border-slate-200 prose-img:shadow-md
                prose-table:text-sm
                prose-th:bg-slate-50 prose-th:font-semibold
                prose-li:[color:#000000] prose-li:leading-[1.9]
                [&_h2]:mt-12 [&_h3]:mt-8
              "
            >
              <div dangerouslySetInnerHTML={{ __html: post.contentHtml }} />
            </article>

            {/* ── Tags footer ── */}
            {post.tags && post.tags.length > 0 && (
              <div className="mt-12 pt-6 border-t border-slate-100 flex flex-wrap gap-2 items-center">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide mr-1">Tags:</span>
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium hover:bg-violet-50 hover:text-violet-700 transition-colors cursor-default"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* ── Author card ── */}
            <div className="mt-10 rounded-2xl border border-slate-200 bg-slate-50 p-5 md:p-6 flex items-start gap-4">
              {post.author?.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={post.author.image}
                  alt={post.author.name || 'Author'}
                  className="w-14 h-14 rounded-full object-cover border-2 border-white shadow ring-1 ring-slate-200 shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-sky-500 to-cyan-400 flex items-center justify-center text-white text-xl font-bold shrink-0">
                  {(post.author?.name || 'P')[0].toUpperCase()}
                </div>
              )}
              <div className="space-y-1 min-w-0">
                <p className="font-bold text-black text-sm">{post.author?.name || 'Property Flow HQ'}</p>
                <p className="text-xs text-black/60">Founder &amp; Developer · Property Flow HQ</p>
                <p className="text-sm text-black leading-[1.9] mt-1">
                  Former property manager who spent years chasing rent in cash and sorting paperwork at midnight.
                  Built this platform so you don&apos;t have to.
                </p>
              </div>
            </div>

            {/* ── Comments ── */}
            <section id="comments" className="mt-12 space-y-5 border-t border-slate-100 pt-8">
              <h2 className="text-xl font-bold text-black flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-slate-400" />
                Comments
                {post.comments.length > 0 && (
                  <span className="text-sm font-normal text-slate-400">({post.comments.length})</span>
                )}
              </h2>

              {post.comments.length === 0 && (
                <p className="text-sm text-slate-500">No comments yet. Be the first to share a thought.</p>
              )}

              <div className="space-y-4">
                {post.comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
                  >
                    {comment.user.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={comment.user.image}
                        alt={comment.user.name || 'User'}
                        className="w-8 h-8 rounded-full object-cover border border-slate-200 mt-0.5 shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-blue-400 flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5">
                        {(comment.user.name || 'U')[0].toUpperCase()}
                      </div>
                    )}
                    <div className="space-y-0.5 min-w-0">
                      <p className="text-sm font-semibold text-black">{comment.user.name || 'User'}</p>
                      <p className="text-sm text-black whitespace-pre-wrap leading-[1.9]">{comment.content}</p>
                    </div>
                  </div>
                ))}
              </div>

              {session ? (
                <form
                  action={async (formData: FormData) => {
                    'use server';
                    const content = String(formData.get('content') || '');
                    await addBlogComment(post.id, content);
                  }}
                  className="mt-4 space-y-3"
                >
                  <textarea
                    name="content"
                    rows={3}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200 resize-none"
                    placeholder="Share your thoughts..."
                  />
                  <button
                    type="submit"
                    className="rounded-full bg-gradient-to-r from-sky-500 to-cyan-400 px-5 py-2 text-sm text-white font-semibold shadow-sm hover:shadow-md hover:scale-[1.02] transition-all"
                  >
                    Post comment
                  </button>
                </form>
              ) : (
                <p className="text-sm text-slate-500 bg-slate-50 rounded-xl px-4 py-3 border border-slate-200">
                  <Link href="/sign-in" className="font-semibold text-violet-600 hover:underline">Sign in</Link>
                  {' '}to join the conversation.
                </p>
              )}
            </section>

          </div>

          {/* ── Sticky ToC sidebar (xl+ only) ── */}
          <TableOfContents contentHtml={post.contentHtml} />

        </div>
      </div>
    </main>
  );
};

export default BlogPostPage;
