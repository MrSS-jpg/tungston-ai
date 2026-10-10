"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Sidebar } from "./Sidebar";
import { Composer } from "./Composer";
import { MessageBubble } from "./MessageBubble";
import { ContextGauge } from "./ContextGauge";
import { FilamentMark } from "./FilamentMark";
import { MenuIcon, SunIcon, MoonIcon } from "./Icons";
import { AuthModal } from "./AuthModal";
import { ProjectsModal } from "./ProjectsModal";
import { ByokModal, getStoredByok, type ByokConfig } from "./ByokModal";
import { supabase } from "@/lib/supabase";
import { estimateTokens } from "@/lib/estimateTokens";
import type { Attachment, ChatMessage, Conversation, Project } from "@/lib/types";
import type { Session, User } from "@supabase/supabase-js";

const STORAGE_KEY = "tungston:conversations";
const PROJECTS_KEY = "tungston:projects";
const ACTIVE_PROJ_KEY = "tungston:active_project";
const uid = () => (crypto as any).randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

function emptyConversation(): Conversation {
  const now = Date.now();
  return { id: uid(), title: "New chat", messages: [], createdAt: now, updatedAt: now };
}

const STARTER_PROMPTS = [
  {
    tag: "BENCHMARK",
    title: "⚡ Speed & Precision Test",
    prompt: "Give me a 5-point technical benchmark of Groq's open-weights architecture with brutally honest pros and cons.",
  },
  {
    tag: "ARCHITECTURE",
    title: "🏗️ Edge System Audit",
    prompt: "Review a Next.js 14 fullstack architecture running edge API routes with Supabase auth and brutalist UI principles.",
  },
  {
    tag: "DEBUG",
    title: "🐞 Code Debugging",
    prompt: "Analyze this TypeScript snippet for memory leaks, unhandled edge cases, and asynchronous race conditions.",
  },
  {
    tag: "CONTEXT",
    title: "📁 Project Knowledge",
    prompt: "How does Tungston AI ingest and prioritize attached Markdown files within its system prompt context?",
  },
];

export default function ChatApp() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [staged, setStaged] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLightMode, setIsLightMode] = useState(false);

  // Supabase Auth state
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Projects state
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [projectsModalOpen, setProjectsModalOpen] = useState(false);

  // Authenticated Model selector state
  const [selectedModel, setSelectedModel] = useState<string>("qwen/qwen3.8-27b");

  // BYOK state
  const [byokConfig, setByokConfig] = useState<ByokConfig>({ key: "", provider: "groq" });
  const [byokModalOpen, setByokModalOpen] = useState(false);

  // Abort controller for Stop button
  const abortControllerRef = useRef<AbortController | null>(null);

  // Quota banner state
  const [rateLimitBanner, setRateLimitBanner] = useState<string | null>(null);

  // Set initial sidebar open state based on screen size
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth >= 768) {
      setSidebarOpen(true);
    }
  }, []);

  useEffect(() => {
    if (isLightMode) {
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
    }
  }, [isLightMode]);

  const [config, setConfig] = useState({ provider: "groq", contextWindowTokens: 128_000 });
  const scrollRef = useRef<HTMLDivElement>(null);

  // Supabase Auth listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load persisted conversations, projects, model selection + server config once on mount.
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

    try {
      const rawProj = localStorage.getItem(PROJECTS_KEY);
      if (rawProj) setProjects(JSON.parse(rawProj));
      const savedActiveProj = localStorage.getItem(ACTIVE_PROJ_KEY);
      if (savedActiveProj) setActiveProjectId(savedActiveProj);
      const savedModel = localStorage.getItem("tungston_member_model");
      if (savedModel) setSelectedModel(savedModel);
      setByokConfig(getStoredByok());
    } catch {}

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

  const activeProject = useMemo(
    () => projects.find((p) => p.id === activeProjectId) ?? null,
    [projects, activeProjectId]
  );

  const contextUsed = useMemo(
    () => (active ? active.messages.reduce((sum, m) => sum + estimateTokens(m.content), 0) : 0),
    [active]
  );

  function handleSelectModel(m: string) {
    setSelectedModel(m);
    try {
      localStorage.setItem("tungston_member_model", m);
    } catch {}
  }

  function handleSaveProjects(updated: Project[]) {
    setProjects(updated);
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(updated));
  }

  function handleSelectProject(id: string | null) {
    setActiveProjectId(id);
    if (id) localStorage.setItem(ACTIVE_PROJ_KEY, id);
    else localStorage.removeItem(ACTIVE_PROJ_KEY);
  }

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

  function handleClearAll() {
    if (confirm("Clear all conversation history? This cannot be undone.")) {
      const c = emptyConversation();
      setConversations([c]);
      setActiveId(c.id);
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  function handleExportChat() {
    if (!active || !active.messages.length) return;
    const title = active.title || "Tungston Chat";
    let md = `# ${title}\n*Exported from Tungston AI on ${new Date().toLocaleString()}*\n\n---\n\n`;
    for (const m of active.messages) {
      const speaker = m.role === "user" ? "USER" : "TUNGSTON AI";
      md += `### ${speaker} (${new Date(m.createdAt).toLocaleTimeString()}):\n\n${m.content}\n\n---\n\n`;
    }
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleStop() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setStreaming(false);
  }

  async function handleAttach(files: FileList) {
    setUploading(true);
    try {
      const form = new FormData();
      Array.from(files).forEach((f) => form.append("files", f));
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload failed");
      setStaged((prev) => [...prev, ...json.attachments]);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  function removeStaged(id: string) {
    setStaged((prev) => prev.filter((a) => a.id !== id));
  }

  async function sendMessage(text: string, isRetry = false) {
    if (!active) return;
    setRateLimitBanner(null);
    const convoId = active.id;

    let historyMessages = [...active.messages];
    if (isRetry) {
      // Remove trailing assistant message if regenerating
      if (historyMessages[historyMessages.length - 1]?.role === "assistant") {
        historyMessages.pop();
      }
    }

    const userMsg: ChatMessage = isRetry
      ? historyMessages[historyMessages.length - 1]
      : { id: uid(), role: "user", content: text, attachments: staged, createdAt: Date.now() };

    const assistantMsg: ChatMessage = { id: uid(), role: "assistant", content: "", pending: true, createdAt: Date.now() };

    const isFirstMessage = active.messages.length === 0;
    updateConversation(convoId, (c) => ({
      ...c,
      title: isFirstMessage ? text.slice(0, 40) : c.title,
      messages: isRetry ? [...historyMessages, assistantMsg] : [...historyMessages, userMsg, assistantMsg],
      updatedAt: Date.now(),
      projectId: activeProjectId,
    }));
    if (!isRetry) setStaged([]);
    setStreaming(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const history = (isRetry ? historyMessages : [...historyMessages, userMsg]).map((m) => ({
        role: m.role,
        content: m.content,
        attachments: m.attachments?.map((a) => ({ mimeType: a.mimeType, fileUri: a.fileUri, dataUrl: a.dataUrl })),
      }));

      // Assemble project context if an active project is set
      let projectContext = "";
      if (activeProject && activeProject.files.length) {
        projectContext =
          `PROJECT NAME: ${activeProject.name}\n` +
          activeProject.files
            .map(
              (f) =>
                `--- FILE: ${f.name} ---\n${f.content}\n--- END OF ${f.name} ---`
            )
            .join("\n\n");
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }
      if (byokConfig.key) {
        headers["x-byok-key"] = byokConfig.key;
        headers["x-byok-provider"] = byokConfig.provider || "groq";
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          messages: history,
          projectContext: projectContext || undefined,
          modelOverride: byokConfig.model || (user ? selectedModel : undefined),
        }),
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => null);
        const errMsg = errorJson?.error || `Server returned ${res.status}`;
        if (res.status === 429) {
          setRateLimitBanner(errMsg);
        }
        throw new Error(errMsg);
      }

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
    } catch (err: any) {
      if (err.name === "AbortError") {
        updateConversation(convoId, (c) => ({
          ...c,
          messages: c.messages.map((m) => (m.id === assistantMsg.id ? { ...m, pending: false } : m)),
        }));
      } else {
        updateConversation(convoId, (c) => ({
          ...c,
          messages: c.messages.map((m) =>
            m.id === assistantMsg.id ? { ...m, pending: false, content: `Error: ${err.message}` } : m
          ),
        }));
      }
    } finally {
      setStreaming(false);
      abortControllerRef.current = null;
    }
  }

  function handleRegenerate() {
    if (!active || !active.messages.length) return;
    const userMsgs = active.messages.filter((m) => m.role === "user");
    const lastUser = userMsgs[userMsgs.length - 1];
    if (lastUser) {
      sendMessage(lastUser.content, true);
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
    <div className="flex h-screen overflow-hidden bg-base text-ink relative">
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={setActiveId}
        onNew={newConversation}
        onDelete={deleteConversation}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeProject={activeProject}
        onOpenProjects={() => setProjectsModalOpen(true)}
        user={user}
        onOpenAuth={() => setAuthModalOpen(true)}
        onSignOut={() => supabase.auth.signOut()}
        onOpenByok={() => setByokModalOpen(true)}
        byokActive={Boolean(byokConfig.key)}
        onExportChat={handleExportChat}
        onClearAll={handleClearAll}
      />

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b-2 border-line bg-surface px-3 py-2.5 md:px-8 md:py-3 font-mono">
          <div className="flex items-center gap-2 md:gap-3">
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              aria-label="Toggle sidebar"
              className="grid h-8 w-8 md:h-9 md:w-9 place-items-center border-2 border-line bg-surface2 text-ink hover:bg-accent hover:text-line"
            >
              <MenuIcon size={16} />
            </button>
            <div className="flex items-center gap-1.5 flex-wrap">
              {byokConfig.key ? (
                <button
                  onClick={() => setByokModalOpen(true)}
                  className="flex items-center border-2 border-line bg-accent text-line px-2 py-0.5 text-[10px] md:text-[11px] font-bold uppercase shadow-hard-sm"
                  title="Click to configure BYOK settings"
                >
                  🔑 BYOK: {byokConfig.provider.toUpperCase()}
                </button>
              ) : user ? (
                <div className="flex items-center border-2 border-line bg-surface font-mono text-[10px] md:text-[11px] shadow-hard-sm">
                  <span className="bg-accent px-1.5 py-0.5 font-bold uppercase text-line hidden sm:inline-block">
                    MEMBER
                  </span>
                  <select
                    value={selectedModel}
                    onChange={(e) => handleSelectModel(e.target.value)}
                    className="bg-surface2 px-1.5 py-0.5 font-bold uppercase text-ink outline-none cursor-pointer hover:bg-surface border-l sm:border-l-0 border-line"
                    title="Select model for signed-in tier"
                  >
                    <option value="qwen/qwen3.8-27b">QWEN 3.8 27B (DEFAULT)</option>
                    <option value="openai/gpt-oss-120b">GPT-OSS 120B (FLAGSHIP)</option>
                    <option value="openai/gpt-oss-20b">GPT-OSS 20B (TURBO)</option>
                  </select>
                </div>
              ) : (
                <span className="border-2 border-line bg-ink px-1.5 py-0.5 font-mono text-[10px] md:text-[11px] font-bold uppercase tracking-wider text-[var(--color-base)]">
                  GROQ: GPT-OSS 20B (GUEST)
                </span>
              )}

              {activeProject ? (
                <button
                  onClick={() => setProjectsModalOpen(true)}
                  className="border-2 border-line bg-surface2 px-1.5 py-0.5 font-mono text-[10px] md:text-[11px] font-bold uppercase text-accent hover:bg-accent hover:text-line truncate max-w-[150px] md:max-w-[220px]"
                  title="Click to view/edit project context files"
                >
                  📁 {activeProject.name} ({activeProject.files.length}/5 files)
                </button>
              ) : (
                <button
                  onClick={() => setProjectsModalOpen(true)}
                  className="hidden sm:inline-block border border-line bg-surface2 px-1.5 py-0.5 font-mono text-[10px] text-muted hover:text-ink"
                >
                  + Attach Project Context
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            {!byokConfig.key && (
              <button
                onClick={() => setByokModalOpen(true)}
                className="hidden lg:inline-block border border-line bg-surface2 px-2 py-1 text-[10px] font-bold uppercase text-muted hover:text-ink"
                title="Bring your own API key"
              >
                BYOK ↗
              </button>
            )}
            {!user && (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="hidden sm:inline-block border-2 border-line bg-accent px-2.5 py-1 font-mono text-[10px] md:text-xs font-bold uppercase text-line shadow-hard-sm"
              >
                Sign In ↗
              </button>
            )}
            <button
              onClick={() => setIsLightMode(!isLightMode)}
              aria-label="Toggle theme"
              className="grid h-8 w-8 md:h-9 md:w-9 place-items-center border-2 border-line bg-surface2 text-ink hover:bg-accent hover:text-line"
            >
              {isLightMode ? <MoonIcon size={15} /> : <SunIcon size={15} />}
            </button>
            <ContextGauge used={contextUsed} max={config.contextWindowTokens} />
          </div>
        </header>

        {/* Rate Limit Banner */}
        {rateLimitBanner && (
          <div className="border-b-2 border-line bg-surface2 px-4 py-2 font-mono text-xs flex items-center justify-between text-ink">
            <div className="flex items-center gap-2">
              <span className="font-bold text-danger">⚠️ RATE LIMIT:</span>
              <span>{rateLimitBanner}</span>
            </div>
            <button
              onClick={() => setByokModalOpen(true)}
              className="border border-line bg-accent px-2 py-0.5 font-bold uppercase text-line text-[10px]"
            >
              Use BYOK Key ↗
            </button>
          </div>
        )}

        <div ref={scrollRef} className="flex-1 space-y-4 md:space-y-5 overflow-y-auto px-3 py-4 md:px-8 md:py-6">
          {!active?.messages.length && (
            <div className="flex min-h-full flex-col items-center justify-center p-2 sm:p-4 font-mono">
              <div className="flex max-w-xl flex-col items-center gap-3 border-2 border-line bg-surface p-6 md:p-8 text-center shadow-hard w-full mb-6">
                <FilamentMark size={48} />
                <h1 className="font-display text-2xl md:text-3xl uppercase leading-none text-ink">Tungston AI</h1>
                <p className="text-xs md:text-sm text-muted max-w-md">
                  {byokConfig.key
                    ? `Running on personal BYOK key (${byokConfig.provider.toUpperCase()}). Unlimited personal quota active.`
                    : user
                    ? "Signed in member. Qwen 3.8 27B & GPT-OSS 120B models unlocked."
                    : "Running on Groq GPT-OSS 20B engine. Sign in to unlock Qwen 3.8 27B & GPT-OSS 120B."}
                </p>
                {activeProject && (
                  <div className="border border-line bg-surface2 px-3 py-1.5 font-mono text-xs text-accent">
                    Active Project: <strong>{activeProject.name}</strong> ({activeProject.files.length} context files injected)
                  </div>
                )}
              </div>

              {/* Starter Prompts Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl">
                {STARTER_PROMPTS.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => sendMessage(item.prompt)}
                    className="border-2 border-line bg-surface p-3 text-left shadow-hard-sm hover:border-accent hover:bg-surface2 transition-all active:translate-x-[1px] active:translate-y-[1px]"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-accent uppercase tracking-wider">{item.tag}</span>
                      <span className="text-muted text-[10px]">↗</span>
                    </div>
                    <div className="font-bold text-xs text-ink mb-1">{item.title}</div>
                    <div className="text-[11px] text-muted line-clamp-2">{item.prompt}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
          {active?.messages.map((m, idx) => (
            <MessageBubble
              key={m.id}
              message={m}
              isLatest={idx === active.messages.length - 1}
              onRegenerate={handleRegenerate}
            />
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
          onStop={handleStop}
        />
      </main>

      {/* Supabase Auth Modal */}
      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => {}}
      />

      {/* Projects Context Modal */}
      <ProjectsModal
        open={projectsModalOpen}
        onClose={() => setProjectsModalOpen(false)}
        projects={projects}
        activeProjectId={activeProjectId}
        onSelectProject={handleSelectProject}
        onSaveProjects={handleSaveProjects}
      />

      {/* BYOK Configuration Modal */}
      <ByokModal
        open={byokModalOpen}
        onClose={() => setByokModalOpen(false)}
        onSave={(cfg) => setByokConfig(cfg)}
      />
    </div>
  );
}
