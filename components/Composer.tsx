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
}: {
  onSend: (text: string) => void;
  onGenerateImage: (prompt: string) => void;
  onAttach: (files: FileList) => void;
  staged: Attachment[];
  onRemoveStaged: (id: string) => void;
  busy: boolean;
  uploading: boolean;
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
    <div className="border-t-2 border-line bg-base px-3 pb-4 pt-3 md:px-8 md:pb-5 md:pt-4">
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
          disabled={uploading}
          title="Attach a file"
          aria-label="Attach a file"
          className="grid h-9 w-9 md:h-10 md:w-10 shrink-0 place-items-center border-2 border-line bg-surface2 text-ink hover:bg-accent hover:text-line disabled:opacity-40"
        >
          <AttachIcon size={16} />
        </button>

        <button
          onClick={() => setImageMode((v) => !v)}
          title="Generate an image instead of chatting"
          aria-pressed={imageMode}
          className={`grid h-9 w-9 md:h-10 md:w-10 shrink-0 place-items-center border-2 border-line ${
            imageMode ? "bg-accent text-line" : "bg-surface2 text-ink hover:bg-accent hover:text-line"
          }`}
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
          placeholder={imageMode ? "Describe image to forge…" : "Message Tungston AI…"}
          className="max-h-36 min-h-[2.4rem] flex-1 resize-none bg-transparent px-2 py-1.5 text-[16px] md:text-[15px] text-ink placeholder:text-muted font-mono leading-relaxed"
        />

        <button
          onClick={submit}
          disabled={busy || !text.trim()}
          aria-label="Send message"
          className="grid h-9 w-9 md:h-10 md:w-10 shrink-0 place-items-center border-2 border-line bg-accent text-line enabled:active:translate-x-[2px] enabled:active:translate-y-[2px] disabled:opacity-30"
        >
          <SendIcon size={16} />
        </button>
      </div>
    </div>
  );
}
