"use client";

import { useEffect, useState } from "react";
import { CloseIcon } from "./Icons";

export type ByokConfig = {
  key: string;
  provider: "groq" | "openrouter" | "cerebras";
  model?: string;
};

export const BYOK_STORAGE_KEY = "tungston_ai_byok";

export function getStoredByok(): ByokConfig {
  if (typeof window === "undefined") return { key: "", provider: "groq" };
  try {
    const raw = localStorage.getItem(BYOK_STORAGE_KEY);
    if (!raw) return { key: "", provider: "groq" };
    return JSON.parse(raw);
  } catch {
    return { key: "", provider: "groq" };
  }
}

export function ByokModal({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (config: ByokConfig) => void;
}) {
  const [provider, setProvider] = useState<"groq" | "openrouter" | "cerebras">("groq");
  const [apiKey, setApiKey] = useState("");
  const [customModel, setCustomModel] = useState("");
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    if (open) {
      const stored = getStoredByok();
      setProvider(stored.provider || "groq");
      setApiKey(stored.key || "");
      setCustomModel(stored.model || "");
    }
  }, [open]);

  if (!open) return null;

  const handleSave = () => {
    const trimmed = apiKey.trim();
    const config: ByokConfig = {
      key: trimmed,
      provider,
      model: customModel.trim() || undefined,
    };
    if (trimmed) {
      localStorage.setItem(BYOK_STORAGE_KEY, JSON.stringify(config));
    } else {
      localStorage.removeItem(BYOK_STORAGE_KEY);
    }
    onSave(config);
    onClose();
  };

  const handleReset = () => {
    localStorage.removeItem(BYOK_STORAGE_KEY);
    setApiKey("");
    setCustomModel("");
    onSave({ key: "", provider: "groq" });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-none"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg border-2 border-line bg-surface p-5 sm:p-6 shadow-hard font-mono">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-line pb-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="bg-accent px-1.5 py-0.5 text-xs font-bold text-line uppercase">
              BYOK
            </span>
            <h2 className="font-display text-lg uppercase text-ink tracking-wide">
              Bring Your Own Key
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

        {/* Info callout */}
        <div className="mb-4 border-2 border-line bg-surface2 p-3 text-xs leading-relaxed text-muted">
          <p className="mb-1 text-ink font-bold">
            ⚡ Uninterrupted Personal Quota
          </p>
          <p>
            By default, Tungston AI runs on the shared server Groq key. If the host
            key hits its daily limit or rate limits, enter your own API key to bypass all limits.
            Keys remain strictly on your local device.
          </p>
        </div>

        {/* Provider selection */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-ink mb-1">
              Select Provider
            </label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as any)}
              className="w-full border-2 border-line bg-base px-3 py-2 text-xs font-bold uppercase text-ink outline-none focus:border-accent"
            >
              <option value="groq">Groq (Ultra-Fast 20B/27B/120B)</option>
              <option value="openrouter">OpenRouter (Claude, Llama, Gemini)</option>
              <option value="cerebras">Cerebras (Llama 3.3 70B Turbo)</option>
            </select>
          </div>

          {/* API Key */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold uppercase tracking-wider text-ink">
                API Key
              </label>
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="text-[10px] text-muted hover:text-accent font-bold uppercase"
              >
                {showKey ? "Hide" : "Show"}
              </button>
            </div>
            <input
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={
                provider === "groq"
                  ? "gsk_..."
                  : provider === "openrouter"
                  ? "sk-or-..."
                  : "csk-..."
              }
              className="w-full border-2 border-line bg-base px-3 py-2 text-xs text-ink placeholder:text-muted outline-none focus:border-accent"
            />
          </div>

          {/* Custom Model */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-ink mb-1">
              Custom Model Override (Optional)
            </label>
            <input
              type="text"
              value={customModel}
              onChange={(e) => setCustomModel(e.target.value)}
              placeholder="Leave empty for provider default"
              className="w-full border-2 border-line bg-base px-3 py-2 text-xs text-ink placeholder:text-muted outline-none focus:border-accent"
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="mt-5 flex flex-wrap gap-2.5 pt-3 border-t-2 border-line">
          <button
            onClick={handleSave}
            className="flex-1 border-2 border-line bg-accent py-2 px-3 text-center text-xs font-bold uppercase text-line shadow-hard-sm active:translate-x-[1px] active:translate-y-[1px] hover:bg-accent/90"
          >
            Save &amp; Activate Key ↗
          </button>
          <button
            onClick={handleReset}
            className="border-2 border-line bg-surface2 py-2 px-3 text-center text-xs font-bold uppercase text-muted hover:text-danger hover:border-danger"
          >
            Use Server Key
          </button>
        </div>
      </div>
    </div>
  );
}
