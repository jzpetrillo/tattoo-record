import { visionStructured, completeStructured, isAnthropicEnabled, AiTool } from "./index";

export interface TattooTags {
  styles: string[];
  subjects: string[];
  colorProfile: "color" | "black-and-grey";
  placement: string;
}

const TATTOO_TAG_TOOL: AiTool = {
  name: "tag_tattoo",
  description: "Analyze a tattoo image and return structured metadata about its style, subjects, color profile, and body placement.",
  input_schema: {
    type: "object",
    properties: {
      styles: {
        type: "array",
        items: {
          type: "string",
          enum: ["Traditional", "Neo-Traditional", "Blackwork", "Fine Line", "Realism", "Japanese", "Geometric", "Watercolor", "Tribal", "Lettering", "Dotwork", "Illustrative"],
        },
        description: "Tattoo style(s) visible in the image",
      },
      subjects: {
        type: "array",
        items: { type: "string" },
        description: "Subject matter shown (e.g. 'floral', 'skull', 'animal', 'portrait', 'abstract')",
      },
      colorProfile: {
        type: "string",
        enum: ["color", "black-and-grey"],
        description: "Whether the tattoo uses color or is black and grey",
      },
      placement: {
        type: "string",
        description: "Body placement of the tattoo (e.g. 'forearm', 'chest', 'back', 'unknown')",
      },
    },
    required: ["styles", "subjects", "colorProfile", "placement"],
  },
};

const DIGEST_TOOL: AiTool = {
  name: "generate_digest",
  description: "Generate a friendly weekly activity digest message for a tattoo community member.",
  input_schema: {
    type: "object",
    properties: {
      message: {
        type: "string",
        description: "The friendly digest message, under 3 sentences, warm and encouraging",
      },
    },
    required: ["message"],
  },
};

export async function tagTattooImage(imageUrl: string): Promise<TattooTags | null> {
  if (!isAnthropicEnabled()) return null;
  try {
    const result = await visionStructured<TattooTags>({
      imageUrl,
      prompt: "Analyze this tattoo image and tag it using the provided tool.",
      tool: TATTOO_TAG_TOOL,
    });
    return result;
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
    const result = await completeStructured<{ message: string }>({
      prompt: `Generate a short, friendly weekly activity digest for a tattoo artist/enthusiast named "${params.username}".
Stats: ${params.newFollowers} new followers, ${params.newLikes} new likes, ${params.newComments} new comments.
${params.topPostCaption ? `Their most-liked post caption: "${params.topPostCaption}"` : ""}
Keep it under 3 sentences, warm and encouraging.`,
      tool: DIGEST_TOOL,
    });
    return result.message;
  } catch {
    return `Hi ${params.username}! This week you got ${params.newFollowers} new followers, ${params.newLikes} likes, and ${params.newComments} comments. Keep creating!`;
  }
}
