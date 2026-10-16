import Link from "next/link";
import { FilamentMark } from "@/components/FilamentMark";

export const metadata = {
  title: "Privacy Policy — Tungston AI",
  description: "Privacy policy and data protection standards for Tungston AI.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-base text-ink font-mono py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <header className="border-3 border-line bg-surface p-6 shadow-hard flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <FilamentMark size={36} />
            <div>
              <h1 className="font-display text-2xl uppercase tracking-tight text-ink">
                Privacy Policy
              </h1>
              <p className="text-xs text-muted font-bold uppercase tracking-wider">
                ELEMENT 74 // DATA INTEGRITY & PRIVACY PROTOCOL
              </p>
            </div>
          </div>
          <Link
            href="/"
            className="border-2 border-line bg-surface2 px-3 py-1.5 text-xs font-bold uppercase text-ink hover:bg-accent hover:text-line text-center transition-colors"
          >
            ← Back to App
          </Link>
        </header>

        {/* Content Box */}
        <div className="border-3 border-line bg-surface p-6 sm:p-8 shadow-hard space-y-6 text-xs sm:text-sm leading-relaxed text-ink/90">
          <div className="border-b-2 border-line pb-4">
            <span className="text-[10px] font-bold uppercase text-accent tracking-widest block mb-1">
              EFFECTIVE DATE: OCTOBER 2026 // VERSION 1.0
            </span>
            <p className="font-bold text-ink">
              Tungston AI is engineered under a strict minimal-data philosophy. We do not sell your personal data, train proprietary models on your personal prompts, or inject behavioral tracking trackers.
            </p>
          </div>

          <section className="space-y-2">
            <h2 className="font-display text-base uppercase text-accent">
              1. Information We Collect
            </h2>
            <p>
              • <strong>Account Credentials:</strong> If you sign up, your email and cryptographically hashed password are stored securely via Supabase Auth. Guest tier users can use the platform without providing an email address.
            </p>
            <p>
              • <strong>Bring-Your-Own-Key (BYOK):</strong> Any API keys you supply (e.g., Groq, OpenRouter, Cerebras) are stored solely in your browser's <code className="bg-base px-1.5 py-0.5 border border-line">localStorage</code>. They are transmitted directly in headers over HTTPS and are never logged or stored in our databases.
            </p>
            <p>
              • <strong>Chat Logs &amp; Context Files:</strong> Your conversations and project files are persisted locally on your device by default. If synced to Supabase, they are protected with strict Row Level Security (RLS) tied to your user identifier.
            </p>
            <p>
              • <strong>Telemetry &amp; Rate Limiting:</strong> We use an in-memory / Upstash Redis store to track IP request counts over sliding windows (e.g., 20 requests per 15 min for guests) solely to protect our server key from automated scraping and abuse.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-base uppercase text-accent">
              2. Third-Party Inference Providers
            </h2>
            <p>
              When executing prompts through shared server keys or BYOK keys, your message payload is sent to the respective LLM inference provider:
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs text-muted pl-2">
              <li><strong className="text-ink">Groq Inc:</strong> High-speed LPUs adhering to zero-data-retention API policies.</li>
              <li><strong className="text-ink">OpenRouter / Cerebras:</strong> Passthrough inference under standard enterprise API terms.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-base uppercase text-accent">
              3. Analytics &amp; Cookies
            </h2>
            <p>
              We do not use tracking cookies, Facebook pixels, or Google Ads tags. We use lightweight, privacy-focused Vercel Web Analytics to track general metrics (page views, country of origin, browser version) without logging IP addresses or tracking you across other sites.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-base uppercase text-accent">
              4. Data Retention &amp; Account Deletion
            </h2>
            <p>
              You maintain full control of your data. You may export your conversations as JSON or Markdown at any time, or permanently delete your account and all associated profile records via the <strong>Delete Account</strong> option in the sidebar. Deletion is instantaneous and permanent.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-base uppercase text-accent">
              5. Contact &amp; Security Reports
            </h2>
            <p>
              For privacy questions, data export requests, or security disclosures, contact the Tungston Foundry operations team via GitHub issues or email: <code className="bg-base px-1.5 py-0.5 border border-line">security@tungston.dev</code>.
            </p>
          </section>
        </div>

        {/* Footer */}
        <footer className="flex justify-between items-center text-xs text-muted font-bold uppercase tracking-wider px-2">
          <span>Tungston AI // Element 74</span>
          <Link href="/terms" className="hover:text-accent underline">
            Terms of Service →
          </Link>
        </footer>
      </div>
    </div>
  );
}
