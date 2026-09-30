/* ============================================================================
   CLICSTORE — Página principal (home)
   ----------------------------------------------------------------------------
   Este es un SERVER COMPONENT que:

     1. Muestra un HERO (banner) grande con el nombre de la tienda y CTA.
     2. Muestra 3 propuestas de valor (envío, pago, calidad).
     3. Muestra 8 productos destacados traídos desde la base de datos.
     4. Muestra 2 tarjetas grandes con las categorías.
     5. Muestra una sección de "cómo comprar" en 3 pasos.
   ============================================================================ */

import Link from "next/link";
import Image from "next/image";

import { prisma } from "@/lib/db";
import { BUSINESS } from "@/config/business";
import { ProductCard, type ProductCardData } from "@/components/shop/product-card";


/* ============================================================================
   CONFIGURACIÓN
   ============================================================================ */

/**
 * Imagen de fondo del hero.
 * Si más adelante quieres una imagen dedicada, súbela a
 * /public/images/banners/ y cambia esta ruta.
 */
const HERO_IMAGE = "/images/products/sueteres-tejidos-ca/cs-v-05.png";


/* ============================================================================
   COMPONENTE
   ============================================================================ */

export default async function HomePage() {
  const [featuredProducts, categories] = await Promise.all([
    prisma.product.findMany({
      where: { active: true },
      take: 8,
      orderBy: { sku: "asc" },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        variants: {
          orderBy: { size: "asc" },
          select: { id: true, sku: true, size: true, stock: true, priceCents: true },
        },
      },
    }),
    prisma.category.findMany({
      orderBy: { order: "asc" },
      include: {
        _count: {
          select: {
            products: { where: { active: true } },
          },
        },
      },
    }),
  ]);

  return (
    <div className="flex flex-col">

      {/* ================================================================
          HERO / BANNER PRINCIPAL
          ================================================================ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-bg to-surface2">
        <div className="container-page py-16 md:py-24">
          <div className="grid gap-10 items-center md:grid-cols-2">

            {/* --- Columna izquierda: texto + CTA --- */}
            <div className="text-center md:text-left">
              <span className="inline-block px-3 py-1 rounded-full bg-primary/15 text-primary text-xs font-semibold uppercase tracking-wider">
                Hecho en Ecuador
              </span>

              <h1 className="mt-4 text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight">
                Suéteres Tejidos
                <span className="block text-primary">Conoce Calidez y Calidad Premiun</span>
              </h1>

              <p className="mt-5 text-lg text-muted max-w-lg mx-auto md:mx-0">
                {BUSINESS.tagline}. Envíos a todo el país y precios
                especiales al llevar 2 o más unidades.
              </p>

              <div className="mt-8 flex flex-wrap gap-3 justify-center md:justify-start">
                <Link
                  href="/productos"
                  className="inline-flex items-center gap-2 px-7 h-13 rounded-xl bg-primary text-primaryFg font-semibold hover:opacity-90 active:scale-[0.99] transition-all text-base"
                  style={{ height: "3.25rem" }}
                >
                  Ver catálogo
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </Link>

                <Link
                  href="/categorias"
                  className="inline-flex items-center gap-2 px-7 h-13 rounded-xl border border-border bg-surface font-semibold hover:bg-surface2 transition-colors text-base"
                  style={{ height: "3.25rem" }}
                >
                  Ver categorías
                </Link>
              </div>

              {/* Trust badges */}
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 justify-center md:justify-start text-sm text-muted">
                <span className="inline-flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-success">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  Envíos a todo Ecuador
                </span>
                <span className="inline-flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-success">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  Pago por transferencia o DEUNA
                </span>
              </div>
            </div>

            {/* --- Columna derecha: imagen destacada --- */}
            <div className="relative">
              <div className="absolute inset-0 -m-6 bg-primary/20 rounded-[2rem] blur-3xl opacity-30" aria-hidden="true" />

              <div className="relative aspect-[3/4] max-w-md mx-auto rounded-3xl overflow-hidden border border-border shadow-2xl">
                {HERO_IMAGE ? (
                  <Image
                    src={HERO_IMAGE}
                    alt="Suéter tejido destacado de ClicStore"
                    fill
                    priority
                    sizes="(max-width: 768px) 100vw, 500px"
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-surface2" />
                )}
              </div>

              {/* Etiqueta flotante del producto destacado */}
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 md:left-8 md:translate-x-0 px-5 py-3 rounded-2xl bg-surface border border-border shadow-lg">
                <p className="text-xs text-muted uppercase tracking-wider">
                  Producto destacado
                </p>
                <p className="text-sm font-bold mt-0.5">Tejido 100%</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================
          PROPUESTAS DE VALOR
          ================================================================ */}
      <section className="container-page py-12">
        <div className="grid gap-6 md:grid-cols-3">
          <ValueCard
            icon="🚚"
            title="Envíos a todo Ecuador"
            text="Recibe en tu domicilio en 2–5 días hábiles según la ciudad."
          />
          <ValueCard
            icon="💳"
            title="Pago fácil y seguro"
            text="Transferencia bancaria, DEUNA o pago contra entrega en ciudades principales."
          />
          <ValueCard
            icon="🧶"
            title="Tejidos a mano"
            text="Suéteres únicos, tejidos por artesanos ecuatorianos con materiales premium."
          />
        </div>
      </section>

      {/* ================================================================
          PRODUCTOS DESTACADOS
          ================================================================ */}
      <section className="container-page py-12">
        <div className="flex items-baseline justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold">Productos destacados</h2>
            <p className="mt-1 text-muted text-sm">
              Una selección de nuestros suéteres más vendidos.
            </p>
          </div>
          <Link
            href="/productos"
            className="hidden md:inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
          >
            Ver todos
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {featuredProducts.map((p) => (
            <ProductCard
              key={p.id}
              product={{
                id: p.id,
                name: p.name,
                slug: p.slug,
                basePriceCents: p.basePriceCents,
                images: p.images,
                colors: p.colors,
                category: { id: p.category.id, name: p.category.name },
                variants: p.variants,
              } satisfies ProductCardData}
            />
          ))}
        </div>

        <div className="mt-8 text-center md:hidden">
          <Link
            href="/productos"
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
          >
            Ver todos los productos
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </section>

      {/* ================================================================
          CATEGORÍAS
          ================================================================ */}
      <section className="container-page py-12">
        <div className="mb-8">
          <h2 className="text-3xl font-bold">Explora por categoría</h2>
          <p className="mt-1 text-muted text-sm">
            Encuentra exactamente lo que buscas.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/productos?categoria=${cat.slug}`}
              className="group relative overflow-hidden rounded-2xl border border-border bg-surface p-8 md:p-10 min-h-[200px] flex flex-col justify-end transition-all hover:border-primary hover:shadow-lg"
            >
              <div
                className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors"
                aria-hidden="true"
              />
              <div
                className="absolute -bottom-16 -left-16 w-40 h-40 rounded-full bg-surface2"
                aria-hidden="true"
              />

              <div className="relative">
                <h3 className="text-2xl font-bold">{cat.name}</h3>
                {cat.description && (
                  <p className="mt-2 text-sm text-muted max-w-sm">
                    {cat.description}
                  </p>
                )}
                <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                  {cat._count.products} {cat._count.products === 1 ? "producto" : "productos"}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-1">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ================================================================
          CÓMO COMPRAR
          ================================================================ */}
      <section className="container-page py-12">
        <div className="rounded-3xl bg-surface border border-border p-8 md:p-12">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold">Comprar es muy fácil</h2>
            <p className="mt-2 text-muted">
              Solo 3 pasos y tu suéter está en camino.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <Step number="1" title="Elige tu suéter" text="Explora el catálogo y agrega tus favoritos al carrito." />
            <Step number="2" title="Completa el pedido" text="Ingresa tus datos de envío y elige cómo pagar." />
            <Step number="3" title="Recibe en casa" text="Enviamos a todo Ecuador por Servientrega. Pago por transferencia o DEUNA." />
          </div>
        </div>
      </section>

      {/* ================================================================
          CTA FINAL
          ================================================================ */}
      <section className="container-page py-12 md:py-20">
        <div className="rounded-3xl bg-gradient-to-br from-primary to-primary/80 text-white p-8 md:p-14 text-center">
          <h2 className="text-3xl md:text-4xl font-bold">
            ¿Listo para estrenar tu suéter?
          </h2>
          <p className="mt-3 text-white/90 max-w-xl mx-auto">
            Descubre la colección completa y aprovecha los precios especiales
            al llevar 2 o más unidades.
          </p>
          <Link
            href="/productos"
            className="mt-8 inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white text-primary font-bold hover:bg-white/90 transition-colors"
          >
            Ir al catálogo
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </section>

    </div>
  );
}


/* ============================================================================
   SUB-COMPONENTES
   ============================================================================ */

function ValueCard({
  icon,
  title,
  text,
}: {
  icon: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <div className="text-3xl" aria-hidden="true">{icon}</div>
      <h3 className="mt-3 text-lg font-bold">{title}</h3>
      <p className="mt-1.5 text-sm text-muted">{text}</p>
    </div>
  );
}

function Step({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary text-primaryFg text-xl font-bold">
        {number}
      </div>
      <h3 className="mt-4 text-lg font-bold">{title}</h3>
      <p className="mt-2 text-sm text-muted max-w-xs mx-auto">{text}</p>
    </div>
  );
}