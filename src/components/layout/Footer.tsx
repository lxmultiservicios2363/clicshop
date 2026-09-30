/* ============================================================================
   CLICSTORE — Footer principal
   ----------------------------------------------------------------------------
   Este componente es el pie de página de la web. Contiene 4 columnas:

     1. Marca + descripción + contacto directo (teléfono, WhatsApp, email)
     2. Navegación principal (Inicio, Productos, Categorías, Contacto)
     3. Información de ayuda (envíos, pagos, horario)
     4. Redes sociales y ubicación

   Y una barra inferior con el copyright.

   Todas las redes sociales y datos de contacto se toman de:
     - BUSINESS (src/config/business.ts) → datos oficiales del negocio
     - Los enlaces específicos de redes (Facebook, Instagram, TikTok, etc.)

   COMPORTAMIENTO
   --------------
   - Responsive: 1 columna en móvil, 4 columnas en desktop
   - Los enlaces se abren en pestaña nueva (target="_blank")
   - Los iconos heredan el color del texto (currentColor) y cambian en dark mode
   ============================================================================ */

// Link de Next.js para navegación sin recarga.
import Link from "next/link";

// Configuración central del negocio (nombre, email, teléfono, etc.).
import { BUSINESS } from "@/config/business";


/* ============================================================================
   CONSTANTES
   ============================================================================ */

/**
 * Enlaces de la navegación principal.
 * Se usan en la columna "Navegación".
 */
const NAV_LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/productos", label: "Productos" },
  { href: "/categorias", label: "Categorías" },
  { href: "/contacto", label: "Contacto" },
];

/**
 * Enlaces de redes sociales y ubicación con sus iconos.
 * Se muestran en la columna de contacto.
 */
type SocialLink = {
  href: string;
  label: string;
  icon: "facebook" | "instagram" | "whatsapp" | "tiktok" | "location";
};

const SOCIAL_LINKS: SocialLink[] = [
  {
    href: "https://www.facebook.com/lxmultiserv/",
    label: "Facebook",
    icon: "facebook",
  },
  {
    href: "https://instagram.com/lxmultiservicios",
    label: "Instagram",
    icon: "instagram",
  },
  {
    // wa.me usa solo dígitos, sin "+" ni espacios.
    href: `https://wa.me/${BUSINESS.phoneDigits}`,
    label: "WhatsApp",
    icon: "whatsapp",
  },
  {
    href: "https://www.tiktok.com/@lxmultiservicios",
    label: "TikTok",
    icon: "tiktok",
  },
  {
    href: "https://share.google/Ag7bGVQF3Igf9Xfsr",
    label: "Ubicación",
    icon: "location",
  },
];

/**
 * Información de ayuda mostrada en la columna "Ayuda".
 */
const HELP_ITEMS = [
  "Envíos a todo Ecuador",
  "Pago con transferencia bancaria o DEUNA",
  "Soporte por WhatsApp",
  "Lun a Sáb, 9:00 a 19:00",
];


/* ============================================================================
   ICONOS SVG
   ----------------------------------------------------------------------------
   Cada icono es un componente que devuelve un SVG. Usa "currentColor" para
   heredar el color del texto. Tamaño por defecto 18x18 px.
   ============================================================================ */

function FacebookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
    </svg>
  );
}

/**
 * Mapa que relaciona el identificador de cada red con su componente de icono.
 */
const ICON_MAP: Record<SocialLink["icon"], () => React.ReactElement> = {
  facebook: FacebookIcon,
  instagram: InstagramIcon,
  whatsapp: WhatsAppIcon,
  tiktok: TikTokIcon,
  location: LocationIcon,
};


/* ============================================================================
   COMPONENTE PRINCIPAL
   ============================================================================ */

export function Footer() {
  // Año actual para el copyright (se calcula en cada render, no hardcodeado).
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-border bg-surface">
      {/* ============================================================
          BLOQUE PRINCIPAL — 4 columnas en desktop, 1 en móvil
          ============================================================ */}
      <div className="container-page grid gap-10 py-12 md:grid-cols-2 lg:grid-cols-4">

        {/* ============================================================
            COLUMNA 1: Marca + descripción + contacto directo
            ============================================================ */}
        <div className="lg:col-span-1">
          <h3 className="text-xl font-bold tracking-tight">{BUSINESS.name}</h3>
          <p className="mt-2 text-sm text-muted">
            Suéteres tejidos y más, directo a tu puerta en todo Ecuador.
          </p>

          {/* --- Contacto directo --- */}
          <ul className="mt-5 space-y-2.5 text-sm">
            <li>
              <a
                href={`tel:+${BUSINESS.phoneDigits}`}
                className="text-muted hover:text-primary transition-colors inline-flex items-center gap-2"
              >
                <span className="text-base">📞</span>
                <span>{BUSINESS.phone}</span>
              </a>
            </li>
            <li>
              <a
                href={`https://wa.me/${BUSINESS.phoneDigits}?text=${encodeURIComponent(
                  `Hola ${BUSINESS.name}, quiero información`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted hover:text-primary transition-colors inline-flex items-center gap-2"
              >
                <span className="text-base">💬</span>
                <span>WhatsApp</span>
              </a>
            </li>
            <li>
              <a
                href={`mailto:${BUSINESS.email}`}
                className="text-muted hover:text-primary transition-colors inline-flex items-center gap-2 break-all"
              >
                <span className="text-base">✉️</span>
                <span>{BUSINESS.email}</span>
              </a>
            </li>
          </ul>
        </div>

        {/* ============================================================
            COLUMNA 2: Navegación
            ============================================================ */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">
            Navegación
          </h4>
          <ul className="mt-4 space-y-2.5 text-sm">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-muted hover:text-primary transition-colors"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* ============================================================
            COLUMNA 3: Ayuda
            ============================================================ */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">
            Ayuda
          </h4>
          <ul className="mt-4 space-y-2.5 text-sm text-muted">
            {HELP_ITEMS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        {/* ============================================================
            COLUMNA 4: Redes sociales + ubicación
            ============================================================ */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">
            Síguenos
          </h4>
          <div className="mt-4 flex flex-wrap gap-2">
            {SOCIAL_LINKS.map((social) => {
              const Icon = ICON_MAP[social.icon];
              return (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  title={social.label}
                  className="p-2.5 rounded-lg border border-border text-muted hover:text-primary hover:border-primary hover:bg-surface2 transition-colors"
                >
                  <Icon />
                </a>
              );
            })}
          </div>

          {/* --- Ubicación física en texto --- */}
          <div className="mt-5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">
              Ubicación
            </h4>
            <p className="mt-2 text-sm text-muted leading-relaxed">
              {BUSINESS.address}<br />
              {BUSINESS.city}, {BUSINESS.province}<br />
              Ecuador · CP {BUSINESS.postalCode}
            </p>
          </div>
        </div>
      </div>

      {/* ============================================================
          BARRA INFERIOR: Copyright
          ============================================================ */}
      <div className="border-t border-border py-5">
        <p className="container-page text-center text-xs text-muted">
          © {year} {BUSINESS.name} · {BUSINESS.domain} · Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}