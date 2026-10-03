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

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

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
            <div className="border-2 border-line bg-accent px-3.5 py-2.5 text-[14px] md:text-[15px] font-medium text-line shadow-hard-sm break-words">
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
            <ReactMarkdown>{message.content}</ReactMarkdown>
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
      </div>
    </div>
  );
}
