/* ============================================================================
   CLICSTORE — Generación de códigos QR
   ----------------------------------------------------------------------------
   Este archivo genera códigos QR de dos tipos:

   1. QR BANCARIO POR PEDIDO (dinámico)
      Se genera para cada pedido con su número y monto específico. El cliente
      lo escanea desde el checkout y la app del banco rellena todos los datos.
      Evita errores de tipeo y agiliza la transferencia.

      CONTENIDO del QR:
        CLICSTORE
        PEDIDO:000125
        MONTO:USD 54.45
        BANCO:Banco Pichincha
        CUENTA:2216452373
        TITULAR:Luis Enrique Reina Mesa
        CEDULA:1762373601
        RUC:1762373601001
        EMAIL:luise2363@gmail.com

   2. QR GENÉRICO
      Para cualquier texto que se necesite codificar (links, mensajes, etc).

   ¿POR QUÉ NO GUARDAMOS ESTOS QR COMO ARCHIVOS?
   --------------------------------------------
   Porque son dinámicos: cada pedido tiene su monto único. Guardar miles de
   PNGs es ineficiente. En su lugar, se generan al vuelo cuando el cliente
   abre la página del pedido, y se devuelven como imagen (data URL o PNG).

   Las imágenes estáticas de public/qr/*.png son otra cosa: esas son las que
   se muestran en el checkout para que el cliente vea el QR "base" de cada
   cuenta, sin monto específico.

   USO EN EL RESTO DEL CÓDIGO
   --------------------------
     import { buildBankQrDataUrl, buildGenericQrDataUrl } from "@/lib/qr";

     // 1. QR bancario para mostrar en <img src="...">:
     const dataUrl = await buildBankQrDataUrl({
       orderNumber: 125,
       amountCents: 5445,
       account: bankAccount,
     });

     // 2. QR genérico:
     const dataUrl = await buildGenericQrDataUrl("Hola mundo");
   ============================================================================ */

// Importamos la librería "qrcode" (ya instalada en package.json).
import QRCode from "qrcode";

// Importamos el tipo BankAccount definido en settings.ts.
import type { BankAccount } from "./settings";

// Importamos el helper para formatear montos.
import { formatOrderNumber, toUsd } from "./money";


/* ============================================================================
   TIPOS
   ============================================================================ */

/**
 * Datos de entrada para generar un QR bancario de pedido.
 */
export type BankQrInput = {
  /** Número del pedido (autoincremental, ej: 125) */
  orderNumber: number;

  /** Monto total a transferir, en centavos */
  amountCents: number;

  /** Cuenta bancaria destino (viene de getBankAccountById) */
  account: BankAccount;
};


/* ============================================================================
   CONSTRUCCIÓN DEL CONTENIDO DEL QR
   ============================================================================ */

/**
 * Construye el texto que irá DENTRO del QR bancario.
 *
 * Formato: líneas "CLAVE:VALOR", una por línea. Es legible por cualquier
 * lector de QR y fácil de copiar/pegar si el usuario no puede escanear.
 *
 * @param input - Datos del pedido y la cuenta
 * @returns String multilínea con el contenido del QR
 */
export function buildBankQrPayload(input: BankQrInput): string {
  // Redondeamos el monto en dólares a 2 decimales para evitar "54.45000001".
  const amount = toUsd(input.amountCents).toFixed(2);

  // Construimos las líneas del contenido. El orden importa:
  // primero lo más importante (banco, cuenta, monto).
  const lines: string[] = [
    "CLICSTORE",
    `PEDIDO:${formatOrderNumber(input.orderNumber)}`,
    `MONTO:USD ${amount}`,
    `BANCO:${input.account.bank}`,
  ];

  // accountType solo existe en cuentas bancarias, no en DEUNA (wallet).
  if (input.account.accountType) {
    lines.push(`TIPO:${input.account.accountType}`);
  }

  lines.push(`CUENTA:${input.account.accountNumber}`);
  lines.push(`TITULAR:${input.account.holder}`);
  lines.push(`CEDULA:${input.account.holderId}`);
  lines.push(`RUC:${input.account.ruc}`);
  lines.push(`EMAIL:${input.account.holderEmail}`);

  // Unimos todo con saltos de línea.
  return lines.join("\n");
}


/* ============================================================================
   GENERACIÓN DE QR — Bancario (por pedido)
   ============================================================================ */

/**
 * Genera el QR bancario y lo devuelve como Data URL (base64 PNG embebido).
 *
 * ¿Qué es una Data URL?
 *   Es un string tipo: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg..."
 *   Se puede poner directamente en <img src={dataUrl} /> sin archivo físico.
 *   Ideal para renderizar QRs dinámicos en el checkout o la página del pedido.
 *
 * @param input - Datos del pedido y la cuenta
 * @returns Data URL con el PNG del QR
 */
export async function buildBankQrDataUrl(input: BankQrInput): Promise<string> {
  const payload = buildBankQrPayload(input);

  return QRCode.toDataURL(payload, {
    // Nivel de corrección de errores: L, M, Q, H.
    // M (medio) tolera hasta ~15% de daño. Es el balance típico.
    errorCorrectionLevel: "M",

    // Margen blanco alrededor del QR (en módulos). 2 es el mínimo
    // recomendado por el estándar para asegurar lectura confiable.
    margin: 2,

    // Ancho final de la imagen en píxeles. 400 se ve bien en retina
    // (se mostrará a 200px en pantalla, nítido en pantallas 2x).
    width: 400,

    // Colores: negro sobre blanco para máxima compatibilidad.
    color: {
      dark: "#000000",
      light: "#FFFFFF",
    },
  });
}

/**
 * Igual que buildBankQrDataUrl pero devuelve un Buffer PNG.
 * Útil para:
 *   - Enviar como respuesta HTTP desde un endpoint /api/qr/...
 *   - Adjuntar en correos electrónicos
 *   - Guardar en disco si algún día se necesita
 *
 * @param input - Datos del pedido y la cuenta
 * @returns Buffer con el PNG del QR
 */
export async function buildBankQrBuffer(input: BankQrInput): Promise<Buffer> {
  const payload = buildBankQrPayload(input);

  return QRCode.toBuffer(payload, {
    type: "png",
    errorCorrectionLevel: "M",
    margin: 2,
    width: 400,
    color: {
      dark: "#000000",
      light: "#FFFFFF",
    },
  });
}


/* ============================================================================
   GENERACIÓN DE QR — Genérico (cualquier texto)
   ============================================================================ */

/**
 * Genera un QR genérico a partir de cualquier texto.
 * Devuelve un Data URL (base64 PNG) listo para usar en <img src>.
 *
 * @param text - Texto a codificar en el QR
 * @param options - Opciones opcionales (ancho, color, margen)
 * @returns Data URL con el PNG del QR
 *
 * @example
 *   const qr = await buildGenericQrDataUrl("https://clicstore.com");
 *   // <img src={qr} />
 */
export async function buildGenericQrDataUrl(
  text: string,
  options?: {
    /** Ancho del PNG en píxeles (default: 400) */
    width?: number;
    /** Nivel de corrección de errores (default: "M") */
    errorCorrectionLevel?: "L" | "M" | "Q" | "H";
  }
): Promise<string> {
  return QRCode.toDataURL(text, {
    errorCorrectionLevel: options?.errorCorrectionLevel ?? "M",
    margin: 2,
    width: options?.width ?? 400,
    color: {
      dark: "#000000",
      light: "#FFFFFF",
    },
  });
}

/**
 * Igual que buildGenericQrDataUrl pero devuelve un Buffer PNG.
 * Útil para enviar por HTTP o guardar en disco.
 *
 * @param text - Texto a codificar
 * @returns Buffer con el PNG del QR
 */
export async function buildGenericQrBuffer(text: string): Promise<Buffer> {
  return QRCode.toBuffer(text, {
    type: "png",
    errorCorrectionLevel: "M",
    margin: 2,
    width: 400,
    color: {
      dark: "#000000",
      light: "#FFFFFF",
    },
  });
}