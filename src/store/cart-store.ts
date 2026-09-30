/* ============================================================================
   CLICSTORE — Estado global del carrito de compras
   ----------------------------------------------------------------------------
   Este archivo maneja TODO lo relacionado con el carrito:

     - Agregar productos (con su talla/color/stock)
     - Quitar productos
     - Cambiar la cantidad de un producto
     - Vaciar el carrito entero
     - Guardar el carrito en localStorage (persiste al cerrar y volver)

   ¿POR QUÉ ZUSTAND?
   -----------------
   Zustand es una librería minimalista de estado global. Permite que cualquier
   componente (header, página de productos, checkout) acceda al carrito sin
   pasar props entre 10 niveles. Y con el middleware "persist" guarda todo
   en localStorage automáticamente.

   ¿QUÉ GUARDA CADA ÍTEM?
   ----------------------
   Cada ítem tiene TODOS los datos necesarios para renderizarlo y calcular
   el total. NO guarda solo el productId: guarda un "snapshot" de nombre,
   imagen, precio, etc., para no tener que hacer 70 consultas a la DB cada
   vez que se abre el carrito. Es la misma estrategia que usa Shopify.

   IMPORTANTE: los precios se calculan SIEMPRE al vuelo (con las PriceRules).
   El precio base guardado aquí es solo para mostrar en el listado. El
   descuento por cantidad se aplica en checkout usando src/lib/pricing.ts.

   USO EN EL RESTO DEL CÓDIGO
   --------------------------
     "use client";
     import { useCartStore } from "@/store/cart-store";

     function MiComponente() {
       const items = useCartStore((s) => s.items);
       const addItem = useCartStore((s) => s.addItem);
       const count = useCartStore((s) => s.items.reduce((n, i) => n + i.quantity, 0));
     }
   ============================================================================ */

"use client";

// Importamos create (para crear el store) y persist (para localStorage).
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";


/* ============================================================================
   TIPOS
   ============================================================================ */

/**
 * Un ítem dentro del carrito.
 * Guarda un snapshot completo del producto + variante elegida.
 */
export type CartItem = {
  /** ID del producto en la base de datos */
  productId: string;

  /** ID de la variante (talla específica) */
  variantId: string;

  /** Nombre del producto (ej: "Suéter Cuello V #01") */
  name: string;

  /** Slug para construir la URL del producto */
  slug: string;

  /** Ruta pública de la imagen principal */
  image: string;

  /** SKU completo (ej: "CS-V-01-M") */
  sku: string;

  /** Talla elegida ("S", "M", "L", "XL") */
  size: string;

  /** Color del producto (puede ser "" si no tiene) */
  color: string;

  /** ID de la categoría (para agrupar y aplicar reglas de precio) */
  categoryId: string;

  /** Nombre de la categoría (ej: "Cuello en V") */
  categoryName: string;

  /** Precio base en centavos (sin descuento por cantidad) */
  priceCents: number;

  /** Cantidad de unidades elegidas */
  quantity: number;

  /** Stock disponible de esa variante (para no excederlo) */
  stock: number;
};

/**
 * Estado + acciones del store.
 */
type CartState = {
  /** Lista de ítems en el carrito */
  items: CartItem[];

  /**
   * Flag interno que indica si Zustand ya cargó el carrito desde localStorage.
   * Necesario para evitar warnings de hidratación en Next.js SSR:
   * en el servidor no existe localStorage, así que el primer render del
   * cliente debe coincidir con el del servidor (carrito vacío) hasta que
   * Zustand re-hidrate. Los componentes pueden esperar a "hasHydrated" para
   * mostrar el contenido real.
   */
  _hasHydrated: boolean;

  /** Setter para el flag de hidratación */
  setHasHydrated: (value: boolean) => void;

  /**
   * Agrega un ítem al carrito.
   * - Si la variante ya existe, le suma la cantidad.
   * - Si excede el stock disponible, la limita al máximo.
   * - Si no existe, lo agrega con la cantidad solicitada.
   */
  addItem: (
    item: Omit<CartItem, "quantity">,
    quantity: number
  ) => void;

  /**
   * Quita un ítem del carrito (identificado por producto + variante).
   */
  removeItem: (productId: string, variantId: string) => void;

  /**
   * Cambia la cantidad de un ítem.
   * - Si la cantidad es <= 0, el ítem se elimina.
   * - Si excede el stock, se limita al máximo.
   */
  updateQuantity: (
    productId: string,
    variantId: string,
    quantity: number
  ) => void;

  /**
   * Vacía el carrito por completo.
   */
  clearCart: () => void;
};


/* ============================================================================
   HELPERS INTERNOS
   ============================================================================ */

/**
 * Busca un ítem en el array por productId + variantId.
 * Devuelve el índice (o -1 si no existe).
 */
function findItemIndex(
  items: CartItem[],
  productId: string,
  variantId: string
): number {
  return items.findIndex(
    (it) => it.productId === productId && it.variantId === variantId
  );
}


/* ============================================================================
   STORE
   ============================================================================ */

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      /* ---- Estado inicial ---- */
      items: [],
      _hasHydrated: false,

      /* ---- Flag de hidratación ---- */
      setHasHydrated: (value) => set({ _hasHydrated: value }),

      /* ------------------------------------------------------------------
         ACCIÓN: addItem
         ------------------------------------------------------------------ */
      addItem: (item, quantity) => {
        // Validación: cantidad mínima 1.
        const qty = Math.max(1, Math.floor(quantity));

        set((state) => {
          const index = findItemIndex(state.items, item.productId, item.variantId);

          // --- Caso 1: el ítem ya existe → sumar cantidad ---
          if (index >= 0) {
            const existing = state.items[index];
            // Sumamos y limitamos al stock disponible.
            const newQty = Math.min(existing.stock, existing.quantity + qty);
            const updated = [...state.items];
            updated[index] = { ...existing, quantity: newQty };
            return { items: updated };
          }

          // --- Caso 2: no existe → agregar nuevo ítem ---
          // Limitamos al stock por si el usuario pide más de lo disponible.
          const safeQty = Math.min(item.stock, qty);
          return {
            items: [...state.items, { ...item, quantity: safeQty }],
          };
        });
      },

      /* ------------------------------------------------------------------
         ACCIÓN: removeItem
         ------------------------------------------------------------------ */
      removeItem: (productId, variantId) => {
        set((state) => ({
          items: state.items.filter(
            (it) => !(it.productId === productId && it.variantId === variantId)
          ),
        }));
      },

      /* ------------------------------------------------------------------
         ACCIÓN: updateQuantity
         ------------------------------------------------------------------ */
      updateQuantity: (productId, variantId, quantity) => {
        set((state) => {
          const index = findItemIndex(state.items, productId, variantId);
          if (index < 0) return state; // No existe → no hacer nada

          // Si la cantidad es <= 0 → eliminar el ítem
          if (quantity <= 0) {
            return {
              items: state.items.filter((_, i) => i !== index),
            };
          }

          // Cantidad válida → actualizar, limitando al stock
          const existing = state.items[index];
          const safeQty = Math.min(existing.stock, Math.floor(quantity));
          const updated = [...state.items];
          updated[index] = { ...existing, quantity: safeQty };
          return { items: updated };
        });
      },

      /* ------------------------------------------------------------------
         ACCIÓN: clearCart
         ------------------------------------------------------------------ */
      clearCart: () => set({ items: [] }),
    }),
    /* ---- Configuración de persistencia ---- */
    {
      // Nombre de la clave en localStorage.
      name: "clicstore-cart",

      // Usamos localStorage como backend.
      storage: createJSONStorage(() => localStorage),

      // Cuando Zustand re-hidrate desde localStorage, marcamos el flag.
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },

      // Solo persistimos "items". El flag _hasHydrated es efímero.
      partialize: (state) => ({ items: state.items }),
    }
  )
);


/* ============================================================================
   SELECTORES DERIVADOS (hooks utilitarios)
   ----------------------------------------------------------------------------
   Estos hooks devuelven valores calculados a partir del estado del carrito.
   Al usarlos en componentes, se re-renderizan solo cuando el valor cambia.
   ============================================================================ */

/**
 * Devuelve la cantidad TOTAL de unidades en el carrito.
 * Útil para el badge numérico en el header.
 *
 * @example
 *   const count = useCartCount();
 */
export function useCartCount(): number {
  return useCartStore((state) =>
    state.items.reduce((sum, item) => sum + item.quantity, 0)
  );
}

/**
 * Devuelve el número de ítems DISTINTOS en el carrito
 * (sin sumar cantidades).
 *
 * @example
 *   const unique = useCartUniqueCount();
 */
export function useCartUniqueCount(): number {
  return useCartStore((state) => state.items.length);
}

/**
 * Devuelve true cuando Zustand ya cargó el carrito desde localStorage.
 * Útil para evitar warnings de hidratación al renderizar el badge.
 *
 * @example
 *   const hasHydrated = useCartHydrated();
 *   if (!hasHydrated) return null; // No renderizar hasta que esté listo
 */
export function useCartHydrated(): boolean {
  return useCartStore((state) => state._hasHydrated);
}