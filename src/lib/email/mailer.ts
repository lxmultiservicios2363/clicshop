/* ============================================================================
   CLICSTORE — Motor de envío de correos (SMTP)
   ----------------------------------------------------------------------------
   Este archivo encapsula el envío de correos vía SMTP (Nodemailer).

   FILOSOFÍA DE RESILIENCIA
   ------------------------
   El envío de correos NO debe romper la web si falla. Ejemplos:

     - El admin aún no configuró SMTP → el correo se omite, se loguea y sigue.
     - El servidor SMTP está caído → se loguea el error y sigue.
     - Las credenciales están mal → se loguea y sigue.

   En todos esos casos, el pedido igual se guarda, el usuario igual ve su
   confirmación. El correo es una notificación, no un paso crítico del flujo.

   CONFIGURACIÓN
   -------------
   Las credenciales SMTP se leen desde .env:
     SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
     MAIL_FROM, MAIL_ADMIN

   Si las variables SMTP están vacías, el módulo entra en "modo consola":
   imprime el correo en la terminal en vez de enviarlo. Útil en desarrollo
   para ver qué se enviaría sin configurar una cuenta real.

   USO EN EL RESTO DEL CÓDIGO
   --------------------------
     import { sendMail } from "@/lib/email/mailer";

     await sendMail({
       to: "cliente@example.com",
       subject: "Confirmación de pedido",
       html: "<h1>Gracias por tu compra</h1>",
       text: "Gracias por tu compra",
     });
   ============================================================================ */

// Nodemailer es la librería estándar para enviar correos desde Node.js.
// El tipo Transporter representa la conexión configurada a un servidor SMTP.
import nodemailer, { type Transporter } from "nodemailer";


/* ============================================================================
   ESTADO DEL MÓDULO
   ----------------------------------------------------------------------------
   Cacheamos el transporter para no crear una nueva conexión SMTP en cada
   envío. Se crea una vez la primera vez que se necesita y se reutiliza.

   Usamos "undefined" como valor inicial (no null) para distinguir entre:
     - undefined → todavía no se ha intentado crear
     - null      → se intentó crear y no se pudo (SMTP sin configurar)
     - Transporter → está creado y listo para usar
   ============================================================================ */

let cachedTransporter: Transporter | null | undefined = undefined;


/* ============================================================================
   TIPOS
   ============================================================================ */

/**
 * Datos para enviar un correo.
 */
export type SendMailInput = {
  /** Destinatario (email o lista de emails) */
  to: string | string[];

  /** Asunto del correo */
  subject: string;

  /** Cuerpo en HTML (con etiquetas) */
  html: string;

  /** Cuerpo en texto plano (para clientes de correo que no muestran HTML) */
  text?: string;

  /** Responder-a (opcional, por si el cliente responde) */
  replyTo?: string;
};

/**
 * Resultado del envío.
 *   - sent: true  → el correo se envió correctamente
 *   - sent: false → no se envió (skip por falta de config o error)
 */
export type SendMailResult = {
  sent: boolean;
  skipped?: boolean;
  error?: string;
};


/* ============================================================================
   CONFIGURACIÓN DEL TRANSPORTER
   ============================================================================ */

/**
 * Crea (o recupera del caché) el transporter SMTP.
 *
 * Devuelve null si las credenciales no están configuradas. En ese caso,
 * el envío se omite con un log en consola.
 *
 * @returns Transporter listo, o null si no hay configuración
 */
export function getTransport(): Transporter | null {
  // Si ya se intentó crear antes, devolvemos el resultado cacheado.
  // (null significa "se intentó y no se pudo")
  if (cachedTransporter !== undefined) {
    return cachedTransporter;
  }

  // Leemos las variables de entorno.
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  // Si falta alguna de las 3 variables esenciales, no hay SMTP.
  if (!host || !user || !pass) {
    cachedTransporter = null;
    return null;
  }

  // Puerto por defecto 587 (STARTTLS) si no se especifica.
  const portNumber = Number(port ?? 587);

  // Creamos el transporter con la configuración.
  cachedTransporter = nodemailer.createTransport({
    host,
    port: portNumber,

    // "secure: true" usa TLS directo (puerto 465).
    // "secure: false" usa STARTTLS (puerto 587, que es el más común).
    secure: portNumber === 465,

    auth: {
      user,
      pass,
    },
  });

  return cachedTransporter;
}


/* ============================================================================
   ENVÍO DE CORREO
   ============================================================================ */

/**
 * Envía un correo.
 *
 * IMPORTANTE: esta función NO lanza excepciones si el envío falla.
 * Devuelve un objeto SendMailResult indicando si se envió o no.
 * El código que llama decide qué hacer (típicamente, solo loguear).
 *
 * @param input - Datos del correo
 * @returns Resultado del envío
 */
export async function sendMail(input: SendMailInput): Promise<SendMailResult> {
  const transporter = getTransport();

  // --- Caso 1: no hay SMTP configurado ---
  if (!transporter) {
    // En desarrollo es útil ver el correo en consola para saber qué se
    // habría enviado. En producción solo un warning.
    if (process.env.NODE_ENV === "development") {
      console.log("");
      console.log("═══════════════════════════════════════════");
      console.log("  [MAIL - Modo consola (SMTP no configurado)]");
      console.log("═══════════════════════════════════════════");
      console.log(`  Para:     ${Array.isArray(input.to) ? input.to.join(", ") : input.to}`);
      console.log(`  Asunto:   ${input.subject}`);
      console.log("  ---");
      console.log(input.text ?? input.html);
      console.log("═══════════════════════════════════════════");
      console.log("");
    } else {
      console.warn(
        `[mail] SMTP no configurado. Se omite envío a ${input.to}.`
      );
    }

    return { sent: false, skipped: true };
  }

  // --- Caso 2: intentar enviar ---
  try {
    await transporter.sendMail({
      // Remitente: del .env, o un valor por defecto si no está.
      from: process.env.MAIL_FROM ?? "ClicStore <no-reply@clicstore.com>",

      // Destinatario(s).
      to: input.to,

      // Asunto.
      subject: input.subject,

      // Cuerpo HTML (el que se ve).
      html: input.html,

      // Cuerpo en texto plano (fallback y accesibilidad).
      // Si no se pasa, se genera una versión muy simple.
      text: input.text ?? input.html.replace(/<[^>]+>/g, ""),

      // Responder-a (opcional).
      replyTo: input.replyTo,
    });

    return { sent: true };
  } catch (error) {
    // --- Caso 3: el envío falló ---
    // No relanzamos el error: la web sigue funcionando sin correo.
    console.error("[mail] Error al enviar correo:", error);
    return {
      sent: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}


/* ============================================================================
   UTILIDAD: Verificar la configuración SMTP
   ============================================================================ */

/**
 * Verifica si el SMTP está correctamente configurado y si el servidor responde.
 * Útil para un endpoint /api/health o para depurar problemas de credenciales.
 *
 * @returns Objeto con el estado de la configuración
 */
export async function checkMailConfig(): Promise<{
  configured: boolean;
  reachable: boolean;
  error?: string;
}> {
  const transporter = getTransport();

  if (!transporter) {
    return { configured: false, reachable: false };
  }

  try {
    // verify() hace una conexión de prueba y cierra.
    await transporter.verify();
    return { configured: true, reachable: true };
  } catch (error) {
    return {
      configured: true,
      reachable: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}