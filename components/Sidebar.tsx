import { FilamentMark } from "./FilamentMark";
import { CloseIcon, PlusIcon } from "./Icons";
import type { Conversation } from "@/lib/types";

export function Sidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  open,
  onClose,
}: {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-xs md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col w-72 max-w-[85vw] border-r-2 border-line bg-surface p-4 transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${
          open ? "translate-x-0 md:w-72" : "-translate-x-full md:w-0 md:border-r-0 md:p-0"
        } shrink-0 overflow-hidden shadow-hard md:shadow-none`}
      >
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

        <button
          onClick={() => {
            onNew();
            if (typeof window !== "undefined" && window.innerWidth < 768) {
              onClose();
            }
          }}
          className="my-4 flex w-full items-center gap-2 border-2 border-line bg-accent px-4 py-2.5 text-left font-mono text-sm font-bold uppercase text-line shadow-hard-sm active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
        >
          <PlusIcon size={14} /> New chat
        </button>

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
                    ? "border-line bg-ink font-bold text-base shadow-hard-sm"
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
                  c.id === activeId ? "text-base hover:text-danger" : "text-muted hover:text-danger"
                } md:hidden md:group-hover:block`}
              >
                <CloseIcon size={11} />
              </button>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
