import { createServerFn } from "@tanstack/react-start";
import { setCookie, deleteCookie } from "@tanstack/react-start/server";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { safeEqual, createAdminToken, getTrustedClientIp } from "@/server/admin-auth.server";
import { WAITER_COOKIE_NAME, verifyWaiterCookie } from "@/server/waiter-auth.server";

const RATE_WINDOW_MIN = 15;
const RATE_MAX_ATTEMPTS = 8;

function getClientIp(): string {
  return getTrustedClientIp();
}


export const loginWaiter = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ pin: z.string().min(4).max(32) }).parse(input))
  .handler(async ({ data }) => {
    const expected = process.env.WAITER_PIN;
    const secret = process.env.ADMIN_SESSION_SECRET;
    if (!expected || !secret) throw new Error("Configuración del servidor incompleta");

    const ip = "waiter:" + getClientIp();
    const sinceIso = new Date(Date.now() - RATE_WINDOW_MIN * 60_000).toISOString();
    const { count } = await supabaseAdmin
      .from("admin_login_attempts")
      .select("*", { count: "exact", head: true })
      .eq("ip", ip)
      .eq("success", false)
      .gte("attempted_at", sinceIso);
    if ((count ?? 0) >= RATE_MAX_ATTEMPTS) {
      throw new Error(`Demasiados intentos. Espera ${RATE_WINDOW_MIN} minutos.`);
    }

    await new Promise((r) => setTimeout(r, 200));
    const ok = safeEqual(data.pin, expected);
    await supabaseAdmin.from("admin_login_attempts").insert({ ip, success: ok });
    if (!ok) throw new Error("PIN incorrecto");

    const token = createAdminToken(secret, "waiter");
    setCookie(WAITER_COOKIE_NAME, token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
    });
    return { ok: true };
  });

export const logoutWaiter = createServerFn({ method: "POST" }).handler(async () => {
  deleteCookie(WAITER_COOKIE_NAME, { path: "/" });
  return { ok: true };
});

export const checkWaiterSession = createServerFn({ method: "GET" }).handler(async () => {
  return { authenticated: verifyWaiterCookie() };
});
