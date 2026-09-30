/* ============================================================================
   CLICSTORE — Detalle de producto (client component)
   ----------------------------------------------------------------------------
   CLIENT COMPONENT con las partes interactivas del detalle:
     - Galería de imágenes con thumbnails.
     - Selector de talla.
     - Selector de cantidad.
     - Botón "Agregar al carrito" con feedback.
     - Precio dinámico (aplica descuentos por cantidad total de la categoría).

   ¿POR QUÉ CLIENT?
   ---------------
   Necesita interactividad (estado local para talla, cantidad, imagen
   seleccionada, feedback). El server component padre ya trajo los datos.
   ============================================================================ */

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatUSD } from "@/lib/money";
import { resolveUnitPriceCents } from "@/lib/pricing";
import { ivaRateToPercent } from "@/lib/tax";
import { useCartStore } from "@/store/cart-store";


/* ============================================================================
   TIPOS
   ============================================================================ */

export type ProductDetailVariant = {
  id: string;
  sku: string;
  size: string | null;
  stock: number;
  priceCents: number | null;
};

export type ProductDetailData = {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDesc: string | null;
  basePriceCents: number;
  sku: string;
  fabricante: string | null;
  images: string[];
  colors: string[];
  category: {
    id: string;
    name: string;
    slug: string;
  };
  variants: ProductDetailVariant[];
};

type PriceRuleRow = {
  categoryId: string;
  minQuantity: number;
  priceCents: number;
};

type ProductDetailProps = {
  product: ProductDetailData;
  priceRules: PriceRuleRow[];
  ivaRateBp: number;
};


/* ============================================================================
   COMPONENTE
   ============================================================================ */

export function ProductDetail({
  product,
  priceRules,
  ivaRateBp,
}: ProductDetailProps) {
  /* --- Estado local --- */
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(() => {
    const firstAvailable = product.variants.find((v) => v.stock > 0);
    return firstAvailable?.id ?? null;
  });
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

  /* --- Store del carrito --- */
  const items = useCartStore((s) => s.items);
  const addItem = useCartStore((s) => s.addItem);

  /* --- Variante seleccionada y disponibilidad --- */
  const selectedVariant = product.variants.find((v) => v.id === selectedVariantId);
  const hasStock = product.variants.some((v) => v.stock > 0);
  const maxStock = selectedVariant?.stock ?? 0;

  /* --- Cantidad total de esta categoría en el carrito (ya agregada) --- */
  const categoryCountInCart = useMemo(
    () =>
      items
        .filter((it) => it.categoryId === product.category.id)
        .reduce((sum, it) => sum + it.quantity, 0),
    [items, product.category.id]
  );

  /* --- Precio unitario según cantidad TOTAL de la categoría ---
     El precio se calcula sobre: lo que ya hay en el carrito + lo que se
     va a agregar ahora. Así el cliente ve el descuento real que pagará. */
  const rules = useMemo(
    () => priceRules.filter((r) => r.categoryId === product.category.id),
    [priceRules, product.category.id]
  );

  const totalQty = categoryCountInCart + quantity;
  const currentUnitPriceCents =
    selectedVariant?.priceCents ??
    resolveUnitPriceCents(totalQty, rules) ??
    product.basePriceCents;

  /* --- Precio sin descuentos (para mostrar tachado si hay descuento) --- */
  const baseUnitPriceCents =
    selectedVariant?.priceCents ?? product.basePriceCents;
  const hasDiscount = currentUnitPriceCents < baseUnitPriceCents;

  /* --- IVA del precio unitario (informativo) --- */
  const ivaPct = ivaRateToPercent(ivaRateBp);

  /* --- Imagen principal --- */
  const mainImage = product.images[selectedImageIdx] ?? product.images[0] ?? "";

  /* --- Manejadores --- */
  function handleAddToCart() {
    if (!selectedVariant || selectedVariant.stock <= 0) return;
    if (quantity < 1 || quantity > selectedVariant.stock) return;

    addItem(
      {
        productId: product.id,
        variantId: selectedVariant.id,
        name: product.name,
        slug: product.slug,
        image: mainImage,
        sku: selectedVariant.sku,
        size: selectedVariant.size ?? "",
        color: product.colors.join(" / "),
        categoryId: product.category.id,
        categoryName: product.category.name,
        priceCents: currentUnitPriceCents,
        stock: selectedVariant.stock,
      },
      quantity
    );

    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1500);
  }

  return (
    <div className="grid gap-10 lg:grid-cols-2">

      {/* ============================================================
          COLUMNA IZQUIERDA — GALERÍA
          ============================================================ */}
      <div>
        {/* Imagen principal */}
        <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-surface2 border border-border">
          {mainImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mainImage}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted">
              Sin imagen
            </div>
          )}
        </div>

        {/* Thumbnails (si hay más de 1 imagen) */}
        {product.images.length > 1 && (
          <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
            {product.images.map((img, idx) => (
              <button
                key={img}
                type="button"
                onClick={() => setSelectedImageIdx(idx)}
                className={[
                  "shrink-0 w-20 h-24 rounded-lg overflow-hidden border-2 transition-all",
                  idx === selectedImageIdx
                    ? "border-primary"
                    : "border-border hover:border-primary/50",
                ].join(" ")}
                aria-label={`Ver imagen ${idx + 1}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ============================================================
          COLUMNA DERECHA — INFO Y ACCIONES
          ============================================================ */}
      <div className="flex flex-col">

        {/* Categoría (link) */}
        <Link
          href={`/productos?categoria=${product.category.slug}`}
          className="text-xs font-semibold uppercase tracking-wider text-muted hover:text-primary transition-colors"
        >
          {product.category.name}
        </Link>

        {/* Nombre */}
        <h1 className="mt-2 text-3xl md:text-4xl font-bold tracking-tight">
          {product.name}
        </h1>

        {/* SKU + fabricante */}
        <p className="mt-2 text-sm text-muted">
          SKU {product.sku}
          {product.fabricante && ` · ${product.fabricante}`}
        </p>

        {/* Colores (badges) */}
        {product.colors.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {product.colors.map((c) => (
              <span
                key={c}
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border border-border bg-surface2 text-text"
              >
                {c}
              </span>
            ))}
          </div>
        )}

        {/* Precio */}
        <div className="mt-6 flex items-baseline gap-3">
          <span className="text-3xl font-bold">
            {formatUSD(currentUnitPriceCents)}
          </span>
          {hasDiscount && (
            <span className="text-lg text-muted line-through">
              {formatUSD(baseUnitPriceCents)}
            </span>
          )}
          <span className="text-sm text-muted">c/u · IVA {ivaPct}% incl.</span>
        </div>

        {/* Aviso de descuento activo */}
        {hasDiscount && (
          <p className="mt-2 text-sm text-success font-medium">
            ¡Descuento aplicado por llevar {totalQty} en {product.category.name}!
          </p>
        )}

        {/* Aviso de descuento futuro */}
        {!hasDiscount && rules.length > 1 && (
          <p className="mt-2 text-xs text-muted">
            Lleva 2 o más y paga menos por unidad.
          </p>
        )}

        {/* Descripción corta */}
        {product.shortDesc && (
          <p className="mt-5 text-base text-muted">{product.shortDesc}</p>
        )}

        {/* Selector de talla */}
        {product.variants.length > 0 ? (
          <div className="mt-8">
            <div className="flex items-baseline justify-between mb-3">
              <span className="text-sm font-semibold">Talla</span>
              {selectedVariant && selectedVariant.stock <= 5 && selectedVariant.stock > 0 && (
                <span className="text-xs text-warning">
                  Últimas {selectedVariant.stock} unidades
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {product.variants.map((v) => {
                const isSelected = v.id === selectedVariantId;
                const isOutOfStock = v.stock <= 0;
                const label = v.size ?? "Única";
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => {
                      setSelectedVariantId(v.id);
                      setQuantity(1);
                    }}
                    disabled={isOutOfStock}
                    className={[
                      "min-w-[52px] h-11 px-4 rounded-lg text-sm font-semibold transition-all",
                      isOutOfStock
                        ? "border border-border text-muted opacity-40 cursor-not-allowed line-through"
                        : isSelected
                        ? "border-2 border-primary bg-primary text-primaryFg"
                        : "border border-border text-text hover:border-primary",
                    ].join(" ")}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="mt-8 text-sm text-muted italic">Sin variantes disponibles</p>
        )}

        {/* Selector de cantidad */}
        {hasStock && selectedVariant && (
          <div className="mt-6">
            <span className="text-sm font-semibold block mb-3">Cantidad</span>
            <div className="inline-flex items-center rounded-lg border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                aria-label="Disminuir cantidad"
                className="w-11 h-11 flex items-center justify-center hover:bg-surface2 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M5 12h14" />
                </svg>
              </button>
              <span className="w-14 text-center text-base font-semibold tabular-nums">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(maxStock, q + 1))}
                disabled={quantity >= maxStock}
                aria-label="Aumentar cantidad"
                className="w-11 h-11 flex items-center justify-center hover:bg-surface2 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Botón agregar al carrito */}
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={!hasStock || !selectedVariant}
          className={[
            "mt-8 w-full h-14 rounded-xl font-semibold text-base transition-all",
            justAdded
              ? "bg-success text-white"
              : !hasStock || !selectedVariant
              ? "bg-surface2 text-muted cursor-not-allowed"
              : "bg-primary text-primaryFg hover:opacity-90 active:scale-[0.99]",
          ].join(" ")}
        >
          {justAdded
            ? "✓ Agregado al carrito"
            : hasStock
            ? `Agregar ${quantity} al carrito · ${formatUSD(currentUnitPriceCents * quantity)}`
            : "Sin stock"}
        </button>

        {/* Link al carrito después de agregar */}
        {justAdded && (
          <Link
            href="/carrito"
            className="mt-3 block text-center text-sm text-primary hover:underline"
          >
            Ir al carrito →
          </Link>
        )}

        {/* Descripción completa */}
        <div className="mt-10 pt-8 border-t border-border">
          <h2 className="text-lg font-semibold mb-3">Descripción</h2>
          <p className="text-sm text-muted leading-relaxed whitespace-pre-line">
            {product.description}
          </p>
        </div>
      </div>
    </div>
  );
}