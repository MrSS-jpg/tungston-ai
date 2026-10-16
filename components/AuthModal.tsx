"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { CloseIcon } from "./Icons";

export function AuthModal({
  open,
  onClose,
  onSuccess,
  initialTab = "signin",
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialTab?: "signin" | "signup" | "reset" | "update-password";
}) {
  const [tab, setTab] = useState<"signin" | "signup" | "reset" | "update-password">(initialTab);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    setTab(initialTab);
    setErrorMsg(null);
    setInfoMsg(null);
  }, [initialTab, open]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  if (!open) return null;

  const validateEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);

    // Validation
    if (tab !== "update-password" && !validateEmail(email)) {
      setErrorMsg("Please enter a valid email address (e.g., user@domain.com).");
      return;
    }

    if (tab === "signup" || tab === "update-password") {
      if (password.length < 8) {
        setErrorMsg("Password must be at least 8 characters in length for production security.");
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg("Passwords do not match. Please re-enter identical passwords.");
        return;
      }
    } else if (tab === "signin") {
      if (password.length < 6) {
        setErrorMsg("Password must be at least 6 characters.");
        return;
      }
    }

    setLoading(true);

    try {
      if (tab === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        onSuccess();
        onClose();
      } else if (tab === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
          },
        });
        if (error) throw error;

        if (data.session) {
          onSuccess();
          onClose();
        } else {
          setInfoMsg(
            "Account created! A verification link has been dispatched to your email. Click the link to complete authentication."
          );
          setResendCooldown(60);
        }
      } else if (tab === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: typeof window !== "undefined" ? `${window.location.origin}` : undefined,
        });
        if (error) throw error;
        setInfoMsg(
          `Password recovery link transmitted to ${email.trim()}. Check your inbox and follow the instructions.`
        );
        setResendCooldown(60);
      } else if (tab === "update-password") {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setInfoMsg("Password successfully updated! You can now sign in with your new credentials.");
        setTab("signin");
        setPassword("");
        setConfirmPassword("");
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "An authentication error occurred.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResendVerification() {
    if (!email || resendCooldown > 0) return;
    setErrorMsg(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
      });
      if (error) throw error;
      setInfoMsg(`Fresh verification link dispatched to ${email.trim()}.`);
      setResendCooldown(60);
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to resend verification email.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 font-mono">
      <div className="w-full max-w-md border-3 border-line bg-surface p-6 shadow-hard text-ink">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-line pb-3 mb-4">
          <div className="font-display text-lg uppercase tracking-tight">
            {tab === "reset"
              ? "Recover Credentials"
              : tab === "update-password"
              ? "Set New Password"
              : "Tungston Auth System"}
          </div>
          <button
            onClick={onClose}
            className="grid h-7 w-7 place-items-center border-2 border-line bg-surface2 text-ink hover:bg-accent hover:text-line"
            aria-label="Close auth dialog"
          >
            <CloseIcon size={12} />
          </button>
        </div>

        {/* Tier Perks Box (visible on signin & signup) */}
        {(tab === "signin" || tab === "signup") && (
          <div className="mb-4 border-2 border-line bg-surface2 p-3 font-mono text-xs">
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
        )}

        {/* Tab switcher */}
        {(tab === "signin" || tab === "signup") && (
          <div className="flex border-2 border-line mb-4 bg-surface2">
            <button
              type="button"
              onClick={() => {
                setTab("signin");
                setErrorMsg(null);
                setInfoMsg(null);
              }}
              className={`flex-1 py-2 font-mono text-xs font-bold uppercase transition-colors ${
                tab === "signin" ? "bg-accent text-line" : "text-muted hover:text-ink"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setTab("signup");
                setErrorMsg(null);
                setInfoMsg(null);
              }}
              className={`flex-1 py-2 font-mono text-xs font-bold uppercase transition-colors ${
                tab === "signup" ? "bg-accent text-line" : "text-muted hover:text-ink"
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {tab !== "update-password" && (
            <div>
              <label className="block font-mono text-xs font-bold uppercase text-muted mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="developer@foundry.io"
                className="w-full border-2 border-line bg-base px-3 py-2 font-mono text-sm text-ink outline-none focus:border-accent"
              />
            </div>
          )}

          {tab !== "reset" && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-mono text-xs font-bold uppercase text-muted">
                  {tab === "update-password" ? "New Password" : "Password"}
                </label>
                {tab === "signin" && (
                  <button
                    type="button"
                    onClick={() => {
                      setTab("reset");
                      setErrorMsg(null);
                      setInfoMsg(null);
                    }}
                    className="text-[10px] font-bold text-accent hover:underline uppercase"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <input
                type="password"
                required
                minLength={tab === "signup" || tab === "update-password" ? 8 : 6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full border-2 border-line bg-base px-3 py-2 font-mono text-sm text-ink outline-none focus:border-accent"
              />
              {(tab === "signup" || tab === "update-password") && (
                <span className="text-[10px] text-muted block mt-1">
                  Minimum 8 characters required.
                </span>
              )}
            </div>
          )}

          {(tab === "signup" || tab === "update-password") && (
            <div>
              <label className="block font-mono text-xs font-bold uppercase text-muted mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full border-2 border-line bg-base px-3 py-2 font-mono text-sm text-ink outline-none focus:border-accent"
              />
            </div>
          )}

          {errorMsg && (
            <div className="border-2 border-danger bg-danger/10 p-2 font-mono text-xs text-danger break-words">
              {errorMsg}
            </div>
          )}

          {infoMsg && (
            <div className="border-2 border-accent bg-accent/10 p-2.5 font-mono text-xs text-accent leading-relaxed space-y-2">
              <p>{infoMsg}</p>
              {tab === "signup" && email && (
                <button
                  type="button"
                  disabled={loading || resendCooldown > 0}
                  onClick={handleResendVerification}
                  className="inline-block border border-accent bg-base px-2 py-1 text-[10px] font-bold uppercase text-accent hover:bg-accent hover:text-line disabled:opacity-50"
                >
                  {resendCooldown > 0
                    ? `Resend in ${resendCooldown}s`
                    : "Resend Verification Email ✉️"}
                </button>
              )}
            </div>
          )}

          <div className="pt-2 space-y-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full border-2 border-line bg-accent py-2.5 font-mono text-sm font-bold uppercase text-line shadow-hard-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50 hover:bg-accent/90"
            >
              {loading
                ? "AUTHENTICATING..."
                : tab === "signin"
                ? "Sign In ↗"
                : tab === "signup"
                ? "Create Account ↗"
                : tab === "reset"
                ? "Transmit Reset Link ↗"
                : "Update Password ↗"}
            </button>

            {tab === "reset" && (
              <button
                type="button"
                onClick={() => {
                  setTab("signin");
                  setErrorMsg(null);
                  setInfoMsg(null);
                }}
                className="w-full border border-line bg-surface2 py-1.5 font-mono text-xs font-bold uppercase text-muted hover:text-ink hover:bg-base"
              >
                ← Return to Sign In
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
