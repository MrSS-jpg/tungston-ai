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
    <div className="border-t border-black/30 bg-base px-4 pb-5 pt-3 md:px-8">
      {!!staged.length && (
        <div className="mb-2 flex flex-wrap gap-2">
          {staged.map((a) => (
            <div key={a.id} className="flex items-center gap-2 rounded-lg bg-surface px-2.5 py-1.5 text-xs shadow-raised-sm">
              <span className="max-w-[9rem] truncate text-muted">{a.name}</span>
              <button onClick={() => onRemoveStaged(a.id)} className="text-muted hover:text-danger">
                <CloseIcon size={11} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2 rounded-2xl bg-surface p-2 shadow-pressed">
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
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-muted shadow-raised-sm transition hover:text-ink active:shadow-pressed-sm disabled:opacity-40"
        >
          <AttachIcon />
        </button>

        <button
          onClick={() => setImageMode((v) => !v)}
          title="Generate an image instead of chatting"
          aria-pressed={imageMode}
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl shadow-raised-sm transition active:shadow-pressed-sm ${
            imageMode ? "text-accent shadow-glow" : "text-muted hover:text-ink"
          }`}
        >
          <ImageIcon />
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
          placeholder={imageMode ? "Describe the image to generate…" : "Message Tungston AI…"}
          className="max-h-40 min-h-[2.5rem] flex-1 resize-none bg-transparent px-2 py-2 text-[15px] text-ink placeholder:text-muted"
        />

        <button
          onClick={submit}
          disabled={busy || !text.trim()}
          aria-label="Send message"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface text-accent shadow-raised-sm transition enabled:hover:shadow-glow active:shadow-pressed-sm disabled:opacity-30"
        >
          <SendIcon />
        </button>
      </div>
    </div>
  );
}
