/**
 * Exporta las reglas de clasificacion reales a un fixture JSON para los tests.
 *
 *   npm run export-rules
 *
 * Lee category_keyword_rules, categories y shop_category_mappings con la
 * service key de .env.local y escribe tests/fixtures/category-rules.json.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    "Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Ejecuta `npm run export-rules`, que carga .env.local.",
  );
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

const [rules, categories, mappings] = await Promise.all([
  sb
    .from("category_keyword_rules")
    .select("keyword, category_id, priority")
    .order("priority", { ascending: false }),
  sb.from("categories").select("id, name").order("name"),
  sb.from("shop_category_mappings").select("brand_id, external_category_name, category_id"),
]);

for (const [label, result] of [
  ["reglas", rules],
  ["categorias", categories],
  ["mappings", mappings],
]) {
  if (result.error) {
    console.error(`Error leyendo ${label}:`, result.error.message);
    process.exit(1);
  }
}

const fixture = {
  exportedAt: new Date().toISOString(),
  categories: categories.data,
  rules: (rules.data ?? []).map((r) => ({
    keyword: r.keyword,
    categoryId: r.category_id,
    priority: r.priority ?? 0,
  })),
  mappings: (mappings.data ?? []).map((m) => ({
    brandId: m.brand_id,
    externalCategoryName: m.external_category_name,
    categoryId: m.category_id,
  })),
};

const out = resolve("tests/fixtures/category-rules.json");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(fixture, null, 2) + "\n", "utf8");

console.log(
  `Escrito ${out}\n  ${fixture.rules.length} reglas · ${fixture.categories.length} categorías · ${fixture.mappings.length} mappings`,
);
