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

  // Load persisted conversations, projects + server config once on mount.
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
      projectId: activeProjectId,
    }));
    setStaged([]);
    setStreaming(true);

    try {
      const history = [...active.messages, userMsg].map((m) => ({
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

      const res = await fetch("/api/chat", {
        method: "POST",
        headers,
        body: JSON.stringify({
          messages: history,
          projectContext: projectContext || undefined,
        }),
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
      />

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b-2 border-line bg-surface px-3 py-2.5 md:px-8 md:py-3">
          <div className="flex items-center gap-2 md:gap-3">
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              aria-label="Toggle sidebar"
              className="grid h-8 w-8 md:h-9 md:w-9 place-items-center border-2 border-line bg-surface2 text-ink hover:bg-accent hover:text-line"
            >
              <MenuIcon size={16} />
            </button>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="border-2 border-line bg-ink px-1.5 py-0.5 font-mono text-[10px] md:text-[11px] font-bold uppercase tracking-wider text-[var(--color-base)]">
                {user ? "GROQ: 20B OSS (UNLOCKED)" : "GROQ: 8B INSTANT"}
              </span>

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

        <div ref={scrollRef} className="flex-1 space-y-4 md:space-y-5 overflow-y-auto px-3 py-4 md:px-8 md:py-6">
          {!active?.messages.length && (
            <div className="flex h-full items-center justify-center p-4">
              <div className="flex max-w-sm flex-col items-center gap-4 border-2 border-line bg-surface p-6 md:p-8 text-center shadow-hard w-full">
                <FilamentMark size={52} />
                <p className="font-display text-2xl md:text-3xl uppercase leading-none text-ink">Tungston AI</p>
                <p className="text-xs md:text-sm text-muted">
                  {user ? "Signed in with 20B OSS Engine unlocked." : "Running on Groq 8B engine. Sign in to unlock 20B & Qwen."}
                </p>
                {activeProject && (
                  <div className="border border-line bg-surface2 px-3 py-1.5 font-mono text-xs text-accent">
                    Active Project: <strong>{activeProject.name}</strong> ({activeProject.files.length} context files injected)
                  </div>
                )}
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
    </div>
  );
}
