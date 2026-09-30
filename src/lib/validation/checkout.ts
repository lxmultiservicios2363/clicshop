/* ============================================================================
   CLICSTORE — Validación del formulario de checkout
   ----------------------------------------------------------------------------
   Este archivo define los SCHEMAS de Zod para el checkout. Un "schema" es
   una descripción del formato exacto que deben tener los datos.

   ¿POR QUÉ VALIDAR?
   -----------------
   La validación se hace en DOS lugares:

     1. CLIENTE (navegador): muestra errores al usuario en tiempo real.
        Ejemplo: "El correo no es válido" apenas escribe mal.

     2. SERVIDOR (backend): re-valida los datos antes de crear el pedido.
        Aunque un atacante manipule el navegador para evitar la validación
        del cliente, el servidor igual rechaza datos inválidos.

   Zod es la librería que usamos: es rápida, tipada, y funciona igual en
   cliente y servidor.

   ¿QUÉ VALIDAMOS?
   ---------------
   - Datos del cliente (nombre, email, teléfono)
   - Dirección de entrega (provincia, ciudad, dirección)
   - Cuenta bancaria elegida (debe ser una de las 3 válidas)

   Los ítems del carrito también se validan en el schema del servidor,
   pero NO en el formulario (porque el carrito ya está validado en el
   cliente con Zustand).

   USO EN EL RESTO DEL CÓDIGO
   --------------------------
     import { checkoutFormSchema, type CheckoutFormInput } from "@/lib/validation/checkout";

     const result = checkoutFormSchema.safeParse(data);
     if (!result.success) {
       console.log(result.error.flatten().fieldErrors);
     } else {
       console.log(result.data); // datos validados y transformados
     }
   ============================================================================ */

// Zod es la librería de validación que usamos en todo el proyecto.
import { z } from "zod";


/* ============================================================================
   CONSTANTES
   ============================================================================ */

/**
 * IDs válidos de cuentas bancarias.
 * Coinciden con los ids definidos en la tabla Setting ("bank").
 *
 * Si mañana agregas una cuenta nueva, solo hay que agregar su id aquí
 * y en el seed. Los formularios y validaciones se actualizan solos.
 */
export const BANK_ACCOUNT_IDS = ["guayaquil", "pichincha", "deuna"] as const;

/**
 * Tipo TypeScript derivado de la lista anterior.
 * Ejemplo: "guayaquil" | "pichincha" | "deuna"
 */
export type BankAccountId = (typeof BANK_ACCOUNT_IDS)[number];


/* ============================================================================
   SUB-SCHEMAS
   ============================================================================ */

/**
 * Schema para el teléfono del cliente.
 *
 * Acepta cualquier formato que ingrese el usuario:
 *   "+593 98 738 4110"
 *   "0987384110"
 *   "593 98 738-4110"
 *   "098 738 41 10"
 *
 * Lo normaliza eliminando todo lo que NO sea dígito, y luego verifica
 * que queden entre 9 y 13 dígitos (rango de números ecuatorianos).
 */
const phoneSchema = z
  .string()
  .min(1, { message: "El teléfono es obligatorio" })
  .transform((value) => value.replace(/\D/g, "")) // quita todo lo que no sea número
  .refine(
    (digits) => digits.length >= 9 && digits.length <= 13,
    { message: "El teléfono debe tener entre 9 y 13 dígitos" }
  );

/**
 * Schema para el nombre del cliente.
 * Mínimo 2 caracteres, máximo 100.
 * Se recorta con trim() para quitar espacios sobrantes.
 */
const nameSchema = z
  .string()
  .min(2, { message: "El nombre debe tener al menos 2 caracteres" })
  .max(100, { message: "El nombre no puede exceder 100 caracteres" })
  .trim();

/**
 * Schema para el email del cliente.
 * Formato de email válido, máximo 150 caracteres.
 * Se convierte a minúsculas y se recorta.
 */
const emailSchema = z
  .string()
  .min(1, { message: "El correo es obligatorio" })
  .email({ message: "Correo electrónico inválido" })
  .max(150, { message: "El correo no puede exceder 150 caracteres" })
  .toLowerCase()
  .trim();

/**
 * Schema para provincia, ciudad o campos de texto corto.
 */
const shortTextSchema = (fieldName: string) =>
  z
    .string()
    .min(2, { message: `${fieldName} debe tener al menos 2 caracteres` })
    .max(100, { message: `${fieldName} no puede exceder 100 caracteres` })
    .trim();


/* ============================================================================
   SCHEMA 1 — Formulario de checkout (cliente)
   ----------------------------------------------------------------------------
   Este schema valida los datos que el cliente ingresa en el formulario.
   Los ítems del carrito NO se incluyen aquí (viven en el store de Zustand).
   ============================================================================ */

export const checkoutFormSchema = z.object({
  /* --- Datos del cliente --- */
  customerName: nameSchema,
  customerEmail: emailSchema,
  customerPhone: phoneSchema,

  /* --- Dirección de entrega --- */
  province: shortTextSchema("La provincia"),
  city: shortTextSchema("La ciudad"),

  addressLine: z
    .string()
    .min(5, { message: "La dirección debe tener al menos 5 caracteres" })
    .max(200, { message: "La dirección no puede exceder 200 caracteres" })
    .trim(),

  /**
   * Referencia adicional (opcional).
   * Ej: "frente al parque", "casa con portón verde".
   * Aceptamos cadena vacía como equivalente a "sin referencia".
   */
  reference: z
    .string()
    .max(200, { message: "La referencia no puede exceder 200 caracteres" })
    .trim()
    .optional()
    .or(z.literal("")),

  /* --- Cuenta bancaria elegida --- */
  bankAccountId: z.enum(BANK_ACCOUNT_IDS, {
    message: "Debes elegir una cuenta bancaria",
  }),
});

/**
 * Tipo inferido del schema. Se usa en el formulario y en el servicio de
 * creación de pedidos para tipar la variable de datos.
 */
export type CheckoutFormInput = z.infer<typeof checkoutFormSchema>;


/* ============================================================================
   SCHEMA 2 — Creación completa de pedido (servidor)
   ----------------------------------------------------------------------------
   Este schema valida la petición completa al servidor: formulario + ítems
   del carrito. El servidor lo usa para asegurarse de que el cliente no
   manipuló datos antes de enviarlos.
   ============================================================================ */

/**
 * Schema de un ítem del carrito en la petición al servidor.
 * El cliente envía solo productId, variantId y quantity. TODO LO DEMÁS
 * (nombre, precio, etc.) lo obtiene el servidor desde la base de datos.
 *
 * ¿POR QUÉ? Seguridad. Si el cliente enviara el precio, podría manipularlo
 * para pagar menos. El servidor SIEMPRE calcula los precios reales.
 */
export const cartItemSchema = z.object({
  productId: z.string().min(1, { message: "ID de producto requerido" }),
  variantId: z.string().min(1, { message: "ID de variante requerido" }),
  quantity: z
    .number()
    .int({ message: "La cantidad debe ser un número entero" })
    .positive({ message: "La cantidad debe ser mayor a 0" })
    .max(99, { message: "La cantidad máxima por ítem es 99" }),
});

/**
 * Schema de la petición completa al endpoint POST /api/orders.
 */
export const createOrderSchema = z.object({
  customer: checkoutFormSchema,
  items: z
    .array(cartItemSchema)
    .min(1, { message: "El carrito no puede estar vacío" })
    .max(50, { message: "Máximo 50 productos diferentes por pedido" }),
});

/**
 * Tipo inferido del schema de creación de pedido.
 * Se usa en el endpoint del servidor.
 */
export type CreateOrderInput = z.infer<typeof createOrderSchema>;


/* ============================================================================
   UTILIDADES
   ============================================================================ */

/**
 * Formatea los errores de Zod para enviarlos al cliente en un formato simple.
 *
 * Zod devuelve los errores como un árbol complejo. Esta función los aplana
 * a un objeto simple tipo `{ campo: "mensaje de error" }`.
 *
 * @example
 *   const result = checkoutFormSchema.safeParse(data);
 *   if (!result.success) {
 *     const errors = formatZodErrors(result.error);
 *     // { customerEmail: "Correo electrónico inválido" }
 *   }
 */
export function formatZodErrors(error: z.ZodError): Record<string, string> {
  const formatted: Record<string, string> = {};

  for (const issue of error.issues) {
    // issue.path es un array como ["customerEmail"] o ["customer", "city"].
    // Lo unimos con "." para tener una clave plana.
    const key = issue.path.join(".");
    // Solo guardamos el primer error por campo (el más relevante).
    if (!formatted[key]) {
      formatted[key] = issue.message;
    }
  }

  return formatted;
}