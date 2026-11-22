"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useState } from "react";

import { BrandForm } from "@/components/brands/BrandForm";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { brandToFormInput, EMPTY_BRAND_FORM } from "@/lib/validation/brand";
import type { Brand, Uuid } from "@/types/db";

export interface BrandQuickEditModalProps {
  /** Marca a editar; `null` para crear una nueva. */
  brand: Brand | null;
  open: boolean;
  onClose: () => void;
  onSaved?: (id: Uuid) => void;
}

/**
 * Pop-up de edicion rapida: el mismo formulario que la pagina de edicion,
 * sin salir del listado. Si hay cambios sin guardar, pide confirmacion al cerrar.
 */
export function BrandQuickEditModal({ brand, open, onClose, onSaved }: BrandQuickEditModalProps) {
  const pathname = usePathname();
  const [dirty, setDirty] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const requestClose = useCallback(() => {
    if (dirty) setConfirming(true);
    else onClose();
  }, [dirty, onClose]);

  function handleSaved(id: Uuid) {
    setDirty(false);
    onSaved?.(id);
    onClose();
  }

  return (
    <>
      <Modal
        open={open}
        onClose={requestClose}
        size="xl"
        title={brand ? `Editar: ${brand.name}` : "Nueva marca"}
        subtitle={
          brand && pathname !== `/brands/${brand.id}` ? (
            <Link href={`/brands/${brand.id}`} className="hover:text-cream underline">
              Abrir ficha completa →
            </Link>
          ) : (
            "Los cambios se aplican al instante en la app de Emer."
          )
        }
      >
        <BrandForm
          key={brand?.id ?? "new"}
          mode={brand ? "edit" : "create"}
          brandId={brand?.id}
          initial={brand ? brandToFormInput(brand) : EMPTY_BRAND_FORM}
          variant="modal"
          onCancel={requestClose}
          onSaved={handleSaved}
          onDirtyChange={setDirty}
        />
      </Modal>

      <ConfirmDialog
        open={confirming}
        title="¿Descartar cambios?"
        description="Hay cambios sin guardar en la marca. Si cierras ahora se pierden."
        confirmLabel="Descartar"
        cancelLabel="Seguir editando"
        onConfirm={() => {
          setConfirming(false);
          setDirty(false);
          onClose();
        }}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}
