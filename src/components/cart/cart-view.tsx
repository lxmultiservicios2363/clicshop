/* ============================================================================
   CLICSTORE — Vista del carrito (cliente)
   ----------------------------------------------------------------------------
   Este CLIENT COMPONENT renderiza la página del carrito:

     - Estado vacío con llamada a la acción
     - Lista de ítems con imagen, nombre, talla, cantidad, precio
     - Controles para cambiar cantidad (+/-) y eliminar
     - Resumen del pedido: subtotal, IVA, envío, total
     - Botón "Ir al checkout"
     - Botón "Vaciar carrito"

   CÁLCULO DE PRECIOS
   ------------------
   Los precios NO son fijos por ítem. Se calculan por CATEGORÍA:

     Si el cliente lleva 3 suéteres de cuello V (mezclando colores),
     los 3 se cobran al precio del tramo 3+ ($12.50 c/u).

   Eso significa que:
     - Cada vez que cambia la cantidad, se recalculan TODOS los precios
       de esa categoría.
     - La UI muestra el precio unitario ACTUAL, que puede bajar o subir
       al agregar/quitar ítems.

   RECIBE DEL SERVER
   -----------------
     - priceRules: reglas de precio (una por categoría × tramo)
     - ivaRateBp: tasa de IVA en basis points (1500 = 15%)
   ============================================================================ */

"use client";

// Hooks de React.
import { useMemo, useState } from "react";

// Link de Next.js para navegar sin recargar.
import Link from "next/link";

// Formateo de dinero.
import { formatUSD } from "@/lib/money";

// Cálculo de totales (subtotal, IVA, envío, total).
import { computeTotals, ivaRateToPercent } from "@/lib/tax";

// Cálculo de precios por cantidad.
import {
  buildRulesMap,
  resolveUnitPriceCents,
  type PriceRuleInput,
} from "@/lib/pricing";

// Store del carrito + hooks de hidratación.
import { useCartStore, useCartHydrated } from "@/store/cart-store";


/* ============================================================================
   TIPOS
   ============================================================================ */

/**
 * Reglas de precio tal como vienen del Server Component.
 */
type RawPriceRule = {
  categoryId: string;
  minQuantity: number;
  priceCents: number;
};

/**
 * Props del componente.
 */
type CartViewProps = {
  priceRules: RawPriceRule[];
  ivaRateBp: number;
};


/* ============================================================================
   COMPONENTE
   ============================================================================ */

export function CartView({ priceRules, ivaRateBp }: CartViewProps) {
  // --- Datos del store ---
  const items = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const clearCart = useCartStore((s) => s.clearCart);
  const hasHydrated = useCartHydrated();

  // --- Estado local para confirmación de "Vaciar carrito" ---
  const [confirmingClear, setConfirmingClear] = useState(false);

  // --- Construir el mapa de reglas por categoría ---
  // useMemo evita recalcularlo en cada render si las reglas no cambian.
  const rulesByCategory = useMemo(
    () => buildRulesMap(priceRules),
    [priceRules]
  );

  // --- Calcular precios por ítem y subtotal ---
  const pricing = useMemo(() => {
    // 1. Sumar cantidades totales por categoría.
    const categoryTotals = new Map<string, number>();
    for (const item of items) {
      const prev = categoryTotals.get(item.categoryId) ?? 0;
      categoryTotals.set(item.categoryId, prev + item.quantity);
    }

    // 2. Resolver precio unitario por categoría según la cantidad total.
    const unitPriceByCategory = new Map<string, number>();
    for (const [catId, total] of categoryTotals) {
      const rules = rulesByCategory.get(catId) ?? [];
      unitPriceByCategory.set(catId, resolveUnitPriceCents(total, rules));
    }

    // 3. Aplicar el precio unitario a cada ítem y sumar.
    let subtotalCents = 0;
    const details = items.map((item) => {
      const unitPrice = unitPriceByCategory.get(item.categoryId) ?? 0;
      const lineTotal = unitPrice * item.quantity;
      subtotalCents += lineTotal;
      return { item, unitPriceCents: unitPrice, lineTotalCents: lineTotal };
    });

    return { subtotalCents, details, unitPriceByCategory };
  }, [items, rulesByCategory]);

  // --- Calcular IVA y totales ---
  const totals = useMemo(
    () =>
      computeTotals({
        subtotalCents: pricing.subtotalCents,
        discountCents: 0, // El descuento ya está aplicado en los precios
        ivaRateBp,
        shippingCents: 0, // El envío se define en el checkout
      }),
    [pricing.subtotalCents, ivaRateBp]
  );

  /* ========================================================================
     ESTADO DE CARGA (SSR → cliente)
     ========================================================================
     Antes de que Zustand cargue el carrito desde localStorage, no mostramos
     el contenido para evitar saltos visuales.
     ======================================================================== */
  if (!hasHydrated) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-12 text-center">
        <p className="text-muted">Cargando tu carrito...</p>
      </div>
    );
  }

  /* ========================================================================
     ESTADO VACÍO
     ======================================================================== */
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-10 md:p-16 text-center">
        <div className="text-5xl mb-4">🛒</div>
        <h2 className="text-xl font-semibold">Tu carrito está vacío</h2>
        <p className="mt-2 text-muted max-w-md mx-auto">
          Aún no has agregado productos. Explora nuestro catálogo de suéteres
          tejidos a mano.
        </p>
        <Link
          href="/productos"
          className="mt-6 inline-block rounded-xl bg-primary px-6 py-3 font-semibold text-primaryFg hover:opacity-90 transition-opacity"
        >
          Ver productos
        </Link>
      </div>
    );
  }

  /* ========================================================================
     CARRITO CON ÍTEMS
     ======================================================================== */
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">

      {/* ============================================================
          COLUMNA IZQUIERDA — Lista de ítems
          ============================================================ */}
      <div className="space-y-4">

        {/* --- Cabecera con contador y botón "Vaciar" --- */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted">
            {items.length} {items.length === 1 ? "producto" : "productos"} en tu carrito
          </p>

          {confirmingClear ? (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted">¿Seguro?</span>
              <button
                onClick={() => {
                  clearCart();
                  setConfirmingClear(false);
                }}
                className="text-danger font-semibold hover:underline"
              >
                Sí, vaciar
              </button>
              <button
                onClick={() => setConfirmingClear(false)}
                className="text-muted hover:text-text"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmingClear(true)}
              className="text-sm text-muted hover:text-danger transition-colors"
            >
              Vaciar carrito
            </button>
          )}
        </div>

        {/* --- Ítems --- */}
        {pricing.details.map(({ item, unitPriceCents, lineTotalCents }) => (
          <article
            key={`${item.productId}-${item.variantId}`}
            className="rounded-2xl border border-border bg-surface p-4 flex gap-4"
          >
            {/* --- Imagen --- */}
            <Link
              href={`/productos/${item.slug}`}
              className="shrink-0 w-20 h-24 sm:w-24 sm:h-32 rounded-lg overflow-hidden bg-surface2"
            >
              {item.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted text-xs">
                  Sin imagen
                </div>
              )}
            </Link>

            {/* --- Info + controles --- */}
            <div className="flex-1 min-w-0 flex flex-col">

              {/* Nombre + eliminar */}
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/productos/${item.slug}`}
                  className="font-semibold text-text hover:text-primary transition-colors line-clamp-2"
                >
                  {item.name}
                </Link>
                <button
                  onClick={() => removeItem(item.productId, item.variantId)}
                  aria-label="Eliminar producto"
                  title="Eliminar"
                  className="shrink-0 p-1 text-muted hover:text-danger transition-colors"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                  </svg>
                </button>
              </div>

              {/* Meta: talla + color + sku */}
              <p className="mt-1 text-xs text-muted">
                {item.size && <>Talla <strong className="text-text">{item.size}</strong></>}
                {item.size && item.color && " · "}
                {item.color && <>{item.color}</>}
                {item.sku && <> · SKU {item.sku}</>}
              </p>

              {/* Precio unitario (ya con descuento aplicado) */}
              <p className="mt-2 text-sm">
                <span className="font-semibold">{formatUSD(unitPriceCents)}</span>
                <span className="text-muted"> c/u</span>
              </p>

              {/* Cantidad + línea total */}
              <div className="mt-auto pt-3 flex items-center justify-between gap-3">
                <QuantityControl
                  value={item.quantity}
                  max={item.stock}
                  onChange={(newQty) =>
                    updateQuantity(item.productId, item.variantId, newQty)
                  }
                />
                <p className="font-bold text-lg">{formatUSD(lineTotalCents)}</p>
              </div>

              {/* Aviso: stock disponible */}
              {item.stock <= 5 && (
                <p className="mt-1 text-xs text-warning">
                  Solo {item.stock} {item.stock === 1 ? "unidad disponible" : "unidades disponibles"}
                </p>
              )}
            </div>
          </article>
        ))}

        {/* --- Enlace para seguir comprando --- */}
        <Link
          href="/productos"
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-primary transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Seguir comprando
        </Link>
      </div>

      {/* ============================================================
          COLUMNA DERECHA — Resumen del pedido
          ============================================================ */}
      <aside className="lg:sticky lg:top-24 h-fit">
        <div className="rounded-2xl border border-border bg-surface p-6">

          <h2 className="text-lg font-semibold">Resumen del pedido</h2>

          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Subtotal</dt>
              <dd className="font-medium">{formatUSD(totals.subtotalCents)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">
                IVA {ivaRateToPercent(totals.ivaRateBp)}%
              </dt>
              <dd className="font-medium">{formatUSD(totals.ivaCents)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Envío</dt>
              <dd className="text-muted">Se calcula al pagar</dd>
            </div>
          </dl>

          <div className="mt-4 pt-4 border-t border-border flex justify-between items-baseline">
            <span className="text-base font-semibold">Total</span>
            <span className="text-2xl font-bold">{formatUSD(totals.totalCents)}</span>
          </div>

          <Link
            href="/checkout"
            className="mt-6 w-full inline-flex items-center justify-center rounded-xl bg-primary px-6 h-12 font-semibold text-primaryFg hover:opacity-90 transition-opacity"
          >
            Ir al checkout
          </Link>

          <p className="mt-4 text-xs text-muted text-center leading-relaxed">
            Pago por transferencia bancaria, DEUNA o tarjeta.
            El envío se calcula según tu ubicación en el checkout.
          </p>
        </div>
      </aside>
    </div>
  );
}


/* ============================================================================
   SUB-COMPONENTE: Control de cantidad (+ / -)
   ============================================================================ */

function QuantityControl({
  value,
  max,
  onChange,
}: {
  value: number;
  max: number;
  onChange: (v: number) => void;
}) {
  const canDecrease = value > 1;
  const canIncrease = value < max;

  return (
    <div className="inline-flex items-center rounded-lg border border-border overflow-hidden">
      <button
        type="button"
        onClick={() => canDecrease && onChange(value - 1)}
        disabled={!canDecrease}
        aria-label="Disminuir cantidad"
        className="w-9 h-9 flex items-center justify-center text-text hover:bg-surface2 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M5 12h14" />
        </svg>
      </button>
      <span className="w-10 text-center text-sm font-semibold tabular-nums">
        {value}
      </span>
      <button
        type="button"
        onClick={() => canIncrease && onChange(value + 1)}
        disabled={!canIncrease}
        aria-label="Aumentar cantidad"
        className="w-9 h-9 flex items-center justify-center text-text hover:bg-surface2 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
    </div>
  );
}