/* ============================================================================
   CLICSTORE — Seed inicial de la base de datos
   ----------------------------------------------------------------------------
   Este archivo llena la base de datos con los datos iniciales del negocio:
     1. Configuración del negocio (business, banco(s), IVA, tema)
     2. Usuario administrador (credenciales desde .env)
     3. 6 Categorías comerciales con sus reglas de precio
     4. 70 productos (17 cuello V + 53 cuello redondo)
     5. Variantes por talla con stock distribuido

   CÓMO EJECUTARLO
   ---------------
   Desde la terminal, en D:\clicshop:
       npx tsx prisma/seed.ts

   IDEMPOTENCIA
   ------------
   Este script se puede ejecutar varias veces sin duplicar datos:
   usa "upsert" en todos los modelos con clave única (email, slug, sku).
   Si cambias un nombre de categoría, el upsert lo actualiza en la DB
   sin tocar los productos asociados (el vínculo es por slug, no por nombre).

   DISTRIBUCIÓN DEL STOCK
   ----------------------
   Total: 154 suéteres entre 70 productos.
     - 14 productos → 3 unidades (S, M, L)
     - 56 productos → 2 unidades (S, M)
   Todas las tallas XL se crean con stock 0 (para rellenar desde el admin).

   CUENTAS DE PAGO POR TRANSFERENCIA
   ---------------------------------
   Se configuran 3 destinos de pago:
     1. Banco Guayaquil     → Cuenta de Ahorros 0041529712
     2. Banco Pichincha     → Cuenta de Ahorros 2216452373
     3. DEUNA (billetera)   → Vinculada a Pichincha, cuenta 7703173067
   Cada uno tiene su propio QR en /public/qr/.

   CATEGORÍAS COMERCIALES
   ----------------------
   Nombres pensados para SEO y conversión (empezar por el sustantivo que
   el cliente busca en Google):

     1. Suéteres Cuello V       (slug: cuello-en-v)         → 17 productos
     2. Suéteres Cuello Redondo (slug: cuello-redondo)      → 53 productos
     3. Suéteres de Hombre      (slug: sueteres-hombre)     → vacía
     4. Suéteres de Mujer       (slug: sueteres-mujer)      → vacía
     5. Tazas Sublimadas        (slug: tazas-sublimadas)    → vacía
     6. Camisetas Estampadas    (slug: camisetas-estampadas) → vacía

   NOTA: las categorías 3-6 están listas para cuando agregues productos.
   Sus reglas de precio se crean vacías hasta que definas los precios.
   ============================================================================ */

// Importamos el cliente de Prisma (generado por npx prisma generate).
import { PrismaClient, Role } from "@prisma/client";

// Importamos bcryptjs para hashear la contraseña del admin.
import bcrypt from "bcryptjs";

// Instancia única del cliente de Prisma.
const prisma = new PrismaClient();


/* ============================================================================
   CONFIGURACIÓN DEL NEGOCIO
   ============================================================================ */

// Información oficial del negocio (visible en la web).
// Estos datos los lee el frontend desde la tabla Setting.
const BUSINESS_DATA = {
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

// Destinos de pago por transferencia (3 en total).
// Se muestran en el checkout y en el correo de confirmación.
const BANK_ACCOUNTS = [
  {
    id: "guayaquil",
    type: "bank",
    bank: "Banco Guayaquil",
    accountType: "Cuenta de Ahorros",
    accountNumber: "0041529712",
    holder: "Luis Enrique Reina Mesa",
    holderId: "1762373601",
    holderEmail: "luise2363@gmail.com",
    ruc: "1762373601001",
    qrImagePath: "/qr/banco-guayaquil.png",
  },
  {
    id: "pichincha",
    type: "bank",
    bank: "Banco Pichincha",
    accountType: "Cuenta de Ahorros",
    accountNumber: "2216452373",
    holder: "Luis Enrique Reina Mesa",
    holderId: "1762373601",
    holderEmail: "luise2363@gmail.com",
    ruc: "1762373601001",
    qrImagePath: "/qr/banco-pichincha.png",
  },
  {
    id: "deuna",
    type: "wallet",
    bank: "Banco Pichincha",
    accountNumber: "7703173067",
    holder: "Luis Enrique Reina Mesa",
    holderId: "1762373601",
    holderEmail: "luise2363@gmail.com",
    ruc: "1762373601001",
    qrImagePath: "/qr/deuna.png",
  },
];

// IVA en basis points. 1500 bp = 15.00%.
const IVA_RATE_BP = 1500;


/* ============================================================================
   CATEGORÍAS Y REGLAS DE PRECIO
   ----------------------------------------------------------------------------
   Cada categoría tiene:
     - name:        nombre comercial visible al cliente
     - slug:        identificador URL (no se cambia una vez creado, porque
                    los productos lo usan como vínculo)
     - description: texto corto descriptivo
     - order:       posición en el menú/grilla
     - priceRules:  reglas de precio escalonado por cantidad
                    (array vacío si aún no se definen precios)
   ============================================================================ */

type PriceRuleSpec = {
  minQuantity: number;
  priceCents: number;
};

type CategorySpec = {
  name: string;
  slug: string;
  description: string;
  order: number;
  priceRules: PriceRuleSpec[];
};

const CATEGORIES: CategorySpec[] = [
  /* ------------------------------------------------------------------------
     1. SUÉTERES CUELLO V
     ------------------------------------------------------------------------ */
  {
    name: "Suéteres Cuello V",
    slug: "cuello-en-v",
    description:
      "Suéteres con cuello en V, botones y bolsillos. Tejidos a mano.",
    order: 1,
    priceRules: [
      { minQuantity: 1, priceCents: 1500 }, // $15.00
      { minQuantity: 2, priceCents: 1400 }, // $14.00
      { minQuantity: 3, priceCents: 1250 }, // $12.50
    ],
  },

  /* ------------------------------------------------------------------------
     2. SUÉTERES CUELLO REDONDO
     ------------------------------------------------------------------------ */
  {
    name: "Suéteres Cuello Redondo",
    slug: "cuello-redondo",
    description:
      "Suéteres de cuello redondo clásico. Tejidos a mano.",
    order: 2,
    priceRules: [
      { minQuantity: 1, priceCents: 1800 }, // $18.00
      { minQuantity: 2, priceCents: 1700 }, // $17.00
      { minQuantity: 3, priceCents: 1500 }, // $15.00
    ],
  },

  /* ------------------------------------------------------------------------
     3. SUÉTERES DE HOMBRE (nueva, sin productos aún)
     ------------------------------------------------------------------------ */
  {
    name: "Suéteres de Hombre",
    slug: "sueteres-hombre",
    description:
      "Suéteres tejidos a mano con cortes masculinos. Calidez y estilo.",
    order: 3,
    priceRules: [], // se definirán cuando se agreguen productos
  },

  /* ------------------------------------------------------------------------
     4. SUÉTERES DE MUJER (nueva, sin productos aún)
     ------------------------------------------------------------------------ */
  {
    name: "Suéteres de Mujer",
    slug: "sueteres-mujer",
    description:
      "Suéteres tejidos a mano con diseños femeninos y colores vibrantes.",
    order: 4,
    priceRules: [],
  },

  /* ------------------------------------------------------------------------
     5. TAZAS SUBLIMADAS (nueva, sin productos aún)
     ------------------------------------------------------------------------ */
  {
    name: "Tazas Sublimadas",
    slug: "tazas-sublimadas",
    description:
      "Tazas sublimadas con diseños únicos. Ideales para regalar.",
    order: 5,
    priceRules: [],
  },

  /* ------------------------------------------------------------------------
     6. CAMISETAS ESTAMPADAS (nueva, sin productos aún)
     ------------------------------------------------------------------------ */
  {
    name: "Camisetas Estampadas",
    slug: "camisetas-estampadas",
    description:
      "Camisetas con estampados originales. Diseños exclusivos.",
    order: 6,
    priceRules: [],
  },
];


/* ============================================================================
   TIPOS AUXILIARES
   ============================================================================ */

// Estructura de cada producto generado.
type ProductSpec = {
  sku: string;             // "CS-V-01"
  name: string;            // "Suéter Cuello V #01"
  slug: string;            // "cs-v-01"
  imagePath: string;       // "/images/products/sueteres-tejidos-ca/cs-v-01.png"
  categorySlug: string;    // "cuello-en-v"
  basePriceCents: number;  // 1500 o 1800
  stock: { S: number; M: number; L: number; XL: number };
};


/* ============================================================================
   GENERACIÓN DE LOS 70 PRODUCTOS
   ----------------------------------------------------------------------------
   Reglas de stock (para llegar a 154 unidades en total):
     - Productos 1..7 de cada categoría → 3 unidades (S=1, M=1, L=1)
     - Resto de productos               → 2 unidades (S=1, M=1, L=0)
   Todas las tallas XL se crean con stock 0.
   ============================================================================ */

function generateProducts(): ProductSpec[] {
  const products: ProductSpec[] = [];

  // --- Cuello en V: 17 productos (CS-V-01 ... CS-V-17) ---
  for (let i = 1; i <= 17; i++) {
    const num = String(i).padStart(2, "0");
    const tieneL = i <= 7;
    products.push({
      sku: `CS-V-${num}`,
      name: `Suéter Cuello V #${num}`,
      slug: `cs-v-${num}`,
      imagePath: `/images/products/sueteres-tejidos-ca/cs-v-${num}.png`,
      categorySlug: "cuello-en-v",
      basePriceCents: 1500,
      stock: { S: 1, M: 1, L: tieneL ? 1 : 0, XL: 0 },
    });
  }

  // --- Cuello redondo: 53 productos (CS-R-01 ... CS-R-53) ---
  for (let i = 1; i <= 53; i++) {
    const num = String(i).padStart(2, "0");
    const tieneL = i <= 7;
    products.push({
      sku: `CS-R-${num}`,
      name: `Suéter Cuello Redondo #${num}`,
      slug: `cs-r-${num}`,
      imagePath: `/images/products/sueteres-tejidos-ca/cs-r-${num}.png`,
      categorySlug: "cuello-redondo",
      basePriceCents: 1800,
      stock: { S: 1, M: 1, L: tieneL ? 1 : 0, XL: 0 },
    });
  }

  return products;
}


/* ============================================================================
   SEMILLAS POR SECCIÓN
   ============================================================================ */

// --- 1. Configuración del negocio (tabla Setting) ---
async function seedSettings(): Promise<void> {
  console.log("→ Insertando configuración del negocio...");

  const settings = [
    { key: "business", value: BUSINESS_DATA },
    { key: "bank", value: BANK_ACCOUNTS },
    { key: "tax.ivaRateBp", value: IVA_RATE_BP },
    { key: "theme", value: { defaultMode: "system" } },
  ];

  for (const s of settings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: { value: s.value as object },
      create: { key: s.key, value: s.value as object },
    });
  }

  console.log(`   ✔ ${settings.length} configuraciones guardadas`);
}


// --- 2. Usuario administrador ---
async function seedAdmin(): Promise<void> {
  console.log("→ Creando usuario administrador...");

  const email = process.env.SEED_ADMIN_EMAIL || "lxmultiservicios@gmail.com";
  const password = process.env.SEED_ADMIN_PASSWORD || "CambiaEstaClave2026!";
  const name = process.env.SEED_ADMIN_NAME || "Luis Enrique Reina Mesa";

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: { email },
    update: { passwordHash, name, role: Role.ADMIN },
    create: { email, passwordHash, name, role: Role.ADMIN },
  });

  console.log(`   ✔ Admin: ${email}`);
  console.log(`   ⚠ Cambia la contraseña después del primer login`);
}


// --- 3. Categorías y reglas de precio ---
async function seedCategories(): Promise<void> {
  console.log("→ Insertando categorías y reglas de precio...");

  for (const cat of CATEGORIES) {
    // Upsert de la categoría (por slug).
    // El slug NUNCA cambia (es el vínculo con los productos).
    // El nombre SÍ se puede renombrar sin afectar los productos.
    const category = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {
        name: cat.name,
        description: cat.description,
        order: cat.order,
      },
      create: {
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        order: cat.order,
      },
    });

    // Upsert de cada regla de precio (si la categoría tiene).
    // Las categorías nuevas vienen con array vacío → no se crean reglas.
    for (const rule of cat.priceRules) {
      await prisma.priceRule.upsert({
        where: {
          categoryId_minQuantity: {
            categoryId: category.id,
            minQuantity: rule.minQuantity,
          },
        },
        update: { priceCents: rule.priceCents },
        create: {
          categoryId: category.id,
          minQuantity: rule.minQuantity,
          priceCents: rule.priceCents,
        },
      });
    }

    const ruleCount = cat.priceRules.length;
    if (ruleCount > 0) {
      console.log(`   ✔ ${cat.name}: ${ruleCount} reglas de precio`);
    } else {
      console.log(`   ✔ ${cat.name}: sin reglas (se definirán después)`);
    }
  }
}


// --- 4. Productos y variantes ---
async function seedProducts(): Promise<void> {
  console.log("→ Insertando 70 productos con sus variantes...");

  // Traemos las categorías de la DB para mapear slug → objeto.
  const categories = await prisma.category.findMany();
  const categoryBySlug = new Map(categories.map((c) => [c.slug, c]));

  const specs = generateProducts();

  let productCount = 0;
  let variantCount = 0;

  for (const spec of specs) {
    const category = categoryBySlug.get(spec.categorySlug);
    if (!category) {
      throw new Error(`Categoría no encontrada: ${spec.categorySlug}`);
    }

    const description =
      spec.categorySlug === "cuello-en-v"
        ? "Suéter de cuello en V, tejido a mano por Cristian Andres. Con botones y bolsillos. Actualiza la descripción y colores desde el panel administrativo."
        : "Suéter de cuello redondo, tejido a mano por Cristian Andres. Actualiza la descripción y colores desde el panel administrativo.";

    // Upsert del producto (por SKU).
    const product = await prisma.product.upsert({
      where: { sku: spec.sku },
      update: {
        name: spec.name,
        slug: spec.slug,
        description,
        basePriceCents: spec.basePriceCents,
        images: [spec.imagePath],
        fabricante: "Cristian Andres",
        categoryId: category.id,
      },
      create: {
        name: spec.name,
        slug: spec.slug,
        description,
        basePriceCents: spec.basePriceCents,
        sku: spec.sku,
        fabricante: "Cristian Andres",
        images: [spec.imagePath],
        colors: [],
        active: true,
        featured: false,
        tags:
          spec.categorySlug === "cuello-en-v"
            ? ["sueter", "tejido", "cuello-v", "botones", "bolsillos"]
            : ["sueter", "tejido", "cuello-redondo"],
        categoryId: category.id,
      },
    });

    productCount++;

    // Crear/actualizar las 4 variantes (S, M, L, XL).
    const sizes: Array<"S" | "M" | "L" | "XL"> = ["S", "M", "L", "XL"];

    for (const size of sizes) {
      const variantSku = `${spec.sku}-${size}`;
      const stock = spec.stock[size];

      await prisma.variant.upsert({
        where: { sku: variantSku },
        update: { stock, size },
        create: { productId: product.id, sku: variantSku, size, stock },
      });

      variantCount++;
    }
  }

  console.log(`   ✔ ${productCount} productos insertados`);
  console.log(`   ✔ ${variantCount} variantes creadas`);
}


/* ============================================================================
   FUNCIÓN PRINCIPAL
   ============================================================================ */

async function main(): Promise<void> {
  console.log("");
  console.log("═══════════════════════════════════════════");
  console.log("  CLICSTORE — Seed inicial");
  console.log("═══════════════════════════════════════════");
  console.log("");

  try {
    await seedSettings();
    await seedAdmin();
    await seedCategories();
    await seedProducts();

    console.log("");
    console.log("═══════════════════════════════════════════");
    console.log("  ✔ Seed completado con éxito");
    console.log("═══════════════════════════════════════════");
    console.log("");
  } catch (error) {
    console.error("");
    console.error("✘ Error durante el seed:");
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();