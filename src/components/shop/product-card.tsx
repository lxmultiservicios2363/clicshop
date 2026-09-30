/* ============================================================================
   CLICSTORE — Card de producto
   ----------------------------------------------------------------------------
   Este componente muestra un producto individual en la grilla del catálogo.
   Contiene:

     - Imagen del producto (con hover y placeholder)
     - Nombre de la categoría (kicker)
     - Nombre del producto
     - Precio (con descuentos por cantidad mostrados)
     - Selector de talla (solo variantes con stock > 0)
     - Botón "Agregar al carrito" con feedback visual

   COMPORTAMIENTO
   --------------
   - Es un CLIENT COMPONENT porque necesita interactividad (agregar al carrito,
     cambiar talla, mostrar feedback).
   - Al agregar, llama a `addItem` del store del carrito.
   - Tras agregar, muestra "✓ Agregado" durante 1.5 segundos y vuelve al estado normal.

   USO EN LA PÁGINA DE PRODUCTOS
   -----------------------------
     <ProductCard product={product} />

   Donde `product` incluye sus variantes (con stock) y la categoría.
   ============================================================================ */

"use client";

// Hook de React para manejar el estado del feedback y la talla seleccionada.
import { useState } from "react";

// Link de Next.js para ir a la página del producto.
import Link from "next/link";

// Formateo de precios en centavos → "$15.00".
import { formatUSD } from "@/lib/money";

// Store del carrito (para agregar ítems).
import { useCartStore } from "@/store/cart-store";


/* ============================================================================
   TIPOS
   ============================================================================ */

/**
 * Variante del producto que viene de la base de datos.
 * Solo los campos que necesita esta card.
 */
export type ProductCardVariant = {
  id: string;
  sku: string;
  size: string | null;
  stock: number;
  priceCents: number | null;
};

/**
 * Datos del producto que necesita esta card.
 * Vienen desde el server component que hace la consulta a Prisma.
 */
export type ProductCardData = {
  id: string;
  name: string;
  slug: string;
  basePriceCents: number;
  images: string[];
  colors: string[];
  category: {
    id: string;
    name: string;
  };
  variants: ProductCardVariant[];
};


/* ============================================================================
   COMPONENTE
   ============================================================================ */

export function ProductCard({ product }: { product: ProductCardData }) {
  // --- Estado interno ---

  // Variante seleccionada (talla). Se inicializa con la primera talla
  // que tenga stock > 0. Si no hay ninguna, queda null.
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    () => {
      const firstAvailable = product.variants.find((v) => v.stock > 0);
      return firstAvailable?.id ?? null;
    }
  );

  // Flag para el feedback "✓ Agregado" que se muestra 1.5s tras agregar.
  const [justAdded, setJustAdded] = useState(false);

  // Acción del store.
  const addItem = useCartStore((s) => s.addItem);

  // --- Datos derivados ---

  // La variante seleccionada completa.
  const selectedVariant = product.variants.find(
    (v) => v.id === selectedVariantId
  );

  // ¿Hay al menos una variante con stock?
  const hasStock = product.variants.some((v) => v.stock > 0);

  // Imagen principal (o placeholder si no hay).
  const mainImage = product.images[0] ?? "";

  // Precio a mostrar: si la variante tiene precio propio, lo usamos;
  // si no, el precio base del producto.
  const displayPriceCents =
    selectedVariant?.priceCents ?? product.basePriceCents;

  // Texto de color(es): unidos con " · " y máx 2 para no saturar.
  const colorsLabel = product.colors.slice(0, 2).join(" · ");

  // --- Manejadores ---

  /** Se ejecuta al hacer clic en "Agregar al carrito". */
  function handleAddToCart() {
    // No hay talla seleccionada o no hay stock → salir.
    if (!selectedVariant || selectedVariant.stock <= 0) return;

    // Agregamos al store. Esta es la firma que definimos en cart-store.ts.
    addItem(
      {
        productId: product.id,
        variantId: selectedVariant.id,
        name: product.name,
        slug: product.slug,
        image: mainImage,
        sku: selectedVariant.sku,
        size: selectedVariant.size ?? "",
        color: colorsLabel,
        categoryId: product.category.id,
        categoryName: product.category.name,
        priceCents: displayPriceCents,
        stock: selectedVariant.stock,
      },
      1
    );

    // Feedback visual: "✓ Agregado" durante 1.5s.
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1500);
  }

  return (
    <article className="group rounded-2xl border border-border bg-surface overflow-hidden flex flex-col transition-shadow hover:shadow-token">

      {/* ============================================================
          IMAGEN (con link al producto)
          ============================================================ */}
      <Link
        href={`/productos/${product.slug}`}
        className="block relative aspect-[3/4] bg-surface2 overflow-hidden"
      >
        {mainImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mainImage}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          // Placeholder cuando no hay imagen.
          <div className="w-full h-full flex items-center justify-center text-muted text-sm">
            Sin imagen
          </div>
        )}
      </Link>

      {/* ============================================================
          CUERPO (info + acciones)
          ============================================================ */}
      <div className="p-4 flex flex-col gap-3 flex-1">

        {/* --- Categoría (kicker) --- */}
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
          {product.category.name}
        </span>

        {/* --- Nombre del producto --- */}
        <Link
          href={`/productos/${product.slug}`}
          className="font-semibold text-text leading-snug hover:text-primary transition-colors line-clamp-2"
        >
          {product.name}
        </Link>

        {/* --- Precio --- */}
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold text-text">
            {formatUSD(displayPriceCents)}
          </span>
          <span className="text-xs text-muted">c/u</span>
        </div>

        {/* --- Selector de talla --- */}
        {product.variants.length > 0 ? (
          <div>
            <span className="block text-[11px] font-medium text-muted mb-1.5">
              Talla
            </span>
            <div className="flex flex-wrap gap-1.5">
              {product.variants.map((variant) => {
                const isSelected = variant.id === selectedVariantId;
                const isOutOfStock = variant.stock <= 0;
                const label = variant.size ?? "Única";

                return (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => setSelectedVariantId(variant.id)}
                    disabled={isOutOfStock}
                    title={
                      isOutOfStock
                        ? `Talla ${label} — sin stock`
                        : `Talla ${label} (${variant.stock} disponibles)`
                    }
                    className={[
                      // Base
                      "min-w-[34px] h-8 px-2 rounded-md text-xs font-semibold transition-all",
                      // Estado: sin stock
                      isOutOfStock
                        ? "border border-border text-muted opacity-40 cursor-not-allowed line-through"
                        : // Estado: seleccionada
                        isSelected
                        ? "border border-primary bg-primary text-primaryFg"
                        : // Estado: disponible sin seleccionar
                          "border border-border text-text hover:border-primary",
                    ].join(" ")}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <span className="text-xs text-muted italic">Sin variantes</span>
        )}

        {/* --- Botón agregar al carrito --- */}
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={!hasStock || !selectedVariant}
          className={[
            // Base
            "mt-auto w-full h-10 rounded-lg font-semibold text-sm transition-all",
            // Estado: éxito (feedback reciente)
            justAdded
              ? "bg-success text-white"
              : // Estado: sin stock
              !hasStock || !selectedVariant
              ? "bg-surface2 text-muted cursor-not-allowed"
              : // Estado: disponible
                "bg-primary text-primaryFg hover:opacity-90 active:scale-[0.98]",
          ].join(" ")}
        >
          {justAdded
            ? "✓ Agregado"
            : hasStock
            ? "Agregar al carrito"
            : "Sin stock"}
        </button>
      </div>
    </article>
  );
}