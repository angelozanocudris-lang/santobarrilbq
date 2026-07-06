import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Plus, Loader2, X, ChevronDown } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import logoFlame from "@/assets/logo-flame.png";

import { useCart } from "@/lib/cart";
import { formatCOP } from "@/lib/format";

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  image_url: string | null;
  available: boolean;
  promo_price: number | null;
  promo_active: boolean;
};

const effectivePrice = (p: Product) =>
  p.promo_active && p.promo_price && Number(p.promo_price) > 0
    ? Number(p.promo_price)
    : Number(p.price);


export const Route = createFileRoute("/menu")({
  head: () => ({
    meta: [
      { title: "Menú — SANTO BARRIL" },
      { name: "description", content: "Conoce nuestro menú: chicharrón, bandeja paisa, picadas, parrilla y bebidas." },
      { property: "og:title", content: "Menú — SANTO BARRIL" },
      { property: "og:description", content: "Carnes, chicharrón y bandeja paisa. Pide en línea." },
    ],
  }),
  component: MenuPage,
});

function MenuPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [openCats, setOpenCats] = useState<Record<string, boolean>>({});
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);
  const [sideModal, setSideModal] = useState<Product | null>(null);
  const [sideStep, setSideStep] = useState<1 | 2>(1);
  const [chosenSide, setChosenSide] = useState<"Bollo" | "Yuca" | null>(null);
  const add = useCart((s) => s.add);

  // Productos que requieren elegir acompañamiento (bollo o yuca)
  const REQUIRES_SIDE = new Set([
    "chicharron",
    "chicharrón",
    "bondiola",
    "duo 1",
    "duo 2",
    "dúo 1",
    "dúo 2",
    "chorizo artesanal",
    "morcilla",
  ]);
  const normalize = (s: string) => s.trim().toLowerCase();
  const needsSide = (p: Product) => {
    if (p.category === "Adicionales") return false;
    return REQUIRES_SIDE.has(normalize(p.name));
  };
  const isDuo = (p: Product) => {
    const n = normalize(p.name);
    return n === "duo 1" || n === "duo 2" || n === "dúo 1" || n === "dúo 2";
  };

  const closeSideModal = () => {
    setSideModal(null);
    setSideStep(1);
    setChosenSide(null);
  };

  const handleAdd = (p: Product) => {
    if (needsSide(p)) {
      setSideModal(p);
      setSideStep(1);
      setChosenSide(null);
      return;
    }
    add({ id: p.id, name: p.name, price: effectivePrice(p), image_url: p.image_url });
    toast.success(`${p.name} agregado al carrito`);
  };

  const addWithSide = (p: Product, side: "Bollo" | "Yuca") => {
    if (isDuo(p)) {
      setChosenSide(side);
      setSideStep(2);
      return;
    }
    const suffix = side === "Bollo" ? "bollo" : "yuca";
    add({
      id: `${p.id}__${suffix}`,
      name: `${p.name} (con ${side.toLowerCase()})`,
      price: effectivePrice(p),
      image_url: p.image_url,
    });
    toast.success(`${p.name} con ${side.toLowerCase()} agregado`);
    closeSideModal();
  };

  const addDuoWithProtein = (p: Product, protein: "Chorizo" | "Morcilla") => {
    if (!chosenSide) return;
    const sideSuffix = chosenSide === "Bollo" ? "bollo" : "yuca";
    const protSuffix = protein.toLowerCase();
    add({
      id: `${p.id}__${sideSuffix}__${protSuffix}`,
      name: `${p.name} (con ${chosenSide.toLowerCase()} y ${protein.toLowerCase()})`,
      price: effectivePrice(p),
      image_url: p.image_url,
    });
    toast.success(`${p.name} con ${chosenSide.toLowerCase()} y ${protein.toLowerCase()} agregado`);
    closeSideModal();
  };

  useEffect(() => {
    supabase
      .from("products")
      .select("id,name,description,price,category,image_url,available,sort_order,promo_price,promo_active")
      .eq("available", true)
      .order("sort_order")
      .then(({ data, error }) => {
        if (error) {
          if (products.length === 0) toast.error("No pudimos cargar el menú");
        } else {
          setProducts(data || []);
        }
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const grouped = products.reduce<Record<string, Product[]>>((acc, p) => {
    (acc[p.category] ||= []).push(p);
    return acc;
  }, {});

  const LAST_CATS = ["Adicionales", "Sodas", "Bebidas"];
  const categories = Object.keys(grouped).sort((a, b) => {
    const ai = LAST_CATS.indexOf(a);
    const bi = LAST_CATS.indexOf(b);
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return -1;
    if (bi === -1) return 1;
    return ai - bi;
  });

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="font-display text-5xl text-foreground sm:text-6xl">
          Nuestro <span className="text-gradient-fire">Menú</span>
        </h1>
        <p className="mt-2 text-muted-foreground">Toca "Agregar" para enviar al carrito.</p>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : products.length === 0 ? (
          <p className="py-20 text-center text-muted-foreground">No hay productos disponibles.</p>
        ) : (
          <>
            <PromosFeatured
              products={products.filter((p) => p.promo_active && p.promo_price && Number(p.promo_price) > 0)}
              onAdd={handleAdd}
              needsSide={needsSide}
              onImage={(src, alt) => setLightbox({ src, alt })}
            />
            {

          categories.map((cat) => {
            const list = grouped[cat];
            const isOpen = openCats[cat] ?? false;
            return (
              <div key={cat} className="group relative mt-4 first:mt-8">
                <button
                  type="button"
                  onClick={() => setOpenCats((s) => ({ ...s, [cat]: !isOpen }))}
                  aria-expanded={isOpen}
                  className={`relative flex w-full items-center justify-between gap-3 overflow-hidden rounded-2xl border px-5 py-5 text-left backdrop-blur-md transition-all duration-300 ${
                    isOpen
                      ? "border-primary/40 bg-[#161412]/80"
                      : "border-white/10 bg-white/[0.02] hover:border-primary/30 hover:bg-white/[0.04]"
                  }`}
                >
                  {/* hairline top highlight */}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent"
                  />
                  <span className="flex items-baseline gap-3">
                    <span
                      className={`font-display text-2xl font-bold uppercase tracking-[0.18em] transition-all duration-500 ${
                        isOpen
                          ? "text-gradient-fire"
                          : "text-foreground/85 group-hover:text-foreground"
                      }`}
                    >
                      {cat}
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/60">
                      {list.length}
                    </span>
                  </span>
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-full border transition-all duration-500 ${
                      isOpen
                        ? "border-primary/40 bg-primary/10 text-accent"
                        : "border-white/10 bg-white/[0.02] text-muted-foreground/70 group-hover:border-primary/30 group-hover:text-accent"
                    }`}
                  >
                    <ChevronDown
                      className={`h-4 w-4 transition-transform duration-500 ${isOpen ? "rotate-180" : ""}`}
                    />
                  </span>
                </button>
                {isOpen && (
                  <div className="px-1 pt-5">

                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                      {list.map((p) => (
                        <article
                          key={p.id}
                          className="group overflow-hidden rounded-2xl border border-border bg-card shadow-card transition hover:border-primary/50"
                        >
                          {p.image_url && (
                            <button
                              type="button"
                              onClick={() => setLightbox({ src: p.image_url!, alt: p.name })}
                              className="block aspect-square w-full overflow-hidden bg-black"
                              aria-label={`Ver imagen de ${p.name}`}
                            >
                              <img
                                src={p.image_url}
                                alt={p.name}
                                loading="lazy"
                                decoding="async"
                                width={800}
                                height={600}
                                className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                              />
                            </button>
                          )}
                          <div className="p-5">
                            <div className="flex items-start justify-between gap-3">
                              <h3 className="font-display text-xl tracking-wide text-foreground">{p.name}</h3>
                              {p.promo_active && p.promo_price ? (
                                <div className="flex shrink-0 flex-col items-end leading-tight">
                                  <span className="text-xs text-muted-foreground line-through">{formatCOP(p.price)}</span>
                                  <span className="font-display text-xl text-primary">{formatCOP(p.promo_price)}</span>
                                </div>
                              ) : (
                                <span className="shrink-0 font-display text-xl text-accent">
                                  {formatCOP(p.price)}
                                </span>
                              )}
                            </div>

                            {p.description && (
                              <div className="mt-2">
                                <p className={`text-sm text-muted-foreground ${expanded[p.id] ? "" : "line-clamp-2"}`}>
                                  {p.description}
                                </p>
                                {p.description.length > 80 && (
                                  <button
                                    type="button"
                                    onClick={() => setExpanded((s) => ({ ...s, [p.id]: !s[p.id] }))}
                                    className="mt-1 text-xs font-semibold text-accent hover:underline"
                                  >
                                    {expanded[p.id] ? "Ver menos" : "Ver más"}
                                  </button>
                                )}
                              </div>
                            )}
                            <button
                              onClick={() => handleAdd(p)}
                              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary py-2.5 font-semibold text-primary-foreground transition hover:bg-primary/90 active:scale-95"
                            >
                              <Plus className="h-4 w-4" />
                              {needsSide(p) ? "Elegir y agregar" : "Agregar al carrito"}
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
          }
          </>
        )}

      </section>
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={() => setLightbox(null)}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
            aria-label="Cerrar"
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={lightbox.src}
            alt={lightbox.alt}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] max-w-full object-contain"
          />
        </div>
      )}
      {sideModal && (
        <div
          onClick={closeSideModal}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-display text-2xl text-foreground">
                {sideModal.name}
              </h3>
              <button
                type="button"
                onClick={closeSideModal}
                className="rounded-full p-1 text-muted-foreground hover:bg-white/5 hover:text-foreground"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {sideStep === 1 ? (
              <>
                <p className="mt-1 text-sm text-muted-foreground">
                  Elige tu acompañamiento (obligatorio)
                </p>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => addWithSide(sideModal, "Bollo")}
                    className="rounded-xl border border-border bg-background py-4 font-semibold text-foreground transition hover:border-primary hover:bg-primary/10"
                  >
                    Con bollo
                  </button>
                  <button
                    type="button"
                    onClick={() => addWithSide(sideModal, "Yuca")}
                    className="rounded-xl border border-border bg-background py-4 font-semibold text-foreground transition hover:border-primary hover:bg-primary/10"
                  >
                    Con yuca
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="mt-1 text-sm text-muted-foreground">
                  Elegiste <span className="text-foreground font-semibold">{chosenSide?.toLowerCase()}</span>. Ahora elige la proteína (obligatorio)
                </p>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => addDuoWithProtein(sideModal, "Chorizo")}
                    className="rounded-xl border border-border bg-background py-4 font-semibold text-foreground transition hover:border-primary hover:bg-primary/10"
                  >
                    Con chorizo
                  </button>
                  <button
                    type="button"
                    onClick={() => addDuoWithProtein(sideModal, "Morcilla")}
                    className="rounded-xl border border-border bg-background py-4 font-semibold text-foreground transition hover:border-primary hover:bg-primary/10"
                  >
                    Con morcilla
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => { setSideStep(1); setChosenSide(null); }}
                  className="mt-4 w-full text-center text-xs text-muted-foreground underline-offset-2 hover:underline"
                >
                  ← Volver a elegir acompañamiento
                </button>
              </>
            )}
          </div>
        </div>
      )}
      <SiteFooter />
    </div>
  );
}

function PromosFeatured({
  products,
  onAdd,
  needsSide,
  onImage,
}: {
  products: Product[];
  onAdd: (p: Product) => void;
  needsSide: (p: Product) => boolean;
  onImage: (src: string, alt: string) => void;
}) {
  if (products.length === 0) return null;
  return (
    <div className="relative mt-8 overflow-hidden rounded-3xl border border-primary/40 bg-gradient-to-br from-primary/15 via-[#1a0f08] to-background p-5 shadow-[0_0_60px_-15px_hsl(var(--primary)/0.5)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl"
      />
      <div className="relative mb-5 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-primary">
          <img src={logoFlame} alt="llama" className="h-5 w-5" />
        </span>
        <div>
          <h2 className="font-display text-2xl uppercase tracking-[0.18em] text-gradient-fire">
            Promos del día
          </h2>
          <p className="text-xs text-muted-foreground">Ofertas por tiempo limitado</p>
        </div>
      </div>
      <PromosCarousel
        products={products}
        onAdd={onAdd}
        needsSide={needsSide}
        onImage={onImage}
      />
    </div>
  );
}

function PromosCarousel({
  products,
  onAdd,
  needsSide,
  onImage,
}: {
  products: Product[];
  onAdd: (p: Product) => void;
  needsSide: (p: Product) => boolean;
  onImage: (src: string, alt: string) => void;
}) {
  const autoplay = useRef(
    Autoplay({ delay: 4500, stopOnInteraction: false, stopOnMouseEnter: false }),
  );
  const multiple = products.length > 1;
  const [emblaRef] = useEmblaCarousel(
    { loop: true, align: "center", containScroll: false, active: multiple },
    multiple ? [autoplay.current] : [],
  );

  const renderCard = (p: Product) => {
    return (
      <article
        key={p.id}
        className="group relative overflow-hidden rounded-2xl border border-primary/30 bg-card shadow-card transition hover:border-primary"
      >
        {p.image_url && (
          <button
            type="button"
            onClick={() => onImage(p.image_url!, p.name)}
            className="block aspect-square w-full overflow-hidden bg-black"
            aria-label={`Ver imagen de ${p.name}`}
          >
            <img
              src={p.image_url}
              alt={p.name}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </button>
        )}
        <div className="p-4">
          <h3 className="font-display text-lg text-foreground">{p.name}</h3>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-2xl text-primary">{formatCOP(p.promo_price!)}</span>
            <span className="text-sm text-muted-foreground line-through">{formatCOP(p.price)}</span>
          </div>
          <button
            onClick={() => onAdd(p)}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            {needsSide(p) ? "Elegir y agregar" : "Agregar"}
          </button>
        </div>
      </article>
    );
  };

  if (!multiple) {
    return <div className="relative mx-auto max-w-sm">{renderCard(products[0])}</div>;
  }

  return (
    <div className="relative">
      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex touch-pan-y">
          {products.map((p) => (
            <div key={p.id} className="min-w-0 flex-[0_0_100%] px-1 sm:px-2">
              <div className="mx-auto max-w-sm">{renderCard(p)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


