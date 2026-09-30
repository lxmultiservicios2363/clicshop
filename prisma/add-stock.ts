/* ============================================================================
   CLICSTORE — Script para agregar stock a los 70 productos existentes
   ----------------------------------------------------------------------------
   Este script suma 13 unidades a cada uno de los 70 suéteres ya cargados,
   repartidas entre sus 4 tallas (S, M, L, XL).

   REPARTO POR PRODUCTO (+13 unidades):
     S  → +4
     M  → +3
     L  → +3
     XL → +3
     ─────────
     Total: +13 unidades por producto

   RESULTADO ESPERADO:
     70 productos × 13 unidades = 910 unidades nuevas en total.

   CÓMO EJECUTARLO
   ---------------
   Desde D:\clicshop:
       npx tsx prisma/add-stock.ts

   IDEMPOTENCIA
   ------------
   Este script NO es idempotente: cada vez que se ejecuta, suma 13 unidades
   más. Si lo corres 2 veces, sumará +26. Es intencional, porque es un
   script de una sola ejecución (migración puntual de datos).

   Solo procesa productos cuyo SKU empiece con "CS-V-" o "CS-R-":
     - CS-V-XX → Suéteres Cuello V
     - CS-R-XX → Suéteres Cuello Redondo
   Los productos futuros (tazas, camisetas, etc.) no se tocan.
   ============================================================================ */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Cuánto sumar a cada talla por producto.
 * La suma debe ser 13 para cumplir con "agregar 13 al stock de cada uno".
 */
const ADD_BY_SIZE = {
  S: 4,
  M: 3,
  L: 3,
  XL: 3,
} as const;

async function main() {
  console.log("");
  console.log("═══════════════════════════════════════════");
  console.log("  CLICSTORE — Sumar stock a los 70 suéteres");
  console.log("═══════════════════════════════════════════");
  console.log("");

  // --- 1. Encontrar los 70 productos de suéteres ---
  const products = await prisma.product.findMany({
    where: {
      OR: [
        { sku: { startsWith: "CS-V-" } },
        { sku: { startsWith: "CS-R-" } },
      ],
    },
    include: {
      variants: true,
    },
    orderBy: { sku: "asc" },
  });

  if (products.length === 0) {
    console.log("✘ No se encontraron productos con SKU CS-V-* o CS-R-*.");
    return;
  }

  console.log(`→ Encontrados ${products.length} productos`);
  console.log("");

  let variantsUpdated = 0;
  let totalAdded = 0;

  // --- 2. Recorrer cada producto y sus variantes ---
  for (const product of products) {
    for (const variant of product.variants) {
      // Solo procesamos las variantes cuya talla está en ADD_BY_SIZE.
      const sizeKey = variant.size as keyof typeof ADD_BY_SIZE | null;
      if (!sizeKey || !(sizeKey in ADD_BY_SIZE)) continue;

      const increment = ADD_BY_SIZE[sizeKey];

      await prisma.variant.update({
        where: { id: variant.id },
        data: { stock: { increment } },
      });

      variantsUpdated++;
      totalAdded += increment;

      console.log(
        `   ${product.sku}-${variant.size}: ${variant.stock} → ${variant.stock + increment} (+${increment})`
      );
    }
  }

  // --- 3. Resumen ---
  console.log("");
  console.log("═══════════════════════════════════════════");
  console.log("  ✔ Stock actualizado");
  console.log(`  Variantes modificadas: ${variantsUpdated}`);
  console.log(`  Unidades agregadas en total: ${totalAdded}`);
  console.log(`  Reparto por producto: S+${ADD_BY_SIZE.S}, M+${ADD_BY_SIZE.M}, L+${ADD_BY_SIZE.L}, XL+${ADD_BY_SIZE.XL} (=13)`);
  console.log("═══════════════════════════════════════════");
  console.log("");
}

main()
  .catch((err) => {
    console.error("");
    console.error("✘ Error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });