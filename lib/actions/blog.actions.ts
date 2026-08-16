"use server";

import { z } from "zod";
import { prisma } from "@/db/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { formatError } from "@/lib/utils";
import { canonicalUrl } from "@/lib/seo";
import { indexNowSubmit } from "@/lib/seo/indexnow";
import { insertBlogPostSchema, updateBlogPostSchema } from "@/lib/validators";

/**
 * Convert any string into a URL-safe slug. Mirrored on the editor client
 * so the user sees the cleaned value as they type, but we re-apply server-
 * side as a defensive measure (in case a slug arrived with whitespace,
 * uppercase, or punctuation from a stale form or external API).
 */
function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function createBlogPost(data: z.infer<typeof insertBlogPostSchema>) {
  try {
    const session = await auth();
    if (session?.user?.role !== "admin" && session?.user?.role !== "superAdmin") {
      throw new Error("Only admins can create blog posts");
    }

    // Normalize the slug before validation so a user-typed "My Post Title"
    // or trailing-whitespace slug becomes "my-post-title" and the link
    // emitted on the listing page actually resolves at /blog/<slug>.
    const slug = normalizeSlug(data.slug || data.title || '');
    if (!slug || slug.length < 3) {
      return {
        success: false,
        message: 'Slug must be at least 3 characters after normalization. Use letters, numbers, and dashes.',
      };
    }

    const parsed = insertBlogPostSchema.parse({
      ...data,
      slug,
      authorId: session.user.id,
    });

    // Helpful error on duplicate slug instead of a Prisma unique-violation
    const existing = await prisma.blogPost.findUnique({
      where: { slug: parsed.slug },
      select: { id: true },
    });
    if (existing) {
      return {
        success: false,
        message: `A post with the slug "${parsed.slug}" already exists. Pick a different slug.`,
      };
    }

    const post = await prisma.blogPost.create({
      data: parsed,
    });

    revalidatePath("/blog");
    revalidatePath(`/blog/${post.slug}`);

    // Tell Bing/Yandex/IndexNow about the new post immediately so it
    // doesn't have to wait for the next sitemap crawl. Best-effort.
    if (post.isPublished) {
      void indexNowSubmit([
        canonicalUrl(`/blog/${post.slug}`),
        canonicalUrl('/blog'),
      ]);
    }

    return { success: true, message: "Blog post created", post };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

export async function deleteBlogPost(id: string) {
  try {
    const session = await auth();
    if (session?.user?.role !== "admin" && session?.user?.role !== "superAdmin") {
      throw new Error("Only admins can delete blog posts");
    }

    const post = await prisma.blogPost.delete({ where: { id } });

    revalidatePath("/blog");
    revalidatePath(`/blog/${post.slug}`);

    return { success: true, message: "Blog post deleted" };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

export async function updateBlogPost(data: z.infer<typeof updateBlogPostSchema>) {
  try {
    const session = await auth();
    if (session?.user?.role !== "admin" && session?.user?.role !== "superAdmin") {
      throw new Error("Only admins can update blog posts");
    }

    const parsed = updateBlogPostSchema.parse(data);

    const post = await prisma.blogPost.update({
      where: { id: parsed.id },
      data: {
        title: parsed.title,
        slug: parsed.slug,
        excerpt: parsed.excerpt,
        contentHtml: parsed.contentHtml,
        coverImage: parsed.coverImage,
        mediaUrls: parsed.mediaUrls,
        tags: parsed.tags,
        isPublished: parsed.isPublished,
      },
    });

    revalidatePath("/blog");
    revalidatePath(`/blog/${post.slug}`);

    // Re-submit to IndexNow so search engines pick up the edited title /
    // excerpt / content. We submit on every update because Bing's API is
    // cheap and the worst case is a redundant re-crawl.
    if (post.isPublished) {
      void indexNowSubmit([
        canonicalUrl(`/blog/${post.slug}`),
        canonicalUrl('/blog'),
      ]);
    }

    return { success: true, message: "Blog post updated", post };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

export async function getPublishedBlogPosts() {
  const posts = await prisma.blogPost.findMany({
    where: { isPublished: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      contentHtml: true,
      coverImage: true,
      createdAt: true,
      updatedAt: true,
      author: {
        select: { name: true, image: true },
      },
      reactions: {
        select: { type: true },
      },
      comments: {
        select: { id: true },
      },
    },
  });

  return posts;
}

export async function toggleBlogLike(postId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error("You must be logged in to like a post");
    }

    const userId = session.user.id as string;

    const existing = await prisma.blogReaction.findFirst({
      where: { postId, userId, type: "like" },
    });

    if (existing) {
      await prisma.blogReaction.delete({ where: { id: existing.id } });
    } else {
      await prisma.blogReaction.create({
        data: { postId, userId, type: "like" },
      });
    }

    const count = await prisma.blogReaction.count({
      where: { postId, type: "like" },
    });

    revalidatePath(`/blog/${postId}`);

    return { success: true, count, liked: !existing };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

export async function addBlogComment(postId: string, content: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error("You must be logged in to comment");
    }

    const trimmed = content.trim();
    if (!trimmed) {
      throw new Error("Comment cannot be empty");
    }

    await prisma.blogComment.create({
      data: {
        postId,
        userId: session.user.id as string,
        content: trimmed,
      },
    });

    revalidatePath(`/blog/${postId}`);

    return { success: true, message: "Comment added" };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

export async function getBlogPostBySlug(slug: string) {
  const post = await prisma.blogPost.findUnique({
    where: { slug },
    include: {
      author: {
        select: { name: true, image: true },
      },
      comments: {
        orderBy: { createdAt: "asc" },
        include: {
          user: {
            select: { name: true, image: true },
          },
        },
      },
      reactions: true,
    },
  });

  return post;
}

export async function getAllBlogPostsForAdmin() {
  const session = await auth();
  if (session?.user?.role !== "admin" && session?.user?.role !== "superAdmin") {
    throw new Error("Only admins can view all posts");
  }

  const posts = await prisma.blogPost.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      author: {
        select: { name: true, email: true },
      },
    },
  });

  return posts;
}
