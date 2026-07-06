import { Link } from "@tanstack/react-router";
import { ClipboardList } from "lucide-react";
import logoFlame from "@/assets/logo-flame.png";
import { RESTAURANT_NAME } from "@/lib/format";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <img
            src={logoFlame}
            alt="Logo Santo Barril"
            className="h-10 w-10 object-contain"
          />
          <span className="font-display text-xl tracking-wider text-foreground">
            {RESTAURANT_NAME}
          </span>
        </Link>
        <nav className="flex items-center gap-2 sm:gap-5">
          <Link
            to="/"
            className="text-sm text-muted-foreground hover:text-foreground"
            activeProps={{ className: "text-foreground" }}
          >
            Inicio
          </Link>
          <Link
            to="/menu"
            className="text-sm text-muted-foreground hover:text-foreground"
            activeProps={{ className: "text-foreground" }}
          >
            Menú
          </Link>
          <Link
            to="/mesera"
            aria-label="Pedido mesa"
            title="Pedido mesa (meseras)"
            className="flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground transition hover:border-primary hover:text-foreground"
            activeProps={{ className: "border-primary text-foreground" }}
          >
            <ClipboardList className="h-4 w-4" />
            <span className="hidden sm:inline">Pedido mesa</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
