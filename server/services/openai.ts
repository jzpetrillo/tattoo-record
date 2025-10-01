import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
let openai: OpenAI | null = null;

if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({ 
    apiKey: process.env.OPENAI_API_KEY 
  });
}

export interface TattooRecommendation {
  styles: string[];
  placement: string[];
  size: string;
  colors: string[];
  description: string;
  aftercareTips: string[];
}

export async function generateTattooRecommendations(
  preferences: {
    description?: string;
    style?: string;
    placement?: string;
    size?: string;
  }
): Promise<TattooRecommendation> {
  if (!openai) {
    throw new Error("OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.");
  }
  
  try {
    const prompt = `Based on the following tattoo preferences, provide detailed recommendations:
    
Description: ${preferences.description || "Not specified"}
Preferred Style: ${preferences.style || "Open to suggestions"}
Preferred Placement: ${preferences.placement || "Open to suggestions"}
Preferred Size: ${preferences.size || "Open to suggestions"}

Provide a JSON response with:
- styles: Array of recommended tattoo styles (e.g., "Traditional", "Japanese", "Realism", "Geometric", "Watercolor")
- placement: Array of recommended body placements
- size: Recommended size description
- colors: Array of color palette suggestions
- description: Detailed description of the recommended design
- aftercareTips: Array of aftercare tips

Respond only with valid JSON.`;

    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: "You are a professional tattoo design consultant with expertise in various tattoo styles and placement recommendations."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 1000
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    const result = JSON.parse(content);
    return result;
  } catch (error: any) {
    throw new Error(`AI recommendation failed: ${error.message}`);
  }
}
