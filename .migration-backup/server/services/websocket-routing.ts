/**
 * Return the path portion of an HTTP upgrade target without parsing URLs.
 * Upgrade targets are untrusted input, so only origin-form paths are routed to
 * application WebSocket servers; Vite and the HTTP server can handle all else.
 */
export function getWebSocketUpgradePath(requestTarget: string | undefined): string | null {
  if (!requestTarget?.startsWith("/")) {
    return null;
  }

  const queryStart = requestTarget.indexOf("?");
  return queryStart === -1 ? requestTarget : requestTarget.slice(0, queryStart);
}