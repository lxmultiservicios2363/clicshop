/* ============================================================================
   CLICSTORE — Integración con WhatsApp
   ----------------------------------------------------------------------------
   Este archivo genera links de WhatsApp (wa.me) con mensajes pre-armados.
   Es la forma SIMPLE y CONFIABLE de notificar: el usuario abre WhatsApp con
   el mensaje ya escrito y solo tiene que presionar "Enviar".

   FILOSOFÍA
   ---------
   Hay dos formas de "enviar" un mensaje por WhatsApp:

     1. LINK (este archivo): abrimos "wa.me/NUMERO?text=MENSAJE" y el usuario
        decide si lo envía. NO requiere credenciales, NO tiene costos,
        NUNCA falla. Es lo que usamos HOY.

     2. API BUSINESS (futuro): el servidor envía el mensaje automáticamente.
        Requiere cuenta de Meta Business, verificación, tokens, etc.
        Lo dejamos preparado pero sin simular. Si mañana se contrata, se
        activa desde variables de entorno sin tocar este archivo.

   USO EN EL RESTO DEL CÓDIGO
   --------------------------
     import { buildWhatsAppLink, buildAdminOrderMessage } from "@/lib/whatsapp";

     // Link simple (sin mensaje específico):
     const link = buildWhatsAppLink("Hola, quiero información", "593987384110");

     // Notificación de pedido (mensaje detallado):
     const msg = buildAdminOrderMessage({ ... });
     const link = buildWhatsAppLink(msg, business.whatsappNumber);
   ============================================================================ */

// Importamos los helpers de formato de dinero y números de pedido.
import { formatUSD, formatOrderNumber } from "./money";


/* ============================================================================
   TIPOS
   ============================================================================ */

/**
 * Ítem del pedido para incluir en la notificación de WhatsApp.
 */
export type WhatsAppOrderItem = {
  /** Nombre del producto (ej: "Suéter Cuello V #01") */
  name: string;

  /** SKU con talla (ej: "CS-V-01-M") */
  sku: string;

  /** Talla seleccionada */
  size?: string;

  /** Color(es) — como texto (ej: "Rojo/Beige") */
  color?: string;

  /** Cantidad de unidades */
  quantity: number;

  /** Precio unitario final en centavos */
  unitPriceCents: number;
};

/**
 * Datos completos del pedido para notificación.
 */
export type WhatsAppOrderData = {
  /** Número de pedido (autoincremental) */
  number: number;

  /** Nombre del cliente */
  customerName: string;

  /** Teléfono del cliente */
  customerPhone: string;

  /** Email del cliente */
  customerEmail: string;

  /** Ítems del pedido */
  items: WhatsAppOrderItem[];

  /** Subtotal en centavos (antes de descuentos) */
  subtotalCents: number;

  /** Descuento aplicado en centavos */
  discountCents: number;

  /** Tasa de IVA en basis points */
  ivaRateBp: number;

  /** IVA calculado en centavos */
  ivaCents: number;

  /** Costo de envío en centavos */
  shippingCents: number;

  /** Total en centavos */
  totalCents: number;

  /** Método de pago elegido (texto legible) */
  paymentMethod: string;

  /** Estado del pago (texto legible) */
  paymentStatus: string;

  /** Dirección de entrega (texto completo ya formateado) */
  address: string;
};

/**
 * Resultado de la notificación al admin.
 */
export type NotifyResult = {
  /** Link de wa.me listo para abrir (o mostrar al usuario) */
  link: string;

  /** Si se intentó enviar por API Business (y si funcionó) */
  sentViaApi: boolean;
};


/* ============================================================================
   FUNCIONES PRINCIPALES — Construcción de mensajes
   ============================================================================ */

/**
 * Construye el mensaje de notificación para el admin cuando entra un pedido.
 *
 * El mensaje se arma línea por línea para que sea fácil de leer en WhatsApp
 * y para que el admin vea todo de un vistazo.
 *
 * @param order - Datos completos del pedido
 * @returns String con el mensaje listo para enviar
 */
export function buildAdminOrderMessage(order: WhatsAppOrderData): string {
  const lines: string[] = [];

  // --- Cabecera ---
  lines.push("🛒 *CLICSTORE — NUEVO PEDIDO*");
  lines.push("");
  lines.push(`*Pedido:* ${formatOrderNumber(order.number)}`);
  lines.push("");

  // --- Datos del cliente ---
  lines.push("👤 *Cliente*");
  lines.push(`Nombre: ${order.customerName}`);
  lines.push(`Teléfono: ${order.customerPhone}`);
  lines.push(`Correo: ${order.customerEmail}`);
  lines.push("");

  // --- Ítems del pedido ---
  lines.push("📦 *Productos*");
  lines.push("");

  order.items.forEach((item, i) => {
    lines.push(`${i + 1}. *${item.name}*`);
    lines.push(`   SKU: ${item.sku}`);
    if (item.size) lines.push(`   Talla: ${item.size}`);
    if (item.color) lines.push(`   Color: ${item.color}`);
    lines.push(`   Cantidad: ${item.quantity}`);
    lines.push(`   Precio: ${formatUSD(item.unitPriceCents)}`);
    lines.push(`   Total: ${formatUSD(item.unitPriceCents * item.quantity)}`);
    lines.push("");
  });

  // --- Totales ---
  lines.push("💰 *Totales*");
  lines.push(`Subtotal: ${formatUSD(order.subtotalCents)}`);

  if (order.discountCents > 0) {
    lines.push(`Descuento: -${formatUSD(order.discountCents)}`);
  }

  const ivaPercent = (order.ivaRateBp / 100).toFixed(2);
  lines.push(`IVA ${ivaPercent}%: ${formatUSD(order.ivaCents)}`);

  if (order.shippingCents > 0) {
    lines.push(`Envío: ${formatUSD(order.shippingCents)}`);
  }

  lines.push(`*TOTAL: ${formatUSD(order.totalCents)}*`);
  lines.push("");

  // --- Pago y entrega ---
  lines.push("💳 *Pago*");
  lines.push(`Método: ${order.paymentMethod}`);
  lines.push(`Estado: ${order.paymentStatus}`);
  lines.push("");

  lines.push("📍 *Entrega*");
  lines.push(order.address);
  lines.push("");
  lines.push("---");
  lines.push("Generado automáticamente desde clicstore.com");

  // Unimos todo con saltos de línea
  return lines.join("\n");
}


/**
 * Construye el link de WhatsApp con un mensaje pre-armado.
 *
 * Formato: https://wa.me/{numero}?text={mensaje URL-encoded}
 *
 * @param message - Texto del mensaje (puede tener saltos de línea y emojis)
 * @param phoneDigits - Número en formato internacional sin "+" ni espacios
 *                      (ej: "593987384110")
 * @returns URL completa lista para abrir
 */
export function buildWhatsAppLink(
  message: string,
  phoneDigits: string
): string {
  // Limpiamos el número: solo dígitos, sin "+", sin espacios, sin guiones
  const cleanNumber = phoneDigits.replace(/\D/g, "");

  // encodeURIComponent convierte caracteres especiales (saltos de línea,
  // emojis, espacios) al formato que entiende el navegador.
  const encodedMessage = encodeURIComponent(message);

  return `https://wa.me/${cleanNumber}?text=${encodedMessage}`;
}


/**
 * Construye un link de WhatsApp SIN mensaje pre-armado.
 * Útil para el botón flotante de soporte: el usuario escribe lo que quiera.
 *
 * @param phoneDigits - Número en formato internacional sin "+" ni espacios
 * @returns URL completa
 */
export function buildWhatsAppContactLink(phoneDigits: string): string {
  const cleanNumber = phoneDigits.replace(/\D/g, "");
  return `https://wa.me/${cleanNumber}`;
}


/* ============================================================================
   NOTIFICACIÓN AL ADMIN
   ============================================================================ */

/**
 * Notifica al admin sobre un pedido nuevo.
 *
 * ¿CÓMO FUNCIONA?
 *   1. Siempre construye el mensaje y devuelve un link wa.me listo.
 *      Este link lo puede usar el frontend para ofrecer un botón
 *      "Enviar a WhatsApp" al cliente al confirmar el pedido.
 *
 *   2. Si existen credenciales de WhatsApp Business API en el .env
 *      (WHATSAPP_API_URL, WHATSAPP_API_TOKEN, WHATSAPP_PHONE_ID),
 *      además intenta enviar el mensaje automáticamente desde el servidor.
 *
 *   3. NUNCA simula un envío si no hay credenciales. Simplemente devuelve
 *      el link y marca sentViaApi: false.
 *
 * @param order - Datos del pedido
 * @param adminPhoneDigits - Teléfono del admin (del negocio)
 * @returns Link listo + flag de envío por API
 */
export async function notifyAdminWhatsApp(
  order: WhatsAppOrderData,
  adminPhoneDigits: string
): Promise<NotifyResult> {
  // 1. Construir el mensaje y el link (siempre, sin importar si hay API)
  const message = buildAdminOrderMessage(order);
  const link = buildWhatsAppLink(message, adminPhoneDigits);

  // 2. Leer credenciales de WhatsApp Business API desde el .env
  const apiUrl = process.env.WHATSAPP_API_URL;
  const apiToken = process.env.WHATSAPP_API_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;

  // 3. Si NO hay las 3 variables, no se intenta enviar nada.
  //    Devuelve el link y sentViaApi: false. Este es el caso HOY.
  if (!apiUrl || !apiToken || !phoneId) {
    return { link, sentViaApi: false };
  }

  // 4. Si SÍ hay credenciales, intentar enviar vía API Business de Meta.
  //    (Este código se activará automáticamente cuando mañana se contrate
  //    el servicio y se rellenen las variables en .env.)
  try {
    const response = await fetch(`${apiUrl}/${phoneId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: adminPhoneDigits.replace(/\D/g, ""),
        type: "text",
        text: { body: message },
      }),
    });

    return {
      link,
      sentViaApi: response.ok,
    };
  } catch (error) {
    // Si falla la API (red, token expirado, etc.), no rompemos el flujo.
    // Devolvemos el link como respaldo.
    console.error("[whatsapp] Error al enviar por API Business:", error);
    return { link, sentViaApi: false };
  }
}