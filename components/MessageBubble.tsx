import ReactMarkdown from "react-markdown";
import { FilamentMark } from "./FilamentMark";
import type { ChatMessage } from "@/lib/types";

function AttachmentChip({ name, mimeType }: { name: string; mimeType: string }) {
  const kind = mimeType.startsWith("image/") ? "Image" : mimeType.split("/")[1]?.toUpperCase() || "File";
  return (
    <div className="flex items-center gap-1.5 rounded-lg bg-base px-2.5 py-1 text-xs text-muted shadow-pressed-sm">
      <span className="font-mono text-accent">{kind}</span>
      <span className="max-w-[10rem] truncate">{name}</span>
    </div>
  );
}

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end animate-rise">
        <div className="max-w-[75%] space-y-2">
          {!!message.attachments?.length && (
            <div className="flex flex-wrap justify-end gap-1.5">
              {message.attachments.map((a) => (
                <AttachmentChip key={a.id} name={a.name} mimeType={a.mimeType} />
              ))}
            </div>
          )}
          {message.content && (
            <div className="rounded-2xl rounded-tr-sm bg-surface px-4 py-2.5 text-[15px] shadow-pressed">
              {message.content}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 animate-rise">
      <div className="mt-0.5 shrink-0">
        <FilamentMark active={message.pending} size={26} />
      </div>
      <div className="min-w-0 max-w-[80%] rounded-2xl rounded-tl-sm bg-surface px-4 py-2.5 shadow-raised-sm">
        {message.pending && !message.content ? (
          <span className="inline-block h-3 w-3 animate-heat rounded-full bg-accent" />
        ) : (
          <div className="prose-tungston text-[15px] leading-relaxed">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}
        {!!message.images?.length && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            {message.images.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={src} alt="Generated" className="rounded-xl shadow-raised-sm" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
