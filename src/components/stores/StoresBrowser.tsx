"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { deleteStore, setStoreActive, verifyStorePlaceIds } from "@/app/stores/actions";
import { StoreFormModal } from "@/components/stores/StoreFormModal";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Table, TableWrapper, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { formatCoords, googleMapsUrl, looksLikeFakePlaceId } from "@/lib/geo";
import { cn, formatNumber } from "@/lib/utils";
import type { Brand } from "@/types/db";
import type { StoreRow } from "@/types/stores";

type Status = "" | "active" | "inactive" | "no-place" | "bad-place";

const STATUS_OPTIONS: Array<{ value: Exclude<Status, "">; label: string }> = [
  { value: "active", label: "Activas" },
  { value: "inactive", label: "Ocultas" },
  { value: "no-place", label: "Sin place_id" },
  { value: "bad-place", label: "place_id dudoso" },
];

export interface StoresBrowserProps {
  stores: StoreRow[];
  brands: Array<Pick<Brand, "id" | "name">>;
  hasGoogleKey: boolean;
  initialBrand: string | null;
  /** Abre el alta al llegar (desde la ficha de una marca). */
  openNew: boolean;
}

type Editing = { store: StoreRow | null; key: number } | null;

/** place_id que no existe en Google (comprobado) o que no lo parece. */
function isBadPlace(store: StoreRow, invalid: ReadonlySet<string>): boolean {
  return store.placeId !== null && (invalid.has(store.id) || looksLikeFakePlaceId(store.placeId));
}

function normalize(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function StoresBrowser({
  stores,
  brands,
  hasGoogleKey,
  initialBrand,
  openNew,
}: StoresBrowserProps) {
  const router = useRouter();
  const { showToast } = useToast();

  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState(initialBrand ?? "");
  const [city, setCity] = useState("");
  const [status, setStatus] = useState<Status>("");

  const [editing, setEditing] = useState<Editing>(openNew ? { store: null, key: 0 } : null);
  const [deleting, setDeleting] = useState<StoreRow | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [invalid, setInvalid] = useState<Set<string>>(new Set());
  const [verified, setVerified] = useState(false);

  const brandOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const store of stores) counts.set(store.brandId, (counts.get(store.brandId) ?? 0) + 1);
    return brands.map((b) => ({
      value: b.id,
      label: counts.has(b.id) ? `${b.name} (${counts.get(b.id)})` : b.name,
    }));
  }, [stores, brands]);

  const cityOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const store of stores) counts.set(store.city, (counts.get(store.city) ?? 0) + 1);
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es"))
      .map(([name, count]) => ({ value: name, label: `${name} (${count})` }));
  }, [stores]);

  const badPlace = (store: StoreRow) => isBadPlace(store, invalid);

  const visible = useMemo(() => {
    const needle = normalize(query.trim());
    return stores.filter((store) => {
      if (brand && store.brandId !== brand) return false;
      if (city && store.city !== city) return false;
      if (status === "active" && !store.isActive) return false;
      if (status === "inactive" && store.isActive) return false;
      if (status === "no-place" && store.placeId) return false;
      if (status === "bad-place" && !isBadPlace(store, invalid)) return false;
      if (needle) {
        const haystack = normalize(
          [store.brandName, store.name, store.address, store.city, store.country]
            .filter(Boolean)
            .join(" "),
        );
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
  }, [stores, brand, city, status, query, invalid]);

  const filtering = query !== "" || brand !== "" || city !== "" || status !== "";
  const suspicious = stores.filter(badPlace).length;

  function openCreate() {
    setEditing({ store: null, key: Date.now() });
  }

  async function toggleActive(store: StoreRow) {
    setToggling(store.id);
    try {
      const result = await setStoreActive(store.id, !store.isActive);
      if (!result.ok) {
        showToast(result.error, "error");
        return;
      }
      showToast(result.message, "ok", 1800);
      router.refresh();
    } finally {
      setToggling(null);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    const result = await deleteStore(deleting.id);
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    showToast(result.message, "ok");
    setDeleting(null);
    router.refresh();
  }

  async function verify() {
    setVerifying(true);
    try {
      const result = await verifyStorePlaceIds();
      if (!result.ok) {
        showToast(result.error, "error");
        return;
      }
      setInvalid(new Set(result.invalid));
      setVerified(true);
      showToast(
        result.invalid.length === 0
          ? `Los ${result.checked} place_id existen en Google.`
          : `${result.invalid.length} de ${result.checked} place_id no existen en Google.`,
        result.invalid.length === 0 ? "ok" : "error",
      );
      if (result.invalid.length > 0) setStatus("bad-place");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {suspicious > 0 ? (
        <div className="border-error/25 bg-error-soft text-error flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 text-xs">
          <p>
            <strong>
              {suspicious === 1 ? "1 tienda tiene" : `${suspicious} tiendas tienen`} un place_id
              dudoso.
            </strong>{" "}
            La app lo usa para abrir la ficha de Google (fotos, horario): con uno inventado falla.
            Edítalas y pega el enlace de Google Maps de cada tienda.
          </p>
          <Button size="sm" variant="secondary" onClick={() => setStatus("bad-place")}>
            Ver cuáles
          </Button>
        </div>
      ) : null}

      <div className="border-line bg-paper flex flex-wrap items-end gap-3 border p-3 shadow-sm">
        <Input
          label="Buscar"
          placeholder="Fuencarral, Nude…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          wrapperClassName="min-w-52 flex-1"
          autoComplete="off"
        />
        <Select
          label="Marca"
          value={brand}
          onChange={(event) => setBrand(event.target.value)}
          placeholder="Todas"
          options={brandOptions}
          wrapperClassName="w-52"
        />
        <Select
          label="Ciudad"
          value={city}
          onChange={(event) => setCity(event.target.value)}
          placeholder="Todas"
          options={cityOptions}
          wrapperClassName="w-44"
        />
        <Select
          label="Estado"
          value={status}
          onChange={(event) => setStatus(event.target.value as Status)}
          placeholder="Todas"
          options={STATUS_OPTIONS}
          wrapperClassName="w-44"
        />
        {filtering ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setQuery("");
              setBrand("");
              setCity("");
              setStatus("");
            }}
          >
            Limpiar
          </Button>
        ) : null}
        <div className="ml-auto flex gap-2">
          {hasGoogleKey ? (
            <Button
              variant="secondary"
              onClick={verify}
              loading={verifying}
              title="Comprueba en Google que cada place_id existe"
            >
              Comprobar place_id
            </Button>
          ) : null}
          <Button onClick={openCreate}>Nueva tienda</Button>
        </div>
      </div>

      <p className="text-ink/60 text-xs">
        {filtering
          ? `${formatNumber(visible.length)} de ${formatNumber(stores.length)} tiendas`
          : `${formatNumber(stores.length)} tiendas`}
      </p>

      {visible.length === 0 ? (
        <div className="border-line bg-paper border p-8 text-center">
          <p className="text-ink/60 text-sm">
            {stores.length === 0
              ? "Todavía no hay tiendas físicas. Crea la primera con «Nueva tienda»."
              : "Ninguna tienda coincide con los filtros."}
          </p>
        </div>
      ) : (
        <TableWrapper>
          <Table>
            <THead>
              <TR>
                <TH>Marca</TH>
                <TH>Tienda</TH>
                <TH>Ciudad</TH>
                <TH>Ubicación</TH>
                <TH>place_id</TH>
                <TH>Estado</TH>
                <TH className="text-right">Acciones</TH>
              </TR>
            </THead>
            <TBody>
              {visible.map((store) => (
                <TR key={store.id} className={cn(!store.isActive && "opacity-60")}>
                  <TD className="whitespace-nowrap">
                    <Link href={`/brands/${store.brandId}`} className="font-medium hover:underline">
                      {store.brandName}
                    </Link>
                  </TD>
                  <TD className="max-w-xs">
                    <button
                      type="button"
                      onClick={() => setEditing({ store, key: Date.now() })}
                      className="block max-w-full text-left"
                    >
                      <span className="block truncate text-sm font-medium hover:underline">
                        {store.name ?? store.address}
                      </span>
                      {store.name ? (
                        <span className="text-ink/55 block truncate text-xs">{store.address}</span>
                      ) : null}
                    </button>
                  </TD>
                  <TD className="text-xs whitespace-nowrap">
                    {store.city}
                    {store.country ? <span className="text-ink/45"> · {store.country}</span> : null}
                  </TD>
                  <TD>
                    <a
                      href={googleMapsUrl(store.latitude, store.longitude, store.placeId)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-ink/70 hover:text-accent font-mono text-[11px] whitespace-nowrap hover:underline"
                      title="Abrir en Google Maps"
                    >
                      {formatCoords(store.latitude, store.longitude)} ↗
                    </a>
                  </TD>
                  <TD>
                    {store.placeId === null ? (
                      <Badge tone="muted">Sin place_id</Badge>
                    ) : badPlace(store) ? (
                      <Badge tone="error">
                        <span title={store.placeId}>Dudoso</span>
                      </Badge>
                    ) : (
                      <Badge tone="ok">
                        <span title={store.placeId}>{verified ? "Verificado" : "Sí"}</span>
                      </Badge>
                    )}
                  </TD>
                  <TD>
                    <button
                      type="button"
                      onClick={() => toggleActive(store)}
                      disabled={toggling === store.id}
                      title={store.isActive ? "Ocultar en la app" : "Mostrar en la app"}
                      className="disabled:opacity-50"
                    >
                      <Badge tone={store.isActive ? "ok" : "muted"}>
                        {store.isActive ? "Activa" : "Oculta"}
                      </Badge>
                    </button>
                  </TD>
                  <TD className="text-right whitespace-nowrap">
                    <div className="flex justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setEditing({ store, key: Date.now() })}
                      >
                        Editar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setDeleting(store)}>
                        Borrar
                      </Button>
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </TableWrapper>
      )}

      {editing ? (
        <StoreFormModal
          key={editing.key}
          open
          store={editing.store}
          defaultBrandId={brand || initialBrand}
          brands={brands}
          hasGoogleKey={hasGoogleKey}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      ) : null}

      <ConfirmDialog
        open={deleting !== null}
        title="Borrar tienda"
        description={
          deleting
            ? `Se borrará ${deleting.name ?? deleting.address} (${deleting.brandName}, ${deleting.city}). Si solo quieres que no salga en la app, ocúltala.`
            : undefined
        }
        confirmLabel="Borrar"
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
