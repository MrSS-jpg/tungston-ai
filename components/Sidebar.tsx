import Link from "next/link";
import { FilamentMark } from "./FilamentMark";
import { CloseIcon, PlusIcon } from "./Icons";
import type { Conversation, Project } from "@/lib/types";
import type { User } from "@supabase/supabase-js";

export function Sidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  open,
  onClose,
  activeProject,
  onOpenProjects,
  user,
  onOpenAuth,
  onSignOut,
  onExportChat,
  onClearAll,
  onOpenDeleteAccount,
  onOpenOnboarding,
}: {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  open: boolean;
  onClose: () => void;
  activeProject: Project | null;
  onOpenProjects: () => void;
  user: User | null;
  onOpenAuth: () => void;
  onSignOut: () => void;
  onExportChat?: () => void;
  onClearAll?: () => void;
  onOpenDeleteAccount?: () => void;
  onOpenOnboarding?: () => void;
}) {
  const activeConvo = conversations.find((c) => c.id === activeId);
  const hasMessages = Boolean(activeConvo && activeConvo.messages.length > 0);

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/80 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col w-72 max-w-[85vw] border-r-2 border-line bg-surface p-4 transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${
          open ? "translate-x-0 md:w-72" : "-translate-x-full pointer-events-none md:pointer-events-auto md:w-0 md:border-r-0 md:p-0"
        } shrink-0 overflow-hidden shadow-hard md:shadow-none`}
      >
        {/* Brand & Close */}
        <div className="flex items-center justify-between border-b-2 border-line pb-4">
          <div className="flex items-center gap-3">
            <FilamentMark size={32} />
            <span className="font-display text-lg uppercase leading-none tracking-tight">Tungston AI</span>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center border-2 border-line bg-surface2 text-ink hover:bg-accent hover:text-line md:hidden"
            aria-label="Close sidebar"
          >
            <CloseIcon size={14} />
          </button>
        </div>

        {/* Action Buttons: New Chat & Projects */}
        <div className="my-3 space-y-2">
          <button
            onClick={() => {
              onNew();
              if (typeof window !== "undefined" && window.innerWidth < 768) {
                onClose();
              }
            }}
            className="flex w-full items-center gap-2 border-2 border-line bg-accent px-4 py-2 text-left font-mono text-sm font-bold uppercase text-line shadow-hard-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
          >
            <PlusIcon size={14} /> New chat
          </button>

          <button
            onClick={() => {
              onOpenProjects();
              if (typeof window !== "undefined" && window.innerWidth < 768) {
                onClose();
              }
            }}
            className="flex w-full items-center justify-between border-2 border-line bg-surface2 px-4 py-2 text-left font-mono text-xs font-bold uppercase text-ink hover:bg-surface hover:border-accent"
          >
            <div className="flex items-center gap-1.5 truncate">
              <span>📁 PROJECTS</span>
              {activeProject && (
                <span className="truncate text-accent text-[10px]">
                  ({activeProject.name})
                </span>
              )}
            </div>
            <span className="text-[10px] text-muted">
              {activeProject ? `${activeProject.files.length} files` : "MANAGE"}
            </span>
          </button>

          {/* Primary Tool Switcher */}
          <div className="pt-1 space-y-1.5">
            <div className="text-[9px] font-bold uppercase tracking-wider text-muted px-1">FOUNDRY ECOSYSTEM</div>
            <div className="grid grid-cols-2 gap-1.5">
              <span className="border-2 border-line bg-accent px-2 py-1.5 text-center font-mono text-[11px] font-black uppercase text-line shadow-hard-sm">
                💬 CHAT
              </span>
              <a
                href="https://tungston-hazel.vercel.app/playground"
                className="border-2 border-line bg-surface2 px-2 py-1.5 text-center font-mono text-[11px] font-black uppercase text-ink hover:text-accent hover:border-accent transition-colors shadow-hard-sm"
                title="Open HTML App Playground on main dashboard"
              >
                ⚡ PLAY ↗
              </a>
            </div>
            <a
              href="https://tungston-hazel.vercel.app/"
              className="block border border-line bg-surface2 px-2 py-1 text-center font-mono text-[10px] font-bold uppercase text-muted hover:text-accent hover:border-accent transition-colors"
              title="Return to Main Dashboard"
            >
              🏠 MAIN DASHBOARD ↗
            </a>
          </div>
        </div>

        {/* Chat History Header & Utilities */}
        <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase tracking-wider text-muted mb-1 px-1">
          <span>Recent Chats</span>
          <div className="flex items-center gap-2">
            {hasMessages && onExportChat && (
              <button
                onClick={onExportChat}
                className="text-muted hover:text-accent font-bold"
                title="Export active conversation as Markdown (.md)"
              >
                EXPORT
              </button>
            )}
            {conversations.length > 1 && onClearAll && (
              <button
                onClick={onClearAll}
                className="text-muted hover:text-danger font-bold"
                title="Clear all chat history"
              >
                CLEAR
              </button>
            )}
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-2 overflow-y-auto pr-1">
          {conversations.length === 0 ? (
            <div className="my-auto border-2 border-dashed border-line/40 p-4 text-center">
              <span className="block font-mono text-xs font-bold uppercase text-ink/80 mb-1">
                No Chat Logs
              </span>
              <p className="font-mono text-[10px] text-muted leading-relaxed">
                Start a fresh session above or pick a starter prompt from the workbench.
              </p>
            </div>
          ) : (
            conversations.map((c) => (
              <div key={c.id} className="group relative">
                <button
                  onClick={() => {
                    onSelect(c.id);
                    if (typeof window !== "undefined" && window.innerWidth < 768) {
                      onClose();
                    }
                  }}
                  className={`w-full truncate border-2 px-3 py-2 pr-8 text-left font-mono text-sm ${
                    c.id === activeId
                      ? "border-line bg-ink font-bold text-[var(--color-base)] shadow-hard-sm"
                      : "border-transparent text-muted hover:border-line hover:bg-surface2 hover:text-ink"
                  }`}
                >
                  {c.title || "New chat"}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(c.id);
                  }}
                  aria-label="Delete conversation"
                  className={`absolute right-1.5 top-2.5 p-1 ${
                    c.id === activeId ? "text-[var(--color-base)] hover:text-danger" : "text-muted hover:text-danger"
                  } md:hidden md:group-hover:block`}
                >
                  <CloseIcon size={11} />
                </button>
              </div>
            ))
          )}
        </nav>

        {/* User / Auth Footer */}
        <div className="mt-3 border-t-2 border-line pt-3 font-mono space-y-2">
          {user ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="truncate font-bold text-ink max-w-[170px]" title={user.email}>
                  👤 {user.email?.split("@")[0]}
                </span>
                <span className="border border-line bg-accent px-1.5 py-0.5 text-[9px] font-bold text-line">
                  120B UNLOCKED
                </span>
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={onSignOut}
                  className="flex-1 border border-line bg-surface2 py-1 text-center text-[10px] font-bold uppercase text-muted hover:bg-surface hover:text-ink transition-colors"
                >
                  Sign Out
                </button>
                {onOpenDeleteAccount && (
                  <button
                    onClick={onOpenDeleteAccount}
                    className="border border-line bg-surface2 px-2 py-1 text-center text-[10px] font-bold uppercase text-muted hover:bg-danger hover:text-white transition-colors"
                    title="Permanently purge account and data"
                  >
                    Purge
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-muted">
                <span>TIER: GUEST (20B)</span>
                <span className="text-[10px] text-accent">FREE</span>
              </div>
              <button
                onClick={onOpenAuth}
                className="w-full border-2 border-line bg-accent py-1.5 text-center text-xs font-bold uppercase text-line shadow-hard-sm active:translate-x-[1px] active:translate-y-[1px]"
              >
                🔑 Sign In for 120B & Apps ↗
              </button>
            </div>
          )}

          {/* Static Legal Links & Guide Button */}
          <div className="pt-2 border-t border-line/40 flex items-center justify-between text-[10px] text-muted">
            {onOpenOnboarding && (
              <button
                onClick={onOpenOnboarding}
                className="hover:text-accent font-bold uppercase flex items-center gap-1 transition-colors"
              >
                ❓ Tour
              </button>
            )}
            <div className="flex items-center gap-2 ml-auto">
              <Link href="/privacy" className="hover:text-accent underline transition-colors">
                Privacy
              </Link>
              <span>•</span>
              <Link href="/terms" className="hover:text-accent underline transition-colors">
                Terms
              </Link>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
