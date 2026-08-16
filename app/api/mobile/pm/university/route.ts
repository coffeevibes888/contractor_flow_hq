/**
 * GET /api/mobile/pm/university
 *
 * Returns the list of PM University articles + categories for the mobile
 * app. The full article walkthroughs (with screenshots + Shepherd tours)
 * live on the website — mobile shows a quick-jump list and opens article
 * detail in a browser.
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyMobileToken } from '@/lib/mobile-auth';
import { UNIVERSITY_CATEGORIES, UNIVERSITY_ARTICLES } from '@/lib/constants/university-content';

const PM_ROLES = new Set(['admin', 'superAdmin', 'landlord', 'property_manager']);

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyMobileToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    if (!PM_ROLES.has(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const articles = UNIVERSITY_ARTICLES.map((a) => ({
      slug: a.slug,
      title: a.title,
      description: a.description,
      category: a.category,
      emoji: a.emoji,
      readTime: a.readTime,
      difficulty: a.difficulty,
      proRequired: a.proRequired ?? false,
      stepCount: a.steps.length,
    }));

    const categories = UNIVERSITY_CATEGORIES.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      emoji: c.emoji,
      articleSlugs: c.articleSlugs,
    }));

    return NextResponse.json({ categories, articles });
  } catch (error: any) {
    console.error('[mobile/pm/university]', error);
    return NextResponse.json({ error: error?.message ?? 'Server error' }, { status: 500 });
  }
}
