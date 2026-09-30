/* ============================================================================
   CLICSTORE — Formulario de checkout (client component)
   ----------------------------------------------------------------------------
   Este es el formulario completo de checkout. Contiene 3 columnas:

     1. IZQUIERDA: Formulario de datos del cliente + dirección + pago.
     2. DERECHA:   Resumen del pedido (ítems + totales).

   FUNCIONALIDADES
   ---------------
   - Validación en vivo con Zod (muestra errores bajo cada campo).
   - Selector de provincia → ciudades dinámicas según la provincia elegida.
   - Selector de cuenta bancaria (radio buttons con las 3 cuentas).
   - Cálculo del resumen en tiempo real (usa las PriceRules).
   - Estados visuales: idle / enviando / éxito / error.
   - Al confirmar: envía a /api/orders, limpia el carrito, redirige.

   ¿POR QUÉ NO USAMOS FORMIK O REACT-HOOK-FORM?
   --------------------------------------------
   Porque para un formulario de este tamaño, el estado de React + Zod es
   suficiente y evita agregar otra dependencia. Si más adelante el formulario
   crece mucho, migramos a react-hook-form sin problema.

   REDIRECCIÓN DESPUÉS DEL ÉXITO
   -----------------------------
   La URL de la página del pedido usa el ID INTERNO (cuid), NO el número
   autoincremental. Motivo de seguridad:

     - Si la URL fuera /pedido/1, /pedido/2, etc., cualquiera podría probar
       números consecutivos y ver pedidos ajenos.
     - El id interno (cuid de 25 caracteres aleatorios) es imposible de
       adivinar, así que solo el cliente que acaba de comprar puede verlo.

   El número visible (#000001) se sigue mostrando EN la página del pedido,
   pero nunca en la URL.
   ============================================================================ */

"use client";

// Hooks de React.
import { useMemo, useState, useCallback } from "react";

// Router de Next.js para redirigir tras el éxito.
import { useRouter } from "next/navigation";

// Link para navegar.
import Link from "next/link";

// Zod para validación.
import {
  checkoutFormSchema,
  formatZodErrors,
  type CheckoutFormInput,
  type BankAccountId,
} from "@/lib/validation/checkout";

// Provincias y ciudades de Ecuador.
import { ECUADOR_PROVINCES, getCitiesByProvince } from "@/data/ecuador";

// Formateo de dinero.
import { formatUSD } from "@/lib/money";

// Cálculo de precios por cantidad.
import {
  buildRulesMap,
  resolveUnitPriceCents,
  type PriceRuleInput,
} from "@/lib/pricing";

// Cálculo de totales (IVA, subtotal, etc.).
import { computeTotals, ivaRateToPercent } from "@/lib/tax";

// Cálculo de envío.
import { calculateShippingCents } from "@/lib/orders/shipping";

// Store del carrito.
import { useCartStore } from "@/store/cart-store";

// Tipo de cuenta bancaria.
import type { BankAccount } from "@/lib/settings";


/* ============================================================================
   TIPOS
   ============================================================================ */

/**
 * Reglas de precio tal como vienen del servidor.
 */
type RawPriceRule = {
  categoryId: string;
  minQuantity: number;
  priceCents: number;
};

/**
 * Props del componente.
 */
type CheckoutFormProps = {
  bankAccounts: BankAccount[];
  priceRules: RawPriceRule[];
  ivaRateBp: number;
};

/**
 * Errores de campo del formulario.
 */
type FieldErrors = Partial<Record<string, string>>;


/* ============================================================================
   COMPONENTE
   ============================================================================ */

export function CheckoutForm({
  bankAccounts,
  priceRules,
  ivaRateBp,
}: CheckoutFormProps) {
  /* ========================================================================
     ESTADO DEL FORMULARIO
     ======================================================================== */
  const [values, setValues] = useState<CheckoutFormInput>({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    province: "",
    city: "",
    addressLine: "",
    reference: "",
    bankAccountId: "guayaquil",
  });

  const [errors, setErrors] = useState<FieldErrors>({});

  /** Estado del envío */
  const [status, setStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");

  /** Mensaje general de error (para errores de servidor) */
  const [serverError, setServerError] = useState<string | null>(null);

  /* ========================================================================
     ESTADO DEL CARRITO
     ======================================================================== */
  const items = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clearCart);

  /* ========================================================================
     ROUTER
     ======================================================================== */
  const router = useRouter();

  /* ========================================================================
     CÁLCULO DEL RESUMEN (memoizado)
     ======================================================================== */
  const summary = useMemo(() => {
    // 1. Agrupar cantidades por categoría.
    const categoryTotals = new Map<string, number>();
    for (const item of items) {
      const prev = categoryTotals.get(item.categoryId) ?? 0;
      categoryTotals.set(item.categoryId, prev + item.quantity);
    }

    // 2. Construir mapa de reglas por categoría.
    const rulesByCategory = buildRulesMap(priceRules);

    // 3. Resolver precio unitario por categoría.
    const unitPriceByCategory = new Map<string, number>();
    for (const [catId, total] of categoryTotals) {
      const rules = rulesByCategory.get(catId) ?? [];
      unitPriceByCategory.set(catId, resolveUnitPriceCents(total, rules));
    }

    // 4. Calcular subtotal + detalle por ítem.
    let subtotalCents = 0;
    const details = items.map((item) => {
      const unitPrice = unitPriceByCategory.get(item.categoryId) ?? 0;
      const lineTotal = unitPrice * item.quantity;
      subtotalCents += lineTotal;
      return { item, unitPriceCents: unitPrice, lineTotalCents: lineTotal };
    });

    // 5. Calcular envío.
    const shippingCents = calculateShippingCents(subtotalCents);

    // 6. Calcular totales (IVA incluido).
    const totals = computeTotals({
      subtotalCents,
      discountCents: 0,
      ivaRateBp,
      shippingCents,
    });

    return { details, totals };
  }, [items, priceRules, ivaRateBp]);

  /* ========================================================================
     MANEJADORES DE CAMBIOS
     ======================================================================== */

  /** Cambiar cualquier campo de texto */
  const handleChange = useCallback(
    (field: keyof CheckoutFormInput, value: string) => {
      setValues((v) => ({ ...v, [field]: value }));
      // Limpiamos el error de ese campo en cuanto el usuario lo edita.
      setErrors((e) => ({ ...e, [field]: undefined }));
    },
    []
  );

  /** Cambiar provincia (resetea la ciudad) */
  const handleProvinceChange = useCallback((province: string) => {
    setValues((v) => ({ ...v, province, city: "" }));
    setErrors((e) => ({ ...e, province: undefined, city: undefined }));
  }, []);

  /* ========================================================================
     CIUDADES DISPONIBLES según la provincia elegida
     ======================================================================== */
  const availableCities = useMemo(
    () => (values.province ? getCitiesByProvince(values.province) : []),
    [values.province]
  );

  /* ========================================================================
     ENVÍO DEL FORMULARIO
     ======================================================================== */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // --- Paso 1: validar en el cliente ---
    const validation = checkoutFormSchema.safeParse(values);

    if (!validation.success) {
      setErrors(formatZodErrors(validation.error) as FieldErrors);
      // Scroll al primer error
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    // --- Paso 2: validar que haya ítems en el carrito ---
    if (items.length === 0) {
      setServerError("Tu carrito está vacío. Agrega productos antes de continuar.");
      return;
    }

    // --- Paso 3: preparar payload ---
    setStatus("submitting");
    setServerError(null);

    const payload = {
      customer: validation.data,
      items: items.map((it) => ({
        productId: it.productId,
        variantId: it.variantId,
        quantity: it.quantity,
      })),
    };

    // --- Paso 4: enviar al servidor ---
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      // --- Paso 5: manejar respuesta ---
      if (!res.ok) {
        // Si hay errores de campo, los mostramos.
        if (data.fieldErrors) {
          setErrors(data.fieldErrors as FieldErrors);
        }
        // Mensaje general.
        setServerError(data.error ?? "Ocurrió un error al procesar el pedido.");
        setStatus("error");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      // --- Paso 6: éxito ---
      // 1. Vaciar el carrito (ya no lo necesita el cliente).
      clearCart();
      // 2. Marcar como exitoso (feedback breve).
      setStatus("success");
      // 3. Redirigir a la página del pedido.
      //
      // ⚠️ IMPORTANTE: usamos "data.order.id" (cuid interno de 25 caracteres),
      // NO "data.order.number" (autoincremental). Motivo de seguridad:
      // si usáramos el número, cualquiera podría probar /pedido/1, /pedido/2
      // y ver pedidos ajenos. El id interno es imposible de adivinar.
      router.push(`/pedido/${data.order.id}`);
    } catch (err) {
      console.error("Error al enviar el pedido:", err);
      setServerError(
        "No pudimos conectar con el servidor. Revisa tu conexión e intenta de nuevo."
      );
      setStatus("error");
    }
  }

  /* ========================================================================
     SI EL CARRITO ESTÁ VACÍO
     ======================================================================== */
  if (items.length === 0 && status !== "success") {
    return (
      <div className="rounded-2xl border border-border bg-surface p-10 md:p-16 text-center">
        <div className="text-5xl mb-4">🛒</div>
        <h2 className="text-xl font-semibold">Tu carrito está vacío</h2>
        <p className="mt-2 text-muted max-w-md mx-auto">
          Agrega productos al carrito antes de continuar al checkout.
        </p>
        <Link
          href="/productos"
          className="mt-6 inline-block rounded-xl bg-primary px-6 py-3 font-semibold text-primaryFg hover:opacity-90 transition-opacity"
        >
          Ver productos
        </Link>
      </div>
    );
  }

  /* ========================================================================
     RENDER
     ======================================================================== */
  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-8 lg:grid-cols-[1fr_360px]"
      noValidate
    >
      {/* ============================================================
          COLUMNA IZQUIERDA — FORMULARIO
          ============================================================ */}
      <div className="space-y-8">

        {/* --- Errores generales --- */}
        {serverError && (
          <div className="rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
            {serverError}
          </div>
        )}

        {/* ============================================================
            SECCIÓN 1: Datos del cliente
            ============================================================ */}
        <section className="rounded-2xl border border-border bg-surface p-6">
          <h2 className="text-lg font-semibold mb-5">Tus datos</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Nombre */}
            <Field
              id="customerName"
              label="Nombre completo"
              value={values.customerName}
              onChange={(v) => handleChange("customerName", v)}
              error={errors.customerName}
              required
              autoComplete="name"
              span="sm:col-span-2"
            />

            {/* Email */}
            <Field
              id="customerEmail"
              label="Correo electrónico"
              type="email"
              value={values.customerEmail}
              onChange={(v) => handleChange("customerEmail", v)}
              error={errors.customerEmail}
              required
              autoComplete="email"
              placeholder="tucorreo@ejemplo.com"
            />

            {/* Teléfono */}
            <Field
              id="customerPhone"
              label="Teléfono / WhatsApp"
              type="tel"
              value={values.customerPhone}
              onChange={(v) => handleChange("customerPhone", v)}
              error={errors.customerPhone}
              required
              autoComplete="tel"
              placeholder="+593 98 738 4110"
            />
          </div>
        </section>

        {/* ============================================================
            SECCIÓN 2: Dirección de entrega
            ============================================================ */}
        <section className="rounded-2xl border border-border bg-surface p-6">
          <h2 className="text-lg font-semibold mb-5">Dirección de entrega</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Provincia */}
            <SelectField
              id="province"
              label="Provincia"
              value={values.province}
              onChange={handleProvinceChange}
              error={errors.province}
              required
              options={[
                { value: "", label: "Elige una provincia" },
                ...ECUADOR_PROVINCES.map((p) => ({
                  value: p.name,
                  label: p.name,
                })),
              ]}
            />

            {/* Ciudad */}
            <SelectField
              id="city"
              label="Ciudad"
              value={values.city}
              onChange={(v) => handleChange("city", v)}
              error={errors.city}
              required
              disabled={!values.province}
              options={[
                {
                  value: "",
                  label: values.province
                    ? "Elige una ciudad"
                    : "Elige primero la provincia",
                },
                ...availableCities.map((c) => ({ value: c, label: c })),
              ]}
            />

            {/* Dirección */}
            <Field
              id="addressLine"
              label="Dirección"
              value={values.addressLine}
              onChange={(v) => handleChange("addressLine", v)}
              error={errors.addressLine}
              required
              autoComplete="street-address"
              placeholder="Calle principal, número y calle secundaria"
              span="sm:col-span-2"
            />

            {/* Referencia */}
            <Field
              id="reference"
              label="Referencia (opcional)"
              value={values.reference ?? ""}
              onChange={(v) => handleChange("reference", v)}
              error={errors.reference}
              placeholder="Ej: casa con portón verde, frente al parque"
              span="sm:col-span-2"
            />
          </div>
        </section>

        {/* ============================================================
            SECCIÓN 3: Método de pago
            ============================================================ */}
        <section className="rounded-2xl border border-border bg-surface p-6">
          <h2 className="text-lg font-semibold mb-2">Método de pago</h2>
          <p className="text-sm text-muted mb-5">
            Elige a qué cuenta harás la transferencia. Después de confirmar
            verás el QR y podrás subir tu comprobante.
          </p>

          <div className="space-y-3">
            {bankAccounts.map((account) => {
              const isSelected = values.bankAccountId === account.id;
              return (
                <label
                  key={account.id}
                  className={[
                    "block p-4 rounded-xl border cursor-pointer transition-all",
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50",
                  ].join(" ")}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="bankAccount"
                      value={account.id}
                      checked={isSelected}
                      onChange={() =>
                        setValues((v) => ({
                          ...v,
                          bankAccountId: account.id as BankAccountId,
                        }))
                      }
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-text">
                        {account.type === "wallet"
                          ? `${account.bank} (Billetera digital)`
                          : `${account.bank} — ${account.accountType}`}
                      </p>
                      <p className="text-sm text-muted mt-0.5">
                        Cuenta: <strong>{account.accountNumber}</strong>
                      </p>
                      <p className="text-xs text-muted mt-0.5">
                        Titular: {account.holder}
                      </p>
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
          {errors.bankAccountId && (
            <p className="mt-3 text-sm text-danger">{errors.bankAccountId}</p>
          )}
        </section>
      </div>

      {/* ============================================================
          COLUMNA DERECHA — RESUMEN DEL PEDIDO
          ============================================================ */}
      <aside className="lg:sticky lg:top-24 h-fit">
        <div className="rounded-2xl border border-border bg-surface p-6">
          <h2 className="text-lg font-semibold">Resumen del pedido</h2>

          {/* --- Ítems --- */}
          <div className="mt-4 max-h-64 overflow-y-auto pr-1 -mr-1">
            <ul className="space-y-3">
              {summary.details.map(({ item, lineTotalCents }) => (
                <li
                  key={`${item.productId}-${item.variantId}`}
                  className="flex gap-3 text-sm"
                >
                  {/* Imagen pequeña */}
                  <div className="shrink-0 w-12 h-12 rounded-lg bg-surface2 overflow-hidden">
                    {item.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.name}</p>
                    <p className="text-xs text-muted">
                      {item.quantity}× · Talla {item.size}
                    </p>
                  </div>
                  {/* Subtotal línea */}
                  <p className="font-semibold whitespace-nowrap">
                    {formatUSD(lineTotalCents)}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          {/* --- Totales --- */}
          <dl className="mt-6 pt-4 border-t border-border space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Subtotal</dt>
              <dd className="font-medium">
                {formatUSD(summary.totals.subtotalCents)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">
                IVA {ivaRateToPercent(summary.totals.ivaRateBp)}%
              </dt>
              <dd className="font-medium">
                {formatUSD(summary.totals.ivaCents)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Envío</dt>
              <dd className="font-medium">
                {summary.totals.shippingCents === 0 ? (
                  <span className="text-success">Gratis</span>
                ) : (
                  formatUSD(summary.totals.shippingCents)
                )}
              </dd>
            </div>
          </dl>

          <div className="mt-4 pt-4 border-t border-border flex justify-between items-baseline">
            <span className="text-base font-semibold">Total</span>
            <span className="text-2xl font-bold">
              {formatUSD(summary.totals.totalCents)}
            </span>
          </div>

          {/* --- Botón confirmar --- */}
          <button
            type="submit"
            disabled={status === "submitting" || status === "success"}
            className={[
              "mt-6 w-full h-12 rounded-xl font-semibold transition-all",
              status === "submitting"
                ? "bg-primary/60 text-primaryFg cursor-wait"
                : status === "success"
                ? "bg-success text-white cursor-default"
                : "bg-primary text-primaryFg hover:opacity-90 active:scale-[0.99]",
            ].join(" ")}
          >
            {status === "submitting"
              ? "Procesando..."
              : status === "success"
              ? "✓ Pedido creado"
              : "Confirmar pedido"}
          </button>

          {/* --- Nota --- */}
          <p className="mt-4 text-xs text-muted text-center leading-relaxed">
            Al confirmar, crearemos tu pedido y te mostraremos los datos
            para la transferencia.
          </p>
        </div>
      </aside>
    </form>
  );
}


/* ============================================================================
   SUB-COMPONENTE: Field (input de texto)
   ============================================================================ */

function Field({
  id,
  label,
  value,
  onChange,
  error,
  type = "text",
  required,
  placeholder,
  autoComplete,
  span,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  autoComplete?: string;
  span?: string;
}) {
  return (
    <div className={span}>
      <label htmlFor={id} className="block text-sm font-medium mb-1.5">
        {label}
        {required && <span className="text-danger ml-0.5">*</span>}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        className={[
          "w-full h-11 px-3 rounded-lg border bg-bg text-text text-sm transition-colors",
          error
            ? "border-danger focus:border-danger"
            : "border-border focus:border-primary",
          "focus:outline-none focus:ring-2 focus:ring-primary/20",
        ].join(" ")}
      />
      {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
    </div>
  );
}


/* ============================================================================
   SUB-COMPONENTE: SelectField (dropdown)
   ============================================================================ */

function SelectField({
  id,
  label,
  value,
  onChange,
  error,
  options,
  required,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  options: { value: string; label: string }[];
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium mb-1.5">
        {label}
        {required && <span className="text-danger ml-0.5">*</span>}
      </label>
      <select
        id={id}
        name={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required={required}
        className={[
          "w-full h-11 px-3 rounded-lg border bg-bg text-text text-sm transition-colors",
          error
            ? "border-danger focus:border-danger"
            : "border-border focus:border-primary",
          "focus:outline-none focus:ring-2 focus:ring-primary/20",
          disabled ? "opacity-50 cursor-not-allowed" : "",
        ].join(" ")}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
    </div>
  );
}