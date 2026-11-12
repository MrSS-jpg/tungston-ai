"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FilamentMark } from "./FilamentMark";
import type { ChatMessage } from "@/lib/types";

function AttachmentChip({ name, mimeType }: { name: string; mimeType: string }) {
  const kind = mimeType.startsWith("image/") ? "Image" : mimeType.split("/")[1]?.toUpperCase() || "File";
  return (
    <div className="flex items-center gap-1.5 border-2 border-line bg-base px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs text-ink shadow-hard-sm">
      <span className="font-mono font-bold uppercase text-accent">{kind}</span>
      <span className="max-w-[7rem] truncate sm:max-w-[12rem]">{name}</span>
    </div>
  );
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const lineCount = code.split("\n").length;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="my-3 border-2 border-line bg-base shadow-hard-sm overflow-hidden font-mono max-w-full">
      <div className="flex items-center justify-between border-b-2 border-line bg-surface2 px-2.5 sm:px-3 py-1.5 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-accent uppercase tracking-wider text-[10px] sm:text-[11px]">
            {language || "CODE"}
          </span>
          <span className="text-[9px] sm:text-[10px] text-muted border border-line bg-surface px-1 py-0.2 font-mono">
            {lineCount} {lineCount === 1 ? "line" : "lines"}
          </span>
        </div>
        <button
          type="button"
          onClick={copy}
          className="border border-line bg-surface px-2 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase text-ink hover:bg-accent hover:text-line active:translate-x-[1px] active:translate-y-[1px] transition-colors"
        >
          {copied ? "COPIED! ✓" : "COPY CODE"}
        </button>
      </div>
      <div className="overflow-x-auto p-2.5 sm:p-3 text-[12px] sm:text-[13px] leading-relaxed max-w-full">
        <pre className="!m-0 !p-0 !bg-transparent text-ink/90 font-mono">
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
      <div className="flex justify-end w-full min-w-0">
        <div className="min-w-0 max-w-[90%] sm:max-w-[80%] space-y-2">
          {!!message.attachments?.length && (
            <div className="flex flex-wrap justify-end gap-1.5 sm:gap-2">
              {message.attachments.map((a) => (
                <AttachmentChip key={a.id} name={a.name} mimeType={a.mimeType} />
              ))}
            </div>
          )}
          {message.content && (
            <div className="border-2 border-line bg-accent px-3.5 py-2.5 text-[13.5px] sm:text-[14.5px] font-medium text-line shadow-hard-sm break-words whitespace-pre-wrap overflow-hidden [overflow-wrap:anywhere]">
              {message.content}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2 sm:gap-3 w-full min-w-0">
      <div className="mt-0.5 shrink-0">
        <FilamentMark active={message.pending} size={28} />
      </div>
      <div className="min-w-0 flex-1 max-w-[95%] sm:max-w-[85%] border-2 border-line bg-surface p-3 sm:p-4 shadow-hard-sm overflow-hidden">
        {message.pending && !message.content ? (
          <span className="inline-block h-3 w-3 animate-heat bg-accent" />
        ) : (
          <div className="prose-tungston text-[13.5px] sm:text-[14.5px] leading-relaxed break-words overflow-hidden">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
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
                      className="border border-line bg-surface2 px-1.5 py-0.5 text-[12px] sm:text-[13px] font-mono font-semibold text-accent"
                      {...props}
                    >
                      {children}
                    </code>
                  );
                },
                table({ children }) {
                  return (
                    <div className="my-3 w-full overflow-x-auto border-2 border-line bg-surface shadow-hard-sm">
                      <table className="w-full border-collapse text-left font-mono text-xs sm:text-[13px]">
                        {children}
                      </table>
                    </div>
                  );
                },
                thead({ children }) {
                  return (
                    <thead className="border-b-2 border-line bg-surface2 font-bold uppercase tracking-wider text-ink text-[11px] sm:text-xs">
                      {children}
                    </thead>
                  );
                },
                th({ children }) {
                  return <th className="border-r border-line/40 px-2.5 sm:px-3 py-2 font-bold last:border-r-0">{children}</th>;
                },
                td({ children }) {
                  return (
                    <td className="border-b border-r border-line/30 px-2.5 sm:px-3 py-1.5 sm:py-2 font-mono tabular-nums text-ink/90 last:border-r-0">
                      {children}
                    </td>
                  );
                },
                tr({ children }) {
                  return <tr className="border-b border-line/20 last:border-b-0 hover:bg-surface2/30 transition-colors">{children}</tr>;
                },
                h1({ children }) {
                  return <h1 className="mt-5 mb-2 font-display text-lg md:text-xl uppercase tracking-tight text-ink border-b-2 border-line pb-1">{children}</h1>;
                },
                h2({ children }) {
                  return <h2 className="mt-4 mb-2 font-display text-base md:text-lg uppercase tracking-tight text-ink flex items-center gap-1.5"><span className="text-accent text-xs">■</span>{children}</h2>;
                },
                h3({ children }) {
                  return <h3 className="mt-3 mb-1.5 font-mono text-xs sm:text-sm font-bold uppercase tracking-wide text-accent">{children}</h3>;
                },
                p({ children }) {
                  return <p className="mb-2.5 sm:mb-3 leading-[1.65] last:mb-0 text-ink/95">{children}</p>;
                },
                ul({ children }) {
                  return <ul className="my-2 space-y-1 pl-4 list-square marker:text-accent">{children}</ul>;
                },
                ol({ children }) {
                  return <ol className="my-2 space-y-1 pl-4 list-decimal marker:font-bold marker:text-accent">{children}</ol>;
                },
                li({ children }) {
                  return <li className="leading-relaxed text-ink/95">{children}</li>;
                },
                blockquote({ children }) {
                  return <blockquote className="my-3 border-l-4 border-accent bg-surface2/60 px-3.5 py-2 text-xs sm:text-sm font-mono italic text-ink/90 shadow-hard-sm">{children}</blockquote>;
                },
                strong({ children }) {
                  return <strong className="font-bold text-ink underline decoration-accent/60 underline-offset-2">{children}</strong>;
                },
                a({ href, children }) {
                  return <a href={href} target="_blank" rel="noopener noreferrer" className="font-bold text-accent underline underline-offset-3 hover:text-ink hover:bg-accent px-0.5 transition-colors">{children} ↗</a>;
                },
                hr() {
                  return <hr className="my-3 sm:my-4 border-t-2 border-line" />;
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}

        {!!message.images?.length && (
          <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {message.images.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={src} alt="Generated" className="border-2 border-line shadow-hard-sm w-full h-auto" />
            ))}
          </div>
        )}

        {/* Action Toolbar on completed Assistant messages */}
        {!message.pending && message.content && (
          <div className="mt-2.5 sm:mt-3 flex items-center gap-1.5 sm:gap-2 pt-2 border-t border-line/50 font-mono text-[10px] sm:text-[11px]">
            <button
              type="button"
              onClick={handleCopyMessage}
              className="flex items-center gap-1 border border-line bg-surface2 px-2 py-0.5 font-bold uppercase text-muted hover:bg-accent hover:text-line hover:border-accent active:translate-x-[1px] active:translate-y-[1px] transition-colors"
              title="Copy message to clipboard"
            >
              {copiedMsg ? "COPIED! ✓" : "📋 COPY"}
            </button>
            {isLatest && onRegenerate && (
              <button
                type="button"
                onClick={onRegenerate}
                className="flex items-center gap-1 border border-line bg-surface2 px-2 py-0.5 font-bold uppercase text-muted hover:bg-accent hover:text-line hover:border-accent active:translate-x-[1px] active:translate-y-[1px] transition-colors"
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
