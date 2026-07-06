// Admin auth now relies exclusively on the httpOnly cookie set by the server.
// These exports are kept as no-ops for backwards compatibility with callers
// that have not been refactored yet.

export function getAdminToken(): string | null {
  return null;
}

export function setAdminToken(_token: string) {
  // no-op: token is stored as httpOnly cookie by the server
}

export function clearAdminToken() {
  // no-op: cookie is cleared via the server `logoutAdmin` function
}

export function installAdminFetchInterceptor() {
  // no-op
}
