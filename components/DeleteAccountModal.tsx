"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { CloseIcon } from "./Icons";

export function DeleteAccountModal({
  open,
  onClose,
  onDeleted,
}: {
  open: boolean;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [confirmInput, setConfirmInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!open) return null;

  const isConfirmed = confirmInput.trim().toUpperCase() === "DELETE";

  async function handleDelete() {
    if (!isConfirmed) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (token) {
        const res = await fetch("/api/account/delete", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to delete account on server.");
        }
      }

      // Purge local storage
      if (typeof window !== "undefined") {
        localStorage.removeItem("tungston:conversations");
        localStorage.removeItem("tungston:projects");
        localStorage.removeItem("tungston:active_project");
        localStorage.removeItem("tungston_ai_byok");
      }

      // Sign out from Supabase
      await supabase.auth.signOut();

      onDeleted();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to delete account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 font-mono">
      <div className="w-full max-w-md border-3 border-danger bg-surface p-6 shadow-hard text-ink">
        <div className="flex items-center justify-between border-b-2 border-line pb-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="bg-danger text-white px-1.5 py-0.5 text-xs font-bold uppercase">
              DANGER
            </span>
            <h2 className="font-display text-lg uppercase tracking-tight text-danger">
              Purge Account &amp; Data
            </h2>
          </div>
          <button
            onClick={onClose}
            className="grid h-7 w-7 place-items-center border-2 border-line bg-surface2 text-ink hover:bg-accent hover:text-line"
            aria-label="Close dialog"
          >
            <CloseIcon size={12} />
          </button>
        </div>

        <div className="border-2 border-line bg-base p-3 mb-4 text-xs leading-relaxed text-muted space-y-2">
          <p className="text-ink font-bold">
            ⚠️ WARNING: THIS ACTION IS PERMANENT AND CANNOT BE UNDONE.
          </p>
          <p>
            Deleting your account will immediately revoke all access to member tier models (Qwen 27B / GPT-OSS 120B), wipe your user credentials, and purge all synced projects and conversations.
          </p>
        </div>

        <div className="space-y-3 mb-5">
          <label className="block text-xs font-bold uppercase text-muted">
            Type <span className="text-danger font-bold">DELETE</span> to confirm:
          </label>
          <input
            type="text"
            value={confirmInput}
            onChange={(e) => setConfirmInput(e.target.value)}
            placeholder="Type DELETE..."
            className="w-full border-2 border-line bg-base px-3 py-2 font-mono text-sm text-ink outline-none focus:border-danger uppercase"
          />
        </div>

        {errorMsg && (
          <div className="border-2 border-danger bg-danger/10 p-2 font-mono text-xs text-danger mb-4">
            {errorMsg}
          </div>
        )}

        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 border-2 border-line bg-surface2 py-2 text-center text-xs font-bold uppercase text-ink hover:bg-base"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={!isConfirmed || loading}
            className="flex-1 border-2 border-line bg-danger py-2 text-center text-xs font-bold uppercase text-white shadow-hard-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-danger/90 active:translate-x-[1px] active:translate-y-[1px]"
          >
            {loading ? "PURGING..." : "Purge Account ✕"}
          </button>
        </div>
      </div>
    </div>
  );
}
