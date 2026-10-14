# emer-admin

## Propósito

Panel de administración **local** (solo `localhost`, **sin login**) para gestionar la base de datos
Supabase de **Emer**, un marketplace de marcas de streetwear españolas.

Los datos los rellena un **scraper de n8n** (flujo padre/hijo) que lee `/products.json` de tiendas
Shopify. Este panel sirve para revisar y corregir a mano lo que el scraper no acierta: marcas,
clasificación de productos, tiendas físicas y lanzamiento/seguimiento de ejecuciones del scraper.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript estricto**
- **Tailwind CSS v4** (configuración en CSS vía `@theme` en `src/app/globals.css`, sin `tailwind.config`)
- **@supabase/supabase-js** con _service role key_, **solo en el servidor**
- **zod** para validar variables de entorno y formularios
- **npm** como gestor de paquetes
- ESLint (`eslint-config-next` + `eslint-config-prettier`) y Prettier (`prettier-plugin-tailwindcss`)

## Cómo arrancar

```bash
npm install
cp .env.example .env.local   # y rellena SUPABASE_SERVICE_ROLE_KEY
npm run dev                  # http://localhost:3000
```

Otros scripts: `npm run build`, `npm run lint`, `npm run lint:fix`, `npm run typecheck`,
`npm run format`.

### Variables de entorno

`.env.example` está commiteado; `.env.local` está en `.gitignore`.

| Variable                    | Para qué sirve                             |
| --------------------------- | ------------------------------------------ |
| `SUPABASE_URL`              | URL del proyecto de Supabase               |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (**nunca** al cliente)    |
| `N8N_SCRAPER_WEBHOOK_URL`   | Webhook del flujo padre del scraper de n8n |

`src/lib/env.ts` las valida con zod de forma perezosa (`getEnv()`) y lanza `EnvError` con un mensaje
claro en español si falta alguna. La home captura ese error y lo muestra en la UI en lugar de romper.

## Reglas del proyecto

1. **La service key nunca sale del servidor.** Ninguna variable lleva prefijo `NEXT_PUBLIC_`.
   `src/lib/supabase.ts` y `src/lib/env.ts` importan `server-only`: si alguien los importa desde un
   Client Component, la compilación falla. Accede a Supabase solo desde Server Components,
   Server Actions y Route Handlers.
2. **Las mutaciones se hacen con Server Actions** (`"use server"`), validando la entrada con zod y
   llamando a `revalidatePath("/ruta")` al terminar. Nada de `fetch` desde el cliente a Supabase.
3. **Componentes de UI propios**, en `src/components/ui`. Sin librerías de UI externas (ni shadcn, ni
   Radix, ni MUI). Si falta un componente, se añade ahí.
4. **Nada de `border-radius`.** Cero esquinas redondeadas en todo el panel; el reset de
   `globals.css` lo fuerza, no lo reintroduzcas con clases.
5. **Todos los textos de la UI en español** (etiquetas, botones, errores, estados vacíos). El código,
   los nombres de variables y los comentarios técnicos van en inglés o español neutro, pero sin
   tildes en comentarios de código para evitar problemas de codificación.
6. **TypeScript estricto**: `strict` + `noUncheckedIndexedAccess`. Los tipos de la BD están escritos
   a mano en `src/types/db.ts`; **no** se usa `supabase gen types`. Si cambia el esquema, se edita
   ese archivo.
7. **Server Components por defecto.** `"use client"` solo donde haga falta interactividad
   (`Modal`, `Tabs`, `Toast`, `ConfirmDialog`, `Sidebar`).
8. Las páginas que leen datos llevan `export const dynamic = "force-dynamic"`: el panel siempre
   muestra datos frescos. Por eso `cacheComponents` está **desactivado** en `next.config.ts`
   (`create-next-app` lo activa por defecto): en un panel de administración no interesa cachear
   nada, y así no hace falta envolver cada lectura en `Suspense`.
9. **Rutas en inglés, interfaz en español**: `/brands`, `/products`… con las
   etiquetas de la sidebar en español ("Marcas", "Productos").
10. **Las lecturas no lanzan excepciones.** Las funciones de `src/lib/queries/` devuelven
    `{ ok: true, ... } | { ok: false, error }` para que la página pinte el error en la UI (ver
    `getDashboardStats`). Las Server Actions sí pueden devolver un error de formulario.

## Sistema de diseño (brutalista editorial)

Igual que la app Emer:

- **Colores**: fondo blanco `#FFFFFF` (`bg-paper`) en la página y la sidebar; crema `#F5F0E8`
  (`cream`) solo para hovers y fondos secundarios; negro `#000000` (`ink`). Acentos **solo para estados**: verde `#1F7A3A` (`ok`), rojo `#C62828` (`error`),
  amarillo `#F2C94C` (`progress`).
- **Tipografía**: Space Grotesk en todo (`next/font/google`, variable `--font-space-grotesk`).
- **Bordes**: 2px negros (`border-2 border-ink`). `border-radius: 0` siempre.
- **Sombra dura**: `shadow-hard` = `4px 4px 0 #000`. En botones y cards clicables se usa la utilidad
  `press`: al hover la sombra pasa a `2px 2px` y el elemento se desplaza `translate(2px, 2px)`;
  transiciones de **120ms**.
- **Títulos** grandes en mayúsculas con tracking apretado (`title-xl`, `label-caps`).
- **Tablas densas**: `px-3 py-1.5` por celda, cabecera negra con texto crema.
- **Layout**: sidebar fija de 240px a la izquierda con el logo `EMER ADMIN` y las secciones Marcas,
  Productos, Clasificación, Tiendas, Scraper. Por debajo de `1024px` la sidebar se colapsa en un
  panel deslizante con barra superior.
- **Carga**: el loader es `Spinner` (tres cuadrados que laten, `animate-loader-block`, toma
  `currentColor`); no uses spinners sueltos con `animate-spin`. `app/loading.tsx` da feedback
  instantáneo al cambiar de sección, `app/template.tsx` hace un fundido de entrada (solo opacidad:
  un `transform` rompería los `position: fixed` de los modales) y los enlaces de la sidebar
  muestran el loader mientras navegan (`useLinkStatus`).
- **Filas de ejecuciones**: el fondo de la fila lleva el color de su estado, igual que el badge.

Utilidades propias definidas en `globals.css`: `press`, `title-xl`, `label-caps`, y los tokens
`shadow-hard`, `shadow-hard-sm`, `shadow-hard-lg`.

## Estructura

```
src/
  app/
    layout.tsx          # html lang="es", fuente, ToastProvider, Sidebar
    page.tsx            # "/" resumen con contadores
    globals.css         # tokens de diseño Tailwind v4
    brands/             # listado, /new, /[id], /[id]/edit, actions.ts
    products/           # listado con filtros en la URL, /[id] con 3 pestañas, actions.ts
    scraper/            # lanzamiento, contadores, ejecuciones (Realtime) y /[id] con productos
    classification/     # 4 pestañas: sin categoría, revisión, reglas, mappings
    api/scraper/        # run (POST a n8n) y runs (fuente del polling)
    api/scrapes/stream/ # SSE: reenvia Realtime de scrape_runs al navegador
    api/classification/ # review (agregado por marca)
    api/brands/upload/  # subida de imágenes de marca (sharp + Storage)
    tiendas/
  components/
    brands/             # tarjetas, tabla, formulario, borrado, repartos
    products/           # filtros, tabla, galería, tallas, gráfica, visor JSON
    scraper/            # lanzadores, marcas con problemas, progreso del detalle de marca
    scrapes/            # tabla y filtros de ejecuciones, indicador Realtime, detalle de run
    classification/     # pestañas, probador de reglas, editores inline
    layout/             # Sidebar, PageHeader, Placeholder
    ui/                 # Button, Input, Textarea, Select, Checkbox, Badge, Card, Table,
                        # Modal, Tabs, Toast, EmptyState, Spinner, ConfirmDialog
  lib/
    validation/         # esquemas zod compartidos cliente/servidor
    env.ts              # validación zod (server-only)
    supabase.ts         # cliente singleton con service role (server-only)
    queries/            # lecturas de datos por sección
    classify.ts         # réplica de la clasificación de n8n (ver más abajo)
    storage.ts          # bucket brands: slug, subida y borrado (server-only)
    utils.ts            # cn, formatDateTime, formatNumber, formatPrice
  types/
    db.ts               # tipos de la BD escritos a mano
    brands.ts           # tipos de vista de la sección Marcas
```

## Scraper

- **Lanzar**: `POST /api/scraper/run` con `{ brandId? }` reenvía a `N8N_SCRAPER_WEBHOOK_URL` un
  `{ brand_id }` (una marca) o `{}` (todas), con **timeout de 5 s**. n8n responde al instante, así
  que el endpoint solo confirma el disparo; el progreso se sigue por `scrape_runs`.
  Errores ya cubiertos: `ECONNREFUSED`/timeout → "n8n no está arrancado…"; `404` de n8n → workflow
  inactivo o URL del webhook incorrecta.
- **Pantalla `/scraper`**: lee de la vista `scrape_runs_admin` (que añade `brand_name` y el estado
  `stuck`) con filtros `brand` y `status` en la URL; el detalle `/scraper/[id]` lista
  `scrape_run_products`. `/scrapes` redirige aquí (`next.config.ts`).
- **Realtime**: el navegador no tiene clave de Supabase, así que `GET /api/scrapes/stream` se
  suscribe a `scrape_runs` en el servidor y reenvía los cambios por SSE; el cliente hace
  `router.refresh()`. El paso a `stuck` no genera evento: mientras haya runs en curso se refresca
  además cada 60 s.
- **Polling**: `GET /api/scraper/runs` sigue sirviendo `?mode=counts` (indicador de la sidebar) y
  `?mode=latest&brand=<id>` (progreso del detalle de marca).
- **Runs atascados**: un run que sigue en `running` más de `STALE_RUN_MINUTES` (30, igual que la vista) se considera
  colgado — n8n se paró sin cerrarlo. No cuenta como actividad: si contara, el panel estaría
  refrescando cada 3 s para siempre. Se marca en la tabla como "Sin terminar".
- **Ritmo del polling**: 3 s mientras hay algo en curso; la sidebar comprueba cada 15 s cuando no
  hay actividad (un scrape puede arrancarlo n8n por su cuenta). Al terminar un run, el detalle de
  marca llama a `router.refresh()` para recargar contadores y repartos.

## Clasificación

### `src/lib/classify.ts` — réplica de la lógica del nodo "Transformar Productos" de n8n

**Mantener sincronizada.** Este archivo reproduce, en TypeScript, cómo decide el scraper la
categoría de un producto. Si tocas el nodo de n8n, actualiza este archivo (y al revés); si las dos
copias se separan, el PROBADOR de `/classification` mentirá.

- `norm`: minúsculas + sin acentos (NFD y fuera los diacríticos).
- `prep`: aplica una lista ORDENADA de reemplazos sobre el texto normalizado (`t-shirt`→`tshirt`,
  `zip-up`→`zip`, `swim shorts`→`swim`, `hoody`/`hoodies`→`hoodie`…) y colapsa espacios. Las
  keywords pasan por el mismo `prep`.
- Coincidencia por **palabra completa**, admitiendo plural: `(?:^|[^a-z0-9])kw(?:s|es)?(?![a-z0-9])`.
  Por eso `short` encuentra "shorts" pero no "shortsleeve".
- **Mejor regla** = mayor prioridad; a igualdad, la keyword más larga.
- **Orden de decisión**: 1) mapeo de la marca por `product_type`; 2) mejor regla del título si su
  prioridad es ≥ 13; 3) mejor regla del `product_type` con prioridad ≥ 10; 4) mejor regla del
  título (cualquier prioridad); 5) ídem del `product_type`; 6) tag que coincida exacto con una
  keyword de prioridad ≥ 10; 7) sin categoría.

Tests: `npm test` (vitest) en `tests/classify.test.ts`, contra las reglas **reales** de la base.
El fixture se regenera con `npm run export-rules` (lee `.env.local`) → `tests/fixtures/category-rules.json`.

### Rendimiento de las pestañas

PostgREST no sabe agrupar, así que las agregaciones se hacen en JS sobre páginas de 1000 filas,
**siempre con `order("id")`**: sin orden estable, `range()` repite filas y se salta otras (medido).

- "Sin categoría" (~2.900 filas, 3 peticiones) se agrupa entero, dentro de un `<Suspense>` para que
  la página pinte antes de terminar.
- "Revisión" va **marca a marca**: agregar las 12.000 filas clasificadas serían 13 peticiones
  (~12 s). Si algún día hace falta la tabla global, lo suyo es una vista o RPC que haga el
  `GROUP BY` en Postgres.

## Imágenes de marca (Supabase Storage)

Bucket **`brands`**, público. `src/lib/storage.ts` lo crea si no existiera (`ensureBrandsBucket`).

- **La subida es SIEMPRE del servidor**, con la service key, en
  `POST /api/brands/upload` (multipart: `file`, `kind`, `brandName`, `previousUrl?`).
  El navegador solo manda el archivo; nunca habla con Supabase Storage.
- Tipos admitidos: PNG, JPG, WEBP, AVIF y SVG, hasta **10 MB**. Se valida en el componente y
  **otra vez en el servidor** (lo que diga el navegador no cuenta).
- Proceso con **sharp**: `image` → máx. 1920 px; `logo` → máx. 800 px; ambos a WEBP calidad 82,
  sin ampliar nunca y conservando la transparencia. Los **SVG se suben tal cual** (rasterizarlos
  sería absurdo). El handler declara `runtime = "nodejs"`: sharp es nativo.
- Ruta: `${slug}_${kind}_${Date.now()}.${ext}`; el timestamp evita que la CDN sirva la imagen
  vieja. `cacheControl: 31536000`.
- **Borrado de huérfanos**: el handler borra `previousUrl` si era del bucket, y además
  `updateBrand` borra la imagen anterior cuando deja de usarse (quitarla o pegar una URL externa)
  y `deleteBrand` borra las dos tras la RPC. Las URLs de Cloudinary u otros dominios **no se tocan**.
- El formulario **no sube al soltar**: valida primero, luego sube en paralelo lo que haya cambiado
  (botón "Subiendo imagen…") y solo entonces guarda la marca. Si una subida falla, no se guarda nada.

## Esquema de la base de datos (resumen)

Postgres en Supabase, schema `public`.

- **brands** — `id uuid pk`, `name` (not null), `url`, `img`, `logo`, `color` (hex **con** `#`, puede
  tener 8 dígitos o venir vacío/null), `created_at`, `tags brand_tag[]` (not null, default `{}`),
  `founded_year int`, `style`.
  Enum **`brand_tag`**: `popular | emergente | novedad | destacada | sostenible | drops`.
- **categories** — `id`, `name` (único), `created_at`. **15 categorías planas**, sin jerarquía.
- **products** — `id`, `brand_id → brands`, `category_id → categories` (nullable),
  `category_locked boolean` (si es `true`, **el scraper NO sobrescribe la categoría**),
  `external_id` (id de Shopify), `handle`, `name`, `description`, `product_url`, `currency char(3)`,
  `current_price`, `original_price` (solo si hay descuento), `min_price`, `max_price`,
  `is_on_sale`, `available`, `main_image_url`, `thumbnail_image_url`, `image_urls jsonb` (array de
  urls), `images jsonb` (`[{src,width,height}]`), `color_name`, `color_hex` (**sin** `#`),
  `attributes jsonb` (`{tags, product_type, vendor, options, colors, badges}`),
  `gender` (`men|women|unisex|null`), `product_type`, `vendor`, `tags text[]`, `published_at`,
  `source_created_at`, `source_updated_at`, `last_seen_at`, `created_at`, `updated_at`.
  **Unique `(brand_id, external_id)`**.
- **product_sizes** — `id`, `product_id → products`, `variant_id`, `size_label`, `size_normalized`,
  `sku`, `stock_status` (`in_stock|out_of_stock`), `available` (**columna generada**, no se escribe),
  `price`, `compare_at_price`, `stock_quantity`, `created_at`, `updated_at`.
- **product_price_history** — `id`, `product_id`, `price`, `currency`, `scraped_at`.
- **scrape_runs** — `id`, `brand_id`, `started_at`, `finished_at`,
  `status` (`running|success|partial|error`), `products_found`, `products_upserted`,
  `error_message`.
- **category_keyword_rules** — `id`, `keyword` (único, sin mayúsculas), `category_id`,
  `priority int`, `created_at`.
- **shop_category_mappings** — `id`, `brand_id`, `external_category_name` (se compara con el
  `product_type` en minúsculas), `category_id`, `created_at`.
- **store_locations** — `id`, `brand_id`, `name`, `address` (not null), `city` (not null), `country`,
  `latitude float8` (not null), `longitude float8` (not null), `place_id`, `is_active`, `source`,
  `created_at`.
- **size_aliases** — `alias pk`, `size_normalized`.
- **color_dictionary** — `keyword pk`, `color_name`, `color_hex` (**sin** `#`).

**Vistas**: `brands_with_preview_products`, `unclassified_products`.

### Columnas reales que no estaban en el esquema de partida

- **`products.sizes`** (jsonb) existe además de la tabla `product_sizes`: es una copia
  desnormalizada que mantiene el scraper. Coinciden exactamente (comprobado en 40 productos),
  pero la **fuente buena es `product_sizes`**, que trae `variant_id`, `sku` y precios.
- **`products.images`** está vacío en casi todo el catálogo (119 de 15.137). La galería usa
  `image_urls` como fuente principal y solo saca `width`/`height` de `images` cuando los hay.
- La vista **`unclassified_products`** expone solo `id, name, attributes, brand_name`.

### Avisos de PostgREST (comprobados contra la BD real)

- **Los `count()` embebidos con filtros por alias NO funcionan.** Una consulta como
  `brands?select=*,x:products(count),y:products(count)&y.category_id=is.null` devuelve el **total**
  en todos los alias, **sin dar error**: datos erróneos en silencio. Con un solo alias el filtro sí
  se aplica, pero no te fíes: usa la vista o un `count` exacto.
- **Las funciones de agregado están deshabilitadas** (`PGRST123: Use of aggregate functions is not
allowed`), así que `select=brand_id,count()` no es una opción.
- **Cómo contar bien, entonces**:
  - Por marca (listado): la vista `brands_with_preview_products` →
    `total_product_count`, `on_sale_count` y `category_counts`. Los productos sin categoría son
    `total_product_count - suma(category_counts)` (comprobado contra `count(*)` en las 31 marcas).
  - De una sola marca o del total: `.select("id", { count: "exact", head: true })` con sus filtros.
- PostgREST devuelve **como mucho 1000 filas** por consulta: no cuentes haciendo `length` de un
  `select` sin paginar. El listado de productos pagina con `range()` + `count: "exact"`.
- Un embed de **filas** sí respeta lo que pides (`products?select=*,product_sizes(available)`
  devuelve bien las tallas de cada producto). El problema es solo el `count()` agregado con
  filtros por alias.

**RPC**: `admin_delete_brand(p_brand_id uuid)` → borra la marca con todos sus productos, tallas,
historial, runs, tiendas y mappings. Devuelve `{ deleted_products }`. Úsalo siempre para borrar una
marca; nunca borres en cascada a mano desde el panel.
