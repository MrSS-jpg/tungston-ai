"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { CloseIcon } from "./Icons";

export function AuthModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    setLoading(true);

    try {
      if (tab === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        onSuccess();
        onClose();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        if (data.session) {
          onSuccess();
          onClose();
        } else {
          setInfoMsg("Account created! Check your email to confirm if required, or sign in now.");
          setTab("signin");
        }
      }
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-md border-3 border-line bg-surface p-6 shadow-hard text-ink">
        <div className="flex items-center justify-between border-b-2 border-line pb-3 mb-4">
          <div className="font-display text-lg uppercase tracking-tight">
            Tungston Auth System
          </div>
          <button
            onClick={onClose}
            className="grid h-7 w-7 place-items-center border-2 border-line bg-surface2 text-ink hover:bg-accent hover:text-line"
            aria-label="Close auth dialog"
          >
            <CloseIcon size={12} />
          </button>
        </div>

        {/* Perks Box */}
        <div className="mb-5 border-2 border-line bg-surface2 p-3 font-mono text-xs">
          <div className="font-bold text-accent uppercase mb-1">Tier Breakdown:</div>
          <div className="text-muted">
            • <strong className="text-ink">Guest:</strong> Fast OpenAI GPT-OSS 20B engine.
          </div>
          <div className="text-muted">
            • <strong className="text-ink">Signed In:</strong> Unlocks{" "}
            <span className="text-accent font-bold">Qwen 3.8 27B</span> &amp;{" "}
            <span className="text-accent font-bold">GPT-OSS 120B</span> frontier models.
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex border-2 border-line mb-4 bg-surface2">
          <button
            type="button"
            onClick={() => {
              setTab("signin");
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 font-mono text-xs font-bold uppercase transition-colors ${
              tab === "signin"
                ? "bg-accent text-line"
                : "text-muted hover:text-ink"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("signup");
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 font-mono text-xs font-bold uppercase transition-colors ${
              tab === "signup"
                ? "bg-accent text-line"
                : "text-muted hover:text-ink"
            }`}
          >
            Create Account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-mono text-xs font-bold uppercase text-muted mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full border-2 border-line bg-base px-3 py-2 font-mono text-sm text-ink outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block font-mono text-xs font-bold uppercase text-muted mb-1">
              Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full border-2 border-line bg-base px-3 py-2 font-mono text-sm text-ink outline-none focus:border-accent"
            />
          </div>

          {errorMsg && (
            <div className="border-2 border-danger bg-danger/10 p-2 font-mono text-xs text-danger">
              {errorMsg}
            </div>
          )}

          {infoMsg && (
            <div className="border-2 border-accent bg-accent/10 p-2 font-mono text-xs text-accent">
              {infoMsg}
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full border-2 border-line bg-accent py-2.5 font-mono text-sm font-bold uppercase text-line shadow-hard-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50"
            >
              {loading
                ? "AUTHENTICATING..."
                : tab === "signin"
                ? "Sign In ↗"
                : "Create Account ↗"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
