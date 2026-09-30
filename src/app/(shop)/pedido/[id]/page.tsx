/* ============================================================================
   CLICSTORE — Página de confirmación del pedido
   ----------------------------------------------------------------------------
   Este es un SERVER COMPONENT que se abre después de crear un pedido.

   MUESTRA:
     1. Cabecera: número de pedido + fecha + estado.
     2. Resumen de los productos comprados.
     3. Totales (subtotal, IVA, envío, total).
     4. Datos bancarios + QR de la cuenta elegida por el cliente.
     5. Instrucciones para transferir.
     6. Espacio para subir el comprobante (sub-bloque 7b).
     7. Datos del cliente y dirección.

   SEGURIDAD — URL CON ID INTERNO
   ------------------------------
   La URL es /pedido/[id], donde "id" es el cuid interno (25 caracteres
   aleatorios). NO usamos el número autoincremental (#000125) en la URL
   porque cualquiera podría probar /pedido/1, /pedido/2, etc. y ver
   pedidos ajenos.

   El id interno es imposible de adivinar y solo lo conoce quien hizo el
   pedido (se lo enviamos al confirmar).

   MANEJO DEL 404
   --------------
   Si alguien entra con un id que no existe, mostramos una página 404
   personalizada (no la default de Next.js).

   QR Y CUENTAS BANCARIAS
   ----------------------
   La cuenta bancaria elegida por el cliente se lee de Setting.bank.
   El QR de esa cuenta es una imagen estática en /public/qr/.
   También generamos un QR dinámico con el monto y número de pedido para
   que el cliente pueda escanearlo desde la app del banco.
   ============================================================================ */

// Next.js: para llamar a notFound() cuando el pedido no existe.
import { notFound } from "next/navigation";

// Tipos de metadatos de Next.js.
import type { Metadata } from "next";

// Link de Next.js.
import Link from "next/link";

// Cliente Prisma compartido.
import { prisma } from "@/lib/db";

// Lectura de cuentas bancarias.
import { getBankAccountById } from "@/lib/settings";

// Formateo de dinero y número de pedido.
import { formatUSD, formatOrderNumber } from "@/lib/money";

// Conversión de IVA a porcentaje legible.
import { ivaRateToPercent } from "@/lib/tax";

// QR dinámico del pedido (con monto y número).
import { buildBankQrDataUrl } from "@/lib/qr";


/* ============================================================================
   TIPOS
   ============================================================================ */

/**
 * Next.js 16 pasa los params como una Promise.
 */
type PageProps = {
  params: Promise<{ id: string }>;
};


/* ============================================================================
   METADATOS
   ============================================================================ */

export const metadata: Metadata = {
  title: "Pedido confirmado",
  description: "Resumen de tu pedido y datos para la transferencia.",
  // No indexar en Google — son páginas privadas del cliente.
  robots: { index: false, follow: false },
};


/* ============================================================================
   COMPONENTE
   ============================================================================ */

export default async function PedidoPage({ params }: PageProps) {
  // --- Leer el id de la URL ---
  const { id } = await params;

  /* ------------------------------------------------------------------------
     PASO 1 — Cargar el pedido desde la DB
     ------------------------------------------------------------------------
     Incluimos todo lo necesario para renderizar en una sola consulta:
       - Los ítems con snapshot.
       - El pago (para saber qué cuenta bancaria eligió).
       - El comprobante (si ya subió alguno).
       - Los eventos de auditoría (para mostrar timeline después).
     ------------------------------------------------------------------------ */
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: true,
      payment: true,
      proof: true,
    },
  });

  // Si no existe → mostramos el 404 personalizado de Next.js.
  if (!order) {
    notFound();
  }

  /* ------------------------------------------------------------------------
     PASO 2 — Obtener la cuenta bancaria elegida
     ------------------------------------------------------------------------
     El pedido guarda "bankAccountId" en Payment. Buscamos esa cuenta en
     Setting.bank para mostrar los datos completos y el QR.
     ------------------------------------------------------------------------ */
  const bankAccount = order.payment?.bankAccountId
    ? await getBankAccountById(order.payment.bankAccountId)
    : null;

  /* ------------------------------------------------------------------------
     PASO 3 — Generar el QR dinámico del pedido
     ------------------------------------------------------------------------
     Si tenemos la cuenta bancaria, generamos un QR que contiene el número
     de pedido y el monto exacto. El cliente lo escanea desde la app del
     banco y se rellenan los campos automáticamente.
     ------------------------------------------------------------------------ */
  const dynamicQrDataUrl =
    bankAccount && order.payment
      ? await buildBankQrDataUrl({
          orderNumber: order.number,
          amountCents: order.totalCents,
          account: bankAccount,
        })
      : null;

  /* ------------------------------------------------------------------------
     PASO 4 — Estado del pago en texto legible
     ------------------------------------------------------------------------ */
  const paymentStatusLabel = getPaymentStatusLabel(order.paymentStatus);
  const paymentStatusColor = getPaymentStatusColor(order.paymentStatus);

  /* ------------------------------------------------------------------------
     PASO 5 — Render
     ------------------------------------------------------------------------ */
  return (
    <div className="container-page py-12 md:py-16 max-w-4xl">

      {/* ============================================================
          CABECERA
          ============================================================ */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/10 text-success mb-4">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold md:text-4xl">
          ¡Gracias por tu compra!
        </h1>
        <p className="mt-2 text-muted">
          Tu pedido{" "}
          <strong className="text-text">
            {formatOrderNumber(order.number)}
          </strong>{" "}
          fue recibido correctamente.
        </p>

        {/* Estado del pago */}
        <div className="mt-4 flex justify-center">
          <span
            className={[
              "inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium",
              paymentStatusColor,
            ].join(" ")}
          >
            {paymentStatusLabel}
          </span>
        </div>
      </div>

      {/* ============================================================
          INSTRUCCIONES DE PAGO (solo si el pago está pendiente)
          ============================================================ */}
      {bankAccount && order.payment?.status === "PENDIENTE" && (
        <section className="mt-10 rounded-2xl border border-primary/30 bg-primary/5 p-6 md:p-8">
          <h2 className="text-xl font-bold">Realiza tu transferencia</h2>
          <p className="mt-2 text-sm text-muted">
            Transfiere el monto exacto a la cuenta que elegiste. Después sube
            tu comprobante al final de esta página.
          </p>

          <div className="mt-6 grid gap-6 md:grid-cols-[1fr_280px]">
            {/* --- Datos bancarios --- */}
            <div>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-muted text-xs uppercase tracking-wider">
                    Banco
                  </dt>
                  <dd className="font-semibold text-base">
                    {bankAccount.bank}
                  </dd>
                </div>

                {bankAccount.accountType && (
                  <div>
                    <dt className="text-muted text-xs uppercase tracking-wider">
                      Tipo de cuenta
                    </dt>
                    <dd className="font-medium">{bankAccount.accountType}</dd>
                  </div>
                )}

                <div>
                  <dt className="text-muted text-xs uppercase tracking-wider">
                    Número de cuenta
                  </dt>
                  <dd className="font-mono font-bold text-lg">
                    {bankAccount.accountNumber}
                  </dd>
                </div>

                <div>
                  <dt className="text-muted text-xs uppercase tracking-wider">
                    Titular
                  </dt>
                  <dd className="font-medium">{bankAccount.holder}</dd>
                </div>

                <div>
                  <dt className="text-muted text-xs uppercase tracking-wider">
                    Cédula / RUC
                  </dt>
                  <dd className="font-medium">
                    {bankAccount.holderId} / {bankAccount.ruc}
                  </dd>
                </div>

                <div>
                  <dt className="text-muted text-xs uppercase tracking-wider">
                    Correo
                  </dt>
                  <dd className="font-medium break-all">
                    {bankAccount.holderEmail}
                  </dd>
                </div>

                <div className="pt-3 border-t border-primary/20">
                  <dt className="text-muted text-xs uppercase tracking-wider">
                    Monto a transferir
                  </dt>
                  <dd className="font-bold text-2xl text-primary">
                    {formatUSD(order.totalCents)}
                  </dd>
                </div>
              </dl>
            </div>

            {/* --- QR dinámico --- */}
            <div className="flex flex-col items-center">
              <p className="text-xs text-muted uppercase tracking-wider mb-2">
                Escanea y paga
              </p>
              {dynamicQrDataUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={dynamicQrDataUrl}
                  alt="QR para transferencia bancaria"
                  className="w-full max-w-[240px] rounded-xl border border-border bg-white p-2"
                />
              )}
              <p className="mt-2 text-xs text-muted text-center">
                Contiene los datos bancarios y el monto exacto
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ============================================================
          RESUMEN DEL PEDIDO
          ============================================================ */}
      <section className="mt-10 rounded-2xl border border-border bg-surface p-6 md:p-8">
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="text-xl font-bold">Resumen del pedido</h2>
          <span className="text-sm text-muted">
            {formatOrderNumber(order.number)}
          </span>
        </div>

        {/* --- Ítems --- */}
        <ul className="divide-y divide-border">
          {order.items.map((item) => (
            <li key={item.id} className="py-4 flex gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-semibold">{item.productName}</p>
                <p className="mt-0.5 text-xs text-muted">
                  SKU {item.sku}
                  {item.size && ` · Talla ${item.size}`}
                  {item.color && ` · ${item.color}`}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {item.quantity} × {formatUSD(item.unitPriceCents)}
                </p>
              </div>
              <p className="font-bold whitespace-nowrap">
                {formatUSD(item.totalCents)}
              </p>
            </li>
          ))}
        </ul>

        {/* --- Totales --- */}
        <dl className="mt-6 pt-6 border-t border-border space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Subtotal</dt>
            <dd className="font-medium">{formatUSD(order.subtotalCents)}</dd>
          </div>
          {order.discountCents > 0 && (
            <div className="flex justify-between">
              <dt className="text-muted">Descuento</dt>
              <dd className="font-medium text-success">
                -{formatUSD(order.discountCents)}
              </dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-muted">
              IVA {ivaRateToPercent(order.ivaRateBp)}%
            </dt>
            <dd className="font-medium">{formatUSD(order.ivaCents)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Envío</dt>
            <dd className="font-medium">
              {order.shippingCents === 0 ? (
                <span className="text-success">Gratis</span>
              ) : (
                formatUSD(order.shippingCents)
              )}
            </dd>
          </div>
        </dl>

        <div className="mt-4 pt-4 border-t border-border flex justify-between items-baseline">
          <span className="text-base font-semibold">Total</span>
          <span className="text-2xl font-bold">
            {formatUSD(order.totalCents)}
          </span>
        </div>
      </section>

      {/* ============================================================
          DATOS DEL CLIENTE Y DIRECCIÓN
          ============================================================ */}
      <section className="mt-6 grid gap-4 md:grid-cols-2">
        {/* Cliente */}
        <div className="rounded-2xl border border-border bg-surface p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted mb-3">
            Datos de contacto
          </h3>
          <p className="font-semibold">{order.customerName}</p>
          <p className="text-sm text-muted mt-1 break-all">
            {order.customerEmail}
          </p>
          <p className="text-sm text-muted">{order.customerPhone}</p>
        </div>

        {/* Dirección */}
        <div className="rounded-2xl border border-border bg-surface p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted mb-3">
            Dirección de entrega
          </h3>
          <p className="font-semibold">{order.addressLine}</p>
          <p className="text-sm text-muted mt-1">
            {order.city}, {order.province}
          </p>
          {order.reference && (
            <p className="text-sm text-muted mt-1 italic">
              Ref: {order.reference}
            </p>
          )}
        </div>
      </section>

      {/* ============================================================
          SUBIR COMPROBANTE
          ============================================================ */}
      <section className="mt-6 rounded-2xl border border-border bg-surface p-6 md:p-8">
        <h2 className="text-xl font-bold">Sube tu comprobante</h2>
        <p className="mt-2 text-sm text-muted">
          Después de hacer la transferencia, sube una foto o PDF del
          comprobante. Lo revisaremos y te confirmaremos el pago.
        </p>

        {order.proof ? (
          // --- Ya subió comprobante ---
          <div className="mt-5 rounded-xl border border-success/30 bg-success/10 p-4 text-sm text-success">
            ✓ Comprobante subido el{" "}
            {order.proof.uploadedAt.toLocaleString("es-EC", {
              dateStyle: "long",
              timeStyle: "short",
            })}
            . Lo estamos revisando.
          </div>
        ) : (
          // --- Aún no sube comprobante ---
          <div className="mt-5 rounded-xl border-2 border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted">
              Próximamente podrás subir tu comprobante desde aquí.
            </p>
          </div>
        )}
      </section>

      {/* ============================================================
          BOTONES DE CONTACTO
          ============================================================ */}
      <section className="mt-6 flex flex-wrap gap-3 justify-center">
        <a
          href="https://wa.me/593987384110"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 h-11 rounded-xl bg-primary text-primaryFg font-semibold hover:opacity-90 transition-opacity"
        >
          Consultar por WhatsApp
        </a>
        <Link
          href="/productos"
          className="inline-flex items-center gap-2 px-5 h-11 rounded-xl border border-border text-text font-semibold hover:bg-surface2 transition-colors"
        >
          Seguir comprando
        </Link>
      </section>
    </div>
  );
}


/* ============================================================================
   HELPERS: Texto y color del estado del pago
   ============================================================================ */

function getPaymentStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDIENTE: "Pago pendiente",
    COMPROBANTE_SUBIDO: "Comprobante subido",
    EN_VERIFICACION: "Pago en verificación",
    VERIFICADO: "Pago verificado",
    RECHAZADO: "Pago rechazado",
    REEMBOLSADO: "Pago reembolsado",
  };
  return labels[status] ?? status;
}

function getPaymentStatusColor(status: string): string {
  const colors: Record<string, string> = {
    PENDIENTE: "bg-warning/15 text-warning border border-warning/30",
    COMPROBANTE_SUBIDO: "bg-primary/15 text-primary border border-primary/30",
    EN_VERIFICACION: "bg-primary/15 text-primary border border-primary/30",
    VERIFICADO: "bg-success/15 text-success border border-success/30",
    RECHAZADO: "bg-danger/15 text-danger border border-danger/30",
    REEMBOLSADO: "bg-surface2 text-muted border border-border",
  };
  return colors[status] ?? "bg-surface2 text-muted border border-border";
}