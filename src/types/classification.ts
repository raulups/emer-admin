import type { Uuid } from "@/types/db";

/** Tipos de vista de la seccion Clasificacion. */

/** Ejemplo de producto dentro de un grupo. */
export interface ProductSample {
  id: Uuid;
  name: string | null;
}

/** Producto sin categoria, con lo necesario para reconocerlo en la vista de lista. */
export interface UnclassifiedProduct extends ProductSample {
  image: string | null;
  price: number | null;
  currency: string | null;
}

/** Grupo de la pestaña SIN CATEGORÍA: marca × product_type. */
export interface UnclassifiedGroup {
  brandId: Uuid;
  brandName: string;
  /** `product_type` original (puede venir vacío). */
  productType: string;
  /** El mismo, en minúsculas: es como se guarda en los mapeos. */
  productTypeKey: string;
  count: number;
  /** Todos los productos del grupo (para asignarles categoria desde la lista). */
  products: UnclassifiedProduct[];
}

/** Fila de la pestaña REVISIÓN: marca × product_type × categoría asignada. */
export interface ReviewGroup {
  brandId: Uuid;
  brandName: string;
  productType: string;
  categoryId: Uuid | null;
  categoryName: string | null;
  count: number;
  sample: ProductSample | null;
}

/** Regla con el nombre de su categoria resuelto. */
export interface RuleRow {
  id: Uuid;
  keyword: string;
  categoryId: Uuid | null;
  categoryName: string | null;
  priority: number;
  createdAt: string | null;
}

/** Mapeo con marca, categoria y cuantos productos lo usan ahora mismo. */
export interface MappingRow {
  id: Uuid;
  brandId: Uuid;
  brandName: string | null;
  externalCategoryName: string;
  categoryId: Uuid | null;
  categoryName: string | null;
  /** Productos de esa marca cuyo `product_type` coincide. */
  productsCount: number;
}

/** Tope de productos que se leen para agrupar, por seguridad. */
export const GROUPING_ROW_LIMIT = 8000;
