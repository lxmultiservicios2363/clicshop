/* ============================================================================
   CLICSTORE — Cálculo de precios con descuento por cantidad
   ----------------------------------------------------------------------------
   Este archivo implementa las reglas de precio escalonado por cantidad.

   REGLAS DE NEGOCIO
   -----------------
   Las reglas viven en la base de datos (tabla PriceRule) y se leen desde ahí.
   Cada categoría tiene sus propias reglas:

     Cuello en V:
       1 unidad  → $15.00  (1500 centavos)
       2 unidades → $14.00  (1400 centavos)
       3+ unidades → $12.50  (1250 centavos)

     Cuello redondo:
       1 unidad  → $18.00  (1800 centavos)
       2 unidades → $17.00  (1700 centavos)
       3+ unidades → $15.00  (1500 centavos)

   ¿CÓMO SE APLICA EL DESCUENTO?
   -----------------------------
   POR TIPO (categoría), NO por modelo individual.

   Ejemplo:
     Carrito:
       2 × Suéter Cuello V Rojo   (#01)
       1 × Suéter Cuello V Azul   (#02)
       1 × Suéter Cuello Redondo Verde (#18)

     Cálculo:
       Cuello V total: 2 + 1 = 3 unidades
         → aplicar regla minQuantity=3 → $12.50 c/u
         → subtotal: 3 × 1250 = 3750 centavos

       Cuello redondo total: 1 unidad
         → aplicar regla minQuantity=1 → $18.00 c/u
         → subtotal: 1 × 1800 = 1800 centavos

     Subtotal del pedido: 3750 + 1800 = 5550 centavos ($55.50)

   ¿POR QUÉ POR TIPO Y NO POR MODELO?
   ----------------------------------
   Porque así lo decidió el negocio: es más generoso con el cliente y aumenta
   el ticket promedio. El cliente ve que comprar varios modelos distintos
   acumula para alcanzar el mejor precio.

   USO EN EL RESTO DEL CÓDIGO
   --------------------------
     import { resolveUnitPriceCents, computeCartPricing } from "@/lib/pricing";

     // 1. Precio unitario de un item según la cantidad TOTAL de su categoría:
     const unitPrice = resolveUnitPriceCents(3, [
       { minQuantity: 1, priceCents: 1500 },
       { minQuantity: 2, priceCents: 1400 },
       { minQuantity: 3, priceCents: 1250 },
     ]);
     // → 1250

     // 2. Cálculo completo del carrito (agrupa por categoría y aplica reglas):
     const result = computeCartPricing(items, rulesByCategory);
     // → { subtotalCents, items: [...] }
   ============================================================================ */


/* ============================================================================
   TIPOS
   ============================================================================ */

/**
 * Una regla de precio escalonado.
 * Viene directamente de la tabla PriceRule de la base de datos.
 */
export type PriceRuleInput = {
  /** Cantidad mínima para que aplique esta regla (1, 2, 3, ...) */
  minQuantity: number;

  /** Precio unitario en centavos cuando se alcanza la cantidad mínima */
  priceCents: number;
};

/**
 * Ítem del carrito que se va a cotizar.
 * Solo los campos que importan para el cálculo de precios.
 */
export type CartItemForPricing = {
  /** ID del producto (para identificar el item en la respuesta) */
  productId: string;

  /** ID de la categoría a la que pertenece (para agrupar) */
  categoryId: string;

  /** Cantidad de unidades de este ítem */
  quantity: number;
};

/**
 * Mapa de reglas de precio por categoría.
 * La clave es el ID de categoría, el valor es el array de reglas.
 */
export type PriceRulesByCategory = Map<string, PriceRuleInput[]>;

/**
 * Resultado del cálculo para un ítem del carrito.
 */
export type CartItemPricing = {
  /** ID del producto original */
  productId: string;

  /** ID de la categoría */
  categoryId: string;

  /** Cantidad de este ítem */
  quantity: number;

  /**
   * Precio unitario aplicado (ya con descuento por cantidad TOTAL
   * de la categoría, no de este ítem solo).
   */
  unitPriceCents: number;

  /** Subtotal de este ítem = quantity × unitPriceCents */
  totalCents: number;
};

/**
 * Resultado completo del cálculo de precios del carrito.
 */
export type CartPricing = {
  /** Suma de todos los subtotales, antes de envío e IVA */
  subtotalCents: number;

  /** Detalle por cada ítem del carrito */
  items: CartItemPricing[];
};


/* ============================================================================
   FUNCIÓN PRINCIPAL: Precio unitario según cantidad
   ============================================================================ */

/**
 * Determina el precio unitario aplicable para una cantidad dada.
 *
 * Cómo funciona:
 *   1. Filtra las reglas cuya minQuantity sea <= a la cantidad solicitada.
 *   2. De esas, elige la que tenga la minQuantity más alta (= mejor precio).
 *   3. Devuelve su priceCents.
 *
 * Si no hay reglas aplicables (caso raro), devuelve 0.
 *
 * @param quantity - Cantidad TOTAL de la categoría (no de este ítem)
 * @param rules - Array de reglas de precio de la categoría
 * @returns Precio unitario en centavos
 *
 * @example
 *   const rules = [
 *     { minQuantity: 1, priceCents: 1500 },
 *     { minQuantity: 2, priceCents: 1400 },
 *     { minQuantity: 3, priceCents: 1250 },
 *   ];
 *
 *   resolveUnitPriceCents(1, rules);  // 1500
 *   resolveUnitPriceCents(2, rules);  // 1400
 *   resolveUnitPriceCents(3, rules);  // 1250
 *   resolveUnitPriceCents(5, rules);  // 1250 (sigue aplicando la de 3+)
 */
export function resolveUnitPriceCents(
  quantity: number,
  rules: PriceRuleInput[]
): number {
  // Si la cantidad es 0 o negativa, no aplica ninguna regla.
  if (quantity <= 0) return 0;

  // Si no hay reglas, devolvemos 0 (el llamador debe manejar este caso).
  if (rules.length === 0) return 0;

  // Filtramos las reglas que apliquen para esta cantidad.
  const applicable = rules.filter((r) => r.minQuantity <= quantity);

  // Si ninguna aplica (cantidad menor al mínimo), devolvemos 0.
  if (applicable.length === 0) return 0;

  // De las aplicables, la que tenga la minQuantity más alta (mejor precio).
  const best = applicable.reduce((max, r) =>
    r.minQuantity > max.minQuantity ? r : max
  );

  return best.priceCents;
}


/* ============================================================================
   FUNCIÓN PRINCIPAL: Cálculo completo del carrito
   ============================================================================ */

/**
 * Calcula el precio de todos los ítems de un carrito aplicando las reglas
 * de descuento por cantidad POR CATEGORÍA.
 *
 * Algoritmo:
 *   1. Agrupar las cantidades totales por categoría.
 *      Ejemplo: si hay 2 cuello V rojo + 1 cuello V azul → total cuello V = 3.
 *   2. Resolver el precio unitario de cada categoría según su cantidad total.
 *   3. Aplicar ese precio unitario a CADA ítem de esa categoría.
 *   4. Sumar todos los subtotales.
 *
 * @param items - Array de ítems del carrito a cotizar
 * @param rulesByCategory - Mapa con las reglas de precio por categoría
 * @returns Objeto con el subtotal total y el detalle por ítem
 *
 * @example
 *   const items = [
 *     { productId: "p1", categoryId: "v", quantity: 2 },
 *     { productId: "p2", categoryId: "v", quantity: 1 },
 *     { productId: "p3", categoryId: "r", quantity: 1 },
 *   ];
 *
 *   const rulesByCategory = new Map([
 *     ["v", [
 *       { minQuantity: 1, priceCents: 1500 },
 *       { minQuantity: 2, priceCents: 1400 },
 *       { minQuantity: 3, priceCents: 1250 },
 *     ]],
 *     ["r", [
 *       { minQuantity: 1, priceCents: 1800 },
 *       { minQuantity: 2, priceCents: 1700 },
 *       { minQuantity: 3, priceCents: 1500 },
 *     ]],
 *   ]);
 *
 *   const result = computeCartPricing(items, rulesByCategory);
 *   // result.subtotalCents === 5550
 *   // result.items = [
 *   //   { productId: "p1", categoryId: "v", quantity: 2, unitPriceCents: 1250, totalCents: 2500 },
 *   //   { productId: "p2", categoryId: "v", quantity: 1, unitPriceCents: 1250, totalCents: 1250 },
 *   //   { productId: "p3", categoryId: "r", quantity: 1, unitPriceCents: 1800, totalCents: 1800 },
 *   // ]
 */
export function computeCartPricing(
  items: CartItemForPricing[],
  rulesByCategory: PriceRulesByCategory
): CartPricing {
  // --- Paso 1: Agrupar cantidades totales por categoría ---
  // Usamos un Map donde la clave es categoryId y el valor es la suma total.
  const categoryTotals = new Map<string, number>();

  for (const item of items) {
    const current = categoryTotals.get(item.categoryId) ?? 0;
    categoryTotals.set(item.categoryId, current + item.quantity);
  }

  // --- Paso 2: Resolver precio unitario por categoría ---
  // Para cada categoría, obtenemos el precio unitario según su cantidad total.
  const unitPriceByCategory = new Map<string, number>();

  for (const [categoryId, totalQuantity] of categoryTotals) {
    const rules = rulesByCategory.get(categoryId) ?? [];
    const unitPrice = resolveUnitPriceCents(totalQuantity, rules);
    unitPriceByCategory.set(categoryId, unitPrice);
  }

  // --- Paso 3 y 4: Calcular subtotales por ítem y sumar ---
  // A cada ítem se le aplica el precio unitario de SU categoría (ya con
  // el descuento que ganó la categoría por su cantidad total).
  const pricedItems: CartItemPricing[] = items.map((item) => {
    const unitPrice = unitPriceByCategory.get(item.categoryId) ?? 0;
    return {
      productId: item.productId,
      categoryId: item.categoryId,
      quantity: item.quantity,
      unitPriceCents: unitPrice,
      totalCents: unitPrice * item.quantity,
    };
  });

  // Sumamos todos los subtotales.
  const subtotalCents = pricedItems.reduce(
    (sum, it) => sum + it.totalCents,
    0
  );

  return {
    subtotalCents,
    items: pricedItems,
  };
}


/* ============================================================================
   UTILIDAD AUXILIAR
   ============================================================================ */

/**
 * Construye el mapa de reglas por categoría a partir de las filas de la DB.
 * Es un "helper" para convertir el resultado de prisma.priceRule.findMany()
 * al formato que espera computeCartPricing().
 *
 * @param rules - Array de reglas con categoryId
 * @returns Map<categoríaId, PriceRuleInput[]>
 *
 * @example
 *   const rows = await prisma.priceRule.findMany();
 *   // rows = [
 *   //   { categoryId: "v", minQuantity: 1, priceCents: 1500 },
 *   //   { categoryId: "v", minQuantity: 2, priceCents: 1400 },
 *   //   ...
 *   // ]
 *
 *   const map = buildRulesMap(rows);
 *   // map.get("v") === [{ minQuantity: 1, priceCents: 1500 }, ...]
 */
export function buildRulesMap(
  rules: Array<{ categoryId: string; minQuantity: number; priceCents: number }>
): PriceRulesByCategory {
  const map: PriceRulesByCategory = new Map();

  for (const rule of rules) {
    const list = map.get(rule.categoryId) ?? [];
    list.push({
      minQuantity: rule.minQuantity,
      priceCents: rule.priceCents,
    });
    map.set(rule.categoryId, list);
  }

  return map;
}