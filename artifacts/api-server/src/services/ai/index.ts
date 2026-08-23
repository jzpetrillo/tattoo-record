import Anthropic from "@anthropic-ai/sdk";
import crypto from "crypto";

const HAIKU = "claude-haiku-4-5-20251001";
const SONNET = "claude-sonnet-5";

let anthropic: Anthropic | null = null;

if (process.env.ANTHROPIC_API_KEY) {
  anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
} else {
  console.warn("[AI] ANTHROPIC_API_KEY not set — Anthropic features disabled");
}

const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY;
const VOYAGE_MODEL = "voyage-3";
const VOYAGE_DIMS = 1024;

const _visionCache = new Map<string, string>();
const _embedCache = new Map<string, number[]>();
const CACHE_MAX = 2000;

function _pruneCache(cache: Map<string, any>) {
  if (cache.size > CACHE_MAX) {
    const keys = Array.from(cache.keys()).slice(0, CACHE_MAX / 2);
    for (const k of keys) cache.delete(k);
  }
}

function _hash(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex").slice(0, 16);
}

export interface AiTool {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
  };
}

export function isAnthropicEnabled() {
  return anthropic !== null;
}

export function isVoyageEnabled() {
  return Boolean(VOYAGE_API_KEY);
}

export async function complete(
  prompt: string,
  systemPrompt = "You are a helpful assistant.",
  model = HAIKU
): Promise<string> {
  if (!anthropic) throw new Error("Anthropic not configured");
  const response = await anthropic.messages.create({
    model,
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: "user", content: prompt }],
  });
  const block = response.content[0];
  if (block.type !== "text") throw new Error("Unexpected response type");
  return block.text;
}

export async function completeJSON<T>(
  prompt: string,
  systemPrompt = "You are a helpful assistant. Always respond with valid JSON only.",
  model = HAIKU
): Promise<T> {
  const raw = await complete(prompt, systemPrompt, model);
  const match = raw.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (!match) throw new Error("No JSON found in AI response");
  return JSON.parse(match[0]) as T;
}

export async function completeStructured<T>(opts: {
  prompt: string;
  system?: string;
  tool: AiTool;
  model?: string;
}): Promise<T> {
  const { prompt, system = "You are a helpful assistant.", tool, model = HAIKU } = opts;
  if (!anthropic) throw new Error("Anthropic not configured");
  const response = await anthropic.messages.create({
    model,
    max_tokens: 1024,
    system,
    tools: [tool as any],
    tool_choice: { type: "tool", name: tool.name },
    messages: [{ role: "user", content: prompt }],
  });
  const block = response.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") throw new Error("No tool_use block in response");
  return block.input as T;
}

export async function vision(imageUrl: string, prompt: string, model = HAIKU): Promise<string> {
  if (!anthropic) throw new Error("Anthropic not configured");
  const cacheKey = _hash(`${model}:${imageUrl}:${prompt}`);
  if (_visionCache.has(cacheKey)) return _visionCache.get(cacheKey)!;

  const response = await anthropic.messages.create({
    model,
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "url", url: imageUrl } },
          { type: "text", text: prompt },
        ],
      },
    ],
  });
  const block = response.content[0];
  if (block.type !== "text") throw new Error("Unexpected vision response type");
  _pruneCache(_visionCache);
  _visionCache.set(cacheKey, block.text);
  return block.text;
}

export async function visionStructured<T>(opts: {
  imageUrl: string;
  prompt: string;
  tool: AiTool;
  model?: string;
}): Promise<T> {
  const { imageUrl, prompt, tool, model = HAIKU } = opts;
  if (!anthropic) throw new Error("Anthropic not configured");
  const cacheKey = _hash(`${model}:${imageUrl}:${tool.name}`);
  if (_visionCache.has(cacheKey)) return JSON.parse(_visionCache.get(cacheKey)!) as T;

  const response = await anthropic.messages.create({
    model,
    max_tokens: 1024,
    tools: [tool as any],
    tool_choice: { type: "tool", name: tool.name },
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "url", url: imageUrl } },
          { type: "text", text: prompt },
        ],
      },
    ],
  });
  const block = response.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") throw new Error("No tool_use block in vision response");
  _pruneCache(_visionCache);
  _visionCache.set(cacheKey, JSON.stringify(block.input));
  return block.input as T;
}

export async function embed(text: string): Promise<number[]> {
  if (!VOYAGE_API_KEY) throw new Error("VOYAGE_API_KEY not configured");
  const cacheKey = _hash(text);
  if (_embedCache.has(cacheKey)) return _embedCache.get(cacheKey)!;

  const resp = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${VOYAGE_API_KEY}`,
    },
    body: JSON.stringify({ model: VOYAGE_MODEL, input: [text], output_dimension: VOYAGE_DIMS }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Voyage API error ${resp.status}: ${err}`);
  }

  const data = (await resp.json()) as { data: Array<{ embedding: number[] }> };
  const vec = data.data[0].embedding;
  _pruneCache(_embedCache);
  _embedCache.set(cacheKey, vec);
  return vec;
}

export { HAIKU, SONNET };
