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
}: {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  open: boolean;
}) {
  return (
    <aside
      className={`${open ? "w-72 p-4" : "w-0 p-0"} shrink-0 overflow-hidden border-r border-black/30 bg-[#1A1C1F] transition-all duration-200`}
    >
      <div className="flex items-center gap-2 px-1 pb-5">
        <FilamentMark size={24} />
        <span className="font-display text-[15px] font-medium tracking-wide">Tungston AI</span>
      </div>

      <button
        onClick={onNew}
        className="mb-4 flex w-full items-center gap-2 rounded-xl bg-surface px-4 py-2.5 text-left text-sm text-ink shadow-raised-sm transition active:shadow-pressed-sm"
      >
        <PlusIcon size={14} /> New chat
      </button>

      <nav className="flex flex-col gap-1 overflow-y-auto" style={{ maxHeight: "calc(100vh - 160px)" }}>
        {conversations.map((c) => (
          <div key={c.id} className="group relative">
            <button
              onClick={() => onSelect(c.id)}
              className={`w-full truncate rounded-lg px-3 py-2 text-left text-sm transition ${
                c.id === activeId ? "bg-surface2 text-ink shadow-pressed-sm" : "text-muted hover:bg-white/5"
              }`}
            >
              {c.title || "New chat"}
            </button>
            <button
              onClick={() => onDelete(c.id)}
              aria-label="Delete conversation"
              className="absolute right-1.5 top-2 hidden rounded-md p-1 text-muted hover:text-danger group-hover:block"
            >
              <CloseIcon size={11} />
            </button>
          </div>
        ))}
      </nav>
    </aside>
  );
}
