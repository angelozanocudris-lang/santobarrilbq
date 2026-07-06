import { getCookie } from "@tanstack/react-start/server";
import { verifyToken } from "./admin-auth.server";

export const WAITER_COOKIE_NAME = "sb_waiter_session";

export function verifyWaiterCookie(): boolean {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) return false;
  const raw = getCookie(WAITER_COOKIE_NAME);
  return verifyToken(raw, secret, "waiter");
}
