"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Sidebar } from "./Sidebar";
import { Composer } from "./Composer";
import { MessageBubble } from "./MessageBubble";
import { ContextGauge } from "./ContextGauge";
import { FilamentMark } from "./FilamentMark";
import { MenuIcon, SunIcon, MoonIcon } from "./Icons";
import { estimateTokens } from "@/lib/estimateTokens";
import type { Attachment, ChatMessage, Conversation } from "@/lib/types";

const STORAGE_KEY = "tungston:conversations";
const uid = () => (crypto as any).randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

function emptyConversation(): Conversation {
  const now = Date.now();
  return { id: uid(), title: "New chat", messages: [], createdAt: now, updatedAt: now };
}

export default function ChatApp() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [staged, setStaged] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isLightMode, setIsLightMode] = useState(false);

  useEffect(() => {
    if (isLightMode) {
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
    }
  }, [isLightMode]);
  const [config, setConfig] = useState({ provider: "nara", contextWindowTokens: 128_000 });
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load persisted conversations + server config once on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed: Conversation[] = raw ? JSON.parse(raw) : [];
      if (parsed.length) {
        setConversations(parsed);
        setActiveId(parsed[0].id);
      } else {
        const c = emptyConversation();
        setConversations([c]);
        setActiveId(c.id);
      }
    } catch {
      const c = emptyConversation();
      setConversations([c]);
      setActiveId(c.id);
    }
    fetch("/api/config")
      .then((r) => r.json())
      .then(setConfig)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (conversations.length) localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  }, [conversations]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [conversations, activeId]);

  const active = useMemo(() => conversations.find((c) => c.id === activeId) ?? null, [conversations, activeId]);

  const contextUsed = useMemo(
    () => (active ? active.messages.reduce((sum, m) => sum + estimateTokens(m.content), 0) : 0),
    [active]
  );

  function updateConversation(id: string, fn: (c: Conversation) => Conversation) {
    setConversations((prev) => prev.map((c) => (c.id === id ? fn(c) : c)));
  }

  function newConversation() {
    const c = emptyConversation();
    setConversations((prev) => [c, ...prev]);
    setActiveId(c.id);
  }

  function deleteConversation(id: string) {
    setConversations((prev) => {
      const next = prev.filter((c) => c.id !== id);
      if (id === activeId) setActiveId(next[0]?.id ?? null);
      return next.length ? next : [emptyConversation()];
    });
  }

  async function handleAttach(files: FileList) {
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: form });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Upload failed");
        setStaged((prev) => [
          ...prev,
          { id: uid(), name: json.name, mimeType: json.mimeType, fileUri: json.fileUri, dataUrl: json.dataUrl, sizeBytes: json.sizeBytes },
        ]);
      }
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  function removeStaged(id: string) {
    setStaged((prev) => prev.filter((a) => a.id !== id));
  }

  async function sendMessage(text: string) {
    if (!active) return;
    const convoId = active.id;
    const userMsg: ChatMessage = { id: uid(), role: "user", content: text, attachments: staged, createdAt: Date.now() };
    const assistantMsg: ChatMessage = { id: uid(), role: "assistant", content: "", pending: true, createdAt: Date.now() };

    const isFirstMessage = active.messages.length === 0;
    updateConversation(convoId, (c) => ({
      ...c,
      title: isFirstMessage ? text.slice(0, 40) : c.title,
      messages: [...c.messages, userMsg, assistantMsg],
      updatedAt: Date.now(),
    }));
    setStaged([]);
    setStreaming(true);

    try {
      const history = [...active.messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
        attachments: m.attachments?.map((a) => ({ mimeType: a.mimeType, fileUri: a.fileUri, dataUrl: a.dataUrl })),
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      if (!res.body) throw new Error("No response stream");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        updateConversation(convoId, (c) => ({
          ...c,
          messages: c.messages.map((m) => (m.id === assistantMsg.id ? { ...m, content: acc } : m)),
        }));
      }
      updateConversation(convoId, (c) => ({
        ...c,
        messages: c.messages.map((m) => (m.id === assistantMsg.id ? { ...m, pending: false } : m)),
      }));
    } catch (err) {
      updateConversation(convoId, (c) => ({
        ...c,
        messages: c.messages.map((m) =>
          m.id === assistantMsg.id ? { ...m, pending: false, content: `Something went wrong: ${(err as Error).message}` } : m
        ),
      }));
    } finally {
      setStreaming(false);
    }
  }

  async function generateImage(prompt: string) {
    if (!active) return;
    const convoId = active.id;
    const userMsg: ChatMessage = { id: uid(), role: "user", content: prompt, createdAt: Date.now() };
    const assistantMsg: ChatMessage = { id: uid(), role: "assistant", content: "", pending: true, createdAt: Date.now() };
    updateConversation(convoId, (c) => ({ ...c, messages: [...c.messages, userMsg, assistantMsg], updatedAt: Date.now() }));
    setStreaming(true);

    try {
      const res = await fetch("/api/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Image generation failed");
      updateConversation(convoId, (c) => ({
        ...c,
        messages: c.messages.map((m) => (m.id === assistantMsg.id ? { ...m, pending: false, images: json.images } : m)),
      }));
    } catch (err) {
      updateConversation(convoId, (c) => ({
        ...c,
        messages: c.messages.map((m) =>
          m.id === assistantMsg.id ? { ...m, pending: false, content: `Couldn't generate that: ${(err as Error).message}` } : m
        ),
      }));
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-base text-ink">
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={setActiveId}
        onNew={newConversation}
        onDelete={deleteConversation}
        open={sidebarOpen}
      />

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b-2 border-line bg-surface px-4 py-3 md:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              aria-label="Toggle sidebar"
              className="grid h-9 w-9 place-items-center border-2 border-line bg-surface2 text-ink hover:bg-accent hover:text-line"
            >
              <MenuIcon size={16} />
            </button>
            <span className="border-2 border-line bg-ink px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wider text-base">{config.provider}</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsLightMode(!isLightMode)}
              aria-label="Toggle theme"
              className="grid h-9 w-9 place-items-center border-2 border-line bg-surface2 text-ink hover:bg-accent hover:text-line"
            >
              {isLightMode ? <MoonIcon size={16} /> : <SunIcon size={16} />}
            </button>
            <ContextGauge used={contextUsed} max={config.contextWindowTokens} />
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 space-y-5 overflow-y-auto px-4 py-6 md:px-8">
          {!active?.messages.length && (
            <div className="flex h-full items-center justify-center">
              <div className="flex max-w-sm flex-col items-center gap-4 border-2 border-line bg-surface p-8 text-center shadow-hard">
                <FilamentMark size={56} />
                <p className="font-display text-3xl uppercase leading-none text-ink">Tungston AI</p>
                <p className="text-sm text-muted">Built to run long. Ask a question, drop in a file, or generate an image.</p>
              </div>
            </div>
          )}
          {active?.messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}
        </div>

        <Composer
          onSend={sendMessage}
          onGenerateImage={generateImage}
          onAttach={handleAttach}
          staged={staged}
          onRemoveStaged={removeStaged}
          busy={streaming}
          uploading={uploading}
        />
      </main>
    </div>
  );
}
