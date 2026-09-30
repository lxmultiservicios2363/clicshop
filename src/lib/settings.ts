/* ============================================================================
   CLICSTORE — Lectura de configuración desde la base de datos
   ----------------------------------------------------------------------------
   Este archivo lee la configuración del negocio (nombre, contacto, banco, IVA,
   tema) desde la tabla Setting. Así, si el admin cambia algo en el panel,
   toda la web lo refleja automáticamente sin tocar código.

   ¿POR QUÉ LEER DE LA DB EN VEZ DE HARDCODEAR?
   -------------------------------------------
   Imagina que mañana cambias el teléfono de contacto. Si estuviera hardcodeado
   en 40 archivos, habría que editarlos todos. Con este patrón, cambias UN
   valor en la DB y todos los componentes que llamen a getBusinessConfig()
   reciben el dato actualizado.

   VALORES DE RESPALDO (FALLBACK)
   ------------------------------
   Si la DB falla, o si por alguna razón falta una clave, devolvemos valores
   por defecto razonables. Así la web NUNCA se rompe por un problema de DB.

   USO EN EL RESTO DEL CÓDIGO
   --------------------------
     import {
       getBusinessConfig,
       getBankAccounts,
       getIvaRateBp,
     } from "@/lib/settings";

     const business = await getBusinessConfig();
     // → { name: "ClicStore", email: "lxmultiservicios@gmail.com", ... }

     const accounts = await getBankAccounts();
     // → [{ id: "guayaquil", bank: "Banco Guayaquil", ... }, ...]

     const ivaBp = await getIvaRateBp();
     // → 1500
   ============================================================================ */

// Importamos el cliente compartido de Prisma.
import { prisma } from "./db";

// Importamos la constante de respaldo para el IVA.
import { DEFAULT_IVA_RATE_BP } from "./tax";


/* ============================================================================
   TIPOS
   ============================================================================ */

/**
 * Configuración del negocio (Setting.business).
 * Todos los datos que se muestran en el header, footer, contacto, etc.
 */
export type BusinessConfig = {
  name: string;
  legalName: string;
  domain: string;
  tagline: string;
  email: string;
  phone: string;
  phoneDigits: string;
  whatsappNumber: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  locationUrl: string;
  currency: string;
  locale: string;
  timezone: string;
};

/**
 * Cuenta o destino de pago por transferencia.
 * El array Setting.bank contiene varias de estas.
 */
export type BankAccount = {
  /** Identificador único interno ("guayaquil", "pichincha", "deuna") */
  id: string;

  /** "bank" para cuentas bancarias, "wallet" para billeteras (DEUNA) */
  type: "bank" | "wallet";

  /** Nombre del banco donde está el dinero */
  bank: string;

  /** Solo para type="bank": "Cuenta de Ahorros" o "Cuenta Corriente" */
  accountType?: string;

  /** Número de cuenta o de billetera */
  accountNumber: string;

  /** Titular de la cuenta */
  holder: string;

  /** Cédula del titular */
  holderId: string;

  /** Email para notificar pagos */
  holderEmail: string;

  /** RUC del titular */
  ruc: string;

  /** Ruta pública del QR (ej: "/qr/banco-guayaquil.png") */
  qrImagePath: string;
};

/**
 * Configuración del tema (Setting.theme).
 */
export type ThemeConfig = {
  /** Modo por defecto para nuevos visitantes */
  defaultMode: "light" | "dark" | "system";
};


/* ============================================================================
   VALORES DE RESPALDO
   ----------------------------------------------------------------------------
   Se usan SOLO si la DB falla o si la clave no existe todavía. En producción
   normal, los valores reales vienen de la DB (cargados por el seed).
   ============================================================================ */

const FALLBACK_BUSINESS: BusinessConfig = {
  name: "ClicStore",
  legalName: "Luis Enrique Reina Mesa",
  domain: "www.clicstore.com",
  tagline: "Suéteres tejidos y más, directo a tu puerta",
  email: "lxmultiservicios@gmail.com",
  phone: "+593 98 738 4110",
  phoneDigits: "593987384110",
  whatsappNumber: "+593987384110",
  address: "Olmedo #22 y Amsterdan",
  city: "Riobamba",
  province: "Chimborazo",
  postalCode: "060104",
  country: "EC",
  locationUrl: "https://share.google/pRzMQbx9Tg7VvSXw7",
  currency: "USD",
  locale: "es-EC",
  timezone: "America/Guayaquil",
};

const FALLBACK_THEME: ThemeConfig = {
  defaultMode: "system",
};


/* ============================================================================
   HELPERS INTERNOS
   ============================================================================ */

/**
 * Lee un valor de la tabla Setting por su clave.
 * Devuelve null si no existe o si algo falla.
 *
 * @param key - Clave única (ej: "business", "bank")
 * @returns Valor guardado, o null
 */
async function readSetting<T>(key: string): Promise<T | null> {
  try {
    const row = await prisma.setting.findUnique({ where: { key } });
    if (!row) return null;
    // El campo "value" es Json, así que TypeScript lo ve como "unknown".
    // Lo casteamos al tipo esperado.
    return row.value as T;
  } catch (error) {
    // Si la DB falla (red, credenciales, etc.), logueamos y devolvemos null
    // para que el llamador use el fallback. Así la web no se rompe.
    console.error(`[settings] Error leyendo la clave "${key}":`, error);
    return null;
  }
}


/* ============================================================================
   FUNCIONES PÚBLICAS
   ============================================================================ */

/**
 * Lee la configuración del negocio.
 * Si falla, devuelve el valor de respaldo.
 */
export async function getBusinessConfig(): Promise<BusinessConfig> {
  const data = await readSetting<BusinessConfig>("business");
  return data ?? FALLBACK_BUSINESS;
}

/**
 * Lee el listado de cuentas/destinos de pago.
 * Si falla o está vacío, devuelve un array vacío.
 *
 * IMPORTANTE: un array vacío significa "no hay métodos de pago disponibles".
 * El checkout debe manejar ese caso (mostrar un mensaje al cliente).
 */
export async function getBankAccounts(): Promise<BankAccount[]> {
  const data = await readSetting<BankAccount[]>("bank");
  if (!data || !Array.isArray(data)) return [];
  return data;
}

/**
 * Busca una cuenta por su id.
 * Útil cuando en el checkout el cliente elige "pichincha" y necesitamos
 * mostrar solo esa cuenta con su QR.
 *
 * @param id - Identificador ("guayaquil", "pichincha", "deuna")
 * @returns La cuenta encontrada o null
 */
export async function getBankAccountById(
  id: string
): Promise<BankAccount | null> {
  const accounts = await getBankAccounts();
  return accounts.find((a) => a.id === id) ?? null;
}

/**
 * Lee la tasa de IVA en basis points.
 * Si falla, devuelve 1500 (15%) como respaldo.
 */
export async function getIvaRateBp(): Promise<number> {
  const data = await readSetting<number>("tax.ivaRateBp");
  if (typeof data !== "number" || data < 0) {
    return DEFAULT_IVA_RATE_BP;
  }
  return data;
}

/**
 * Lee la configuración del tema.
 * Si falla, devuelve "system" por defecto.
 */
export async function getThemeConfig(): Promise<ThemeConfig> {
  const data = await readSetting<ThemeConfig>("theme");
  return data ?? FALLBACK_THEME;
}


/* ============================================================================
   ESCRITURA (para el panel admin)
   ============================================================================ */

/**
 * Escribe (crea o actualiza) un valor en la tabla Setting.
 *
 * Esta función la usará el panel admin más adelante, para que el admin
 * pueda cambiar la configuración sin tocar código.
 *
 * @param key - Clave única
 * @param value - Valor nuevo (cualquier estructura serializable a JSON)
 */
export async function setSetting(key: string, value: unknown): Promise<void> {
  await prisma.setting.upsert({
    where: { key },
    update: { value: value as object },
    create: { key, value: value as object },
  });
}