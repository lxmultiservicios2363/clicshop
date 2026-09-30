/* ============================================================================
   CLICSTORE — Servicio de creación de pedidos
   ----------------------------------------------------------------------------
   Este archivo contiene la función `createOrder()`: el corazón del checkout.

   RESPONSABILIDADES
   -----------------
   Dada una petición del cliente (datos personales + items del carrito), esta
   función:

     1. VALIDA que todos los productos y variantes existan y estén activos.
     2. VALIDA que haya stock suficiente de cada variante.
     3. CALCULA los precios reales desde la base de datos (nunca confía en el
        precio que pueda enviar el cliente).
     4. APLICA los descuentos por cantidad (PriceRules) por categoría.
     5. APLICA el IVA (desde Setting.tax.ivaRateBp).
     6. APLICA la política de envío (shipping.ts).
     7. CREA el pedido (Order), los ítems (OrderItem) con snapshot, el pago
        (Payment) y el primer evento de auditoría (OrderEvent).
     8. DESCUENTA el stock de cada variante comprada.
     9. TODO dentro de una TRANSACCIÓN: si algo falla, no se guarda nada.

   ¿POR QUÉ TRANSACCIÓN?
   ---------------------
   Imagina que creamos el pedido, descontamos el stock de 3 productos, y en
   el 4to nos damos cuenta de que no había stock. Sin transacción, quedaría
   un pedido a medias y el stock de 3 productos ya descontado. Con transacción,
   se revierte TODO automáticamente.

   SEGURIDAD
   ---------
   El cliente solo envía: { productId, variantId, quantity } por cada ítem.
   NUNCA envía precios, nombres, ni SKUs. Todo eso lo obtenemos desde la
   base de datos. Esto evita que alguien manipule la petición para pagar menos.

   USO EN EL RESTO DEL CÓDIGO
   --------------------------
     import { createOrder } from "@/lib/orders/create";

     const order = await createOrder({
       customer: { ... },
       items: [{ productId, variantId, quantity }, ...],
     });
   ============================================================================ */

// Cliente Prisma compartido.
import { prisma } from "@/lib/db";

// Cálculo de precios con descuentos por cantidad.
import { resolveUnitPriceCents, type PriceRuleInput } from "@/lib/pricing";

// Cálculo de IVA y totales.
import { computeTotals } from "@/lib/tax";

// Cálculo de envío.
import { calculateShippingCents } from "./shipping";

// Tipos y schema de validación.
import type { CreateOrderInput } from "@/lib/validation/checkout";


/* ============================================================================
   TIPOS
   ============================================================================ */

/**
 * Resultado de la creación de un pedido.
 * Solo devolvemos los datos esenciales para el cliente y la redirección.
 */
export type CreatedOrderResult = {
  /** ID interno del pedido (cuid) */
  id: string;

  /** Número visible del pedido (autoincremental) */
  number: number;

  /** Total final pagado en centavos */
  totalCents: number;

  /** Estado del pedido (siempre RECIBIDO al crear) */
  orderStatus: string;

  /** Estado del pago (siempre PENDIENTE al crear) */
  paymentStatus: string;

  /** Fecha de creación */
  createdAt: Date;
};

/**
 * Error personalizado para la creación de pedidos.
 * Permite distinguir entre errores "esperados" (stock, producto inactivo)
 * y errores inesperados (bugs, caídas de red).
 */
export class OrderCreationError extends Error {
  constructor(
    message: string,
    public code:
      | "PRODUCT_NOT_FOUND"
      | "PRODUCT_INACTIVE"
      | "VARIANT_NOT_FOUND"
      | "INSUFFICIENT_STOCK"
      | "INVALID_QUANTITY"
      | "UNKNOWN"
  ) {
    super(message);
    this.name = "OrderCreationError";
  }
}


/* ============================================================================
   FUNCIÓN PRINCIPAL
   ============================================================================ */

/**
 * Crea un pedido nuevo en la base de datos.
 *
 * El flujo es 100% transaccional: si cualquier paso falla, no se persiste nada.
 *
 * @param input - Datos validados (customer + items)
 * @returns Los datos esenciales del pedido creado
 * @throws OrderCreationError si algo falla de forma esperada
 */
export async function createOrder(
  input: CreateOrderInput
): Promise<CreatedOrderResult> {
  const { customer, items } = input;

  /* ------------------------------------------------------------------------
     PASO 1 — Validación básica de entrada
     ------------------------------------------------------------------------ */
  if (items.length === 0) {
    throw new OrderCreationError(
      "El carrito no puede estar vacío",
      "INVALID_QUANTITY"
    );
  }

  /* ------------------------------------------------------------------------
     PASO 2 — Transacción
     ------------------------------------------------------------------------
     Todo lo que sigue ocurre dentro de una transacción. Si algo falla,
     Prisma revierte TODOS los cambios automáticamente.
     ------------------------------------------------------------------------ */
  return await prisma.$transaction(async (tx) => {
    /* ======================================================================
       PASO 2.1 — Cargar variantes (con producto y categoría)
       ======================================================================
       Traemos en UNA sola consulta todas las variantes del carrito, con su
       producto, categoría y stock actual. Es más eficiente que hacer N
       consultas (una por ítem).
       ====================================================================== */
    const variantIds = items.map((it) => it.variantId);

    const variants = await tx.variant.findMany({
      where: { id: { in: variantIds } },
      include: {
        product: {
          include: {
            category: true,
          },
        },
      },
    });

    // Mapeamos por id para búsquedas rápidas O(1).
    const variantById = new Map(variants.map((v) => [v.id, v]));

    /* ======================================================================
       PASO 2.2 — Validar que cada variante exista, esté activa y tenga stock
       ====================================================================== */
    for (const item of items) {
      const variant = variantById.get(item.variantId);

      if (!variant) {
        throw new OrderCreationError(
          `Variante no encontrada: ${item.variantId}`,
          "VARIANT_NOT_FOUND"
        );
      }

      if (!variant.product.active) {
        throw new OrderCreationError(
          `Producto inactivo: ${variant.product.name}`,
          "PRODUCT_INACTIVE"
        );
      }

      if (variant.stock < item.quantity) {
        throw new OrderCreationError(
          `Stock insuficiente para ${variant.product.name} (talla ${variant.size}): ` +
            `disponible ${variant.stock}, solicitado ${item.quantity}`,
          "INSUFFICIENT_STOCK"
        );
      }
    }

    /* ======================================================================
       PASO 2.3 — Cargar las reglas de precio de las categorías involucradas
       ====================================================================== */
    const categoryIds = [
      ...new Set(variants.map((v) => v.product.categoryId)),
    ];

    const priceRules = await tx.priceRule.findMany({
      where: { categoryId: { in: categoryIds } },
    });

    // Agrupamos las reglas por categoría: Map<categoryId, PriceRuleInput[]>
    const rulesByCategory = new Map<string, PriceRuleInput[]>();
    for (const rule of priceRules) {
      const list = rulesByCategory.get(rule.categoryId) ?? [];
      list.push({
        minQuantity: rule.minQuantity,
        priceCents: rule.priceCents,
      });
      rulesByCategory.set(rule.categoryId, list);
    }

    /* ======================================================================
       PASO 2.4 — Calcular cantidades totales por categoría
       ======================================================================
       El descuento se aplica POR CATEGORÍA (todos los cuello V suman juntos,
       todos los cuello redondo suman juntos).
       ====================================================================== */
    const quantityByCategory = new Map<string, number>();
    for (const item of items) {
      const variant = variantById.get(item.variantId)!;
      const catId = variant.product.categoryId;
      const prev = quantityByCategory.get(catId) ?? 0;
      quantityByCategory.set(catId, prev + item.quantity);
    }

    /* ======================================================================
       PASO 2.5 — Resolver precio unitario por categoría
       ====================================================================== */
    const unitPriceByCategory = new Map<string, number>();
    for (const [catId, totalQty] of quantityByCategory) {
      const rules = rulesByCategory.get(catId) ?? [];
      const unitPrice = resolveUnitPriceCents(totalQty, rules);
      unitPriceByCategory.set(catId, unitPrice);
    }

    /* ======================================================================
       PASO 2.6 — Construir los ítems del pedido con snapshots
       ======================================================================
       Cada OrderItem guarda TODO lo necesario para reconstruirlo después,
       aunque el producto cambie o se desactive.
       ====================================================================== */
    type OrderItemData = {
      productId: string;
      variantId: string;
      productName: string;
      sku: string;
      size: string | null;
      color: string | null;
      categoryId: string;
      categoryName: string;
      quantity: number;
      unitPriceCents: number;
      totalCents: number;
    };

    const orderItemsData: OrderItemData[] = [];
    let subtotalCents = 0;

    for (const item of items) {
      const variant = variantById.get(item.variantId)!;
      const product = variant.product;
      const unitPrice = unitPriceByCategory.get(product.categoryId) ?? 0;
      const lineTotal = unitPrice * item.quantity;

      subtotalCents += lineTotal;

      orderItemsData.push({
        productId: product.id,
        variantId: variant.id,
        productName: product.name,
        sku: variant.sku,
        size: variant.size,
        color: product.colors.join(" / ") || null,
        categoryId: product.categoryId,
        categoryName: product.category.name,
        quantity: item.quantity,
        unitPriceCents: unitPrice,
        totalCents: lineTotal,
      });
    }

    /* ======================================================================
       PASO 2.7 — Leer la tasa de IVA desde la DB
       ====================================================================== */
    const ivaSetting = await tx.setting.findUnique({
      where: { key: "tax.ivaRateBp" },
    });
    const ivaRateBp =
      typeof ivaSetting?.value === "number" ? ivaSetting.value : 1500;

    /* ======================================================================
       PASO 2.8 — Calcular envío y totales
       ====================================================================== */
    const shippingCents = calculateShippingCents(subtotalCents);

    const totals = computeTotals({
      subtotalCents,
      discountCents: 0, // Los descuentos ya están aplicados en los precios
      ivaRateBp,
      shippingCents,
    });

    /* ======================================================================
       PASO 2.9 — Crear el pedido
       ======================================================================
       Guardamos todos los snapshots y montos calculados. También creamos:
         - Los OrderItems.
         - El Payment con la cuenta bancaria elegida.
         - El primer OrderEvent (auditoría).
       ====================================================================== */
    const order = await tx.order.create({
      data: {
        // --- Snapshot del cliente ---
        customerName: customer.customerName,
        customerEmail: customer.customerEmail,
        customerPhone: customer.customerPhone,

        // --- Snapshot de la dirección ---
        province: customer.province,
        city: customer.city,
        addressLine: customer.addressLine,
        reference: customer.reference || null,

        // --- Montos calculados ---
        subtotalCents: totals.subtotalCents,
        discountCents: totals.discountCents,
        taxableCents: totals.taxableCents,
        ivaRateBp: totals.ivaRateBp,
        ivaCents: totals.ivaCents,
        shippingCents: totals.shippingCents,
        totalCents: totals.totalCents,
        currency: "USD",

        // --- Estados iniciales ---
        orderStatus: "RECIBIDO",
        paymentStatus: "PENDIENTE",
        paymentMethod: "BANK_TRANSFER",

        // --- Ítems (creación en cascada) ---
        items: {
          create: orderItemsData,
        },

        // --- Pago asociado ---
        payment: {
          create: {
            method: "BANK_TRANSFER",
            provider: "bank_transfer",
            bankAccountId: customer.bankAccountId,
            status: "PENDIENTE",
            amountCents: totals.totalCents,
          },
        },

        // --- Primer evento de auditoría ---
        events: {
          create: {
            type: "ORDER_CREATED",
            toValue: "RECIBIDO",
            note: "Pedido creado por el cliente",
          },
        },
      },
    });

    /* ======================================================================
       PASO 2.10 — Descontar stock de cada variante
       ======================================================================
       Usamos updateMany con una condición de "stock suficiente" para
       protegernos contra condiciones de carrera (dos clientes comprando
       el último suéter al mismo tiempo).
       ====================================================================== */
    for (const item of items) {
      const result = await tx.variant.updateMany({
        where: {
          id: item.variantId,
          // Solo actualiza si hay stock suficiente.
          stock: { gte: item.quantity },
        },
        data: {
          stock: { decrement: item.quantity },
        },
      });

      // Si el updateMany no afectó ninguna fila, significa que el stock
      // cambió desde que validamos (otro cliente se adelantó).
      if (result.count === 0) {
        const variant = variantById.get(item.variantId)!;
        throw new OrderCreationError(
          `Stock insuficiente (condición de carrera) para ${variant.product.name}`,
          "INSUFFICIENT_STOCK"
        );
      }
    }

    /* ======================================================================
       PASO 2.11 — Devolver datos esenciales
       ====================================================================== */
    return {
      id: order.id,
      number: order.number,
      totalCents: order.totalCents,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      createdAt: order.createdAt,
    };
  });
}