"use client";

import { useState } from "react";

import { BrandQuickEditModal } from "@/components/brands/BrandQuickEditModal";
import { Button } from "@/components/ui/Button";
import type { Brand } from "@/types/db";

/** Boton "Editar" de la ficha: abre el pop-up en vez de navegar a /edit. */
export function EditBrandButton({ brand }: { brand: Brand }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>Editar</Button>
      <BrandQuickEditModal brand={brand} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
