"use client";
import { GlassModal } from "./GlassModal";
import { GlassButton } from "./GlassButton";
import { AlertTriangle } from "lucide-react";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({ open, title, message, confirmLabel = "Confirm", cancelLabel = "Cancel", danger, loading, onConfirm, onCancel }: ConfirmModalProps) {
  return (
    <GlassModal open={open} onClose={onCancel} title={title} size="sm">
      <div className="flex flex-col gap-4">
        {danger && (
          <div className="flex items-center gap-3 rounded-sm bg-red-400/10 border border-red-400/20 p-3">
            <AlertTriangle className="h-5 w-5 text-[#f87272] shrink-0" />
            <p className="text-sm text-white/80">{message}</p>
          </div>
        )}
        {!danger && <p className="text-sm text-white/70">{message}</p>}
        <div className="flex gap-3 justify-end">
          <GlassButton variant="ghost" onClick={onCancel}>{cancelLabel}</GlassButton>
          <GlassButton variant={danger ? "danger" : "primary"} loading={loading} onClick={onConfirm}>{confirmLabel}</GlassButton>
        </div>
      </div>
    </GlassModal>
  );
}
