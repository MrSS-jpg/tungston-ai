"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global Fatal Error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-[#24272B] text-[#F2EFE6] font-mono min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-lg border-2 border-[#FF6B5A] bg-[#2E3237] p-6 shadow-[4px_4px_0_#0B0C0D]">
          <h1 className="font-bold text-lg uppercase text-[#FF6B5A] mb-2">
            CRITICAL KERNEL CRASH // GLOBAL EXCEPTION
          </h1>
          <p className="text-xs text-[#A0A3A9] mb-4">
            A fatal exception occurred in the root render pipeline.
          </p>
          {error.message && (
            <pre className="bg-[#24272B] p-3 text-xs text-[#FF6B5A] border border-[#0B0C0D] mb-4 overflow-x-auto whitespace-pre-wrap">
              {error.message}
            </pre>
          )}
          <button
            onClick={() => reset()}
            className="w-full border-2 border-[#0B0C0D] bg-[#FFA85C] text-[#0B0C0D] py-2 font-bold uppercase text-xs shadow-[2px_2px_0_#0B0C0D] hover:bg-[#FFA85C]/90"
          >
            Hard Reload Application
          </button>
        </div>
      </body>
    </html>
  );
}
