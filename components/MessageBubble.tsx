import ReactMarkdown from "react-markdown";
import { FilamentMark } from "./FilamentMark";
import type { ChatMessage } from "@/lib/types";

function AttachmentChip({ name, mimeType }: { name: string; mimeType: string }) {
  const kind = mimeType.startsWith("image/") ? "Image" : mimeType.split("/")[1]?.toUpperCase() || "File";
  return (
    <div className="flex items-center gap-1.5 border-2 border-line bg-base px-2.5 py-1 text-xs text-ink shadow-hard-sm">
      <span className="font-mono font-bold uppercase text-accent">{kind}</span>
      <span className="max-w-[10rem] truncate">{name}</span>
    </div>
  );
}

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%] space-y-2">
          {!!message.attachments?.length && (
            <div className="flex flex-wrap justify-end gap-2">
              {message.attachments.map((a) => (
                <AttachmentChip key={a.id} name={a.name} mimeType={a.mimeType} />
              ))}
            </div>
          )}
          {message.content && (
            <div className="border-2 border-line bg-accent px-4 py-2.5 text-[15px] font-medium text-line shadow-hard-sm">
              {message.content}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <div className="mt-0.5 shrink-0">
        <FilamentMark active={message.pending} size={30} />
      </div>
      <div className="min-w-0 max-w-[80%] border-2 border-line bg-surface px-4 py-2.5 shadow-hard-sm">
        {message.pending && !message.content ? (
          <span className="inline-block h-3 w-3 animate-heat bg-accent" />
        ) : (
          <div className="prose-tungston text-[15px] leading-relaxed">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}
        {!!message.images?.length && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            {message.images.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={src} alt="Generated" className="border-2 border-line shadow-hard-sm" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
