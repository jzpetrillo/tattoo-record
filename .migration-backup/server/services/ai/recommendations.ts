import { completeStructured, isAnthropicEnabled, AiTool } from "./index";

export interface TattooRecommendation {
  styles: string[];
  placement: string[];
  size: string;
  colors: string[];
  description: string;
  aftercareTips: string[];
}

const RECOMMENDATION_TOOL: AiTool = {
  name: "tattoo_recommendations",
  description: "Generate personalized tattoo design recommendations based on user preferences.",
  input_schema: {
    type: "object",
    properties: {
      styles: {
        type: "array",
        items: { type: "string" },
        description: "Recommended tattoo styles (e.g. Traditional, Japanese, Realism, Geometric)",
      },
      placement: {
        type: "array",
        items: { type: "string" },
        description: "Recommended body placements (e.g. forearm, chest, back)",
      },
      size: {
        type: "string",
        description: "Recommended size description (e.g. 'Medium (4-6 inches)')",
      },
      colors: {
        type: "array",
        items: { type: "string" },
        description: "Color palette suggestions (e.g. 'black and grey', 'full color', 'red accent')",
      },
      description: {
        type: "string",
        description: "Detailed description of the recommended design concept",
      },
      aftercareTips: {
        type: "array",
        items: { type: "string" },
        description: "Specific aftercare tips for the recommended tattoo",
      },
    },
    required: ["styles", "placement", "size", "colors", "description", "aftercareTips"],
  },
};

export async function generateTattooRecommendations(preferences: {
  description?: string;
  style?: string;
  placement?: string;
  size?: string;
}): Promise<TattooRecommendation> {
  if (!isAnthropicEnabled()) {
    throw new Error("unavailable");
  }

  return completeStructured<TattooRecommendation>({
    prompt: `You are a professional tattoo design consultant. Based on these preferences, provide detailed recommendations:

Description: ${preferences.description || "Not specified"}
Preferred Style: ${preferences.style || "Open to suggestions"}
Preferred Placement: ${preferences.placement || "Open to suggestions"}
Preferred Size: ${preferences.size || "Open to suggestions"}

Provide specific, actionable tattoo design recommendations using the tool.`,
    system: "You are a professional tattoo design consultant with expertise in various tattoo styles, placement, and aftercare.",
    tool: RECOMMENDATION_TOOL,
  });
}
