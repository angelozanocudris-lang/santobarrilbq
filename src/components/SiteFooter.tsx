import { Link } from "@tanstack/react-router";
import { RESTAURANT_NAME } from "@/lib/format";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-background py-10">
      <div className="mx-auto max-w-6xl px-4 text-center text-sm text-muted-foreground">
        <p className="font-display text-3xl font-bold text-primary">TODO AL BARRIL</p>
        <p className="mt-2 text-base font-bold text-white">Dónde los chicharrones no son un problema</p>
        <p className="mt-3">
          © {new Date().getFullYear()} {RESTAURANT_NAME} ·{" "}
          <Link to="/admin" className="hover:text-foreground">
            Admin
          </Link>
        </p>
      </div>
    </footer>
  );
}
