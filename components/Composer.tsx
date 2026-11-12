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
    <div className="border-t-2 border-line bg-base px-2.5 sm:px-4 md:px-8 pt-2 sm:pt-3 pb-[max(0.65rem,env(safe-area-inset-bottom))] md:pb-4 font-mono w-full max-w-full shrink-0">
      {!!staged.length && (
        <div className="mb-2 flex flex-wrap gap-1.5 sm:gap-2 max-w-4xl mx-auto">
          {staged.map((a) => (
            <div key={a.id} className="flex items-center gap-1.5 border-2 border-line bg-surface px-2 py-1 text-xs shadow-hard-sm">
              <span className="max-w-[7rem] truncate text-ink md:max-w-[12rem]">{a.name}</span>
              <button onClick={() => onRemoveStaged(a.id)} className="text-muted hover:text-danger" aria-label="Remove attachment">
                <CloseIcon size={11} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-1.5 md:gap-2 border-2 border-line bg-surface p-1.5 md:p-2 shadow-hard max-w-4xl mx-auto w-full">
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
          className="grid h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 shrink-0 place-items-center border-2 border-line bg-surface2 text-ink hover:bg-accent hover:text-line disabled:opacity-40 transition-colors"
        >
          <AttachIcon size={15} />
        </button>

        <button
          onClick={() => setImageMode((v) => !v)}
          disabled={busy}
          title="Generate an image instead of chatting"
          aria-pressed={imageMode}
          className={`grid h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 shrink-0 place-items-center border-2 border-line ${
            imageMode ? "bg-accent text-line" : "bg-surface2 text-ink hover:bg-accent hover:text-line"
          } disabled:opacity-40 transition-colors`}
        >
          <ImageIcon size={15} />
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
              : "Message Tungston AI… (Enter to send)"
          }
          className="max-h-32 min-h-[2.2rem] sm:min-h-[2.4rem] flex-1 resize-none bg-transparent px-2 py-1 text-[13.5px] sm:text-[14.5px] text-ink placeholder:text-muted/60 font-mono leading-relaxed outline-none"
        />

        {busy ? (
          <button
            onClick={onStop}
            type="button"
            title="Stop generation"
            aria-label="Stop generation"
            className="flex items-center gap-1.5 h-8 sm:h-9 md:h-10 px-2.5 sm:px-3 shrink-0 border-2 border-line bg-danger text-white font-mono text-[11px] sm:text-xs font-bold uppercase shadow-hard-sm hover:bg-red-700 active:translate-x-[1px] active:translate-y-[1px]"
          >
            <span className="inline-block h-2 w-2 sm:h-2.5 sm:w-2.5 bg-white" />
            <span className="hidden sm:inline">STOP</span>
          </button>
        ) : (
          <button
            onClick={submit}
            disabled={!text.trim()}
            aria-label="Send message"
            className="grid h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 shrink-0 place-items-center border-2 border-line bg-accent text-line enabled:active:translate-x-[1px] enabled:active:translate-y-[1px] disabled:opacity-30 transition-all shadow-hard-sm"
          >
            <SendIcon size={15} />
          </button>
        )}
      </div>
    </div>
  );
}
