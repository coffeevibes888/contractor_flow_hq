/**
 * One-off: list every BlogPost row so the user can see what's in the
 * database before we delete anything. Run with:
 *
 *   npx tsx scripts/list-blog-posts.ts
 */
import { prisma } from '@/db/prisma';

async function main() {
  const posts = await prisma.blogPost.findMany({
    select: {
      id: true,
      title: true,
      slug: true,
      isPublished: true,
      createdAt: true,
      _count: { select: { comments: true, reactions: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (posts.length === 0) {
    console.log('No blog posts in the database.');
    return;
  }

  console.log(`Found ${posts.length} blog post(s):\n`);
  for (const p of posts) {
    console.log(`  id:        ${p.id}`);
    console.log(`  title:     ${p.title || '(empty)'}`);
    console.log(`  slug:      ${p.slug || '(empty)'}`);
    console.log(`  published: ${p.isPublished}`);
    console.log(`  created:   ${p.createdAt.toISOString()}`);
    console.log(`  comments:  ${p._count.comments}`);
    console.log(`  reactions: ${p._count.reactions}`);
    console.log('');
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
