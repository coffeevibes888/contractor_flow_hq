-- Hard-delete every BlogPost row plus its comments and reactions.
-- The schema cascades comments/reactions on post delete (BlogComment and
-- BlogReaction both have onDelete: Cascade against postId), so this single
-- DELETE wipes all related rows in one shot.
--
-- Run with:
--   npx prisma db execute --file scripts/delete-all-blog-posts.sql
DELETE FROM "BlogPost";
