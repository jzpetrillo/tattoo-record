import type { Express } from "express";
import { and, desc, eq, ilike, inArray, isNull, or, sql } from "drizzle-orm";
import { z } from "zod/v4";
import { db } from "../db";
import * as schema from "@workspace/db";
import { optionalAuth, requireAuth, type AuthRequest } from "../middleware/auth";
import { postVisibleToViewer, publicUserColumns } from "../storage";
import { logger } from "../lib/logger";

const idSchema = z.string().uuid();
const pageSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

function fail(res: import("express").Response, error: unknown) {
  if (error instanceof z.ZodError) {
    res.status(400).json({ message: error.issues[0]?.message ?? "Invalid request" });
  } else {
    logger.error({ err: error }, "Post account tagging request failed");
    res.status(500).json({ message: "Unable to load or update tattoo tags" });
  }
}

export function registerPostTagRoutes(app: Express) {
  app.get("/api/taggable-accounts", requireAuth, async (req: AuthRequest, res) => {
    try {
      const query = z.string().trim().min(1).max(100).parse(req.query.q);
      // Treat wildcard characters as literal input, not a request for all users.
      const pattern = `%${query.replace(/[\\%_]/g, "\\$&")}%`;
      const accounts = await db.select(publicUserColumns).from(schema.users).where(and(
        inArray(schema.users.role, ["ARTIST", "STUDIO"]),
        isNull(schema.users.deletedAt),
        eq(schema.users.isBanned, false),
        or(
          ilike(schema.users.username, pattern),
          ilike(schema.users.firstName, pattern),
          ilike(schema.users.lastName, pattern),
          sql`concat_ws(' ', ${schema.users.firstName}, ${schema.users.lastName}) ILIKE ${pattern}`,
        ),
      )).orderBy(schema.users.username).limit(20);
      res.json(accounts);
    } catch (error) { fail(res, error); }
  });

  app.get("/api/posts/:id/tags", optionalAuth, async (req: AuthRequest, res) => {
    try {
      const postId = idSchema.parse(req.params.id);
      const [post] = await db.select({ id: schema.posts.id }).from(schema.posts).where(and(
        eq(schema.posts.id, postId), isNull(schema.posts.deletedAt), postVisibleToViewer(req.userId),
      )).limit(1);
      if (!post) return res.status(404).json({ message: "Post not found" });
      // Intentionally include profile-removed tags: attribution stays on the post.
      res.json(await db.select(publicUserColumns).from(schema.postAccountTags)
        .innerJoin(schema.users, eq(schema.postAccountTags.taggedAccountId, schema.users.id))
        .where(and(eq(schema.postAccountTags.postId, postId), isNull(schema.users.deletedAt)))
        .orderBy(schema.postAccountTags.createdAt, schema.postAccountTags.id));
    } catch (error) { fail(res, error); }
  });

  app.get("/api/users/:id/tagged-posts", optionalAuth, async (req: AuthRequest, res) => {
    try {
      const accountId = idSchema.parse(req.params.id);
      const { limit, offset } = pageSchema.parse(req.query);
      const [account] = await db.select({ id: schema.users.id }).from(schema.users).where(and(
        eq(schema.users.id, accountId), inArray(schema.users.role, ["ARTIST", "STUDIO"]),
        isNull(schema.users.deletedAt),
      )).limit(1);
      if (!account) return res.status(404).json({ message: "Artist or studio not found" });
      const posts = await db.select({
        post: schema.posts,
        author: publicUserColumns,
        isLiked: req.userId
          ? sql<boolean>`EXISTS (SELECT 1 FROM ${schema.postLikes} WHERE ${schema.postLikes.postId} = ${schema.posts.id} AND ${schema.postLikes.userId} = ${req.userId})`
          : sql<boolean>`false`,
        isSaved: req.userId
          ? sql<boolean>`EXISTS (SELECT 1 FROM ${schema.savedPosts} WHERE ${schema.savedPosts.postId} = ${schema.posts.id} AND ${schema.savedPosts.userId} = ${req.userId})`
          : sql<boolean>`false`,
      })
        .from(schema.postAccountTags)
        .innerJoin(schema.posts, eq(schema.postAccountTags.postId, schema.posts.id))
        .innerJoin(schema.users, eq(schema.posts.authorId, schema.users.id))
        .where(and(
          eq(schema.postAccountTags.taggedAccountId, accountId),
          eq(schema.postAccountTags.removedFromProfile, false),
          isNull(schema.posts.deletedAt),
          postVisibleToViewer(req.userId),
        ))
        .orderBy(desc(schema.posts.createdAt), desc(schema.posts.id))
        .limit(limit).offset(offset);
      res.json(posts);
    } catch (error) { fail(res, error); }
  });

  app.delete("/api/posts/:postId/tags/:accountId", requireAuth, async (req: AuthRequest, res) => {
    try {
      const postId = idSchema.parse(req.params.postId);
      const accountId = idSchema.parse(req.params.accountId);
      if (accountId !== req.userId) return res.status(403).json({ message: "Only the tagged account can remove work from its profile" });
      const rows = await db.update(schema.postAccountTags).set({ removedFromProfile: true })
        .where(and(eq(schema.postAccountTags.postId, postId), eq(schema.postAccountTags.taggedAccountId, accountId)))
        .returning({ id: schema.postAccountTags.id });
      if (!rows.length) return res.status(404).json({ message: "Tag not found" });
      res.json({ message: "Removed from your profile. The original post and its tags are unchanged." });
    } catch (error) { fail(res, error); }
  });
}
