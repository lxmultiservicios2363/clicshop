/* ============================================================================
   CLICSTORE — Página de checkout (server component)
   ----------------------------------------------------------------------------
   Este es un SERVER COMPONENT que:

     1. Lee las cuentas bancarias desde Setting.bank.
     2. Lee las reglas de precio (PriceRule).
     3. Lee la tasa de IVA (Setting.tax.ivaRateBp).
     4. Pasa todo al <CheckoutForm /> (client component).

   ¿POR QUÉ SERVER + CLIENT?
   -------------------------
   El formulario necesita interactividad (validación, estado, envío), así que
   es un client component. Pero las cuentas bancarias, las reglas de precio
   y el IVA viven en la base de datos. Traerlos en el servidor y pasarlos
   como props evita hacer peticiones adicionales desde el cliente.

   ¿CÓMO EVITAMOS DOBLE CARGA?
   ---------------------------
   El servidor ya tiene estos datos ANTES de que el cliente llegue al
   formulario. Eso significa:
     - El resumen del pedido (con precios y todo) ya se puede calcular
       en el primer render.
     - El cliente ve todo cargado instantáneamente, sin "loading...".
   ============================================================================ */

// Tipo de metadatos de Next.js.
import type { Metadata } from "next";

// Link de Next.js para navegar al carrito.
import Link from "next/link";

// Cliente Prisma compartido.
import { prisma } from "@/lib/db";

// Lectura de configuración (cuentas + IVA).
import { getBankAccounts, getIvaRateBp } from "@/lib/settings";

// Componente del formulario (client).
import { CheckoutForm } from "@/components/checkout/checkout-form";


/* ============================================================================
   METADATOS
   ============================================================================ */

export const metadata: Metadata = {
  title: "Checkout",
  description: "Completa tus datos para finalizar la compra.",
};


/* ============================================================================
   COMPONENTE (SERVER)
   ============================================================================ */

export default async function CheckoutPage() {
  /* ------------------------------------------------------------------------
     Cargar datos en paralelo
     ------------------------------------------------------------------------
       1. Cuentas bancarias (Guayaquil, Pichincha, DEUNA).
       2. Reglas de precio (para el resumen del carrito).
       3. Tasa de IVA.
     ------------------------------------------------------------------------ */
  const [bankAccounts, priceRules, ivaRateBp] = await Promise.all([
    getBankAccounts(),
    prisma.priceRule.findMany({
      select: {
        categoryId: true,
        minQuantity: true,
        priceCents: true,
      },
    }),
    getIvaRateBp(),
  ]);

  /* ------------------------------------------------------------------------
     Estado especial: no hay cuentas bancarias
     ------------------------------------------------------------------------
     Si por alguna razón no hay cuentas configuradas, no podemos procesar
     pagos. Mostramos un mensaje y no permitimos continuar.
     ------------------------------------------------------------------------ */
  if (bankAccounts.length === 0) {
    return (
      <div className="container-page py-12 md:py-16">
        <div className="rounded-2xl border border-border bg-surface p-10 text-center max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold">Pagos no disponibles</h1>
          <p className="mt-3 text-muted">
            Estamos configurando los métodos de pago. Vuelve en unos minutos.
          </p>
          <Link
            href="/contacto"
            className="mt-6 inline-block rounded-xl bg-primary px-5 py-3 font-medium text-primaryFg hover:opacity-90 transition-opacity"
          >
            Contactar por WhatsApp
          </Link>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------------------
     Renderizado
     ------------------------------------------------------------------------ */
  return (
    <div className="container-page py-12 md:py-16">

      {/* --- Encabezado --- */}
      <div className="max-w-3xl">
        <h1 className="text-3xl font-bold md:text-4xl">Finalizar compra</h1>
        <p className="mt-2 text-muted">
          Completa tus datos y elige cómo pagar. Te llevará menos de 2 minutos.
        </p>
      </div>

      {/* --- Formulario --- */}
      <div className="mt-10">
        <CheckoutForm
          bankAccounts={bankAccounts}
          priceRules={priceRules}
          ivaRateBp={ivaRateBp}
        />
      </div>
    </div>
  );
}