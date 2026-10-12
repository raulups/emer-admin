"use client";

import { useState, type ReactNode } from "react";

import { Button, type ButtonVariant } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: ButtonVariant;
  /** Si se pasa, hay que teclear este texto exacto para habilitar el boton. */
  confirmText?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  confirmVariant = "danger",
  confirmText,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [pending, setPending] = useState(false);
  const [typed, setTyped] = useState("");

  const confirmBlocked = confirmText !== undefined && typed.trim() !== confirmText;

  async function handleConfirm() {
    setPending(true);
    try {
      await onConfirm();
    } finally {
      setPending(false);
      setTyped("");
    }
  }

  function handleCancel() {
    setTyped("");
    onCancel();
  }

  return (
    <Modal
      open={open}
      onClose={handleCancel}
      title={title}
      dismissable={!pending}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={handleCancel} disabled={pending}>
            {cancelLabel}
          </Button>
          <Button
            variant={confirmVariant}
            onClick={handleConfirm}
            loading={pending}
            disabled={confirmBlocked}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {description ? <div className="text-ink/80 text-sm">{description}</div> : null}

      {confirmText !== undefined ? (
        <div className="mt-4 flex flex-col gap-1.5">
          <label htmlFor="confirm-text" className="label-caps">
            Escribe <span className="text-error">{confirmText}</span> para confirmar
          </label>
          <input
            id="confirm-text"
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            autoComplete="off"
            className="border-ink bg-paper focus-visible:outline-ink w-full border-2 px-3 py-2 text-sm focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2"
          />
        </div>
      ) : null}
    </Modal>
  );
}
