/* ============================================================================
   CLICSTORE — Cálculo de IVA y totales del pedido
   ----------------------------------------------------------------------------
   Este archivo contiene la LÓGICA FISCAL de ClicStore. Es el ÚNICO lugar
   donde se calcula el IVA. Si mañana cambia la tasa (por ejemplo, a 16%),
   se cambia en la base de datos (Setting.tax.ivaRateBp) y todo el sistema
   lo refleja automáticamente. NO se modifica este archivo.

   REGLAS DE NEGOCIO
   -----------------
   1. El IVA se calcula sobre (subtotal - descuento).
      NO se calcula sobre el subtotal bruto.
   2. El envío NO tiene IVA (es un servicio exento).
   3. Todo el dinero se maneja en centavos enteros.
   4. Redondeo al centavo más cercano (Math.round).

   ¿POR QUÉ "BASIS POINTS" Y NO PORCENTAJE?
   ----------------------------------------
   En vez de guardar 15 (porcentaje), guardamos 1500 (basis points).

   Basis points = 1/100 de un porcentaje.
       15.00%   →  1500 bp
       15.50%   →  1550 bp
       12.00%   →  1200 bp

   VENTAJA: si mañana el IVA cambia a 15.25%, no tenemos que inventar
   decimales. Guardamos 1525 bp y el cálculo es exacto.

   IMPORTANTE SOBRE LAS UNIDADES
   -----------------------------
   Esta función RECIBE centavos y DEVUELVE centavos. Nunca convierte
   dólares a centavos ni al revés. Solo redondea para asegurar enteros.

   (Esto es distinto de la función toCents() de money.ts, que SÍ convierte
   dólares a centavos. Aquí NO se usa esa función, porque el input ya
   viene en centavos por contrato.)

   EJEMPLO DE USO
   --------------
       import { computeTotals } from "@/lib/tax";

       const totals = computeTotals({
         subtotalCents: 10000,   // $100.00
         discountCents: 1000,    // -$10.00
         ivaRateBp: 1500,        // 15%
         shippingCents: 500,     // $5.00
       });

       // totals = {
       //   subtotalCents: 10000,
       //   discountCents: 1000,
       //   taxableCents: 9000,
       //   ivaRateBp: 1500,
       //   ivaCents: 1350,
       //   shippingCents: 500,
       //   totalCents: 10850,
       // }
   ============================================================================ */


/* ============================================================================
   CONSTANTES
   ============================================================================ */

/**
 * Tasa de IVA por defecto en basis points.
 * 1500 bp = 15.00%
 *
 * Esta constante SOLO se usa como valor de respaldo por si la base de datos
 * falla al leer la configuración real. El valor real vive en la tabla Setting
 * (clave "tax.ivaRateBp") y se lee mediante src/lib/settings.ts.
 */
export const DEFAULT_IVA_RATE_BP = 1500;


/* ============================================================================
   TIPOS
   ============================================================================ */

/**
 * Datos de entrada para calcular los totales de un pedido.
 * TODOS los montos están en CENTAVOS.
 */
export type TotalsInput = {
  /** Suma de los precios unitarios × cantidad, antes de descuentos (en centavos) */
  subtotalCents: number;

  /** Descuento total aplicado (por promociones, cupones, etc.) en centavos */
  discountCents?: number;

  /** Tasa de IVA en basis points (1500 = 15.00%) */
  ivaRateBp: number;

  /** Costo de envío en centavos (no lleva IVA) */
  shippingCents?: number;
};

/**
 * Resultado del cálculo de totales.
 * Incluye TODOS los campos intermedios para mostrarlos en el checkout.
 * TODOS los montos están en CENTAVOS.
 */
export type Totals = {
  /** Subtotal original (antes de descuentos) */
  subtotalCents: number;

  /** Descuento aplicado */
  discountCents: number;

  /** Base imponible: subtotal - descuento. Sobre esto se calcula el IVA. */
  taxableCents: number;

  /** Tasa de IVA aplicada (en basis points) */
  ivaRateBp: number;

  /** Monto del IVA calculado */
  ivaCents: number;

  /** Costo de envío */
  shippingCents: number;

  /** Total final = taxableCents + ivaCents + shippingCents */
  totalCents: number;
};


/* ============================================================================
   FUNCIÓN PRINCIPAL
   ============================================================================ */

/**
 * Calcula todos los montos del pedido a partir de los datos de entrada.
 *
 * IMPORTANTE: los valores de entrada YA están en centavos. Esta función
 * NO convierte dólares a centavos, solo redondea para asegurar enteros.
 *
 * Orden de operaciones:
 *   1. Normaliza el subtotal a centavos enteros (Math.round, no toCents).
 *   2. Aplica el descuento (no puede superar el subtotal → gravable >= 0).
 *   3. Calcula el IVA sobre el gravable.
 *   4. Suma el envío.
 *   5. Total final.
 *
 * @param input - Datos de entrada (subtotal, descuento, IVA, envío)
 * @returns Objeto con todos los montos calculados
 */
export function computeTotals(input: TotalsInput): Totals {
  // --- Paso 1: Normalizar entrada ---
  // Math.round asegura enteros (por si llega un decimal por error).
  // Math.max(0, ...) evita valores negativos.
  // NO usamos toCents() aquí porque el input ya viene en centavos.
  const subtotal = Math.max(0, Math.round(input.subtotalCents));

  // --- Paso 2: Aplicar descuento ---
  // El descuento no puede superar el subtotal (si no, el gravable sería negativo).
  // Math.min garantiza que nunca se pase del subtotal.
  const discountRaw = Math.max(0, Math.round(input.discountCents ?? 0));
  const discount = Math.min(subtotal, discountRaw);

  // Base imponible: sobre esto se calcula el IVA.
  const taxable = subtotal - discount;

  // --- Paso 3: Calcular IVA ---
  // Fórmula: (taxable × ivaRateBp) / 10000
  //
  // ¿Por qué dividir por 10000?
  //   1500 bp = 15.00% = 0.15
  //   taxable × 0.15 = taxable × 1500 / 10000
  //
  // Math.round asegura un centavo entero (ej: $13.499 → $13.50).
  const iva = Math.round((taxable * input.ivaRateBp) / 10000);

  // --- Paso 4: Envío ---
  // El envío no lleva IVA. Se suma directo al final.
  const shipping = Math.max(0, Math.round(input.shippingCents ?? 0));

  // --- Paso 5: Total final ---
  const total = taxable + iva + shipping;

  // Devolvemos TODO lo calculado para que el frontend pueda mostrarlo.
  return {
    subtotalCents: subtotal,
    discountCents: discount,
    taxableCents: taxable,
    ivaRateBp: input.ivaRateBp,
    ivaCents: iva,
    shippingCents: shipping,
    totalCents: total,
  };
}


/* ============================================================================
   UTILIDADES RELACIONADAS
   ============================================================================ */

/**
 * Convierte una tasa en basis points a string legible con porcentaje.
 * Útil para mostrar "IVA 15.00%" en el checkout y los correos.
 *
 * @param bp - Basis points (1500 = 15.00%)
 * @returns String con el porcentaje formateado
 *
 * @example
 *   ivaRateToPercent(1500)  // "15.00"
 *   ivaRateToPercent(1250)  // "12.50"
 *   ivaRateToPercent(1525)  // "15.25"
 */
export function ivaRateToPercent(bp: number): string {
  return (bp / 100).toFixed(2);
}