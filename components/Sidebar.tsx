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
      className={`${open ? "w-72 border-r-2 p-4" : "w-0 border-r-0 p-0"} shrink-0 overflow-hidden border-line bg-surface`}
    >
      <div className="flex items-center gap-3 border-b-2 border-line pb-4">
        <FilamentMark size={32} />
        <span className="font-display text-lg uppercase leading-none tracking-tight">Tungston AI</span>
      </div>

      <button
        onClick={onNew}
        className="my-4 flex w-full items-center gap-2 border-2 border-line bg-accent px-4 py-2.5 text-left font-mono text-sm font-bold uppercase text-line shadow-hard-sm active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
      >
        <PlusIcon size={14} /> New chat
      </button>

      <nav className="flex flex-col gap-2 overflow-y-auto pr-1" style={{ maxHeight: "calc(100vh - 190px)" }}>
        {conversations.map((c) => (
          <div key={c.id} className="group relative">
            <button
              onClick={() => onSelect(c.id)}
              className={`w-full truncate border-2 px-3 py-2 pr-8 text-left font-mono text-sm ${
                c.id === activeId
                  ? "border-line bg-ink font-bold text-line shadow-hard-sm"
                  : "border-transparent text-muted hover:border-line hover:bg-surface2 hover:text-ink"
              }`}
            >
              {c.title || "New chat"}
            </button>
            <button
              onClick={() => onDelete(c.id)}
              aria-label="Delete conversation"
              className={`absolute right-1.5 top-2.5 hidden p-1 group-hover:block ${
                c.id === activeId ? "text-line hover:text-danger" : "text-muted hover:text-danger"
              }`}
            >
              <CloseIcon size={11} />
            </button>
          </div>
        ))}
      </nav>
    </aside>
  );
}
