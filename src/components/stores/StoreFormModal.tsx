"use client";

import { useState } from "react";

import {
  createStore,
  resolveLocationLink,
  searchStorePlaces,
  updateStore,
} from "@/app/stores/actions";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import {
  formatCoords,
  googleMapsUrl,
  isShortMapsLink,
  isValidLatLng,
  looksLikeFakePlaceId,
  osmEmbedUrl,
  parseLocationInput,
} from "@/lib/geo";
import type { PlaceCandidate } from "@/lib/places";
import { STORE_SOURCE_LABELS, type StoreSource } from "@/lib/validation/store";
import type { Brand } from "@/types/db";
import type { StoreRow } from "@/types/stores";

interface FormState {
  brandId: string;
  name: string;
  address: string;
  city: string;
  country: string;
  latitude: string;
  longitude: string;
  placeId: string;
  isActive: boolean;
  source: StoreSource;
}

function initialState(store: StoreRow | null, brandId: string | null): FormState {
  return {
    brandId: store?.brandId ?? brandId ?? "",
    name: store?.name ?? "",
    address: store?.address ?? "",
    city: store?.city ?? "",
    country: store?.country ?? "España",
    latitude: store ? String(store.latitude) : "",
    longitude: store ? String(store.longitude) : "",
    placeId: store?.placeId ?? "",
    isActive: store?.isActive ?? true,
    source: (store?.source as StoreSource | undefined) ?? "manual",
  };
}

export interface StoreFormModalProps {
  open: boolean;
  /** `null` = tienda nueva. */
  store: StoreRow | null;
  /** Marca preseleccionada al crear. */
  defaultBrandId: string | null;
  brands: Array<Pick<Brand, "id" | "name">>;
  hasGoogleKey: boolean;
  onClose: () => void;
  onSaved: () => void;
}

/** Alta y edicion de una tienda fisica. Se monta con `key` para empezar de cero cada vez. */
export function StoreFormModal({
  open,
  store,
  defaultBrandId,
  brands,
  hasGoogleKey,
  onClose,
  onSaved,
}: StoreFormModalProps) {
  const { showToast } = useToast();
  const [form, setForm] = useState<FormState>(() => initialState(store, defaultBrandId));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<PlaceCandidate[] | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [link, setLink] = useState("");
  const [resolving, setResolving] = useState(false);

  const lat = Number(form.latitude);
  const lng = Number(form.longitude);
  const hasCoords = form.latitude !== "" && form.longitude !== "" && isValidLatLng(lat, lng);
  const suspiciousPlaceId = form.placeId.trim() !== "" && looksLikeFakePlaceId(form.placeId);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!(key in current)) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  async function search() {
    const text = query.trim();
    if (text.length < 3) return;
    setSearching(true);
    setSearchError(null);
    try {
      const result = await searchStorePlaces(text);
      if (!result.ok) {
        setSearchError(result.error);
        setResults(null);
        return;
      }
      setResults(result.results);
    } finally {
      setSearching(false);
    }
  }

  function pick(candidate: PlaceCandidate) {
    setForm((current) => ({
      ...current,
      name: current.name || candidate.name || "",
      address: candidate.address || current.address,
      city: candidate.city || current.city,
      country: candidate.country || current.country,
      latitude: String(candidate.latitude),
      longitude: String(candidate.longitude),
      placeId: candidate.placeId ?? (candidate.source === "osm" ? current.placeId : ""),
      source: candidate.source,
    }));
    setErrors({});
    setResults(null);
  }

  async function applyLink() {
    const text = link.trim();
    if (text === "") return;
    let location = isShortMapsLink(text) ? null : parseLocationInput(text);
    if (!location?.coords) {
      setResolving(true);
      try {
        const result = await resolveLocationLink(text);
        if (!result.ok) {
          showToast(result.error, "error");
          return;
        }
        location = result.location;
      } finally {
        setResolving(false);
      }
    }
    const coords = location.coords;
    if (!coords) return;
    setForm((current) => ({
      ...current,
      latitude: String(coords.lat),
      longitude: String(coords.lng),
      placeId: location.placeId ?? current.placeId,
    }));
    setErrors((current) => {
      const next = { ...current };
      delete next.latitude;
      delete next.longitude;
      return next;
    });
    setLink("");
    showToast(
      location.placeId ? "Coordenadas y place_id leídos del enlace." : "Coordenadas leídas.",
      "ok",
      1800,
    );
  }

  async function save() {
    setSaving(true);
    try {
      const input = {
        brandId: form.brandId,
        name: form.name,
        address: form.address,
        city: form.city,
        country: form.country,
        latitude: form.latitude === "" ? Number.NaN : Number(form.latitude.replace(",", ".")),
        longitude: form.longitude === "" ? Number.NaN : Number(form.longitude.replace(",", ".")),
        placeId: form.placeId,
        isActive: form.isActive,
        source: form.source,
      };
      const result = store ? await updateStore(store.id, input) : await createStore(input);
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        showToast(result.error, "error");
        return;
      }
      showToast(result.message, "ok");
      if (result.warning) showToast(result.warning, "error", 6000);
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      dismissable={!saving}
      title={store ? "Editar tienda" : "Nueva tienda"}
      subtitle={
        store
          ? `${store.brandName} · ${store.address}`
          : "Busca la tienda o pega su enlace de Google Maps y revisa los datos."
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={save} loading={saving}>
            {store ? "Guardar cambios" : "Crear tienda"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        {/* Buscador */}
        <section className="bg-subtle/50 flex flex-col gap-2 rounded-xl border p-3">
          <div className="flex items-end gap-2">
            <Input
              label={hasGoogleKey ? "Buscar en Google Maps" : "Buscar en OpenStreetMap"}
              placeholder="Nude Project Fuencarral Madrid"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void search();
                }
              }}
              wrapperClassName="flex-1"
              autoComplete="off"
            />
            <Button
              variant="secondary"
              onClick={search}
              loading={searching}
              disabled={query.trim().length < 3}
            >
              Buscar
            </Button>
          </div>
          {!hasGoogleKey ? (
            <p className="text-ink/55 text-xs">
              Sin <code className="font-mono">GOOGLE_PLACES_API_KEY</code> el buscador no da
              place_id: pega el enlace de Google Maps de la tienda para tenerlo.
            </p>
          ) : null}
          {searchError ? <p className="text-error text-xs">{searchError}</p> : null}
          {results ? (
            results.length === 0 ? (
              <p className="text-ink/60 text-xs">Sin resultados. Prueba con la dirección.</p>
            ) : (
              <ul className="bg-paper divide-line flex flex-col divide-y overflow-hidden rounded-lg border">
                {results.map((candidate) => (
                  <li key={`${candidate.latitude},${candidate.longitude},${candidate.label}`}>
                    <button
                      type="button"
                      onClick={() => pick(candidate)}
                      className="hover:bg-subtle flex w-full items-start justify-between gap-3 px-3 py-2 text-left"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">
                          {candidate.name ?? candidate.address}
                        </span>
                        <span className="text-ink/55 block truncate text-xs">
                          {candidate.label}
                        </span>
                      </span>
                      <span className="text-accent shrink-0 text-xs font-medium">Usar</span>
                    </button>
                  </li>
                ))}
              </ul>
            )
          ) : null}
        </section>

        <div className="grid gap-5 md:grid-cols-[1fr_260px]">
          <div className="flex flex-col gap-3">
            <Select
              label="Marca"
              value={form.brandId}
              onChange={(event) => set("brandId", event.target.value)}
              placeholder="Elige una marca"
              options={brands.map((brand) => ({ value: brand.id, label: brand.name }))}
              error={errors.brandId}
            />
            <Input
              label="Nombre (opcional)"
              placeholder="Flagship Madrid"
              value={form.name}
              onChange={(event) => set("name", event.target.value)}
              hint="Si se deja vacío, la app enseña la dirección."
              error={errors.name}
            />
            <Input
              label="Dirección"
              placeholder="Calle de Fuencarral, 47"
              value={form.address}
              onChange={(event) => set("address", event.target.value)}
              error={errors.address}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Ciudad"
                placeholder="Madrid"
                value={form.city}
                onChange={(event) => set("city", event.target.value)}
                error={errors.city}
              />
              <Input
                label="País"
                placeholder="España"
                value={form.country}
                onChange={(event) => set("country", event.target.value)}
                error={errors.country}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="bg-subtle relative aspect-square overflow-hidden rounded-xl border">
              {hasCoords ? (
                <iframe
                  key={`${lat},${lng}`}
                  title="Ubicación de la tienda"
                  src={osmEmbedUrl(lat, lng)}
                  className="absolute inset-0 size-full"
                  loading="lazy"
                />
              ) : (
                <p className="text-ink/50 absolute inset-0 grid place-items-center p-4 text-center text-xs">
                  El mapa aparece cuando hay coordenadas.
                </p>
              )}
            </div>
            {hasCoords ? (
              <a
                href={googleMapsUrl(lat, lng, form.placeId || null)}
                target="_blank"
                rel="noreferrer"
                className="text-accent text-xs font-medium hover:underline"
              >
                Abrir en Google Maps ↗
              </a>
            ) : null}
          </div>
        </div>

        {/* Ubicacion */}
        <section className="flex flex-col gap-3">
          <div className="flex items-end gap-2">
            <Input
              label="Pegar enlace de Google Maps o coordenadas"
              placeholder="https://maps.app.goo.gl/…  ·  40.4234, -3.7015"
              value={link}
              onChange={(event) => setLink(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void applyLink();
                }
              }}
              wrapperClassName="flex-1"
              autoComplete="off"
            />
            <Button
              variant="secondary"
              onClick={applyLink}
              loading={resolving}
              disabled={link.trim() === ""}
            >
              Leer
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Latitud"
              inputMode="decimal"
              placeholder="40.42340"
              value={form.latitude}
              onChange={(event) => set("latitude", event.target.value)}
              error={errors.latitude}
            />
            <Input
              label="Longitud"
              inputMode="decimal"
              placeholder="-3.70150"
              value={form.longitude}
              onChange={(event) => set("longitude", event.target.value)}
              error={errors.longitude}
            />
          </div>

          <Input
            label="place_id de Google"
            placeholder="ChIJ…"
            value={form.placeId}
            onChange={(event) => set("placeId", event.target.value.trim())}
            className="font-mono text-xs"
            hint={
              suspiciousPlaceId
                ? undefined
                : "La app lo usa para la ficha de la tienda (fotos, horario, valoración). Sin él solo sale el punto en el mapa."
            }
            error={
              errors.placeId ??
              (suspiciousPlaceId
                ? "No parece un place_id real (¿inventado?). La ficha de la app fallará: pega el enlace de Google Maps de la tienda."
                : undefined)
            }
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Checkbox
              label="Activa"
              hint="Solo las activas salen en la app y en la web."
              checked={form.isActive}
              onChange={(event) => set("isActive", event.target.checked)}
              name="isActive"
            />
            <span className="text-ink/55 flex items-center gap-2 text-xs">
              Origen
              <Badge tone={form.source === "manual" ? "muted" : "accent"}>
                {STORE_SOURCE_LABELS[form.source] ?? form.source}
              </Badge>
            </span>
          </div>
          {hasCoords ? (
            <p className="text-ink/50 font-mono text-[11px]">{formatCoords(lat, lng)}</p>
          ) : null}
        </section>
      </div>
    </Modal>
  );
}
