/**
 * Clasificacion automatica de productos.
 *
 * ⚠️ REPLICA DE LA LOGICA DEL NODO "Transformar Productos" DE n8n.
 * Si cambias el nodo, cambia este archivo (y al reves). El probador de
 * /classification usa exactamente estas funciones, asi que lo que veas ahi es
 * lo que hara el scraper... mientras las dos copias esten sincronizadas.
 *
 * Modulo puro: sin dependencias de servidor ni de React, para poder usarlo en
 * el cliente y en los tests.
 */

export interface ClassifyRule {
  keyword: string;
  categoryId: string;
  priority: number;
}

export interface ClassifyMapping {
  brandId: string;
  /** `product_type` de la tienda, en minusculas. */
  externalCategoryName: string;
  categoryId: string;
}

export interface ClassifyInput {
  title: string | null | undefined;
  productType: string | null | undefined;
  tags?: string[] | null;
  brandId?: string | null;
}

/** Paso que ha decidido la categoria. */
export type ClassifySource =
  | "mapping"
  | "title_high"
  | "product_type_high"
  | "title_any"
  | "product_type_any"
  | "tags"
  | "none";

export const CLASSIFY_SOURCE_LABELS: Record<ClassifySource, string> = {
  mapping: "Mapeo de la tienda (product_type)",
  title_high: "Regla en el título (prioridad ≥ 13)",
  product_type_high: "Regla en el product_type (prioridad ≥ 10)",
  title_any: "Regla en el título",
  product_type_any: "Regla en el product_type",
  tags: "Tag exacto (prioridad ≥ 10)",
  none: "Ninguna regla ha coincidido",
};

export interface ClassifyResult {
  categoryId: string | null;
  source: ClassifySource;
  /** Regla ganadora, si ha decidido una regla. */
  rule: ClassifyRule | null;
  /** Texto donde ha coincidido, ya normalizado. */
  matchedIn: string | null;
}

/* ------------------------------------------------------------------ */
/* Normalizacion                                                       */
/* ------------------------------------------------------------------ */

/** Minusculas y sin acentos. */
export function norm(value: string | null | undefined): string {
  if (!value) return "";
  return value.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/**
 * Reemplazos que unifican variantes de escritura. El ORDEN importa: se
 * aplican uno detras de otro sobre el texto ya normalizado.
 */
const PREP_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\b(?:t|tee)[\s-]?shirts?\b/g, "tshirt"],
  [/\blong[\s-]?sleeve[sd]?\b/g, "longsleeve"],
  [/\bshort[\s-]?sleeve[sd]?\b/g, "shortsleeve"],
  [/\bsweat[\s-]?pants?\b/g, "sweatpants"],
  [/\bsweat[\s-]shirts?\b/g, "sweatshirt"],
  [/\bcrew[\s-]?necks?\b/g, "crewneck"],
  [/\b(?:full|half|quarter|1\/4|1\/2)[\s-]?zip\b/g, "zip"],
  [/\bzip[\s-]?up\b/g, "zip"],
  [/\bzipp(?:er|ed)s?\b/g, "zip"],
  [/\bboot[\s-]?cut\b/g, "bootcut"],
  [/\bcrop(?:ped)?[\s-]?tops?\b/g, "croptop"],
  [/\bflip[\s-]?flops?\b/g, "flipflop"],
  [/\bboard[\s-]?shorts?\b/g, "boardshort"],
  [/\bcard[\s-]?holders?\b/g, "cardholder"],
  [/\bkey[\s-]?(?:chain|ring)s?\b/g, "keychain"],
  [/\bhood(?:y|ies)\b/g, "hoodie"],
  [/\bsun[\s-]?glass(?:es)?\b/g, "sunglass"],
  [/\bknitted\b/g, "knit"],
  [/\bswim[\s-]?(?:pants?|shorts?|trunks?)\b/g, "swim"],
  [/\bjewell?(?:e?ry)\b/g, "jewelry"],
];

/** Normaliza y aplica los reemplazos; deja los espacios colapsados. */
export function prep(value: string | null | undefined): string {
  let text = norm(value);
  for (const [pattern, replacement] of PREP_REPLACEMENTS) {
    text = text.replace(pattern, replacement);
  }
  return text.replace(/\s+/g, " ").trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Coincidencia por palabra completa, admitiendo plural en `s` / `es`.
 * `short` encuentra "shorts" pero no "shortsleeve".
 */
export function matchesKeyword(text: string, preppedKeyword: string): boolean {
  if (preppedKeyword === "") return false;
  const pattern = new RegExp(`(?:^|[^a-z0-9])${escapeRegExp(preppedKeyword)}(?:s|es)?(?![a-z0-9])`);
  return pattern.test(text);
}

/* ------------------------------------------------------------------ */
/* Seleccion de regla                                                  */
/* ------------------------------------------------------------------ */

/** Regla con su keyword ya pasada por `prep`, para no repetir el trabajo. */
interface PreparedRule extends ClassifyRule {
  prepped: string;
}

export function prepareRules(rules: ClassifyRule[]): PreparedRule[] {
  return rules
    .map((rule) => ({ ...rule, prepped: prep(rule.keyword) }))
    .filter((rule) => rule.prepped !== "");
}

/** Gana la de mayor prioridad; a igual prioridad, la keyword mas larga. */
function better(a: PreparedRule, b: PreparedRule): PreparedRule {
  if (b.priority !== a.priority) return b.priority > a.priority ? b : a;
  return b.prepped.length > a.prepped.length ? b : a;
}

/** Mejor regla que coincide en `text` (ya prepped). `null` si ninguna. */
export function bestRuleIn(text: string, rules: PreparedRule[]): PreparedRule | null {
  let winner: PreparedRule | null = null;
  for (const rule of rules) {
    if (!matchesKeyword(text, rule.prepped)) continue;
    winner = winner === null ? rule : better(winner, rule);
  }
  return winner;
}

/**
 * Mejor regla cuyo keyword coincide EXACTAMENTE con alguno de los tags
 * (admitiendo plural), entre las de prioridad suficiente.
 */
function bestRuleInTags(
  tags: string[],
  rules: PreparedRule[],
  minPriority: number,
): PreparedRule | null {
  const preppedTags = tags.map((tag) => prep(tag)).filter((tag) => tag !== "");
  if (preppedTags.length === 0) return null;

  let winner: PreparedRule | null = null;

  for (const rule of rules) {
    if (rule.priority < minPriority) continue;
    const hit = preppedTags.some(
      (tag) => tag === rule.prepped || tag === `${rule.prepped}s` || tag === `${rule.prepped}es`,
    );
    if (!hit) continue;
    winner = winner === null ? rule : better(winner, rule);
  }

  return winner;
}

/* ------------------------------------------------------------------ */
/* Umbrales                                                            */
/* ------------------------------------------------------------------ */

/** Prioridad minima para que el titulo mande sobre el product_type. */
export const TITLE_PRIORITY_THRESHOLD = 13;
/** Prioridad minima para que el product_type mande antes del segundo repaso. */
export const PRODUCT_TYPE_PRIORITY_THRESHOLD = 10;
/** Prioridad minima para que un tag decida. */
export const TAG_PRIORITY_THRESHOLD = 10;

export interface ClassifyContext {
  rules: ClassifyRule[];
  mappings?: ClassifyMapping[];
}

function noMatch(): ClassifyResult {
  return { categoryId: null, source: "none", rule: null, matchedIn: null };
}

/**
 * Decide la categoria de un producto.
 *
 * Orden de decision (el primero que acierta manda):
 *  1. Mapeo de la marca para ese `product_type`.
 *  2. Mejor regla del titulo, si su prioridad es >= 13.
 *  3. Mejor regla del product_type, si su prioridad es >= 10.
 *  4. Mejor regla del titulo, sea cual sea su prioridad.
 *  5. Mejor regla del product_type, sea cual sea su prioridad.
 *  6. Tag que coincida exacto con una keyword de prioridad >= 10.
 *  7. Sin categoria.
 */
export function classifyProduct(input: ClassifyInput, context: ClassifyContext): ClassifyResult {
  const rules = prepareRules(context.rules);

  // 1. Mapeo de la tienda por product_type.
  const productTypeRaw = (input.productType ?? "").trim().toLowerCase();
  if (input.brandId && productTypeRaw !== "") {
    const mapping = (context.mappings ?? []).find(
      (item) =>
        item.brandId === input.brandId &&
        item.externalCategoryName.trim().toLowerCase() === productTypeRaw,
    );
    if (mapping) {
      return {
        categoryId: mapping.categoryId,
        source: "mapping",
        rule: null,
        matchedIn: productTypeRaw,
      };
    }
  }

  const title = prep(input.title);
  const productType = prep(input.productType);

  const titleRule = title === "" ? null : bestRuleIn(title, rules);
  const typeRule = productType === "" ? null : bestRuleIn(productType, rules);

  // 2. El titulo manda si la regla es suficientemente fuerte.
  if (titleRule && titleRule.priority >= TITLE_PRIORITY_THRESHOLD) {
    return {
      categoryId: titleRule.categoryId,
      source: "title_high",
      rule: titleRule,
      matchedIn: title,
    };
  }

  // 3. Si no, el product_type con prioridad decente.
  if (typeRule && typeRule.priority >= PRODUCT_TYPE_PRIORITY_THRESHOLD) {
    return {
      categoryId: typeRule.categoryId,
      source: "product_type_high",
      rule: typeRule,
      matchedIn: productType,
    };
  }

  // 4 y 5. Segundo repaso, ya sin umbral.
  if (titleRule) {
    return {
      categoryId: titleRule.categoryId,
      source: "title_any",
      rule: titleRule,
      matchedIn: title,
    };
  }

  if (typeRule) {
    return {
      categoryId: typeRule.categoryId,
      source: "product_type_any",
      rule: typeRule,
      matchedIn: productType,
    };
  }

  // 6. Ultimo recurso: un tag que sea exactamente una keyword.
  const tagRule = bestRuleInTags(input.tags ?? [], rules, TAG_PRIORITY_THRESHOLD);
  if (tagRule) {
    return {
      categoryId: tagRule.categoryId,
      source: "tags",
      rule: tagRule,
      matchedIn: tagRule.prepped,
    };
  }

  // 7. Sin categoria: lo decidira una persona desde el panel.
  return noMatch();
}
