"use client";

import { useState } from "react";
import { FilamentMark } from "./FilamentMark";
import { CloseIcon } from "./Icons";

export const ONBOARDING_STORAGE_KEY = "tungston:onboarded";

export function OnboardingModal({
  open,
  onClose,
  onOpenAuth,
  onOpenByok,
}: {
  open: boolean;
  onClose: () => void;
  onOpenAuth: () => void;
  onOpenByok: () => void;
}) {
  const [step, setStep] = useState<number>(1);

  if (!open) return null;

  const handleFinish = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-none font-mono">
      <div className="w-full max-w-lg border-3 border-line bg-surface p-5 sm:p-6 shadow-hard text-ink">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-line pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <FilamentMark size={28} />
            <div>
              <h2 className="font-display text-base sm:text-lg uppercase tracking-tight text-ink">
                Welcome to Tungston AI
              </h2>
              <span className="text-[10px] text-muted font-bold uppercase tracking-wider block">
                Foundry Onboarding // Step {step} of 3
              </span>
            </div>
          </div>
          <button
            onClick={handleFinish}
            className="grid h-7 w-7 place-items-center border-2 border-line bg-surface2 text-ink hover:bg-accent hover:text-line transition-colors"
            aria-label="Skip onboarding"
          >
            <CloseIcon size={12} />
          </button>
        </div>

        {/* Step Content */}
        {step === 1 && (
          <div className="space-y-3">
            <div className="border-2 border-line bg-surface2 p-3">
              <span className="text-[10px] font-bold text-accent uppercase tracking-wider block mb-1">
                STEP 01 // TWO-TIER INFERENCE ARCHITECTURE
              </span>
              <p className="text-xs text-ink/90 leading-relaxed mb-3">
                Tungston AI provides extreme-velocity inference without mandatory signups:
              </p>
              <div className="space-y-2 text-xs">
                <div className="border border-line bg-base p-2">
                  <div className="font-bold text-ink flex items-center justify-between">
                    <span>⚡ GUEST TIER (DEFAULT)</span>
                    <span className="text-[9px] bg-surface2 px-1.5 py-0.5 text-accent font-bold">NO SIGNUP</span>
                  </div>
                  <p className="text-[11px] text-muted mt-0.5">
                    Pre-armed with OpenAI GPT-OSS 20B on Groq LPUs. Fast, zero-friction, 20 msgs / 15m.
                  </p>
                </div>
                <div className="border border-line bg-base p-2">
                  <div className="font-bold text-ink flex items-center justify-between">
                    <span>🔑 MEMBER TIER (FREE)</span>
                    <span className="text-[9px] bg-accent px-1.5 py-0.5 text-line font-bold">UNLOCKED</span>
                  </div>
                  <p className="text-[11px] text-muted mt-0.5">
                    Sign in with email via Supabase to unlock frontier <strong className="text-ink">Qwen 3.8 27B</strong> &amp; <strong className="text-ink">GPT-OSS 120B</strong> models with higher hourly limits.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <div className="border-2 border-line bg-surface2 p-3">
              <span className="text-[10px] font-bold text-accent uppercase tracking-wider block mb-1">
                STEP 02 // BRING-YOUR-OWN-KEY (BYOK)
              </span>
              <p className="text-xs text-ink/90 leading-relaxed mb-3">
                Never get blocked by shared server quotas. Plug in your personal API keys for unlimited direct throughput:
              </p>
              <ul className="space-y-2 text-xs">
                <li className="border border-line bg-base p-2">
                  <span className="font-bold text-accent uppercase">100% Private:</span>
                  <span className="text-muted block text-[11px] mt-0.5">
                    Keys are stored exclusively in your browser's <code className="text-ink">localStorage</code>. They never touch our database.
                  </span>
                </li>
                <li className="border border-line bg-base p-2">
                  <span className="font-bold text-accent uppercase">Multi-Provider:</span>
                  <span className="text-muted block text-[11px] mt-0.5">
                    Seamlessly switch between Groq, OpenRouter, and Cerebras keys at zero markup.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <div className="border-2 border-line bg-surface2 p-3">
              <span className="text-[10px] font-bold text-accent uppercase tracking-wider block mb-1">
                STEP 03 // PROJECTS &amp; PERSISTENT CONTEXT
              </span>
              <p className="text-xs text-ink/90 leading-relaxed mb-3">
                Supercharge your coding sessions with persistent repository and architectural memory:
              </p>
              <div className="space-y-2 text-xs">
                <div className="border border-line bg-base p-2">
                  <span className="font-bold text-ink">📁 Project Knowledge Folders:</span>
                  <p className="text-[11px] text-muted mt-0.5">
                    Create a project and attach your architecture specs, Markdown files, or database schemas. They are automatically injected into the system prompt.
                  </p>
                </div>
                <div className="border border-line bg-base p-2">
                  <span className="font-bold text-ink">⌨️ Power Shortcuts:</span>
                  <p className="text-[11px] text-muted mt-0.5">
                    <kbd className="bg-surface2 px-1 text-ink">Enter</kbd> to transmit, <kbd className="bg-surface2 px-1 text-ink">Shift+Enter</kbd> for newline, and 1-click code block copying.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step Buttons & Progress */}
        <div className="mt-5 pt-3 border-t-2 border-line flex items-center justify-between gap-2">
          <div className="flex gap-1.5">
            {[1, 2, 3].map((s) => (
              <button
                key={s}
                onClick={() => setStep(s)}
                className={`h-2.5 w-6 border border-line transition-colors ${
                  step === s ? "bg-accent" : "bg-surface2 hover:bg-muted"
                }`}
                aria-label={`Jump to step ${s}`}
              />
            ))}
          </div>

          <div className="flex gap-2">
            {step > 1 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="border-2 border-line bg-surface2 px-3 py-1.5 text-xs font-bold uppercase text-ink hover:bg-base"
              >
                ← Back
              </button>
            )}

            {step < 3 ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                className="border-2 border-line bg-accent px-4 py-1.5 text-xs font-bold uppercase text-line shadow-hard-sm hover:bg-accent/90"
              >
                Next →
              </button>
            ) : (
              <button
                onClick={handleFinish}
                className="border-2 border-line bg-accent px-4 py-1.5 text-xs font-bold uppercase text-line shadow-hard-sm hover:bg-accent/90 active:translate-x-[1px] active:translate-y-[1px]"
              >
                Enter Foundry ↗
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
