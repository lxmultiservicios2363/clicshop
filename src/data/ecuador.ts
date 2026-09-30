/* ============================================================================
   CLICSTORE — Provincias y ciudades de Ecuador
   ----------------------------------------------------------------------------
   Este archivo contiene la lista completa de las 24 provincias de Ecuador
   con sus principales ciudades/cantones. Se usa en el formulario de checkout
   para que el cliente elija su ubicación mediante dos dropdowns:

     1. Provincia (dropdown 1)
     2. Ciudad (dropdown 2, filtrado según la provincia elegida)

   ¿POR QUÉ UNA LISTA LOCAL Y NO UNA API?
   --------------------------------------
   Porque:
     - Es instantáneo (no hay latencia de red).
     - No depende de servicios externos (si se cae, seguimos funcionando).
     - El listado de provincias de Ecuador cambia rarísima vez.
     - Se puede editar a mano si hace falta.

   ESTRUCTURA
   ----------
   Cada provincia tiene:
     - code: código oficial (2 letras, usado por el INEC)
     - name: nombre completo
     - cities: array de ciudades/cantones principales

   ¿QUÉ CIUDADES INCLUIMOS?
   ------------------------
   Los cantones principales de cada provincia (no los 221 cantones totales,
   porque sería demasiado para un dropdown). Si un cliente vive en un cantón
   que no está en la lista, puede escribir su dirección exacta en el campo
   "Dirección" y mencionar el cantón ahí.

   USO EN EL RESTO DEL CÓDIGO
   --------------------------
     import { ECUADOR_PROVINCES, getCitiesByProvince } from "@/data/ecuador";

     // Todas las provincias:
     ECUADOR_PROVINCES.map((p) => <option>{p.name}</option>);

     // Ciudades de una provincia:
     const cities = getCitiesByProvince("Chimborazo");
     // → ["Riobamba", "Alausí", "Guano", ...]
   ============================================================================ */


/* ============================================================================
   TIPOS
   ============================================================================ */

/**
 * Estructura de una provincia.
 */
export type EcuadorProvince = {
  /** Código oficial (2 letras, según el INEC) */
  code: string;

  /** Nombre de la provincia */
  name: string;

  /** Ciudades/cantones principales */
  cities: string[];
};


/* ============================================================================
   LISTA DE PROVINCIAS
   ----------------------------------------------------------------------------
   Ordenadas alfabéticamente para el dropdown.
   ============================================================================ */

export const ECUADOR_PROVINCES: EcuadorProvince[] = [
  {
    code: "A",
    name: "Azuay",
    cities: ["Cuenca", "Gualaceo", "Paute", "Santa Isabel", "Sigsig", "Girón"],
  },
  {
    code: "B",
    name: "Bolívar",
    cities: ["Guaranda", "Chillanes", "Chimbo", "Echeandía", "San Miguel"],
  },
  {
    code: "F",
    name: "Cañar",
    cities: ["Azogues", "Biblián", "Cañar", "La Troncal", "El Tambo"],
  },
  {
    code: "C",
    name: "Carchi",
    cities: ["Tulcán", "Bolívar", "Espejo", "Mira", "Montúfar", "San Pedro de Huaca"],
  },
  {
    code: "H",
    name: "Chimborazo",
    cities: [
      "Riobamba",
      "Alausí",
      "Chambo",
      "Chunchi",
      "Colta",
      "Cumandá",
      "Guamote",
      "Guano",
      "Penipe",
    ],
  },
  {
    code: "X",
    name: "Cotopaxi",
    cities: ["Latacunga", "La Maná", "Pangua", "Pujilí", "Salcedo", "Saquisilí", "Sigchos"],
  },
  {
    code: "O",
    name: "El Oro",
    cities: [
      "Machala",
      "Arenillas",
      "Atahualpa",
      "Balsas",
      "Chilla",
      "El Guabo",
      "Huaquillas",
      "Marcabelí",
      "Pasaje",
      "Piñas",
      "Portovelo",
      "Santa Rosa",
      "Zaruma",
    ],
  },
  {
    code: "E",
    name: "Esmeraldas",
    cities: ["Esmeraldas", "Atacames", "Eloy Alfaro", "Muisne", "Quinindé", "Río Verde", "San Lorenzo"],
  },
  {
    code: "W",
    name: "Galápagos",
    cities: ["Puerto Ayora", "Puerto Baquerizo Moreno", "Puerto Villamil"],
  },
  {
    code: "G",
    name: "Guayas",
    cities: [
      "Guayaquil",
      "Alfredo Baquerizo Moreno",
      "Balao",
      "Balzar",
      "Colimes",
      "Daule",
      "Durán",
      "El Empalme",
      "El Triunfo",
      "General Villamil (Playas)",
      "Isidro Ayora",
      "Lomas de Sargentillo",
      "Milagro",
      "Naranjal",
      "Naranjito",
      "Nobol",
      "Palestina",
      "Pedro Carbo",
      "Salitre",
      "Samborondón",
      "Santa Lucía",
      "Yaguachi",
    ],
  },
  {
    code: "I",
    name: "Imbabura",
    cities: ["Ibarra", "Antonio Ante (Atuntaqui)", "Cotacachi", "Otavalo", "Pimampiro", "Urcuquí"],
  },
  {
    code: "L",
    name: "Loja",
    cities: ["Loja", "Calvas", "Catamayo", "Celica", "Chaguarpamba", "Espíndola", "Gonzanamá", "Macará", "Olmedo", "Paltas", "Pindal", "Puyango", "Quilanga", "Saraguro", "Sozoranga", "Zapotillo"],
  },
  {
    code: "R",
    name: "Los Ríos",
    cities: ["Babahoyo", "Baba", "Buena Fe", "Mocache", "Montalvo", "Palenque", "Puebloviejo", "Quevedo", "Quinsaloma", "Urdaneta", "Valencia", "Ventanas", "Vinces"],
  },
  {
    code: "M",
    name: "Manabí",
    cities: ["Portoviejo", "Bolívar", "Chone", "El Carmen", "Flavio Alfaro", "Jama", "Jaramijó", "Jipijapa", "Junín", "Manta", "Montecristi", "Olmedo", "Paján", "Pedernales", "Pichincha", "Puerto López", "Rocafuerte", "San Vicente", "Santa Ana", "Sucre (Bahía de Caráquez)", "Tosagua", "Veinticuatro de Mayo"],
  },
  {
    code: "S",
    name: "Morona Santiago",
    cities: ["Macas (Morona)", "Gualaquiza", "Huamboya", "Limón Indanza", "Logroño", "Pablo Sexto", "Palora", "San Juan Bosco", "Santiago de Méndez", "Sucúa", "Taisha", "Tiwintza"],
  },
  {
    code: "N",
    name: "Napo",
    cities: ["Tena", "Archidona", "Carlos Julio Arosemena Tola", "El Chaco", "Quijos"],
  },
  {
    code: "D",
    name: "Orellana",
    cities: ["Francisco de Orellana (Coca)", "Aguarico", "La Joya de los Sachas", "Loreto"],
  },
  {
    code: "Y",
    name: "Pastaza",
    cities: ["Puyo (Pastaza)", "Arajuno", "Mera", "Santa Clara"],
  },
  {
    code: "P",
    name: "Pichincha",
    cities: ["Quito", "Cayambe", "Mejía", "Pedro Moncayo", "Pedro Vicente Maldonado", "Puerto Quito", "Rumiñahui (Sangolquí)", "San Miguel de los Bancos"],
  },
  {
    code: "Q",
    name: "Santa Elena",
    cities: ["Santa Elena", "La Libertad", "Salinas"],
  },
  {
    code: "U",
    name: "Santo Domingo de los Tsáchilas",
    cities: ["Santo Domingo", "La Concordia"],
  },
  {
    code: "K",
    name: "Sucumbíos",
    cities: ["Nueva Loja (Lago Agrio)", "Cascales", "Cuyabeno", "Gonzalo Pizarro", "Putumayo", "Shushufindi", "Sucumbíos"],
  },
  {
    code: "T",
    name: "Tungurahua",
    cities: ["Ambato", "Baños de Agua Santa", "Cevallos", "Mocha", "Patate", "Pelileo", "Píllaro", "Quero", "Tisaleo"],
  },
  {
    code: "Z",
    name: "Zamora Chinchipe",
    cities: ["Zamora", "Centinela del Cóndor", "Chinchipe", "El Pangui", "Nangaritza", "Palanda", "Paquisha", "Yacuambi", "Yantzaza"],
  },
];


/* ============================================================================
   UTILIDADES
   ============================================================================ */

/**
 * Devuelve las ciudades de una provincia por su NOMBRE.
 *
 * @param provinceName - Nombre exacto de la provincia (ej: "Chimborazo")
 * @returns Array de ciudades, o array vacío si la provincia no existe
 *
 * @example
 *   getCitiesByProvince("Chimborazo")
 *   // → ["Riobamba", "Alausí", "Chambo", ...]
 *
 *   getCitiesByProvince("NoExiste")
 *   // → []
 */
export function getCitiesByProvince(provinceName: string): string[] {
  const province = ECUADOR_PROVINCES.find((p) => p.name === provinceName);
  return province?.cities ?? [];
}

/**
 * Devuelve una provincia completa por su nombre.
 *
 * @param provinceName - Nombre de la provincia
 * @returns Objeto EcuadorProvince, o undefined si no existe
 */
export function getProvinceByName(
  provinceName: string
): EcuadorProvince | undefined {
  return ECUADOR_PROVINCES.find((p) => p.name === provinceName);
}

/**
 * Lista de nombres de provincias (sin el resto de datos).
 * Útil para validaciones o para listar solo los nombres.
 *
 * @returns Array de strings con nombres de provincia
 */
export function getProvinceNames(): string[] {
  return ECUADOR_PROVINCES.map((p) => p.name);
}