/* ============================================================================
   CLICSTORE — Política de envío
   ----------------------------------------------------------------------------
   Este archivo define cómo se calcula el costo de envío de un pedido.

   POLÍTICA ACTUAL
   ---------------
     - Envío GRATIS si el subtotal (después de descuentos) es >= $50.00
     - Envío de $5.00 si el subtotal es menor a $50.00

   ¿POR QUÉ DESPUÉS DE DESCUENTOS Y NO ANTES?
   ------------------------------------------
   Porque el descuento ya se aplicó en los precios de los productos. El
   "subtotal después de descuentos" es lo que realmente paga el cliente por
   los productos, y sobre ese número tiene sentido calcular el envío.

   ¿SE PODRÍA MOVER A LA DB?
   -------------------------
   Sí. Actualmente estos valores están hardcodeados (constantes). Cuando
   construyamos el panel de admin, los moveremos a la tabla Setting para
   que el administrador pueda cambiarlos sin tocar código. Por ahora,
   constantes es lo más simple y no bloquea nada.

   USO EN EL RESTO DEL CÓDIGO
   --------------------------
     import { calculateShippingCents } from "@/lib/orders/shipping";

     const shipping = calculateShippingCents(4500);  // $45 → devuelve 500 ($5)
     const shipping2 = calculateShippingCents(6000); // $60 → devuelve 0 (gratis)
   ============================================================================ */


/* ============================================================================
   CONFIGURACIÓN
   ----------------------------------------------------------------------------
   Cambiar estas constantes es cambiar la política de envío.
   ============================================================================ */

/**
 * Monto mínimo (en centavos) para que el envío sea gratis.
 * 5000 centavos = $50.00
 */
export const SHIPPING_FREE_THRESHOLD_CENTS = 5000;

/**
 * Costo de envío (en centavos) cuando el pedido no alcanza el mínimo.
 * 500 centavos = $5.00
 */
export const SHIPPING_FEE_CENTS = 500;


/* ============================================================================
   FUNCIÓN PRINCIPAL
   ============================================================================ */

/**
 * Calcula el costo de envío (en centavos) según el subtotal del pedido.
 *
 * @param subtotalAfterDiscountCents - Subtotal después de descuentos, en centavos
 * @returns Costo de envío en centavos (0 si es gratis, 500 si cobra)
 *
 * @example
 *   calculateShippingCents(3000)  // $30 → 500 ($5 de envío)
 *   calculateShippingCents(4999)  // $49.99 → 500 ($5 de envío)
 *   calculateShippingCents(5000)  // $50 → 0 (gratis)
 *   calculateShippingCents(12000) // $120 → 0 (gratis)
 */
export function calculateShippingCents(
  subtotalAfterDiscountCents: number
): number {
  // Si el subtotal es 0 o negativo, el envío es 0 (no hay pedido).
  if (subtotalAfterDiscountCents <= 0) return 0;

  // Si alcanza el mínimo, envío gratis.
  if (subtotalAfterDiscountCents >= SHIPPING_FREE_THRESHOLD_CENTS) {
    return 0;
  }

  // Sino, cobramos la tarifa fija.
  return SHIPPING_FEE_CENTS;
}