/* ============================================================================
   CLICSTORE — Página de detalle de producto
   ----------------------------------------------------------------------------
   Este es un SERVER COMPONENT que muestra un suéter individual.

   MUESTRA:
     1. Galería de imágenes (con thumbnails si hay varias).
     2. Nombre, categoría, descripción.
     3. Colores del producto (badges).
     4. Selector de talla y cantidad + botón agregar al carrito (cliente).
     5. Precio dinámico según cantidad (con descuentos por categoría).
     6. Productos relacionados de la misma categoría.

   FLUJO
   -----
     1. El usuario hace clic en una card de producto.
     2. URL: /productos/[slug] (ej: /productos/cs-v-01).
     3. Este server component busca el producto por slug.
     4. Si no existe → 404 personalizado.
     5. Si existe → renderiza el detalle + el client component interactivo.

   SEGURIDAD
   ---------
   No hay riesgo de enumeración porque los slugs son predecibles (cs-v-01),
   pero solo exponemos productos activos (active=true). Los inactivos → 404.
   ============================================================================ */

import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { prisma } from "@/lib/db";
import { getIvaRateBp } from "@/lib/settings";
import { ProductDetail } from "@/components/shop/product-detail";
import { ProductCard, type ProductCardData } from "@/components/shop/product-card";


/* ============================================================================
   TIPOS
   ============================================================================ */

type PageProps = {
  params: Promise<{ slug: string }>;
};


/* ============================================================================
   METADATOS DINÁMICOS (SEO)
   ----------------------------------------------------------------------------
   Next.js llama a esta función para generar <title> y <meta description>
   específicos de cada producto. Ayuda al SEO (Google muestra el nombre del
   suéter en los resultados).

   IMPORTANTE: el select trae TODOS los campos que se usan en el cuerpo de
   la función (name, description, shortDesc, images). Si falta alguno,
   TypeScript da error.
   ============================================================================ */

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;

  const product = await prisma.product.findUnique({
    where: { slug },
    select: {
      name: true,
      description: true,
      // ✅ shortDesc agregado para que no falle el acceso más abajo.
      shortDesc: true,
      images: true,
    },
  });

  if (!product) {
    return { title: "Producto no encontrado" };
  }

  return {
    title: product.name,
    description: product.shortDesc ?? product.description.slice(0, 160),
    openGraph: {
      title: product.name,
      description: product.description.slice(0, 200),
      images: product.images.slice(0, 1),
    },
  };
}


/* ============================================================================
   COMPONENTE
   ============================================================================ */

export default async function ProductoPage({ params }: PageProps) {
  const { slug } = await params;

  /* ------------------------------------------------------------------------
     PASO 1 — Buscar el producto (solo si está activo)
     ------------------------------------------------------------------------ */
  const product = await prisma.product.findFirst({
    where: { slug, active: true },
    include: {
      category: true,
      variants: {
        orderBy: { size: "asc" },
      },
    },
  });

  if (!product) {
    notFound();
  }

  /* ------------------------------------------------------------------------
     PASO 2 — Cargar datos auxiliares en paralelo
     ------------------------------------------------------------------------
       - Reglas de precio de TODAS las categorías (necesarias para calcular
         descuentos por cantidad en el cliente).
       - Tasa de IVA.
       - Productos relacionados (misma categoría, hasta 4, excluyendo actual).
     ------------------------------------------------------------------------ */
  const [priceRules, ivaRateBp, relatedProducts] = await Promise.all([
    prisma.priceRule.findMany({
      select: { categoryId: true, minQuantity: true, priceCents: true },
    }),
    getIvaRateBp(),
    prisma.product.findMany({
      where: {
        active: true,
        categoryId: product.categoryId,
        id: { not: product.id },
      },
      take: 4,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        variants: {
          orderBy: { size: "asc" },
          select: { id: true, sku: true, size: true, stock: true, priceCents: true },
        },
      },
      orderBy: { sku: "asc" },
    }),
  ]);

  /* ------------------------------------------------------------------------
     PASO 3 — Render
     ------------------------------------------------------------------------ */
  return (
    <div className="container-page py-10 md:py-14">

      {/* ============================================================
          DETALLE DEL PRODUCTO (client component interactivo)
          ============================================================ */}
      <ProductDetail
        product={{
          id: product.id,
          name: product.name,
          slug: product.slug,
          description: product.description,
          shortDesc: product.shortDesc,
          basePriceCents: product.basePriceCents,
          sku: product.sku,
          fabricante: product.fabricante,
          images: product.images,
          colors: product.colors,
          category: {
            id: product.category.id,
            name: product.category.name,
            slug: product.category.slug,
          },
          variants: product.variants.map((v) => ({
            id: v.id,
            sku: v.sku,
            size: v.size,
            stock: v.stock,
            priceCents: v.priceCents,
          })),
        }}
        priceRules={priceRules}
        ivaRateBp={ivaRateBp}
      />

      {/* ============================================================
          PRODUCTOS RELACIONADOS
          ============================================================ */}
      {relatedProducts.length > 0 && (
        <section className="mt-16">
          <h2 className="text-2xl font-bold mb-6">
            También te puede interesar
          </h2>

          <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {relatedProducts.map((p) => (
              <ProductCard
                key={p.id}
                product={{
                  id: p.id,
                  name: p.name,
                  slug: p.slug,
                  basePriceCents: p.basePriceCents,
                  images: p.images,
                  colors: p.colors,
                  category: {
                    id: p.category.id,
                    name: p.category.name,
                  },
                  variants: p.variants,
                } satisfies ProductCardData}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}