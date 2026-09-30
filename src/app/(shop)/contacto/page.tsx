import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contacto",
  description:
    "Contáctanos por WhatsApp, teléfono o correo. CLICSHOP te atiende en todo Ecuador.",
};

const WHATSAPP_NUMBER = "593987384110";
const PHONE_NUMBER = "+593987384110";
const EMAIL = "cliclearteam@gmail.com";

export default function ContactoPage() {
  return (
    <div className="container-page py-12 md:py-16">
      <header className="max-w-2xl">
        <h1 className="text-3xl font-bold md:text-4xl">Contáctanos</h1>
        <p className="mt-3 text-muted">
          Estamos aquí para ayudarte. Elige el canal que prefieras:
        </p>
      </header>

      {/* Canales de contacto */}
      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <a
          href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
            "Hola CLICSHOP, necesito ayuda"
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-2xl border border-border bg-surface p-6 transition-colors hover:bg-surface2"
        >
          <p className="text-2xl">💬</p>
          <h2 className="mt-3 font-semibold">WhatsApp</h2>
          <p className="mt-1 text-sm text-muted">
            Respuesta inmediata en horario de atención.
          </p>
          <p className="mt-3 text-sm font-medium text-primary">
            Escribir ahora →
          </p>
        </a>

        <a
          href={`tel:${PHONE_NUMBER}`}
          className="rounded-2xl border border-border bg-surface p-6 transition-colors hover:bg-surface2"
        >
          <p className="text-2xl">📞</p>
          <h2 className="mt-3 font-semibold">Llamar</h2>
          <p className="mt-1 text-sm text-muted">
            Habla directamente con nuestro equipo.
          </p>
          <p className="mt-3 text-sm font-medium text-primary">
            {PHONE_NUMBER}
          </p>
        </a>

        <a
          href={`mailto:${EMAIL}`}
          className="rounded-2xl border border-border bg-surface p-6 transition-colors hover:bg-surface2"
        >
          <p className="text-2xl">✉️</p>
          <h2 className="mt-3 font-semibold">Correo</h2>
          <p className="mt-1 text-sm text-muted">
            Escríbenos cuando quieras, respondemos en menos de 24h.
          </p>
          <p className="mt-3 text-sm font-medium text-primary break-all">
            {EMAIL}
          </p>
        </a>
      </section>

      {/* Formulario + horario */}
      <section className="mt-12 grid gap-8 md:grid-cols-2">
        <div>
          <h2 className="text-2xl font-bold">Envíanos un mensaje</h2>
          <p className="mt-2 text-sm text-muted">
            Llena el formulario y te responderemos lo antes posible.
          </p>

          {/* Por ahora el formulario es visual.
              En el siguiente paso lo conectamos a un API route + SMTP. */}
          <form className="mt-6 space-y-4" aria-disabled>
            <div>
              <label className="block text-sm font-medium" htmlFor="nombre">
                Nombre
              </label>
              <input
                id="nombre"
                type="text"
                placeholder="Tu nombre"
                className="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2 outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium" htmlFor="email">
                Correo
              </label>
              <input
                id="email"
                type="email"
                placeholder="tucorreo@ejemplo.com"
                className="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2 outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium" htmlFor="mensaje">
                Mensaje
              </label>
              <textarea
                id="mensaje"
                rows={5}
                placeholder="Cuéntanos en qué podemos ayudarte"
                className="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2 outline-none focus:border-primary"
              />
            </div>
            <button
              type="button"
              disabled
              className="rounded-xl bg-primary px-5 py-3 font-medium text-primaryFg opacity-60"
              title="Próximamente conectado al correo"
            >
              Enviar mensaje (próximamente)
            </button>
          </form>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6">
          <h2 className="text-lg font-semibold">Horario de atención</h2>
          <ul className="mt-4 space-y-2 text-sm">
            <li className="flex justify-between">
              <span className="text-muted">Lunes a Viernes</span>
              <span className="font-medium">9:00 — 19:00</span>
            </li>
            <li className="flex justify-between">
              <span className="text-muted">Sábado</span>
              <span className="font-medium">10:00 — 16:00</span>
            </li>
            <li className="flex justify-between">
              <span className="text-muted">Domingo</span>
              <span className="font-medium">Cerrado</span>
            </li>
          </ul>

          <hr className="my-6 border-border" />

          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted">
            Datos oficiales
          </h3>
          <ul className="mt-3 space-y-1 text-sm">
            <li>
              <span className="text-muted">Razón social: </span>
              CLICSHOP
            </li>
            <li>
              <span className="text-muted">País: </span>Ecuador
            </li>
            <li>
              <span className="text-muted">Sitio: </span>www.clicshop.com
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}