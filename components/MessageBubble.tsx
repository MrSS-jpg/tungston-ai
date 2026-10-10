"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { FilamentMark } from "./FilamentMark";
import type { ChatMessage } from "@/lib/types";

function AttachmentChip({ name, mimeType }: { name: string; mimeType: string }) {
  const kind = mimeType.startsWith("image/") ? "Image" : mimeType.split("/")[1]?.toUpperCase() || "File";
  return (
    <div className="flex items-center gap-1.5 border-2 border-line bg-base px-2.5 py-1 text-xs text-ink shadow-hard-sm">
      <span className="font-mono font-bold uppercase text-accent">{kind}</span>
      <span className="max-w-[8rem] truncate md:max-w-[12rem]">{name}</span>
    </div>
  );
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="my-3 border-2 border-line bg-base shadow-hard-sm overflow-hidden font-mono">
      <div className="flex items-center justify-between border-b-2 border-line bg-surface2 px-3 py-1.5 text-xs">
        <span className="font-bold text-accent uppercase tracking-wider text-[11px]">
          {language || "CODE"}
        </span>
        <button
          type="button"
          onClick={copy}
          className="border border-line bg-surface px-2 py-0.5 text-[10px] font-bold uppercase text-ink hover:bg-accent hover:text-line active:translate-x-[1px] active:translate-y-[1px]"
        >
          {copied ? "COPIED! ✓" : "COPY CODE"}
        </button>
      </div>
      <div className="overflow-x-auto p-3 text-[13px] leading-relaxed">
        <pre className="!m-0 !p-0 !bg-transparent">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}

export function MessageBubble({
  message,
  onRegenerate,
  isLatest,
}: {
  message: ChatMessage;
  onRegenerate?: () => void;
  isLatest?: boolean;
}) {
  const [copiedMsg, setCopiedMsg] = useState(false);
  const isUser = message.role === "user";

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedMsg(true);
      setTimeout(() => setCopiedMsg(false), 2000);
    } catch {}
  };

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="min-w-0 max-w-[88%] space-y-2 md:max-w-[75%]">
          {!!message.attachments?.length && (
            <div className="flex flex-wrap justify-end gap-2">
              {message.attachments.map((a) => (
                <AttachmentChip key={a.id} name={a.name} mimeType={a.mimeType} />
              ))}
            </div>
          )}
          {message.content && (
            <div className="border-2 border-line bg-accent px-3.5 py-2.5 text-[14px] md:text-[15px] font-medium text-line shadow-hard-sm break-words whitespace-pre-wrap">
              {message.content}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2.5 md:gap-3">
      <div className="mt-0.5 shrink-0">
        <FilamentMark active={message.pending} size={28} />
      </div>
      <div className="min-w-0 max-w-[88%] border-2 border-line bg-surface px-3.5 py-2.5 shadow-hard-sm md:max-w-[80%]">
        {message.pending && !message.content ? (
          <span className="inline-block h-3 w-3 animate-heat bg-accent" />
        ) : (
          <div className="prose-tungston text-[14px] md:text-[15px] leading-relaxed break-words">
            <ReactMarkdown
              components={{
                code({ className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || "");
                  const codeText = String(children).replace(/\n$/, "");
                  const isMultiline = codeText.includes("\n") || Boolean(match);

                  if (isMultiline) {
                    return <CodeBlock language={match ? match[1].toUpperCase() : "CODE"} code={codeText} />;
                  }

                  return (
                    <code
                      className="border border-line bg-surface2 px-1.5 py-0.5 text-[13px] font-mono font-semibold text-accent"
                      {...props}
                    >
                      {children}
                    </code>
                  );
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}

        {!!message.images?.length && (
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {message.images.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={src} alt="Generated" className="border-2 border-line shadow-hard-sm w-full h-auto" />
            ))}
          </div>
        )}

        {/* Action Toolbar on completed Assistant messages */}
        {!message.pending && message.content && (
          <div className="mt-3 flex items-center gap-2 pt-2 border-t border-line/60 font-mono text-[11px]">
            <button
              type="button"
              onClick={handleCopyMessage}
              className="flex items-center gap-1 border border-line bg-surface2 px-2 py-0.5 font-bold uppercase text-muted hover:bg-accent hover:text-line hover:border-accent"
              title="Copy message to clipboard"
            >
              {copiedMsg ? "COPIED! ✓" : "📋 COPY"}
            </button>
            {isLatest && onRegenerate && (
              <button
                type="button"
                onClick={onRegenerate}
                className="flex items-center gap-1 border border-line bg-surface2 px-2 py-0.5 font-bold uppercase text-muted hover:bg-accent hover:text-line hover:border-accent"
                title="Regenerate this response"
              >
                🔄 REGENERATE
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
