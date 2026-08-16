import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/auth-guard';
import { getArticle, UNIVERSITY_ARTICLES } from '@/lib/constants/university-content';
import { ArticleView } from './article-view';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return UNIVERSITY_ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return { title: 'Not Found' };
  return {
    title: `${article.title} | PM University`,
    description: article.description,
  };
}

export default async function ArticlePage({ params }: Props) {
  await requireAdmin();
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();
  return <ArticleView article={article} />;
}
