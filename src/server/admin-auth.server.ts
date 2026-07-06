import { getCookie, getRequestHeader, getRequestIP } from "@tanstack/react-start/server";
import { createHmac, timingSafeEqual } from "crypto";

export const COOKIE_NAME = "sb_admin_session";
export const MAX_AGE = 60 * 60 * 24 * 7; // 7 días

export type TokenRole = "admin" | "waiter";

export function sign(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export function createAdminToken(secret: string, role: TokenRole = "admin"): string {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  const payload = Buffer.from(JSON.stringify({ exp, role })).toString("base64url");
  const sig = sign(payload, secret);
  return `${payload}.${sig}`;
}

export function verifyToken(
  raw: string | undefined | null,
  secret: string,
  expectedRole?: TokenRole,
): boolean {
  if (!raw) return false;
  const [payload, sig] = raw.split(".");
  if (!payload || !sig) return false;
  const expected = sign(payload, secret);
  if (!safeEqual(sig, expected)) return false;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    const { exp, role } = parsed as { exp?: unknown; role?: unknown };
    if (typeof exp !== "number" || exp < Math.floor(Date.now() / 1000)) return false;
    if (expectedRole) {
      if (role !== expectedRole) return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function verifyAdminCookie(): boolean {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) return false;
  const raw = getCookie(COOKIE_NAME);
  return verifyToken(raw, secret, "admin");
}

/**
 * Returns the real client IP. On Cloudflare we trust `CF-Connecting-IP`
 * (server-set, cannot be forged). We deliberately do NOT trust the first
 * value of `X-Forwarded-For`, which is attacker-controlled.
 */
export function getTrustedClientIp(): string {
  const cf = getRequestHeader("cf-connecting-ip");
  if (cf) return cf.trim();
  const real = getRequestHeader("x-real-ip");
  if (real) return real.trim();
  // Last hop of XFF is appended by the trusted edge proxy.
  const xff = getRequestHeader("x-forwarded-for");
  if (xff) {
    const parts = xff.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  }
  return getRequestIP() || "unknown";
}
