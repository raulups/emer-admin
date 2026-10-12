import { describe, expect, it } from "vitest";

import fixture from "./fixtures/category-rules.json";
import {
  bestRuleIn,
  classifyProduct,
  matchesKeyword,
  norm,
  prep,
  prepareRules,
  type ClassifyMapping,
  type ClassifyRule,
} from "@/lib/classify";

/**
 * Los tests corren contra las reglas REALES de la base de datos, exportadas
 * con `npm run export-rules`. Si cambian las reglas, vuelve a exportarlas.
 */
const rules: ClassifyRule[] = fixture.rules;
const categoryNames = new Map(fixture.categories.map((category) => [category.id, category.name]));

/** Clasifica y devuelve el NOMBRE de la categoria, que es lo que se afirma. */
function categoryOf(
  title: string,
  productType?: string,
  options: { tags?: string[]; brandId?: string; mappings?: ClassifyMapping[] } = {},
): string | null {
  const result = classifyProduct(
    {
      title,
      productType: productType ?? null,
      tags: options.tags ?? [],
      brandId: options.brandId ?? null,
    },
    { rules, mappings: options.mappings ?? [] },
  );

  return result.categoryId ? (categoryNames.get(result.categoryId) ?? null) : null;
}

describe("fixture de reglas", () => {
  it("trae las reglas y categorías reales", () => {
    expect(rules.length).toBeGreaterThan(100);
    expect(fixture.categories).toHaveLength(15);
  });
});

describe("norm", () => {
  it("pasa a minúsculas y quita acentos", () => {
    expect(norm("BAÑADOR Ártico")).toBe("banador artico");
  });

  it("tolera null y vacío", () => {
    expect(norm(null)).toBe("");
    expect(norm(undefined)).toBe("");
  });
});

describe("prep", () => {
  it("unifica variantes de escritura", () => {
    expect(prep("T-Shirt")).toBe("tshirt");
    expect(prep("Tee Shirts")).toBe("tshirt");
    expect(prep("Long Sleeved")).toBe("longsleeve");
    expect(prep("Short-Sleeve")).toBe("shortsleeve");
    expect(prep("Sweat Pants")).toBe("sweatpants");
    expect(prep("Crew Neck")).toBe("crewneck");
    expect(prep("1/4 Zip")).toBe("zip");
    expect(prep("Zip-Up")).toBe("zip");
    expect(prep("Zipper")).toBe("zip");
    expect(prep("Hoody")).toBe("hoodie");
    expect(prep("Hoodies")).toBe("hoodie");
    expect(prep("Board Shorts")).toBe("boardshort");
    expect(prep("Swim Trunks")).toBe("swim");
    expect(prep("Knitted")).toBe("knit");
    expect(prep("Jewellery")).toBe("jewelry");
    expect(prep("Sun Glasses")).toBe("sunglass");
    expect(prep("Key Ring")).toBe("keychain");
  });

  it("colapsa los espacios sobrantes", () => {
    expect(prep("  Belt   Bag  ")).toBe("belt bag");
  });
});

describe("matchesKeyword", () => {
  it("encuentra la palabra completa y su plural", () => {
    expect(matchesKeyword("cargo shorts khaki", "short")).toBe(true);
    expect(matchesKeyword("a short", "short")).toBe(true);
    expect(matchesKeyword("short", "short")).toBe(true);
  });

  it("no encuentra la palabra dentro de otra", () => {
    // Este es el motivo de ser del límite de palabra: "shortsleeve" no es "short".
    expect(matchesKeyword("shortsleeve shirt", "short")).toBe(false);
    expect(matchesKeyword("baggy pants", "bag")).toBe(false);
  });

  it("admite keywords de varias palabras", () => {
    expect(matchesKeyword("bag charm heart", "bag charm")).toBe(true);
  });
});

describe("bestRuleIn", () => {
  const prepared = prepareRules([
    { keyword: "bag", categoryId: "bolsos", priority: 28 },
    { keyword: "bag charm", categoryId: "accesorios", priority: 29 },
    { keyword: "heart", categoryId: "accesorios", priority: 10 },
  ]);

  it("gana la de mayor prioridad", () => {
    expect(bestRuleIn("bag charm heart", prepared)?.categoryId).toBe("accesorios");
  });

  it("a igual prioridad gana la keyword más larga", () => {
    const empate = prepareRules([
      { keyword: "polo", categoryId: "polos", priority: 20 },
      { keyword: "polo shirt", categoryId: "camisas", priority: 20 },
    ]);
    expect(bestRuleIn("polo shirt azul", empate)?.categoryId).toBe("camisas");
  });
});

describe("classifyProduct · casos reales", () => {
  const casos: Array<[string, string | undefined, string]> = [
    ["Short Sleeve Shirt Black", undefined, "Camisas"],
    ["Swim Shorts Palm", undefined, "Bañadores"],
    ["Belt Bag Black", undefined, "Bolsos y mochilas"],
    ["Knit Polo Cream", undefined, "Polos"],
    ["Cargo Shorts Khaki", undefined, "Shorts y faldas"],
    ["Bag Charm Heart", undefined, "Accesorios"],
    ["ATELIER LIGHT BLUE PANTS", "SUDADERAS", "Pantalones"],
    ["Tech Brown Fur Zip", "Man Jacket", "Abrigos y chaquetas"],
  ];

  for (const [title, productType, expected] of casos) {
    const label = productType ? `"${title}" (product_type "${productType}")` : `"${title}"`;
    it(`${label} → ${expected}`, () => {
      expect(categoryOf(title, productType)).toBe(expected);
    });
  }
});

describe("classifyProduct · orden de decisión", () => {
  const brandId = "11111111-1111-1111-1111-111111111111";
  const camisetas = fixture.categories.find((category) => category.name === "Camisetas");

  it("el mapeo de la marca manda sobre cualquier regla", () => {
    const mappings: ClassifyMapping[] = [
      { brandId, externalCategoryName: "man jacket", categoryId: camisetas!.id },
    ];
    // Sin mapeo esto sería "Abrigos y chaquetas".
    expect(categoryOf("Tech Brown Fur Zip", "Man Jacket", { brandId, mappings })).toBe("Camisetas");
  });

  it("el mapeo solo aplica a su marca", () => {
    const mappings: ClassifyMapping[] = [
      {
        brandId: "22222222-2222-2222-2222-222222222222",
        externalCategoryName: "man jacket",
        categoryId: camisetas!.id,
      },
    ];
    expect(categoryOf("Tech Brown Fur Zip", "Man Jacket", { brandId, mappings })).toBe(
      "Abrigos y chaquetas",
    );
  });

  it("un título fuerte (≥ 13) gana al product_type", () => {
    // "pant" (22) en el título gana a "sudadera" (20) en el product_type.
    expect(categoryOf("ATELIER LIGHT BLUE PANTS", "SUDADERAS")).toBe("Pantalones");
  });

  it("un título flojo (< 13) cede ante el product_type", () => {
    // "zip" (11) en el título cede ante "jacket" (24) en el product_type.
    expect(categoryOf("Tech Brown Fur Zip", "Man Jacket")).toBe("Abrigos y chaquetas");
  });

  it("sin nada que coincida, devuelve null", () => {
    const result = classifyProduct(
      { title: "Xyzzy Plugh", productType: null, tags: [] },
      { rules },
    );
    expect(result.categoryId).toBeNull();
    expect(result.source).toBe("none");
  });

  it("los tags deciden solo como último recurso", () => {
    const result = classifyProduct(
      { title: "Xyzzy Plugh", productType: null, tags: ["Hoodies"] },
      { rules },
    );
    expect(result.source).toBe("tags");
    expect(result.categoryId && categoryNames.get(result.categoryId)).toBe("Sudaderas");
  });
});

describe("classifyProduct · la fuente explica la decisión", () => {
  it("indica en qué paso se ha decidido", () => {
    expect(classifyProduct({ title: "Knit Polo Cream", productType: null }, { rules }).source).toBe(
      "title_high",
    );
    expect(
      classifyProduct({ title: "Tech Brown Fur Zip", productType: "Man Jacket" }, { rules }).source,
    ).toBe("product_type_high");
  });

  it("devuelve la regla ganadora", () => {
    const result = classifyProduct({ title: "Bag Charm Heart", productType: null }, { rules });
    expect(result.rule?.keyword).toBe("bag charm");
  });
});
