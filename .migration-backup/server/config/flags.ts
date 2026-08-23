export const flags = {
  aiAutotag: process.env.AI_AUTOTAG !== "false",
  aiDigest: process.env.AI_DIGEST !== "false",
  aiSemanticSearch: process.env.AI_SEMANTIC_SEARCH !== "false",
};
