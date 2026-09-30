/* ============================================================================
   CLICSTORE — Endpoint POST /api/orders
   ----------------------------------------------------------------------------
   Este endpoint recibe la petición del checkout del cliente y crea un pedido.

   FLUJO COMPLETO
   --------------
     1. El cliente hace clic en "Confirmar pedido" en /checkout.
     2. El navegador envía un POST a /api/orders con:
          { customer: {...}, items: [{ productId, variantId, quantity }] }
     3. ESTE endpoint:
          a. Valida los datos con Zod (createOrderSchema).
          b. Llama a createOrder() (el servicio del sub-bloque 4).
          c. Si todo va bien: responde 201 con el pedido creado.
          d. Si hay un error esperado (stock, producto, etc.): responde 400
             con un mensaje amigable para el usuario.
          e. Si hay un error inesperado: responde 500 con un mensaje genérico
             y loguea el error completo en el servidor.
     4. El cliente recibe la respuesta y redirige a /pedido/[numero].

   SEGURIDAD
   ---------
   - NUNCA se confía en los precios del cliente. El servidor los recalcula.
   - Se re-valida TODO con Zod aunque el cliente ya haya validado.
   - Los errores internos NO se exponen al cliente (solo el mensaje amigable).

   ¿POR QUÉ UN ENDPOINT DE API Y NO UN SERVER ACTION?
   -------------------------------------------------
   Los Server Actions de Next.js son geniales, pero un endpoint REST es más
   fácil de probar (con curl, Postman) y de documentar. También permite que
   un futuro cliente móvil use la misma API.
   ============================================================================ */

// Tipos de Next.js para el request/response.
import { NextResponse } from "next/server";

// Schema de validación del pedido.
import { createOrderSchema, formatZodErrors } from "@/lib/validation/checkout";

// Servicio de creación de pedidos + errores personalizados.
import { createOrder, OrderCreationError } from "@/lib/orders/create";


/* ============================================================================
   CONFIGURACIÓN DEL RUNTIME
   ----------------------------------------------------------------------------
   Forzamos el runtime Node.js (no Edge) porque usamos Prisma, que necesita
   Node.js completo para funcionar.
   ============================================================================ */

export const runtime = "nodejs";

/**
 * Forzamos que el endpoint se evalúe en cada request (no se cachee).
 * Es crítico: cada pedido es único, no tiene sentido cachear la respuesta.
 */
export const dynamic = "force-dynamic";


/* ============================================================================
   HANDLER: POST /api/orders
   ============================================================================ */

export async function POST(request: Request) {
  /* ------------------------------------------------------------------------
     PASO 1 — Parsear el JSON de la petición
     ------------------------------------------------------------------------
     Si el body no es JSON válido, respondemos 400 inmediatamente.
     ------------------------------------------------------------------------ */
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "El cuerpo de la petición debe ser JSON válido" },
      { status: 400 }
    );
  }

  /* ------------------------------------------------------------------------
     PASO 2 — Validar con Zod
     ------------------------------------------------------------------------
     Zod se asegura de que:
       - Todos los campos obligatorios estén presentes.
       - Los formatos sean correctos (email, teléfono, etc.).
       - La cuenta bancaria elegida sea una de las 3 válidas.
       - Los ítems tengan productId, variantId y quantity correctos.
     ------------------------------------------------------------------------ */
  const validation = createOrderSchema.safeParse(body);

  if (!validation.success) {
    const fieldErrors = formatZodErrors(validation.error);

    return NextResponse.json(
      {
        error: "Datos inválidos",
        fieldErrors,
      },
      { status: 400 }
    );
  }

  /* ------------------------------------------------------------------------
     PASO 3 — Crear el pedido
     ------------------------------------------------------------------------
     createOrder() hace toda la magia: valida stock, calcula precios reales,
     crea el pedido y descuenta stock. Todo dentro de una transacción.
     ------------------------------------------------------------------------ */
  try {
    const order = await createOrder(validation.data);

    /* --------------------------------------------------------------------
       PASO 4 — Respuesta exitosa
       --------------------------------------------------------------------
       Devolvemos 201 (Created) con los datos esenciales del pedido.
       El cliente usará el "number" para redirigir a /pedido/[number].
       -------------------------------------------------------------------- */
    return NextResponse.json(
      {
        success: true,
        order: {
          id: order.id,
          number: order.number,
          totalCents: order.totalCents,
          orderStatus: order.orderStatus,
          paymentStatus: order.paymentStatus,
          createdAt: order.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    /* --------------------------------------------------------------------
       PASO 5 — Manejar errores
       --------------------------------------------------------------------
       Distinguimos dos tipos:

       1. OrderCreationError: error esperado (stock, producto, etc.).
          → 400 Bad Request con mensaje amigable.
          → El cliente muestra el mensaje al usuario.

       2. Error desconocido: bug o caída.
          → 500 Internal Server Error con mensaje genérico.
          → El cliente muestra "algo salió mal".
          → El error real se loguea en el servidor para depurar.
       -------------------------------------------------------------------- */
    if (error instanceof OrderCreationError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
        },
        { status: 400 }
      );
    }

    // Error inesperado: logueamos completo y respondemos genérico.
    console.error("[POST /api/orders] Error inesperado:", error);

    return NextResponse.json(
      {
        error: "Ocurrió un error al procesar tu pedido. Intenta nuevamente.",
      },
      { status: 500 }
    );
  }
}


/* ============================================================================
   HANDLER: GET /api/orders
   ----------------------------------------------------------------------------
   Bloqueamos GET por seguridad. Solo se permite crear pedidos vía POST.
   ============================================================================ */

export async function GET() {
  return NextResponse.json(
    { error: "Método no permitido. Usa POST para crear un pedido." },
    { status: 405 }
  );
}