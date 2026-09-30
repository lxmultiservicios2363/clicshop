/* ============================================================================
   CLICSTORE — Configuración central del negocio
   ----------------------------------------------------------------------------
   Este archivo concentra TODOS los datos oficiales del negocio en un solo
   lugar. Cualquier componente que necesite mostrar el nombre, el contacto,
   el WhatsApp o la ubicación, los importa desde aquí.

   Beneficio: si mañana cambia el teléfono, el correo o la dirección,
   se modifica UNA vez aquí y toda la web lo refleja automáticamente.

   IMPORTANTE: este archivo NO contiene secretos ni contraseñas. Los secretos
   viven en .env. Aquí solo hay datos públicos del negocio.
   ============================================================================ */


/* ----------------------------------------------------------------------------
   Tipo de dato Business
   ----------------------------------------------------------------------------
   Define la "forma" que tiene el objeto BUSINESS.
   Esto le dice a TypeScript exactamente qué campos existen y de qué tipo son,
   lo que permite autocompletar y detectar errores al escribir código.
   ---------------------------------------------------------------------------- */
export type Business = {
  /* --- Identidad --- */
  name: string;              // Nombre comercial visible (ej: "ClicStore")
  legalName: string;         // Nombre legal del propietario (para facturación)
  domain: string;            // Dominio web sin protocolo (ej: "www.clicstore.com")
  tagline: string;           // Frase corta descriptiva del negocio

  /* --- Contacto --- */
  email: string;             // Correo principal de contacto y soporte
  phone: string;             // Teléfono en formato legible (+593 98 738 4110)
  phoneDigits: string;       // Solo dígitos, sin "+" ni espacios (para links "tel:")
  whatsappNumber: string;    // Número completo con código de país para WhatsApp

  /* --- Ubicación --- */
  address: string;           // Dirección física (calle y número)
  city: string;              // Ciudad
  province: string;          // Provincia (Ecuador)
  postalCode: string;        // Código postal (Ecuador usa 6 dígitos)
  country: string;           // Código ISO de país (EC = Ecuador)
  locationUrl: string;       // URL de Google Maps (compartible)

  /* --- Operativos --- */
  currency: "USD";           // Moneda oficial (Ecuador usa dólares)
  locale: string;            // Configuración regional para formatear fechas/números
  timezone: string;          // Zona horaria (Ecuador continental)
};


/* ----------------------------------------------------------------------------
   BUSINESS — Objeto con los datos oficiales de ClicStore
   ----------------------------------------------------------------------------
   Este es el único lugar del proyecto donde estos datos existen.
   Cualquier otro archivo los importa desde aquí.
   ---------------------------------------------------------------------------- */
export const BUSINESS = {
  /* === Identidad === */
  name: "ClicStore",
  legalName: "Luis Enrique Reina Mesa",
  domain: "www.clicstore.com",
  tagline: "Suéteres tejidos y más, directo a tu puerta",

  /* === Contacto === */
  email: "lxmultiservicios@gmail.com",
  phone: "+593 98 738 4110",       // Formato legible para mostrar en pantalla
  phoneDigits: "593987384110",     // Solo dígitos (para construir links "tel:")
  whatsappNumber: "+593987384110", // Número completo con código de país

  /* === Ubicación === */
  address: "Olmedo #22 y Amsterdan",
  city: "Riobamba",
  province: "Chimborazo",           // Riobamba es la capital de Chimborazo
  postalCode: "060104",
  country: "EC",                    // ISO 3166-1 alpha-2 para Ecuador
  locationUrl: "https://share.google/pRzMQbx9Tg7VvSXw7",

  /* === Operativos === */
  currency: "USD",
  locale: "es-EC",                  // Español - Ecuador
  timezone: "America/Guayaquil",    // Zona horaria continental de Ecuador
} as const;


/* ----------------------------------------------------------------------------
   Tipos derivados (para reutilizar en otros archivos)
   ----------------------------------------------------------------------------
   Permite importar el tipo del objeto ya creado sin volver a escribirlo.
   Útil para funciones que reciben "el objeto BUSINESS completo"
   o "una propiedad específica de BUSINESS".
   ---------------------------------------------------------------------------- */
export type BusinessConfig = typeof BUSINESS;
export type BusinessKey = keyof BusinessConfig;