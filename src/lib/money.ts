/* ============================================================================
   CLICSTORE — Utilidades de dinero
   ----------------------------------------------------------------------------
   Todas las operaciones monetarias en ClicStore se hacen con CENTAVOS ENTEROS.

   ¿POR QUÉ?
   JavaScript (y casi todos los lenguajes) tienen problemas con decimales:

       0.1 + 0.2 === 0.30000000000000004    // ❌ ¡Error!
       10 + 20 === 30                        // ✅ Perfecto con enteros

   Si guardáramos $0.10 + $0.20 en la base de datos como decimales, después
   de muchas sumas el total podría desviarse por centavos. Eso, en un sistema
   de pagos, es inaceptable.

   LA SOLUCIÓN:
   Guardar todo como centavos enteros.
       $18.00  →  1800
       $12.50  →  1250
       $0.01   →  1

   Y convertir a formato "bonito" ($18.00) SOLO al mostrarlo en pantalla.

   USO EN EL RESTO DEL CÓDIGO
   --------------------------
       import { formatUSD, toCents, toUsd } from "@/lib/money";

       formatUSD(1800)      // "$18.00"
       formatUSD(1250)      // "$12.50"
       toCents(18)          // 1800   (convierte $18 → 1800 centavos)
       toUsd(1250)          // 12.5   (convierte 1250 centavos → $12.50)
   ============================================================================ */


/* ============================================================================
   CONVERSIONES
   ============================================================================ */

/**
 * Convierte dólares (número decimal) a centavos (entero).
 *
 * Math.round es importante porque en JavaScript:
 *     18.00 * 100 = 1800            ✅
 *     12.50 * 100 = 1250            ✅
 *     0.07 * 100  = 7.000000000001  ❌ (sin redondear)
 *
 * @param usd - Monto en dólares (puede tener decimales)
 * @returns Monto en centavos como entero
 *
 * @example
 *   toCents(18)     // 1800
 *   toCents(12.50)  // 1250
 *   toCents(0.07)   // 7 (redondeado correctamente)
 */
export function toCents(usd: number): number {
  return Math.round(usd * 100);
}

/**
 * Convierte centavos (entero) a dólares (número decimal).
 *
 * @param cents - Monto en centavos
 * @returns Monto en dólares (puede tener decimales)
 *
 * @example
 *   toUsd(1800)  // 18
 *   toUsd(1250)  // 12.5
 *   toUsd(7)     // 0.07
 */
export function toUsd(cents: number): number {
  return cents / 100;
}


/* ============================================================================
   FORMATEO PARA MOSTRAR EN PANTALLA
   ============================================================================ */

/**
 * Formatea un monto en centavos como string en dólares estadounidenses.
 * Usa el formato local de EE.UU. porque Ecuador usa USD y este formato
 * es el estándar internacional: "$18.00", "$1,234.56".
 *
 * @param cents - Monto en centavos
 * @returns String formateado con símbolo de dólar
 *
 * @example
 *   formatUSD(1800)     // "$18.00"
 *   formatUSD(1250)     // "$12.50"
 *   formatUSD(123456)   // "$1,234.56"
 *   formatUSD(0)        // "$0.00"
 */
export function formatUSD(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2, // Siempre 2 decimales (aunque sea $18.00)
    maximumFractionDigits: 2, // Nunca más de 2
  }).format(cents / 100);
}

/**
 * Formatea un monto en centavos SIN el símbolo de dólar.
 * Útil para campos donde el símbolo ya está en el HTML (ej: "<span>$</span>18.00").
 *
 * @param cents - Monto en centavos
 * @returns String formateado sin símbolo
 *
 * @example
 *   formatNumber(1800)    // "18.00"
 *   formatNumber(123456)  // "1,234.56"
 */
export function formatNumber(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}


/* ============================================================================
   UTILIDADES ADICIONALES
   ============================================================================ */

/**
 * Formatea el número de pedido con ceros a la izquierda.
 * Los pedidos en ClicStore se muestran como #000001, #000125, etc.
 *
 * @param num - Número de pedido (autoincremental)
 * @param pad - Cantidad de dígitos (default 6)
 * @returns String con formato "#000001"
 *
 * @example
 *   formatOrderNumber(1)     // "#000001"
 *   formatOrderNumber(125)   // "#000125"
 *   formatOrderNumber(9999)  // "#009999"
 */
export function formatOrderNumber(num: number, pad: number = 6): string {
  return `#${String(num).padStart(pad, "0")}`;
}

/**
 * Suma una lista de montos en centavos de forma segura.
 * Recibe un array y devuelve el total entero. Más legible que reduce manual.
 *
 * @param amounts - Array de montos en centavos
 * @returns Total en centavos
 *
 * @example
 *   sumCents([1500, 1400, 1250])  // 4150
 *   sumCents([])                  // 0
 */
export function sumCents(amounts: number[]): number {
  return amounts.reduce((acc, val) => acc + val, 0);
}

/**
 * Calcula el porcentaje de un monto en centavos.
 * Útil para descuentos, IVA, etc.
 * Redondea al centavo entero más cercano.
 *
 * @param cents - Monto base en centavos
 * @param percent - Porcentaje (ej: 15 para 15%, 10 para 10%)
 * @returns Monto resultante en centavos
 *
 * @example
 *   percentOf(10000, 15)  // 1500  ($100.00 × 15% = $15.00)
 *   percentOf(9000, 15)   // 1350  ($90.00 × 15% = $13.50)
 */
export function percentOf(cents: number, percent: number): number {
  return Math.round((cents * percent) / 100);
}