"use client";

import { useRef, useState } from "react";
import type { Attachment } from "@/lib/types";
import { AttachIcon, CloseIcon, ImageIcon, SendIcon } from "./Icons";

export function Composer({
  onSend,
  onGenerateImage,
  onAttach,
  staged,
  onRemoveStaged,
  busy,
  uploading,
  onStop,
}: {
  onSend: (text: string) => void;
  onGenerateImage: (prompt: string) => void;
  onAttach: (files: FileList) => void;
  staged: Attachment[];
  onRemoveStaged: (id: string) => void;
  busy: boolean;
  uploading: boolean;
  onStop?: () => void;
}) {
  const [text, setText] = useState("");
  const [imageMode, setImageMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const submit = () => {
    const value = text.trim();
    if (!value || busy) return;
    if (imageMode) onGenerateImage(value);
    else onSend(value);
    setText("");
  };

  return (
    <div className="border-t-2 border-line bg-base px-3 pb-4 pt-3 md:px-8 md:pb-5 md:pt-4 font-mono">
      {!!staged.length && (
        <div className="mb-2 flex flex-wrap gap-2">
          {staged.map((a) => (
            <div key={a.id} className="flex items-center gap-2 border-2 border-line bg-surface px-2.5 py-1.5 text-xs shadow-hard-sm">
              <span className="max-w-[8rem] truncate text-ink md:max-w-[12rem]">{a.name}</span>
              <button onClick={() => onRemoveStaged(a.id)} className="text-muted hover:text-danger" aria-label="Remove attachment">
                <CloseIcon size={11} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-1.5 md:gap-2 border-2 border-line bg-surface p-1.5 md:p-2 shadow-hard">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && onAttach(e.target.files)}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || busy}
          title="Attach a file"
          aria-label="Attach a file"
          className="grid h-9 w-9 md:h-10 md:w-10 shrink-0 place-items-center border-2 border-line bg-surface2 text-ink hover:bg-accent hover:text-line disabled:opacity-40"
        >
          <AttachIcon size={16} />
        </button>

        <button
          onClick={() => setImageMode((v) => !v)}
          disabled={busy}
          title="Generate an image instead of chatting"
          aria-pressed={imageMode}
          className={`grid h-9 w-9 md:h-10 md:w-10 shrink-0 place-items-center border-2 border-line ${
            imageMode ? "bg-accent text-line" : "bg-surface2 text-ink hover:bg-accent hover:text-line"
          } disabled:opacity-40`}
        >
          <ImageIcon size={16} />
        </button>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          rows={1}
          placeholder={
            busy
              ? "Generating response…"
              : imageMode
              ? "Describe image to forge…"
              : "Message Tungston AI… (Enter to send, Shift+Enter for new line)"
          }
          className="max-h-36 min-h-[2.4rem] flex-1 resize-none bg-transparent px-2 py-1.5 text-[15px] text-ink placeholder:text-muted font-mono leading-relaxed outline-none"
        />

        {busy ? (
          <button
            onClick={onStop}
            type="button"
            title="Stop generation"
            aria-label="Stop generation"
            className="flex items-center gap-1.5 h-9 md:h-10 px-3 shrink-0 border-2 border-line bg-danger text-white font-mono text-xs font-bold uppercase shadow-hard-sm hover:bg-red-700 active:translate-x-[1px] active:translate-y-[1px]"
          >
            <span className="inline-block h-2.5 w-2.5 bg-white" />
            <span className="hidden sm:inline">STOP</span>
          </button>
        ) : (
          <button
            onClick={submit}
            disabled={!text.trim()}
            aria-label="Send message"
            className="grid h-9 w-9 md:h-10 md:w-10 shrink-0 place-items-center border-2 border-line bg-accent text-line enabled:active:translate-x-[2px] enabled:active:translate-y-[2px] disabled:opacity-30"
          >
            <SendIcon size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
