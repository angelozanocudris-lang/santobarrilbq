import { createFileRoute, Link } from "@tanstack/react-router";
import { Instagram, MapPin, Lock, X } from "lucide-react";
import { useEffect, useState } from "react";
import portada from "@/assets/portada-santo-barril.webp";
import { getStoreStatus } from "@/lib/admin-data.functions";



// Horarios: Jue/Vie/Dom 18:30-22:30, Sáb 18:30-23:00. TZ America/Bogota.
const SCHEDULE: Record<number, { open: number; close: number } | null> = {
  0: { open: 18.5, close: 22.5 },  // Domingo
  1: null,                          // Lunes
  2: null,                          // Martes
  3: null,                          // Miércoles
  4: { open: 18.5, close: 22.5 },  // Jueves
  5: { open: 18.5, close: 22.5 },  // Viernes
  6: { open: 18.5, close: 23 },    // Sábado
};

function getBogotaNow() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Bogota",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(new Date());
  const wd = parts.find((p) => p.type === "weekday")?.value ?? "Mon";
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { day: map[wd] ?? 0, time: (hour % 24) + minute / 60 };
}

function useIsOpen() {
  const [open, setOpen] = useState(false);
  const [override, setOverride] = useState<"auto" | "open" | "closed">("auto");
  useEffect(() => {
    let cancelled = false;
    const loadOverride = () => {
      getStoreStatus()
        .then((r) => {
          if (!cancelled) setOverride(r.status_override);
        })
        .catch(() => {});
    };
    loadOverride();
    const tick = () => {
      const { day, time } = getBogotaNow();
      const s = SCHEDULE[day];
      setOpen(!!s && time >= s.open && time < s.close);
    };
    tick();
    const id = setInterval(tick, 60_000);
    const id2 = setInterval(loadOverride, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
      clearInterval(id2);
    };
  }, []);
  if (override === "open") return true;
  if (override === "closed") return false;
  return open;
}



const PORTADA_WHATSAPP = "573177921086";
const PORTADA_INSTAGRAM = "santobarrilbq";
const PORTADA_DIRECCION = "Calle 84b #38-97";
const PORTADA_MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  "Calle 84b #38-97, Barranquilla, Colombia",
)}`;

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SANTO BARRIL" },
      { name: "description", content: "Donde los chicharrones no son un problema. Pide a domicilio por WhatsApp." },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { property: "og:title", content: "SANTO BARRIL" },
      { property: "og:description", content: "Pide por WhatsApp." },
    ],
    links: [
      { rel: "preload", as: "image", href: portada, fetchpriority: "high" } as any,
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main
      className="relative min-h-[100svh] w-full bg-black bg-no-repeat"
      style={{
        backgroundImage: `url(${portada})`,
        backgroundSize: "auto 75%",
        backgroundPosition: "center 25%",
      }}
    >
      {/* Oscurecido inferior para legibilidad de botones */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/80 to-transparent"
        aria-hidden="true"
      />

      {/* Horarios de atención — pill superior minimalista */}
      <SchedulePill />


      {/* Contenido inferior: botón + redes + dirección */}
      <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-5 px-6 pb-[max(env(safe-area-inset-bottom),1.5rem)]">
        {/* Botón Ver Menú — más pequeño y centrado, separado del borde */}

        <Link
          to="/menu"
          className="inline-flex items-center justify-center rounded-full bg-gradient-fire px-8 py-3 text-sm font-bold uppercase tracking-[0.18em] text-primary-foreground shadow-ember transition-transform active:scale-95"
        >
          Ver menú
        </Link>

        {/* Iconos sociales */}
        <div className="flex items-center gap-3">
          <a
            href={`https://wa.me/${PORTADA_WHATSAPP}`}
            target="_blank"
            rel="noreferrer"
            aria-label="WhatsApp"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur-md transition-all hover:border-[var(--gold)] hover:text-[var(--gold)] active:scale-95"
          >
            <svg viewBox="0 0 32 32" className="h-5 w-5" fill="currentColor" aria-hidden="true">
              <path d="M19.11 17.205c-.372 0-1.088 1.39-1.518 1.39a.63.63 0 0 1-.315-.1c-.802-.402-1.504-.817-2.163-1.447-.545-.516-1.146-1.29-1.46-1.963a.426.426 0 0 1-.073-.215c0-.33.99-.945.99-1.49 0-.143-.73-2.09-.832-2.335-.143-.372-.214-.487-.6-.487-.187 0-.36-.043-.53-.043-.302 0-.53.115-.746.315-.688.645-1.032 1.318-1.06 2.264v.114c-.014.99.36 1.945.992 2.71 1.7 2.34 3.916 4.087 6.614 5.062.473.143 2.108.6 2.41.6.704 0 1.42-.27 1.819-.94.114-.214.214-.5.214-.745 0-.514-2.91-1.45-3.083-1.59zm-3.16 7.27c-1.92 0-3.78-.583-5.354-1.66l-3.74 1.193 1.22-3.612a9.453 9.453 0 0 1-1.84-5.625c0-5.282 4.302-9.583 9.585-9.583 5.282 0 9.585 4.3 9.585 9.583 0 5.282-4.301 9.704-9.456 9.704zm0-21.135C9.624 3.34 4.31 8.554 4.31 14.876c0 2.05.557 4.034 1.602 5.78L4 26.66l6.158-1.97a11.444 11.444 0 0 0 5.79 1.476h.005c6.2 0 11.534-5.214 11.534-11.534 0-3.066-1.213-5.95-3.36-8.123A11.434 11.434 0 0 0 15.95 3.34z" />
            </svg>
          </a>
          <a
            href={`https://instagram.com/${PORTADA_INSTAGRAM}`}
            target="_blank"
            rel="noreferrer"
            aria-label="Instagram @santobarrilbq"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur-md transition-all hover:border-[var(--gold)] hover:text-[var(--gold)] active:scale-95"
          >
            <Instagram className="h-5 w-5" />
          </a>
          <a
            href={PORTADA_MAPS_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="Ver ubicación en Google Maps"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur-md transition-all hover:border-[var(--gold)] hover:text-[var(--gold)] active:scale-95"
          >
            <MapPin className="h-5 w-5" />
          </a>
        </div>

        {/* Datos de contacto */}
        <div className="flex flex-col items-center gap-1 text-center text-xs text-white/85">
          <a
            href={`https://wa.me/${PORTADA_WHATSAPP}`}
            target="_blank"
            rel="noreferrer"
            className="font-medium tracking-wide hover:text-[var(--gold)]"
          >
            WhatsApp: {PORTADA_WHATSAPP}
          </a>
          <a
            href={`https://instagram.com/${PORTADA_INSTAGRAM}`}
            target="_blank"
            rel="noreferrer"
            className="tracking-wide hover:text-[var(--gold)]"
          >
            @{PORTADA_INSTAGRAM}
          </a>
          <a
            href={PORTADA_MAPS_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 tracking-wide hover:text-[var(--gold)]"
          >
            <MapPin className="h-3 w-3" />
            {PORTADA_DIRECCION}
          </a>
        </div>
      </div>

      {/* Acceso discreto a Admin */}
      <Link
        to="/admin"
        aria-label="Panel Admin"
        className="absolute right-3 top-3 z-30 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white/80 backdrop-blur-md transition-all hover:border-[var(--gold)] hover:text-[var(--gold)] active:scale-95"
      >
        <Lock className="h-4 w-4" />
      </Link>

      <h1 className="sr-only">SANTO BARRIL — Smokehouse</h1>
    </main>
  );
}

function SchedulePill() {
  const isOpen = useIsOpen();
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <div className="absolute inset-x-0 top-[max(env(safe-area-inset-top),0.75rem)] z-20 flex justify-center px-4">
        <button
          type="button"
          onClick={() => setExpanded(true)}
          aria-label="Ver horarios completos"
          className="flex items-center gap-3 rounded-full border border-white/15 bg-black/40 px-4 py-2 backdrop-blur-md transition-all hover:border-white/30 active:scale-95"
        >
          <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
            {isOpen && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-60" />
            )}
            <span
              className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                isOpen ? "bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.9)]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]"
              }`}
            />
          </span>
          <span className="text-[12px] uppercase tracking-[0.22em] text-white/85">
            <span className={isOpen ? "text-green-300" : "text-red-300"}>
              {isOpen ? "Abierto" : "Cerrado"}
            </span>
            <span className="mx-1.5 text-white/30">·</span>
            <span className="text-white/70">Horarios</span>
          </span>

        </button>
      </div>

      {expanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6 backdrop-blur-sm"
          onClick={() => setExpanded(false)}
        >
          <div
            className="relative w-full max-w-xs rounded-2xl border border-white/15 bg-[var(--card)] p-6 shadow-ember"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setExpanded(false)}
              aria-label="Cerrar"
              className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full ${
                  isOpen ? "bg-green-400" : "bg-red-500"
                }`}
                aria-hidden="true"
              />
              <span
                className={`text-[10px] font-semibold uppercase tracking-[0.28em] ${
                  isOpen ? "text-green-300" : "text-red-300"
                }`}
              >
                {isOpen ? "Abierto ahora" : "Cerrado ahora"}
              </span>
            </div>

            <h2 className="mt-3 font-display text-2xl tracking-wider text-foreground">
              Horarios de atención
            </h2>

            <ul className="mt-4 divide-y divide-white/10 text-sm">
              <li className="flex items-center justify-between py-2.5">
                <span className="text-white/70">Jueves</span>
                <span className="text-white">6:30 — 10:30 pm</span>
              </li>
              <li className="flex items-center justify-between py-2.5">
                <span className="text-white/70">Viernes</span>
                <span className="text-white">6:30 — 10:30 pm</span>
              </li>
              <li className="flex items-center justify-between py-2.5">
                <span className="text-white/70">Sábado</span>
                <span className="text-white">6:30 — 11:00 pm</span>
              </li>
              <li className="flex items-center justify-between py-2.5">
                <span className="text-white/70">Domingo</span>
                <span className="text-white">6:30 — 10:30 pm</span>
              </li>
              <li className="flex items-center justify-between py-2.5 text-white/40">
                <span>Lun · Mar · Mié</span>
                <span>Cerrado</span>
              </li>
            </ul>
          </div>
        </div>
      )}
    </>
  );
}

