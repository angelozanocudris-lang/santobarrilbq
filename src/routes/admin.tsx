import { Link, Outlet, createFileRoute, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { loginWithPin } from "@/lib/admin-auth.functions";
import logoFlame from "@/assets/logo-flame.png";


export const Route = createFileRoute("/admin")({
  component: AdminRoute,
});

const PIN_LENGTH = 4;

function AdminRoute() {
  const location = useLocation();

  if (location.pathname !== "/admin") {
    return <Outlet />;
  }

  return <AdminLogin />;
}

function AdminLogin() {
  const { loading, isAdmin, refresh } = useAdminAuth();
  const navigate = useNavigate();
  const [pin, setPin] = useState<string[]>(Array(PIN_LENGTH).fill(""));
  const [busy, setBusy] = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  // No auto-redirect: el panel de PIN siempre se muestra al hacer click
  // en el candadito, aunque haya una sesión previa.

  function handleChange(i: number, v: string) {
    const digit = v.replace(/\D/g, "").slice(-1);
    const next = [...pin];
    next[i] = digit;
    setPin(next);
    if (digit && i < PIN_LENGTH - 1) inputs.current[i + 1]?.focus();
    if (next.every((d) => d !== "")) submit(next.join(""));
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !pin[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
  }

  async function submit(value: string) {
    if (busy) return;
    setBusy(true);
    try {
      await loginWithPin({ data: { pin: value } });
      toast.success("Bienvenido");
      await refresh();
      navigate({ to: "/admin/productos" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "PIN incorrecto";
      toast.error(msg);
      setPin(Array(PIN_LENGTH).fill(""));
      inputs.current[0]?.focus();
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-card">
        <Link
          to="/"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Volver a la portada
        </Link>
        <div className="text-center">
          <img src={logoFlame} alt="Santo Barril" className="mx-auto h-14 w-14 object-contain" />
          <h1 className="mt-3 font-display text-3xl">Panel Admin</h1>
          <p className="text-sm text-muted-foreground">Ingresa tu PIN</p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(pin.join(""));
          }}
          className="mt-7 space-y-5"
        >
          <div className="flex justify-center gap-3">
            {pin.map((d, i) => (
              <input
                key={i}
                ref={(el) => {
                  inputs.current[i] = el;
                }}
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="one-time-code"
                maxLength={1}
                value={d}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                disabled={busy}
                className="h-14 w-12 rounded-xl border border-border bg-input text-center font-display text-2xl focus:border-primary focus:outline-none disabled:opacity-50"
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={busy || pin.some((d) => d === "")}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Ingresar
          </button>
        </form>
      </div>
    </div>
  );
}
