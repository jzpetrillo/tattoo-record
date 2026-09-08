const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Metro resolves workspace packages from the monorepo root, so it can also see
// Vite's short-lived dependency cache in the sibling web artifact. Vite replaces
// deps_temp_* directories atomically; watching them can crash Metro with ENOENT.
config.resolver.blockList = [
  ...(Array.isArray(config.resolver.blockList)
    ? config.resolver.blockList
    : config.resolver.blockList
      ? [config.resolver.blockList]
      : []),
  /.*[\\/]node_modules[\\/]\.vite[\\/].*/,
];

module.exports = config;
