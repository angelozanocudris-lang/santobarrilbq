import { Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Loader2, LogOut, Package, ClipboardList, ArrowLeft, Wallet } from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { logoutAdmin } from "@/lib/admin-auth.functions";
import { getStoreStatus, adminSetStoreStatus } from "@/lib/admin-data.functions";

import { RESTAURANT_NAME } from "@/lib/format";

type StoreOverride = "auto" | "open" | "closed";

function StoreStatusToggle() {
  const [value, setValue] = useState<StoreOverride>("auto");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getStoreStatus()
      .then((r) => setValue(r.status_override))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const update = async (v: StoreOverride) => {
    setSaving(true);
    const prev = value;
    setValue(v);
    try {
      await adminSetStoreStatus({ data: { status_override: v } });
    } catch {
      setValue(prev);
    } finally {
      setSaving(false);
    }
  };

  const opts: { v: StoreOverride; label: string; cls: string }[] = [
    { v: "auto", label: "Auto", cls: "data-[on=true]:bg-muted data-[on=true]:text-foreground" },
    { v: "open", label: "Abierto", cls: "data-[on=true]:bg-green-500/20 data-[on=true]:text-green-300" },
    { v: "closed", label: "Cerrado", cls: "data-[on=true]:bg-red-500/20 data-[on=true]:text-red-300" },
  ];

  return (
    <div className="flex items-center gap-1 rounded-full border border-border bg-background p-0.5 text-xs">
      <span className="pl-2 pr-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        Tienda
      </span>
      {opts.map((o) => (
        <button
          key={o.v}
          type="button"
          disabled={loading || saving}
          data-on={value === o.v}
          onClick={() => update(o.v)}
          className={`rounded-full px-2.5 py-1 font-medium text-muted-foreground transition disabled:opacity-50 ${o.cls}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}


export function AdminLayout({ children }: { children: ReactNode }) {
  const { loading, isAdmin } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate({ to: "/admin" });
    }
  }, [loading, isAdmin, navigate]);

  if (loading || !isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const links = [
    { to: "/admin/productos", label: "Productos", Icon: Package },
    { to: "/admin/pedidos", label: "Pedidos", Icon: ClipboardList },
    { to: "/admin/egresos", label: "Compras y Gastos", Icon: Wallet },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              to="/"
              className="flex shrink-0 items-center gap-1 rounded-full border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> Volver
            </Link>
            <Link to="/" className="truncate font-display text-xl">{RESTAURANT_NAME}</Link>
            <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-xs text-accent">Admin</span>
          </div>
          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <StoreStatusToggle />
            <button
              onClick={async () => {
                await logoutAdmin();
                navigate({ to: "/admin" });
              }}
              className="flex shrink-0 items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4" /> Salir
            </button>
          </div>


        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 px-2">
          {links.map(({ to, label, Icon }) => {
            const active = location.pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition ${
                  active
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" /> {label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        {children}
      </main>
    </div>
  );
}
