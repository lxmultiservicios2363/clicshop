/* ============================================================================
   CLICSTORE — Página de categorías
   ----------------------------------------------------------------------------
   Este es un SERVER COMPONENT que lista TODAS las categorías reales de la
   base de datos, cada una con su contador de productos activos.

   ¿QUÉ CAMBIÓ RESPECTO AL ORIGINAL?
   ---------------------------------
   Antes esta página tenía un array hardcodeado con 6 categorías falsas
   (Ropa, Calzado, Accesorios, Hogar, Tecnología, Belleza) que NO existían
   en la base de datos. Los links daban error 404 y nunca mostraban productos.

   Ahora lee las categorías REALES desde Prisma. Así:
     - Los contadores son verdaderos.
     - Los links van a /productos?categoria=slug (funcional).
     - Si agregas una categoría nueva desde el admin, aparece automáticamente.

   ICONO POR CATEGORÍA
   -------------------
   Cada categoría tiene un emoji asignado según su slug. Si agregas una
   categoría nueva desde el admin, recibe el emoji por defecto (📦).
   ============================================================================ */

import type { Metadata } from "next";
import Link from "next/link";

import { prisma } from "@/lib/db";


/* ============================================================================
   METADATOS
   ============================================================================ */

export const metadata: Metadata = {
  title: "Categorías",
  description:
    "Explora las categorías de ClicStore: suéteres, tazas sublimadas y camisetas estampadas. Envíos a todo Ecuador.",
};


/* ============================================================================
   ICONOS POR CATEGORÍA
   ----------------------------------------------------------------------------
   Mapeo slug → emoji. Si un slug no está acá, se usa el ícono por defecto.
   ============================================================================ */

const CATEGORY_ICONS: Record<string, string> = {
  "cuello-en-v": "🧥",
  "cuello-redondo": "🧶",
  "sueteres-hombre": "🧑",
  "sueteres-mujer": "👩",
  "tazas-sublimadas": "☕",
  "camisetas-estampadas": "👕",
};

const DEFAULT_ICON = "📦";


/* ============================================================================
   COMPONENTE
   ============================================================================ */

export default async function CategoriasPage() {
  /* ------------------------------------------------------------------------
     Leer las categorías reales de la base de datos.
     Cada categoría viene con un contador de productos activos.
     ------------------------------------------------------------------------ */
  const categories = await prisma.category.findMany({
    orderBy: { order: "asc" },
    include: {
      _count: {
        select: {
          products: { where: { active: true } },
        },
      },
    },
  });

  /* ------------------------------------------------------------------------
     Render
     ------------------------------------------------------------------------ */
  return (
    <div className="container-page py-12 md:py-16">
      {/* --- Encabezado --- */}
      <header className="max-w-2xl">
        <h1 className="text-3xl font-bold md:text-4xl">Categorías</h1>
        <p className="mt-3 text-muted">
          Explora nuestras categorías y encuentra justo lo que buscas.
        </p>
      </header>

      {/* --- Si no hay categorías --- */}
      {categories.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-border bg-surface p-10 text-center">
          <p className="text-lg font-semibold">Aún no hay categorías</p>
          <p className="mt-2 text-sm text-muted">
            Pronto agregaremos nuevas categorías de productos.
          </p>
        </div>
      ) : (
        /* --- Grilla de categorías --- */
        <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => {
            const icon = CATEGORY_ICONS[cat.slug] ?? DEFAULT_ICON;
            const count = cat._count.products;

            return (
              <Link
                key={cat.id}
                href={`/productos?categoria=${cat.slug}`}
                className="group rounded-2xl border border-border bg-surface p-6 transition-all hover:border-primary hover:shadow-lg"
              >
                {/* Emoji */}
                <div className="text-4xl" aria-hidden="true">
                  {icon}
                </div>

                {/* Nombre */}
                <h2 className="mt-4 text-lg font-bold group-hover:text-primary transition-colors">
                  {cat.name}
                </h2>

                {/* Descripción (si tiene) */}
                {cat.description && (
                  <p className="mt-1 text-sm text-muted">{cat.description}</p>
                )}

                {/* Contador + CTA */}
                <div className="mt-5 flex items-center justify-between">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-surface2 text-muted text-xs font-semibold">
                    {count} {count === 1 ? "producto" : "productos"}
                  </span>
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
                    Ver
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="transition-transform group-hover:translate-x-1"
                    >
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </Link>
            );
          })}
        </section>
      )}

      {/* --- Nota al pie --- */}
      <p className="mt-12 text-center text-xs text-muted">
        ¿No encuentras lo que buscas?{" "}
        <Link
          href="/productos"
          className="text-primary hover:underline font-medium"
        >
          Ver todo el catálogo
        </Link>
      </p>
    </div>
  );
}