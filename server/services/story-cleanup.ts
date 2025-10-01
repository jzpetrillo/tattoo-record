import { db } from "../db";
import { stories } from "@shared/schema";
import { lt } from "drizzle-orm";
import { deleteMedia } from "./cloudinary";

export async function cleanupExpiredStories() {
  try {
    const expiredStories = await db
      .select()
      .from(stories)
      .where(lt(stories.expiresAt, new Date()));

    for (const story of expiredStories) {
      try {
        if (story.media?.publicId) {
          await deleteMedia(story.media.publicId);
        }
      } catch (error) {
        console.error(`Failed to delete media for story ${story.id}:`, error);
      }
    }

    const result = await db
      .delete(stories)
      .where(lt(stories.expiresAt, new Date()))
      .returning();

    console.log(`Cleaned up ${result.length} expired stories`);
    return result.length;
  } catch (error) {
    console.error("Story cleanup failed:", error);
    throw error;
  }
}

// Run cleanup every 10 minutes
export function startStoryCleanupScheduler() {
  setInterval(async () => {
    try {
      await cleanupExpiredStories();
    } catch (error) {
      console.error("Scheduled story cleanup error:", error);
    }
  }, 10 * 60 * 1000); // 10 minutes
}
