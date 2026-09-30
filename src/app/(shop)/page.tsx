import Link from "next/link";

const BENEFITS = [
  { title: "Envíos a todo Ecuador", desc: "Recibe en la puerta de tu casa." },
  { title: "Pago seguro", desc: "Transferencia bancaria o tarjeta." },
  { title: "Soporte directo", desc: "Atención por WhatsApp y teléfono." },
];

const WHATSAPP_NUMBER = "593987384110";
const PHONE_NUMBER = "+593987384110";

export default function HomePage() {
  return (
    <div className="container-page py-10 md:py-16">
      {/* HERO */}
      <section className="grid gap-8 md:grid-cols-2 md:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            Bienvenido a CLICSHOP
          </p>
          <h1 className="mt-3 text-4xl font-bold leading-tight md:text-5xl">
            Compra fácil,<br />
            recibe rápido.
          </h1>
          <p className="mt-4 max-w-lg text-muted">
            Tu tienda online en Ecuador. Productos de calidad, envíos a todo el
            país y atención personalizada.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/productos"
              className="rounded-xl bg-primary px-5 py-3 font-medium text-primaryFg transition-opacity hover:opacity-90"
            >
              Ver productos
            </Link>
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
                "Hola CLICSHOP, quiero más información"
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-border px-5 py-3 font-medium hover:bg-surface2"
            >
              Escríbenos por WhatsApp
            </a>
          </div>
        </div>

        {/* Bloque visual (placeholder por ahora) */}
        <div className="rounded-2xl border border-border bg-surface p-8 shadow-token">
          <div className="aspect-square w-full rounded-xl bg-gradient-to-br from-primary/20 to-primary/5" />
        </div>
      </section>

      {/* BENEFICIOS */}
      <section className="mt-16 grid gap-4 sm:grid-cols-3">
        {BENEFITS.map((b) => (
          <div
            key={b.title}
            className="rounded-2xl border border-border bg-surface p-5"
          >
            <h3 className="font-semibold">{b.title}</h3>
            <p className="mt-1 text-sm text-muted">{b.desc}</p>
          </div>
        ))}
      </section>

      {/* CONTACTO */}
      <section className="mt-16 rounded-2xl border border-border bg-surface p-6 md:p-10">
        <h2 className="text-2xl font-bold">¿Necesitas ayuda?</h2>
        <p className="mt-2 text-muted">
          Estamos disponibles para ayudarte con tu compra, tu pago o tu envío.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href={`tel:${PHONE_NUMBER}`}
            className="rounded-xl bg-primary px-5 py-3 font-medium text-primaryFg hover:opacity-90"
          >
            📞 Llamar ahora
          </a>
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
              "Hola CLICSHOP, necesito ayuda"
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-border px-5 py-3 font-medium hover:bg-surface2"
          >
            💬 WhatsApp
          </a>
          <a
            href="mailto:cliclearteam@gmail.com"
            className="rounded-xl border border-border px-5 py-3 font-medium hover:bg-surface2"
          >
            ✉️ Correo
          </a>
        </div>
      </section>
    </div>
  );
}