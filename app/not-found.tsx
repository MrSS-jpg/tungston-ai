import Link from "next/link";
import { FilamentMark } from "@/components/FilamentMark";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-base text-ink flex flex-col items-center justify-center p-4 font-mono select-none">
      <div className="w-full max-w-md border-3 border-line bg-surface p-6 sm:p-8 shadow-hard text-center">
        <div className="flex justify-center mb-4">
          <FilamentMark size={48} />
        </div>

        <div className="font-display text-4xl sm:text-5xl uppercase tracking-tight text-accent mb-2">
          404
        </div>

        <div className="font-mono text-xs font-bold uppercase tracking-wider text-muted border-y border-line py-2 mb-4">
          ELEMENT 74 // ROUTE NOT FOUND
        </div>

        <p className="font-mono text-xs text-ink/80 leading-relaxed mb-6">
          The requested coordinate or industrial tool does not exist in the Tungston Foundry.
          Check the URL address or return to the main workspace.
        </p>

        <Link
          href="/"
          className="inline-block w-full border-2 border-line bg-accent py-2.5 px-4 font-mono text-xs font-bold uppercase text-line shadow-hard-sm hover:bg-accent/90 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
        >
          ← Return to Foundry
        </Link>
      </div>
    </div>
  );
}
