/* ============================================================================
   CLICSTORE — Cliente Prisma compartido
   ----------------------------------------------------------------------------
   Este archivo exporta UNA única instancia de PrismaClient para toda la app.

   ¿POR QUÉ ES IMPORTANTE?
   En desarrollo, Next.js recarga los módulos cada vez que guardas un archivo
   (Hot Reload). Si creáramos "new PrismaClient()" en cada archivo que lo usa,
   cada recarga abriría una conexión nueva a la base de datos, y en minutos
   agotaríamos el límite de conexiones de Neon (que es bajo en el plan free).

   La solución es guardar la instancia en "globalThis" (el objeto global de
   Node.js) para que sobreviva a las recargas de Next.js. En producción, este
   patrón no tiene costo, simplemente devuelve una instancia única.

   USO EN EL RESTO DEL CÓDIGO
   --------------------------
   En cualquier archivo del servidor:

       import { prisma } from "@/lib/db";

       const products = await prisma.product.findMany();

   REGLA: NUNCA escribas "new PrismaClient()" en ningún otro archivo.
          Siempre importa esta instancia.
   ============================================================================ */

// Importamos la clase PrismaClient generada por "npx prisma generate".
import { PrismaClient } from "@prisma/client";

// Accedemos al objeto global de Node.js y lo tipamos con una propiedad
// opcional "prisma". Esto permite guardar la instancia entre recargas
// sin que TypeScript se queje.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Exportamos la instancia única:
//   - Si ya existe en globalThis, la reutilizamos (durante desarrollo).
//   - Si no existe, creamos una nueva y la configuramos con logs útiles.
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Configuramos qué queremos que Prisma registre en consola:
    //   - En desarrollo: errores y advertencias (útil para depurar)
    //   - En producción: solo errores (menos ruido en los logs)
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });

// En desarrollo, guardamos la instancia en globalThis para que sobreviva
// a las recargas de Next.js. En producción NO lo hacemos porque no hay
// recargas y queremos que el recolector de basura libere cuando cierre.
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}