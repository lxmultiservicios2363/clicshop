/* ============================================================================
   CLICSTORE — Endpoint POST /api/orders/[id]/proof
   ----------------------------------------------------------------------------
   Este endpoint recibe el comprobante de pago del cliente, lo guarda en
   Vercel Blob (almacenamiento externo), actualiza la base de datos, y
   dispara las notificaciones al admin:

     1. Correo electrónico a lxmultiservicios@gmail.com (automático).
     2. Notificación por WhatsApp (link preparado para que el cliente lo
        dispare; si hay API Business configurada, se envía solo).

   FLUJO COMPLETO
   --------------
     1. El cliente sube un archivo (JPG, PNG o PDF, máx 5 MB).
     2. Validamos tipo y tamaño.
     3. Subimos el archivo a Vercel Blob.
     4. Creamos/actualizamos el PaymentProof.
     5. Actualizamos Payment.status y Order.paymentStatus a COMPROBANTE_SUBIDO.
     6. Creamos un OrderEvent (auditoría).
     7. Enviamos correo al admin con todos los datos del pedido.
     8. Preparamos el link de WhatsApp y lo devolvemos al cliente.

   SEGURIDAD
   ---------
   - Solo se aceptan 3 tipos MIME: image/jpeg, image/png, application/pdf.
   - Tamaño máximo: 5 MB.
   - El nombre del archivo se genera con el id del pedido + timestamp
     (evita colisiones y permite saber a qué pedido pertenece).
   - El archivo vive en Vercel Blob (almacenamiento persistente en la nube).

   ¿POR QUÉ VERCEL BLOB Y NO DISCO LOCAL?
   -------------------------------------
   Vercel es serverless: el sistema de archivos local es de SOLO LECTURA
   excepto /tmp (que se borra en cada invocación). Guardar en public/ no
   funciona en producción. Vercel Blob es la solución nativa de Vercel para
   almacenamiento persistente de archivos, sin configuración extra.

   La variable de entorno BLOB_READ_WRITE_TOKEN la inyecta Vercel
   automáticamente cuando creas el Blob store en el panel.
   ============================================================================ */

// Tipos de Next.js para request/response.
import { NextResponse } from "next/server";

// SDK de Vercel Blob para subir archivos.
import { put } from "@vercel/blob";

// Cliente Prisma compartido.
import { prisma } from "@/lib/db";

// Envío de correos.
import { sendMail } from "@/lib/email/mailer";

// Plantilla del correo al admin.
import { adminOrderEmail, type OrderEmailData } from "@/lib/email/templates/order";

// Notificación por WhatsApp.
import { notifyAdminWhatsApp, type WhatsAppOrderData } from "@/lib/whatsapp";

// Configuración central del negocio (email del admin, WhatsApp).
import { BUSINESS } from "@/config/business";


/* ============================================================================
   CONFIGURACIÓN
   ============================================================================ */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Tamaño máximo del archivo: 5 MB */
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

/** Tipos MIME aceptados */
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "application/pdf",
];


/* ============================================================================
   HANDLER
   ============================================================================ */

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  /* ------------------------------------------------------------------------
     PASO 1 — Leer el id del pedido desde la URL
     ------------------------------------------------------------------------ */
  const { id: orderId } = await params;

  if (!orderId) {
    return NextResponse.json(
      { error: "ID de pedido requerido" },
      { status: 400 }
    );
  }

  /* ------------------------------------------------------------------------
     PASO 2 — Verificar que el pedido existe
     ------------------------------------------------------------------------ */
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      payment: true,
      proof: true,
    },
  });

  if (!order) {
    return NextResponse.json(
      { error: "Pedido no encontrado" },
      { status: 404 }
    );
  }

  /* ------------------------------------------------------------------------
     PASO 3 — Parsear el formulario multipart
     ------------------------------------------------------------------------ */
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "No se pudo leer el archivo. Intenta de nuevo." },
      { status: 400 }
    );
  }

  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Debes adjuntar un archivo" },
      { status: 400 }
    );
  }

  /* ------------------------------------------------------------------------
     PASO 4 — Validar el tipo de archivo
     ------------------------------------------------------------------------ */
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return NextResponse.json(
      {
        error:
          "Formato no permitido. Solo se aceptan JPG, PNG o PDF.",
      },
      { status: 400 }
    );
  }

  /* ------------------------------------------------------------------------
     PASO 5 — Validar el tamaño
     ------------------------------------------------------------------------ */
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      {
        error: `El archivo supera el tamaño máximo permitido (5 MB). Tu archivo pesa ${(file.size / 1024 / 1024).toFixed(2)} MB.`,
      },
      { status: 400 }
    );
  }

  if (file.size === 0) {
    return NextResponse.json(
      { error: "El archivo está vacío" },
      { status: 400 }
    );
  }

  /* ------------------------------------------------------------------------
     PASO 6 — Subir el archivo a Vercel Blob
     ------------------------------------------------------------------------
     Ruta dentro del Blob: proofs/[orderId]-[timestamp]-[nombre-original]
     El nombre incluye el id del pedido + timestamp para evitar colisiones
     y para saber a qué pedido pertenece.
     ------------------------------------------------------------------------ */
  const timestamp = Date.now();
  const ext = file.name.split(".").pop() ?? "bin";
  const blobPath = `proofs/${orderId}-${timestamp}.${ext}`;

  let publicUrl: string;

  try {
    const blob = await put(blobPath, file, {
      access: "public",
      addRandomSuffix: false, // ya incluimos orderId + timestamp
      contentType: file.type,
    });

    publicUrl = blob.url;
  } catch (err) {
    console.error("[POST /api/orders/[id]/proof] Error subiendo a Blob:", err);
    return NextResponse.json(
      { error: "No pudimos guardar tu comprobante. Intenta de nuevo." },
      { status: 500 }
    );
  }

  /* ------------------------------------------------------------------------
     PASO 7 — Actualizar la base de datos (transacción)
     ------------------------------------------------------------------------
     Todo dentro de una transacción para asegurar consistencia:
       1. Crear/actualizar PaymentProof.
       2. Actualizar Payment.status a COMPROBANTE_SUBIDO.
       3. Actualizar Order.paymentStatus a COMPROBANTE_SUBIDO.
       4. Crear OrderEvent de auditoría.
     ------------------------------------------------------------------------ */
  try {
    await prisma.$transaction(async (tx) => {
      // --- 7.1 PaymentProof (upsert: solo uno por pedido) ---
      await tx.paymentProof.upsert({
        where: { orderId },
        update: {
          fileUrl: publicUrl,
          mimeType: file.type,
          sizeBytes: file.size,
          uploadedAt: new Date(),
          // Limpiamos revisiones anteriores si había.
          reviewedBy: null,
          reviewedAt: null,
          reviewNote: null,
        },
        create: {
          orderId,
          fileUrl: publicUrl,
          mimeType: file.type,
          sizeBytes: file.size,
        },
      });

      // --- 7.2 Payment.status ---
      if (order.payment) {
        await tx.payment.update({
          where: { orderId },
          data: { status: "COMPROBANTE_SUBIDO" },
        });
      }

      // --- 7.3 Order.paymentStatus ---
      await tx.order.update({
        where: { id: orderId },
        data: { paymentStatus: "COMPROBANTE_SUBIDO" },
      });

      // --- 7.4 Auditoría ---
      await tx.orderEvent.create({
        data: {
          orderId,
          type: "PROOF_UPLOADED",
          fromValue: "PENDIENTE",
          toValue: "COMPROBANTE_SUBIDO",
          note: "Comprobante subido por el cliente",
        },
      });
    });
  } catch (err) {
    console.error("[POST /api/orders/[id]/proof] Error actualizando DB:", err);
    return NextResponse.json(
      { error: "El comprobante se guardó pero hubo un problema al registrarlo. Contacta por WhatsApp." },
      { status: 500 }
    );
  }

  /* ------------------------------------------------------------------------
     PASO 8 — Enviar notificación por correo al admin
     ------------------------------------------------------------------------
     Si SMTP está configurado, se envía automáticamente.
     Si no, se loguea en consola (no rompe el flujo).
     ------------------------------------------------------------------------ */
  const emailData: OrderEmailData = {
    number: order.number,
    createdAt: order.createdAt,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone,
    items: order.items.map((it) => ({
      name: it.productName,
      sku: it.sku,
      size: it.size ?? undefined,
      color: it.color ?? undefined,
      quantity: it.quantity,
      unitPriceCents: it.unitPriceCents,
    })),
    subtotalCents: order.subtotalCents,
    discountCents: order.discountCents,
    ivaRateBp: order.ivaRateBp,
    ivaCents: order.ivaCents,
    shippingCents: order.shippingCents,
    totalCents: order.totalCents,
    province: order.province,
    city: order.city,
    addressLine: order.addressLine,
    reference: order.reference ?? undefined,
    paymentMethod: "Transferencia bancaria",
    paymentStatus: "Comprobante subido — pendiente de verificación",
  };

  const emailTpl = adminOrderEmail(emailData);
  const emailResult = await sendMail({
    to: BUSINESS.email,
    subject: `[ClicStore] Comprobante subido — Pedido #${String(order.number).padStart(6, "0")}`,
    html: emailTpl.html,
    text: emailTpl.text,
  });

  /* ------------------------------------------------------------------------
     PASO 9 — Preparar el mensaje de WhatsApp
     ------------------------------------------------------------------------
     Devolvemos el link al cliente para que lo pueda enviar manualmente.
     Si hubiera credenciales de WhatsApp Business API en .env, además se
     envía automáticamente desde el servidor.
     ------------------------------------------------------------------------ */
  const waData: WhatsAppOrderData = {
    number: order.number,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    customerEmail: order.customerEmail,
    items: order.items.map((it) => ({
      name: it.productName,
      sku: it.sku,
      size: it.size ?? undefined,
      color: it.color ?? undefined,
      quantity: it.quantity,
      unitPriceCents: it.unitPriceCents,
    })),
    subtotalCents: order.subtotalCents,
    discountCents: order.discountCents,
    ivaRateBp: order.ivaRateBp,
    ivaCents: order.ivaCents,
    shippingCents: order.shippingCents,
    totalCents: order.totalCents,
    paymentMethod: "Transferencia bancaria",
    paymentStatus: "Comprobante subido",
    address: `${order.addressLine}, ${order.city}, ${order.province}${order.reference ? ` (${order.reference})` : ""}`,
  };

  const waResult = await notifyAdminWhatsApp(waData, BUSINESS.phoneDigits);

  /* ------------------------------------------------------------------------
     PASO 10 — Respuesta al cliente
     ------------------------------------------------------------------------ */
  return NextResponse.json(
    {
      success: true,
      proof: {
        fileUrl: publicUrl,
        mimeType: file.type,
        sizeBytes: file.size,
      },
      notifications: {
        emailSent: emailResult.sent,
        whatsappLink: waResult.link,
        whatsappSentViaApi: waResult.sentViaApi,
      },
    },
    { status: 201 }
  );
}


/* ============================================================================
   HANDLER: GET — bloqueado por seguridad
   ============================================================================ */

export async function GET() {
  return NextResponse.json(
    { error: "Método no permitido. Usa POST para subir un comprobante." },
    { status: 405 }
  );
}