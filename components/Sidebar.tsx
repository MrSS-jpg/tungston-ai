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
  onOpenByok,
  byokActive,
  onExportChat,
  onClearAll,
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
  onOpenByok: () => void;
  byokActive: boolean;
  onExportChat?: () => void;
  onClearAll?: () => void;
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
          open ? "translate-x-0 md:w-72" : "-translate-x-full md:w-0 md:border-r-0 md:p-0"
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
          {conversations.map((c) => (
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
          ))}
        </nav>

        {/* BYOK and User / Auth Footer */}
        <div className="mt-3 border-t-2 border-line pt-3 font-mono space-y-2">
          {/* BYOK Toggle Button */}
          <button
            onClick={() => {
              onOpenByok();
              if (typeof window !== "undefined" && window.innerWidth < 768) {
                onClose();
              }
            }}
            className={`w-full border-2 border-line py-1.5 px-3 flex items-center justify-between text-xs font-bold uppercase transition-colors ${
              byokActive
                ? "bg-accent text-line"
                : "bg-surface2 text-muted hover:bg-surface hover:text-ink"
            }`}
            title="Configure Bring-Your-Own-Key"
          >
            <span>🔑 BYOK KEY</span>
            <span className="text-[10px]">{byokActive ? "ACTIVE" : "CONFIG ↗"}</span>
          </button>

          {user ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="truncate font-bold text-ink max-w-[170px]" title={user.email}>
                  👤 {user.email?.split("@")[0]}
                </span>
                <span className="border border-line bg-accent px-1 py-0.2 text-[9px] font-bold text-line">
                  27B UNLOCKED
                </span>
              </div>
              <button
                onClick={onSignOut}
                className="w-full border border-line bg-surface2 py-1 text-center text-[10px] font-bold uppercase text-muted hover:bg-danger hover:text-white"
              >
                Sign Out
              </button>
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
                🔑 Sign In for Qwen 27B ↗
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
