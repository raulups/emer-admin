"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { deleteBrand } from "@/app/brands/actions";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { formatNumber } from "@/lib/utils";
import type { Uuid } from "@/types/db";

export interface DeleteBrandButtonProps {
  brandId: Uuid;
  brandName: string;
  /** Productos que se borraran con la marca, para avisar en el dialogo. */
  productsCount: number;
}

/** Borra la marca con todo su contenido vía la RPC `admin_delete_brand`. */
export function DeleteBrandButton({ brandId, brandName, productsCount }: DeleteBrandButtonProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);

  async function onConfirm() {
    const result = await deleteBrand(brandId, brandName);

    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }

    setOpen(false);
    showToast(
      `Marca "${brandName}" eliminada con ${formatNumber(result.deletedProducts)} producto(s).`,
      "ok",
    );
    router.push("/brands");
  }

  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)}>
        Eliminar
      </Button>

      <ConfirmDialog
        open={open}
        title="Eliminar marca"
        confirmLabel="Eliminar definitivamente"
        confirmText={brandName}
        onConfirm={onConfirm}
        onCancel={() => setOpen(false)}
        description={
          <div className="flex flex-col gap-2">
            <p>
              Se va a borrar la marca <strong>{brandName}</strong> y{" "}
              <strong>todo su contenido</strong>:
            </p>
            <ul className="list-disc pl-5">
              <li>
                <strong>{formatNumber(productsCount)}</strong>{" "}
                {productsCount === 1 ? "producto" : "productos"}, con sus tallas y su historial de
                precios
              </li>
              <li>Las ejecuciones del scraper de esta marca</li>
              <li>Sus tiendas físicas y sus mapeos de categorías</li>
            </ul>
            <p className="text-error font-bold">Esta acción no se puede deshacer.</p>
          </div>
        }
      />
    </>
  );
}
