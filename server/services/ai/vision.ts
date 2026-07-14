import { completeJSON, vision, isAnthropicEnabled } from "./index";

export interface TattooTags {
  styles: string[];
  subjects: string[];
  colors: string[];
  mood: string;
  confidence: number;
}

const SYSTEM_PROMPT = `You are a tattoo expert analyzing images. 
Return ONLY a JSON object with these fields:
- styles: array of tattoo style names (e.g. "Traditional", "Japanese", "Realism", "Geometric", "Watercolor", "Blackwork", "Neo-traditional", "Minimalist", "Tribal", "Illustrative")
- subjects: array of subject matter (e.g. "floral", "skull", "animal", "portrait", "abstract", "nature", "mythology")
- colors: array of color descriptors (e.g. "black and grey", "full color", "red accent")
- mood: single word mood descriptor (e.g. "bold", "delicate", "dark", "whimsical")
- confidence: number 0-1 representing how clearly this is a tattoo image
If the image is not a tattoo or body art, set confidence to 0 and return empty arrays.`;

export async function tagTattooImage(imageUrl: string): Promise<TattooTags | null> {
  if (!isAnthropicEnabled()) return null;

  try {
    const raw = await vision(
      imageUrl,
      "Analyze this image and identify tattoo styles, subjects, colors, and mood. Return a JSON object only.",
    );
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]) as TattooTags;
    if (typeof parsed.confidence !== "number") parsed.confidence = 1;
    return parsed;
  } catch (err) {
    console.error("[vision] Failed to tag image:", err);
    return null;
  }
}

export async function generateWeeklyDigestText(params: {
  username: string;
  newFollowers: number;
  newLikes: number;
  newComments: number;
  topPostCaption: string | null;
}): Promise<string> {
  if (!isAnthropicEnabled()) {
    return `Hi ${params.username}! Here's your weekly summary: ${params.newFollowers} new followers, ${params.newLikes} likes, ${params.newComments} comments.`;
  }

  try {
    return await completeJSON<{ message: string }>(
      `Generate a short, friendly weekly activity digest for a tattoo artist/enthusiast named "${params.username}".
Stats: ${params.newFollowers} new followers, ${params.newLikes} new likes, ${params.newComments} new comments.
${params.topPostCaption ? `Their most-liked post caption: "${params.topPostCaption}"` : ""}
Keep it under 3 sentences, warm and encouraging. Return JSON: { "message": "..." }`,
    ).then((r) => r.message);
  } catch {
    return `Hi ${params.username}! This week you got ${params.newFollowers} new followers, ${params.newLikes} likes, and ${params.newComments} comments. Keep creating!`;
  }
}
