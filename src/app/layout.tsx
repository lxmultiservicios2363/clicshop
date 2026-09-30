/* ============================================================================
   CLICSTORE — Layout raíz de la aplicación
   ----------------------------------------------------------------------------
   Este archivo define la estructura común a TODAS las páginas:

     <html>
       <body>
         <ThemeProvider>      ← Provee tema claro/oscuro/sistema
           <Header />          ← Barra superior
           <main>{children}</main>  ← Contenido de cada página
           <Footer />          ← Pie de página
         </ThemeProvider>
       </body>
     </html>

   TIPOGRAFÍAS
   -----------
   Se cargan dos fuentes desde Google Fonts:

     1. POPPINS (variable --font-display)
        Se usa para TÍTULOS y encabezados. Es geométrica, moderna y
        amigable — transmite calidez, ideal para una tienda artesanal.

     2. INTER (variable --font-sans)
        Se usa para el CUERPO del texto. Excelente legibilidad en
        cualquier tamaño y dispositivo.

   next/font/google descarga las fuentes en BUILD TIME y las sirve como
   archivos estáticos. Ventajas:
     - Cero requests a Google en runtime (más rápido, más privado)
     - Sin "flash" de fuente por defecto (FOUT)
     - Automáticamente optimizadas para cada navegador
   ============================================================================ */

// Tipo de metadatos de Next.js para SEO y Open Graph.
import type { Metadata } from "next";

// Cargadores de fuentes de Google (Poppins e Inter).
import { Inter, Poppins } from "next/font/google";

// Estilos globales (Tailwind 4 + tokens).
import "./globals.css";

// Proveedor de tema claro/oscuro/sistema.
import { ThemeProvider } from "@/components/theme/theme-provider";

// Barra superior con navegación y redes sociales.
import { Header } from "@/components/layout/Header";

// Pie de página con contacto y enlaces.
import { Footer } from "@/components/layout/Footer";


/* ============================================================================
   CARGA DE FUENTES
   ============================================================================ */

/**
 * POPPINS — fuente para títulos.
 * Genera la variable CSS "--font-display" que luego usamos en tokens.css.
 */
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"], // pesos disponibles
  variable: "--font-display",
  display: "swap", // muestra texto con la fuente fallback hasta que cargue
});

/**
 * INTER — fuente para el cuerpo del texto.
 * Genera la variable CSS "--font-sans" que se aplica al body.
 */
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});


/* ============================================================================
   METADATOS (SEO y redes sociales)
   ============================================================================ */

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://www.clicstore.com"
  ),
  title: {
    default: "ClicStore — Compra online en Ecuador",
    template: "%s | ClicStore",
  },
  description:
    "ClicStore: tienda online en Ecuador. Suéteres tejidos a mano, envíos a todo el país, pago con transferencia bancaria o DEUNA.",
  openGraph: {
    type: "website",
    locale: "es_EC",
    url: "/",
    siteName: "ClicStore",
  },
  robots: { index: true, follow: true },
};


/* ============================================================================
   COMPONENTE ROOT LAYOUT
   ============================================================================ */

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // lang="es-EC": le dice al navegador que el contenido está en español
    //              de Ecuador (útil para SEO y accesibilidad).
    //
    // className: aplica AMBAS variables de fuente al <html>, para que
    //            cualquier elemento pueda usar var(--font-sans) o
    //            var(--font-display).
    //
    // suppressHydrationWarning: evita warnings porque el ThemeProvider
    //                           puede cambiar clases al montar.
    <html
      lang="es-EC"
      className={`${inter.variable} ${poppins.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-bg text-text antialiased flex flex-col">
        <ThemeProvider>
          <Header />
          {/* flex-1 hace que el main ocupe el espacio restante, empujando
              el footer al fondo en páginas con poco contenido. */}
          <main className="flex-1">{children}</main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}