"use client";

import { useEffect } from "react";
import Link from "next/link";
import { FilamentMark } from "@/components/FilamentMark";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console or error tracker
    console.error("Tungston AI Unhandled Runtime Error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-base text-ink flex flex-col items-center justify-center p-4 font-mono">
      <div className="w-full max-w-lg border-3 border-danger bg-surface p-6 sm:p-8 shadow-hard">
        <div className="flex items-center justify-between border-b-2 border-line pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <FilamentMark size={28} />
            <span className="font-display text-lg uppercase tracking-tight text-danger">
              System Fault Detected
            </span>
          </div>
          <span className="px-2 py-0.5 border border-danger bg-danger/10 text-danger text-[10px] font-bold uppercase">
            STATUS 500
          </span>
        </div>

        <p className="font-mono text-xs text-ink/80 leading-relaxed mb-4">
          The application encountered an unexpected runtime exception. All persistent state in local storage has been protected.
        </p>

        {error.message && (
          <div className="border-2 border-line bg-base p-3 mb-4 text-xs font-mono text-danger/90 break-words max-h-36 overflow-y-auto">
            <span className="font-bold text-muted block mb-1 uppercase text-[10px]">Error Digest:</span>
            <code>{error.message}</code>
            {error.digest && (
              <span className="block mt-1 text-[10px] text-muted">ID: {error.digest}</span>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
          <button
            onClick={() => reset()}
            className="flex-1 border-2 border-line bg-accent py-2.5 px-4 font-mono text-xs font-bold uppercase text-line shadow-hard-sm hover:bg-accent/90 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all text-center"
          >
            🔄 Reboot Console
          </button>
          <Link
            href="/"
            className="border-2 border-line bg-surface2 py-2.5 px-4 font-mono text-xs font-bold uppercase text-ink hover:bg-base hover:text-accent transition-colors text-center"
          >
            ← Return Home
          </Link>
        </div>
      </div>
    </div>
  );
}
