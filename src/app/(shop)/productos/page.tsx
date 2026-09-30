/* ============================================================================
   CLICSTORE — Página de productos (catálogo)
   ----------------------------------------------------------------------------
   Este es un SERVER COMPONENT que:

     1. Lee las categorías desde la base de datos.
     2. Lee los productos activos (con sus variantes) desde la base de datos.
     3. Filtra por categoría si viene el parámetro "?categoria=..." en la URL.
     4. Renderiza una grilla con las cards de producto.

   ¿POR QUÉ SERVER COMPONENT?
   --------------------------
   Porque consulta directamente a Prisma (la base de datos) y devuelve HTML
   ya armado al cliente. Ventajas:
     - Más rápido (no hay ida/vuelta por API).
     - El catálogo se indexa bien en Google (SEO).
     - No necesita "use client" ni JavaScript adicional para mostrar datos.

   FILTRO POR CATEGORÍA
   --------------------
   Se hace vía URL (parámetro ?categoria=cuello-en-v) en vez de estado de React,
   porque así:
     - El usuario puede compartir el link con el filtro aplicado.
     - El filtro es "bookmarkeable".
     - No requiere JavaScript para funcionar.

   CONTADORES DE CATEGORÍA
   -----------------------
   Cada botón de filtro muestra cuántos productos tiene esa categoría.
   Se calcula con "_count" de Prisma (sin hacer consultas extra).
   ============================================================================ */

// Tipo de metadatos de Next.js para SEO.
import type { Metadata } from "next";

// Link de Next.js para navegación sin recarga.
import Link from "next/link";

// Cliente de Prisma (compartido, instancia única).
import { prisma } from "@/lib/db";

// Card de producto (ya creada en src/components/shop/product-card.tsx).
import { ProductCard, type ProductCardData } from "@/components/shop/product-card";


/* ============================================================================
   METADATOS
   ============================================================================ */

export const metadata: Metadata = {
  title: "Productos",
  description:
    "Explora el catálogo de ClicStore: suéteres tejidos a mano, envíos a todo Ecuador. Precios especiales por cantidad.",
};


/* ============================================================================
   TIPOS
   ============================================================================ */

/**
 * Next.js 16 pasa los parámetros de la URL como una Promise.
 * El único que usamos aquí es "categoria" (opcional).
 */
type PageProps = {
  searchParams: Promise<{ categoria?: string }>;
};


/* ============================================================================
   COMPONENTE PRINCIPAL (SERVER COMPONENT)
   ============================================================================ */

export default async function ProductosPage({ searchParams }: PageProps) {
  /* ------------------------------------------------------------------------
     PASO 1 — Leer los parámetros de la URL
     ------------------------------------------------------------------------
     Next.js 16 exige hacer "await" a searchParams (es una Promise).
     Si el usuario entra a /productos sin filtro, categoriaSlug queda undefined.
     Si entra a /productos?categoria=cuello-en-v, tendrá ese valor.
     ------------------------------------------------------------------------ */
  const params = await searchParams;
  const categoriaSlug = params.categoria;

  /* ------------------------------------------------------------------------
     PASO 2 — Consultas a la base de datos
     ------------------------------------------------------------------------
     Hacemos 2 consultas en paralelo con Promise.all para mayor velocidad:

       1. Categorías con el conteo de productos activos de cada una.
       2. Productos filtrados (o todos si no hay filtro) con sus variantes
          y categoría.
     ------------------------------------------------------------------------ */
  const [categories, products] = await Promise.all([
    // --- Categorías con contador de productos activos ---
    prisma.category.findMany({
      orderBy: { order: "asc" },
      include: {
        _count: {
          select: {
            // Contamos solo productos con active=true.
            products: { where: { active: true } },
          },
        },
      },
    }),

    // --- Productos con sus variantes y categoría ---
    prisma.product.findMany({
      where: {
        active: true,
        // Si hay filtro, aplicamos la condición por categoría.
        // Si no, no agregamos nada (devuelve todos).
        ...(categoriaSlug
          ? { category: { slug: categoriaSlug } }
          : {}),
      },
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
        variants: {
          // Ordenamos las tallas S, M, L, XL. El orden alfabético funciona bien.
          orderBy: { size: "asc" },
          // Traemos solo los campos que necesita la ProductCard.
          select: {
            id: true,
            sku: true,
            size: true,
            stock: true,
            priceCents: true,
          },
        },
      },
      // Orden: primero por categoría, después por SKU (que ya está numerado).
      orderBy: [{ categoryId: "asc" }, { sku: "asc" }],
    }),
  ]);

  /* ------------------------------------------------------------------------
     PASO 3 — Calcular el total para el filtro "Todos"
     ------------------------------------------------------------------------
     Sumamos los productos activos de todas las categorías.
     ------------------------------------------------------------------------ */
  const totalProducts = categories.reduce(
    (sum, cat) => sum + cat._count.products,
    0
  );

  /* ------------------------------------------------------------------------
     PASO 4 — Determinar el título dinámico
     ------------------------------------------------------------------------
     Si hay filtro, mostramos el nombre de la categoría filtrada.
     Si no, mostramos un texto genérico con el total.
     ------------------------------------------------------------------------ */
  const categoriaActual = categoriaSlug
    ? categories.find((c) => c.slug === categoriaSlug)
    : null;

  /* ------------------------------------------------------------------------
     PASO 5 — Renderizado
     ------------------------------------------------------------------------ */
  return (
    <div className="container-page py-12 md:py-16">

      {/* ============================================================
          ENCABEZADO
          ============================================================ */}
      <header className="max-w-3xl">
        <h1 className="text-3xl font-bold md:text-4xl">
          {categoriaActual ? categoriaActual.name : "Nuestros productos"}
        </h1>
        <p className="mt-3 text-muted">
          {categoriaActual?.description ??
            "Suéteres Tejidos (Nuestro Producto Premiun). Precios especiales al llevar 2 o más unidades."}
        </p>
        <p className="mt-2 text-sm text-muted">
          Mostrando <strong className="text-text">{products.length}</strong>{" "}
          {products.length === 1 ? "producto" : "productos"}
          {categoriaActual ? ` en ${categoriaActual.name}` : " disponibles"}.
        </p>
      </header>

      {/* ============================================================
          FILTROS POR CATEGORÍA
          ============================================================ */}
      <nav
        className="mt-8 flex flex-wrap gap-2"
        aria-label="Filtrar por categoría"
      >
        {/* --- Botón "Todos" --- */}
        <CategoryChip
          href="/productos"
          label="Todos"
          count={totalProducts}
          isActive={!categoriaSlug}
        />

        {/* --- Botones por cada categoría --- */}
        {categories.map((cat) => (
          <CategoryChip
            key={cat.id}
            href={`/productos?categoria=${cat.slug}`}
            label={cat.name}
            count={cat._count.products}
            isActive={categoriaSlug === cat.slug}
          />
        ))}
      </nav>

      {/* ============================================================
          GRILLA DE PRODUCTOS
          ============================================================ */}
      {products.length === 0 ? (
        // --- Estado vacío ---
        <div className="mt-10 rounded-2xl border border-border bg-surface p-10 text-center">
          <p className="text-lg font-semibold">No hay productos disponibles</p>
          <p className="mt-2 text-sm text-muted">
            {categoriaSlug
              ? "No encontramos productos en esta categoría. Prueba con otra."
              : "Estamos preparando el catálogo. Vuelve pronto."}
          </p>
          <Link
            href="/contacto"
            className="mt-5 inline-block rounded-xl bg-primary px-5 py-3 font-medium text-primaryFg hover:opacity-90 transition-opacity"
          >
            Consultar por WhatsApp
          </Link>
        </div>
      ) : (
        // --- Grilla ---
        <div className="mt-8 grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={{
                id: product.id,
                name: product.name,
                slug: product.slug,
                basePriceCents: product.basePriceCents,
                images: product.images,
                colors: product.colors,
                category: {
                  id: product.category.id,
                  name: product.category.name,
                },
                variants: product.variants,
              } satisfies ProductCardData}
            />
          ))}
        </div>
      )}
    </div>
  );
}


/* ============================================================================
   SUB-COMPONENTE: Chip de categoría
   ----------------------------------------------------------------------------
   Botón pequeño que representa una categoría en la fila de filtros.
   Muestra el nombre + contador, y tiene un estilo distinto si está activo.
   ============================================================================ */

function CategoryChip({
  href,
  label,
  count,
  isActive,
}: {
  href: string;
  label: string;
  count: number;
  isActive: boolean;
}) {
  return (
    <Link
      href={href}
      className={[
        // Base
        "inline-flex items-center gap-2 px-4 h-9 rounded-full text-sm font-medium transition-colors",
        // Estado: activo vs no activo
        isActive
          ? "bg-primary text-primaryFg"
          : "border border-border text-muted hover:text-text hover:border-primary",
      ].join(" ")}
      aria-current={isActive ? "page" : undefined}
    >
      <span>{label}</span>
      <span
        className={[
          "text-[11px] font-bold rounded-full min-w-[20px] h-[20px] px-1.5 inline-flex items-center justify-center",
          isActive
            ? "bg-primaryFg/20 text-primaryFg"
            : "bg-surface2 text-muted",
        ].join(" ")}
      >
        {count}
      </span>
    </Link>
  );
}