/* ============================================================================
   CLICSTORE — Página del carrito
   ----------------------------------------------------------------------------
   Este es un SERVER COMPONENT que:

     1. Lee las reglas de precio (PriceRule) y la tasa de IVA desde la DB.
     2. Se las pasa al componente de cliente <CartView />.
     3. NO renderiza nada de UI directamente — solo prepara datos.

   ¿POR QUÉ SERVER + CLIENT?
   -------------------------
   El carrito vive en localStorage (Zustand en el navegador). Eso lo maneja
   el cliente. Pero las reglas de precio y el IVA viven en la base de datos.
   Solo un Server Component puede consultar Prisma directamente. Entonces:
     - Server: obtiene las reglas/IVA
     - Client: usa esas reglas + el carrito del localStorage

   FILTRADO POR CATEGORÍA
   ----------------------
   El precio se calcula POR CATEGORÍA (todos los cuello V suman juntos).
   Por eso el server envía TODAS las reglas, agrupadas por categoría.
   ============================================================================ */

// Tipo de metadatos de Next.js.
import type { Metadata } from "next";

// Cliente de Prisma (instancia única compartida).
import { prisma } from "@/lib/db";

// Función que lee la tasa de IVA desde la DB.
import { getIvaRateBp } from "@/lib/settings";

// Componente de cliente que renderiza el carrito.
import { CartView } from "@/components/cart/cart-view";


/* ============================================================================
   METADATOS
   ============================================================================ */

export const metadata: Metadata = {
  title: "Carrito",
  description: "Revisa los productos de tu carrito antes de finalizar la compra.",
};


/* ============================================================================
   COMPONENTE (SERVER)
   ============================================================================ */

export default async function CarritoPage() {
  /* ------------------------------------------------------------------------
     PASO 1 — Consultar en paralelo
     ------------------------------------------------------------------------
     Obtenemos en una sola pasada:
       - Todas las reglas de precio (para el cálculo por cantidad).
       - La tasa de IVA configurada en la DB (por defecto 1500 bp = 15%).
     ------------------------------------------------------------------------ */
  const [priceRules, ivaRateBp] = await Promise.all([
    prisma.priceRule.findMany({
      // Traemos solo los campos que necesita el cliente.
      select: {
        categoryId: true,
        minQuantity: true,
        priceCents: true,
      },
    }),
    getIvaRateBp(),
  ]);

  /* ------------------------------------------------------------------------
     PASO 2 — Renderizado
     ------------------------------------------------------------------------
     Pasamos al cliente:
       - priceRules: array plano (serializable a JSON sin problemas).
       - ivaRateBp: número (1500 = 15%).

     El cliente se encarga del resto (leer localStorage, calcular totales, etc.).
     ------------------------------------------------------------------------ */
  return (
    <div className="container-page py-12 md:py-16">
      <h1 className="text-3xl font-bold md:text-4xl">Tu carrito</h1>
      <p className="mt-2 text-muted">
        Revisa los productos antes de continuar al checkout.
      </p>

      <div className="mt-8">
        <CartView priceRules={priceRules} ivaRateBp={ivaRateBp} />
      </div>
    </div>
  );
}