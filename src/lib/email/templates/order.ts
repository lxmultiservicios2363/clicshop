/* ============================================================================
   CLICSTORE — Plantillas de correo para pedidos
   ----------------------------------------------------------------------------
   Este archivo contiene dos plantillas HTML:

     1. adminOrderEmail()    → Correo al administrador (notificación interna)
     2. customerOrderEmail() → Correo al cliente (confirmación + datos bancarios)

   DISEÑO
   ------
   Los correos usan tablas HTML y estilos inline (style="..."). Esto es
   INTENCIONAL: los clientes de correo (Gmail, Outlook, etc.) NO soportan
   CSS externo ni muchas propiedades modernas. Por eso se usan técnicas
   clásicas de maquetación.

   La estética general:
     - Fondo blanco, texto oscuro (legible en cualquier cliente)
     - Encabezado con el nombre de ClicStore
     - Tabla de productos y totales clara
     - Datos de transferencia y contacto al pie

   CÓMO SE USAN
   ------------
     import { adminOrderEmail, customerOrderEmail } from "@/lib/email/templates/order";
     import { sendMail } from "@/lib/email/mailer";

     const adminTpl = adminOrderEmail(orderData);
     await sendMail({ to: business.email, ...adminTpl });

     const custTpl = customerOrderEmail(orderData);
     await sendMail({ to: order.customerEmail, ...custTpl });
   ============================================================================ */

// Importamos helpers de formato de dinero y números de pedido.
import { formatUSD, formatOrderNumber } from "@/lib/money";

// Importamos el conversor de basis points a porcentaje legible.
import { ivaRateToPercent } from "@/lib/tax";

// Importamos la configuración del negocio (nombre, dominio, contacto).
import { BUSINESS } from "@/config/business";

// Importamos el tipo BankAccount para la sección de transferencia.
import type { BankAccount } from "@/lib/settings";


/* ============================================================================
   TIPOS
   ============================================================================ */

/**
 * Ítem del pedido para el correo.
 */
export type OrderEmailItem = {
  name: string;
  sku: string;
  size?: string;
  color?: string;
  quantity: number;
  unitPriceCents: number;
};

/**
 * Datos completos del pedido para armar los correos.
 */
export type OrderEmailData = {
  /** Número de pedido */
  number: number;

  /** Fecha de creación del pedido */
  createdAt: Date;

  /** Nombre del cliente */
  customerName: string;

  /** Email del cliente */
  customerEmail: string;

  /** Teléfono del cliente */
  customerPhone: string;

  /** Ítems del pedido */
  items: OrderEmailItem[];

  /** Totales en centavos */
  subtotalCents: number;
  discountCents: number;
  ivaRateBp: number;
  ivaCents: number;
  shippingCents: number;
  totalCents: number;

  /** Dirección de entrega */
  province: string;
  city: string;
  addressLine: string;
  reference?: string;

  /** Método de pago (texto legible, ej: "Transferencia bancaria") */
  paymentMethod: string;

  /** Estado del pago (texto legible) */
  paymentStatus: string;

  /** Cuentas bancarias a mostrar (solo para el correo del cliente) */
  bankAccounts?: BankAccount[];

  /** URL del panel admin para ver el pedido (solo para el correo del admin) */
  adminUrl?: string;
};

/**
 * Resultado de una plantilla: los campos que necesita sendMail.
 */
export type EmailTemplate = {
  subject: string;
  html: string;
  text?: string;
};


/* ============================================================================
   HELPERS INTERNOS
   ============================================================================ */

/**
 * Genera una fila simple de tabla "clave: valor" con estilos inline.
 * Se usa para las secciones de totales y datos bancarios.
 */
function row(key: string, value: string): string {
  return `<tr>
    <td style="padding:6px 8px;color:#666;font-size:14px">${key}</td>
    <td style="padding:6px 8px;font-weight:bold;text-align:right;font-size:14px">${value}</td>
  </tr>`;
}

/**
 * Genera la tabla de productos del pedido (HTML).
 */
function itemsTable(items: OrderEmailItem[]): string {
  const rowsHtml = items
    .map(
      (item) => `
        <tr>
          <td style="padding:10px 8px;border-bottom:1px solid #eee;font-size:14px">
            <strong>${item.name}</strong><br>
            <span style="color:#888;font-size:12px">SKU: ${item.sku}${
        item.size ? ` · Talla ${item.size}` : ""
      }${item.color ? ` · ${item.color}` : ""}</span>
          </td>
          <td style="padding:10px 8px;border-bottom:1px solid #eee;text-align:center;font-size:14px">
            ${item.quantity}
          </td>
          <td style="padding:10px 8px;border-bottom:1px solid #eee;text-align:right;font-size:14px">
            ${formatUSD(item.unitPriceCents)}
          </td>
          <td style="padding:10px 8px;border-bottom:1px solid #eee;text-align:right;font-size:14px">
            <strong>${formatUSD(item.unitPriceCents * item.quantity)}</strong>
          </td>
        </tr>
      `
    )
    .join("");

  return `
    <table style="width:100%;border-collapse:collapse;margin-top:12px">
      <thead>
        <tr style="background:#f7f7f9">
          <th style="text-align:left;padding:10px 8px;font-size:12px;color:#666;text-transform:uppercase">Producto</th>
          <th style="text-align:center;padding:10px 8px;font-size:12px;color:#666;text-transform:uppercase">Cant.</th>
          <th style="text-align:right;padding:10px 8px;font-size:12px;color:#666;text-transform:uppercase">P. Unit</th>
          <th style="text-align:right;padding:10px 8px;font-size:12px;color:#666;text-transform:uppercase">Total</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
  `;
}

/**
 * Genera la tabla de totales (subtotal, descuento, IVA, envío, total).
 */
function totalsTable(data: OrderEmailData): string {
  const ivaPercent = ivaRateToPercent(data.ivaRateBp);

  const discountRow =
    data.discountCents > 0
      ? row("Descuento", `-${formatUSD(data.discountCents)}`)
      : "";

  const shippingRow =
    data.shippingCents > 0
      ? row("Envío", formatUSD(data.shippingCents))
      : "";

  return `
    <table style="width:100%;border-collapse:collapse;margin-top:16px;max-width:400px;margin-left:auto">
      ${row("Subtotal", formatUSD(data.subtotalCents))}
      ${discountRow}
      ${row(`IVA ${ivaPercent}%`, formatUSD(data.ivaCents))}
      ${shippingRow}
      <tr>
        <td style="padding:12px 8px;border-top:2px solid #111;font-size:16px"><strong>TOTAL</strong></td>
        <td style="padding:12px 8px;border-top:2px solid #111;text-align:right;font-size:18px">
          <strong>${formatUSD(data.totalCents)}</strong>
        </td>
      </tr>
    </table>
  `;
}

/**
 * Genera la sección con las cuentas bancarias para el cliente.
 */
function bankAccountsSection(accounts: BankAccount[]): string {
  if (accounts.length === 0) return "";

  const accountsHtml = accounts
    .map((acc) => {
      const accountTypeLine = acc.accountType
        ? `<tr><td style="padding:4px 0;color:#666;font-size:13px">Tipo</td><td style="padding:4px 0;font-size:13px">${acc.accountType}</td></tr>`
        : "";

      return `
        <div style="background:#f7f7f9;border-radius:8px;padding:16px;margin-top:12px">
          <h4 style="margin:0 0 10px;font-size:15px;color:#111">${acc.bank}</h4>
          <table style="width:100%;border-collapse:collapse">
            ${accountTypeLine}
            <tr><td style="padding:4px 0;color:#666;font-size:13px">Cuenta</td><td style="padding:4px 0;font-size:13px;font-weight:bold">${acc.accountNumber}</td></tr>
            <tr><td style="padding:4px 0;color:#666;font-size:13px">Titular</td><td style="padding:4px 0;font-size:13px">${acc.holder}</td></tr>
            <tr><td style="padding:4px 0;color:#666;font-size:13px">Cédula</td><td style="padding:4px 0;font-size:13px">${acc.holderId}</td></tr>
            <tr><td style="padding:4px 0;color:#666;font-size:13px">RUC</td><td style="padding:4px 0;font-size:13px">${acc.ruc}</td></tr>
            <tr><td style="padding:4px 0;color:#666;font-size:13px">Email</td><td style="padding:4px 0;font-size:13px">${acc.holderEmail}</td></tr>
          </table>
        </div>
      `;
    })
    .join("");

  return `
    <h3 style="margin-top:24px;font-size:16px">Datos para la transferencia</h3>
    <p style="font-size:13px;color:#666;margin:4px 0 12px">
      Elige cualquiera de las siguientes cuentas. Sube tu comprobante desde la página de tu pedido.
    </p>
    ${accountsHtml}
  `;
}


/* ============================================================================
   PLANTILLA 1: Correo al ADMIN
   ============================================================================ */

/**
 * Construye la plantilla del correo dirigido al administrador.
 * Se envía cuando entra un pedido nuevo.
 *
 * @param data - Datos completos del pedido
 * @returns { subject, html, text }
 */
export function adminOrderEmail(data: OrderEmailData): EmailTemplate {
  // Fecha formateada en español de Ecuador.
  const fecha = data.createdAt.toLocaleString("es-EC", {
    dateStyle: "long",
    timeStyle: "short",
  });

  // Línea completa de dirección.
  const direccionCompleta = [
    data.addressLine,
    data.city,
    data.province,
    data.reference ? `(${data.reference})` : "",
  ]
    .filter(Boolean)
    .join(", ");

  // Asunto del correo.
  const subject = `[ClicStore] Pedido ${formatOrderNumber(data.number)} — ${data.customerName}`;

  // Cuerpo en HTML.
  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head><meta charset="utf-8"></head>
    <body style="margin:0;padding:20px;background:#f7f7f9;font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif;color:#111">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:12px;padding:24px">
        <h1 style="margin:0 0 4px;font-size:22px">Nuevo pedido ${formatOrderNumber(data.number)}</h1>
        <p style="color:#666;margin:0 0 20px;font-size:13px">${fecha}</p>

        <h3 style="margin:16px 0 8px;font-size:15px">Cliente</h3>
        <p style="margin:0;font-size:14px">
          <strong>${data.customerName}</strong><br>
          ${data.customerEmail}<br>
          ${data.customerPhone}
        </p>

        <h3 style="margin:16px 0 8px;font-size:15px">Dirección de entrega</h3>
        <p style="margin:0;font-size:14px">${direccionCompleta}</p>

        ${itemsTable(data.items)}
        ${totalsTable(data)}

        <h3 style="margin:24px 0 8px;font-size:15px">Pago</h3>
        <p style="margin:0;font-size:14px">
          <strong>Método:</strong> ${data.paymentMethod}<br>
          <strong>Estado:</strong> ${data.paymentStatus}
        </p>

        ${
          data.adminUrl
            ? `<p style="margin-top:20px">
                <a href="${data.adminUrl}" style="display:inline-block;padding:10px 18px;background:#111;color:#fff;text-decoration:none;border-radius:8px;font-size:14px">
                  Ver en el panel administrativo
                </a>
               </p>`
            : ""
        }

        <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
        <p style="color:#999;font-size:12px;margin:0">
          Correo generado automáticamente por ${BUSINESS.name}.
        </p>
      </div>
    </body>
    </html>
  `;

  // Versión texto plano (fallback para clientes sin HTML).
  const text = `
Nuevo pedido ${formatOrderNumber(data.number)}

Cliente: ${data.customerName}
Email: ${data.customerEmail}
Teléfono: ${data.customerPhone}
Dirección: ${direccionCompleta}

Productos:
${data.items.map((it) => `- ${it.quantity}× ${it.name} (${it.sku}) — ${formatUSD(it.unitPriceCents)}`).join("\n")}

Subtotal: ${formatUSD(data.subtotalCents)}
Descuento: ${formatUSD(data.discountCents)}
IVA ${ivaRateToPercent(data.ivaRateBp)}%: ${formatUSD(data.ivaCents)}
Envío: ${formatUSD(data.shippingCents)}
TOTAL: ${formatUSD(data.totalCents)}

Pago: ${data.paymentMethod}
Estado: ${data.paymentStatus}
  `.trim();

  return { subject, html, text };
}


/* ============================================================================
   PLANTILLA 2: Correo al CLIENTE
   ============================================================================ */

/**
 * Construye la plantilla del correo dirigido al cliente.
 * Se envía al confirmar el pedido (antes de verificar el pago).
 *
 * @param data - Datos completos del pedido (incluye bankAccounts)
 * @returns { subject, html, text }
 */
export function customerOrderEmail(data: OrderEmailData): EmailTemplate {
  // Asunto amigable.
  const subject = `${BUSINESS.name} — Confirmación de pedido ${formatOrderNumber(data.number)}`;

  // Sección de cuentas (solo aparece si viene el array).
  const banksHtml =
    data.bankAccounts && data.bankAccounts.length > 0
      ? bankAccountsSection(data.bankAccounts)
      : "";

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head><meta charset="utf-8"></head>
    <body style="margin:0;padding:20px;background:#f7f7f9;font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif;color:#111">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:12px;padding:24px">
        <h1 style="margin:0 0 8px;font-size:22px">¡Gracias por tu compra, ${data.customerName}!</h1>
        <p style="color:#666;margin:0 0 20px;font-size:14px">
          Recibimos tu pedido <strong>${formatOrderNumber(data.number)}</strong> y ya estamos procesándolo.
        </p>

        ${itemsTable(data.items)}
        ${totalsTable(data)}

        <h3 style="margin:24px 0 8px;font-size:15px">Estado del pago</h3>
        <p style="margin:0;font-size:14px">
          <strong>Método:</strong> ${data.paymentMethod}<br>
          <strong>Estado:</strong> ${data.paymentStatus}
        </p>

        ${banksHtml}

        <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
        <p style="color:#666;font-size:13px;margin:0 0 4px">
          ¿Dudas? Escríbenos:
        </p>
        <p style="color:#666;font-size:13px;margin:0">
          ${BUSINESS.email} · WhatsApp ${BUSINESS.phone}
        </p>
        <p style="color:#999;font-size:12px;margin:16px 0 0">
          ${BUSINESS.name} · ${BUSINESS.domain}
        </p>
      </div>
    </body>
    </html>
  `;

  // Versión texto plano.
  const text = `
¡Gracias por tu compra, ${data.customerName}!

Recibimos tu pedido ${formatOrderNumber(data.number)}.

Productos:
${data.items.map((it) => `- ${it.quantity}× ${it.name} (${it.sku}) — ${formatUSD(it.unitPriceCents)}`).join("\n")}

Subtotal: ${formatUSD(data.subtotalCents)}
Descuento: ${formatUSD(data.discountCents)}
IVA ${ivaRateToPercent(data.ivaRateBp)}%: ${formatUSD(data.ivaCents)}
Envío: ${formatUSD(data.shippingCents)}
TOTAL: ${formatUSD(data.totalCents)}

Método de pago: ${data.paymentMethod}
Estado: ${data.paymentStatus}

${
  data.bankAccounts && data.bankAccounts.length > 0
    ? `Cuentas para transferir:\n${data.bankAccounts
        .map(
          (a) =>
            `- ${a.bank}${a.accountType ? ` (${a.accountType})` : ""}: ${a.accountNumber} — ${a.holder}`
        )
        .join("\n")}`
    : ""
}

¿Dudas? Escríbenos a ${BUSINESS.email} o WhatsApp ${BUSINESS.phone}.

${BUSINESS.name} · ${BUSINESS.domain}
  `.trim();

  return { subject, html, text };
}