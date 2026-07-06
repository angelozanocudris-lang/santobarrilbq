import { createServerFn } from "@tanstack/react-start";
import { setCookie, deleteCookie } from "@tanstack/react-start/server";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  COOKIE_NAME,
  safeEqual,
  verifyAdminCookie,
  createAdminToken,
  getTrustedClientIp,
} from "@/server/admin-auth.server";

const RATE_WINDOW_MIN = 15;
const RATE_MAX_ATTEMPTS = 5;

function getClientIp(): string {
  return getTrustedClientIp();
}


export const loginWithPin = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ pin: z.string().regex(/^\d{4,8}$/) }).parse(input))
  .handler(async ({ data }) => {
    const expected = process.env.ADMIN_PIN;
    const secret = process.env.ADMIN_SESSION_SECRET;
    if (!expected || !secret) {
      throw new Error("Configuración del servidor incompleta");
    }

    const ip = getClientIp();
    const sinceIso = new Date(Date.now() - RATE_WINDOW_MIN * 60_000).toISOString();

    // Rate limit: count recent failed attempts from this IP
    const { count } = await supabaseAdmin
      .from("admin_login_attempts")
      .select("*", { count: "exact", head: true })
      .eq("ip", ip)
      .eq("success", false)
      .gte("attempted_at", sinceIso);

    if ((count ?? 0) >= RATE_MAX_ATTEMPTS) {
      throw new Error(`Demasiados intentos. Espera ${RATE_WINDOW_MIN} minutos.`);
    }

    await new Promise((r) => setTimeout(r, 250));
    const ok = safeEqual(data.pin, expected);

    // Log the attempt
    await supabaseAdmin.from("admin_login_attempts").insert({ ip, success: ok });

    if (!ok) throw new Error("PIN incorrecto");

    const token = createAdminToken(secret);
    setCookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
    });
    return { ok: true };
  });

export const logoutAdmin = createServerFn({ method: "POST" }).handler(async () => {
  deleteCookie(COOKIE_NAME, { path: "/" });
  return { ok: true };
});

export const checkAdminSession = createServerFn({ method: "GET" }).handler(async () => {
  return { authenticated: verifyAdminCookie() };
});
