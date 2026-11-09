"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { AuthModal } from "@/components/AuthModal";

// Default showcase app that renders on initial load
const DEFAULT_STARTER_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tungsten Focus & Tasks</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { background-color: #24272B; color: #F2EFE6; font-family: monospace; }
    .shadow-hard { box-shadow: 4px 4px 0 #0B0C0D; }
    .shadow-hard-sm { box-shadow: 2px 2px 0 #0B0C0D; }
  </style>
</head>
<body class="p-4 sm:p-6 min-h-screen flex flex-col items-center justify-center">
  <div class="w-full max-w-lg border-2 border-[#0B0C0D] bg-[#2E3237] p-6 shadow-hard space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between border-b-2 border-[#0B0C0D] pb-3">
      <div class="flex items-center gap-2">
        <span class="grid h-7 w-7 place-items-center bg-[#FFA85C] text-[#0B0C0D] font-black text-sm">74</span>
        <h1 class="text-base font-bold tracking-tight uppercase">FOCUS & TASK WORKBENCH</h1>
      </div>
      <span class="bg-[#3A3F45] border border-[#0B0C0D] px-2 py-0.5 text-[10px] font-bold text-[#FFA85C]">READY</span>
    </div>

    <!-- Timer Box -->
    <div class="border-2 border-[#0B0C0D] bg-[#24272B] p-5 text-center shadow-hard space-y-3">
      <div id="timer-display" class="text-5xl font-black text-[#FFA85C] tracking-wider">25:00</div>
      <div class="flex justify-center gap-2">
        <button id="btn-toggle" onclick="toggleTimer()" class="border-2 border-[#0B0C0D] bg-[#FFA85C] text-[#0B0C0D] px-4 py-1.5 text-xs font-black uppercase shadow-hard-sm active:translate-x-0.5 active:translate-y-0.5">START</button>
        <button onclick="resetTimer(25)" class="border-2 border-[#0B0C0D] bg-[#3A3F45] text-[#F2EFE6] px-3 py-1.5 text-xs font-bold uppercase shadow-hard-sm hover:border-[#FFA85C]">25M</button>
        <button onclick="resetTimer(5)" class="border-2 border-[#0B0C0D] bg-[#3A3F45] text-[#F2EFE6] px-3 py-1.5 text-xs font-bold uppercase shadow-hard-sm hover:border-[#FFA85C]">5M</button>
      </div>
    </div>

    <!-- Quick Tasks -->
    <div class="space-y-3">
      <div class="text-xs font-bold text-[#FFA85C] uppercase tracking-wider">Daily Directives</div>
      <div class="flex gap-2">
        <input id="task-input" type="text" placeholder="Add a new task..." class="flex-1 border-2 border-[#0B0C0D] bg-[#24272B] px-3 py-1.5 text-xs text-[#F2EFE6] focus:outline-none focus:border-[#FFA85C]" onkeydown="if(event.key==='Enter') addTask()">
        <button onclick="addTask()" class="border-2 border-[#0B0C0D] bg-[#FFA85C] text-[#0B0C0D] px-3 py-1.5 text-xs font-black uppercase shadow-hard-sm">+</button>
      </div>
      <ul id="task-list" class="space-y-1.5 text-xs max-h-48 overflow-y-auto"></ul>
    </div>
  </div>

  <script>
    let timeLeft = 1500;
    let timerId = null;

    function updateDisplay() {
      const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
      const s = (timeLeft % 60).toString().padStart(2, '0');
      document.getElementById('timer-display').innerText = m + ':' + s;
    }

    function toggleTimer() {
      const btn = document.getElementById('btn-toggle');
      if (timerId) {
        clearInterval(timerId);
        timerId = null;
        btn.innerText = 'RESUME';
      } else {
        timerId = setInterval(() => {
          if (timeLeft > 0) {
            timeLeft--;
            updateDisplay();
          } else {
            clearInterval(timerId);
            timerId = null;
            btn.innerText = 'START';
            alert('Timer Complete!');
          }
        }, 1000);
        btn.innerText = 'PAUSE';
      }
    }

    function resetTimer(minutes) {
      if (timerId) clearInterval(timerId);
      timerId = null;
      timeLeft = minutes * 60;
      updateDisplay();
      document.getElementById('btn-toggle').innerText = 'START';
    }

    let tasks = JSON.parse(localStorage.getItem('tungsten_demo_tasks') || '["Complete MVP update", "Verify Groq 4-key pool", "Ship to production"]');

    function renderTasks() {
      const list = document.getElementById('task-list');
      list.innerHTML = '';
      tasks.forEach((t, i) => {
        const li = document.createElement('li');
        li.className = 'flex items-center justify-between border border-[#0B0C0D] bg-[#24272B] px-3 py-1.5 text-xs';
        li.innerHTML = '<span class="text-[#F2EFE6]">' + t + '</span><button onclick="deleteTask(' + i + ')" class="text-[#FF6B5A] hover:text-[#FFA85C] font-bold">×</button>';
        list.appendChild(li);
      });
      localStorage.setItem('tungsten_demo_tasks', JSON.stringify(tasks));
    }

    function addTask() {
      const inp = document.getElementById('task-input');
      const v = inp.value.trim();
      if (!v) return;
      tasks.push(v);
      inp.value = '';
      renderTasks();
    }

    function deleteTask(i) {
      tasks.splice(i, 1);
      renderTasks();
    }

    renderTasks();
  </script>
</body>
</html>`;

const STARTER_PROMPTS = [
  {
    icon: "⏱️",
    title: "Pomodoro & Task Board",
    prompt: "Create a brutalist Pomodoro Timer with customizable work/break intervals, sound chime, and a localStorage task list.",
  },
  {
    icon: "💰",
    title: "Invoice & Tax Generator",
    prompt: "Build an interactive client invoice generator that calculates subtotal, discounts, tax rates, and has a 1-click 'Print to PDF' view.",
  },
  {
    icon: "📊",
    title: "Kanban Board with Drag & Drop",
    prompt: "Create a 3-column Kanban board (To Do, In Progress, Done) with smooth drag and drop, color tags, and localStorage saving.",
  },
  {
    icon: "🎨",
    title: "Palette & WCAG Contrast Checker",
    prompt: "Build an interactive color palette generator that tests foreground/background contrast ratios against WCAG AA and AAA standards in real time.",
  },
  {
    icon: "📝",
    title: "Markdown Scratchpad & Word Counter",
    prompt: "Create a distraction-free split-screen Markdown editor with live preview, word/character count, reading time, and HTML export.",
  },
  {
    icon: "🕹️",
    title: "Retro Snake or Pong Arcade",
    prompt: "Build a retro 80s arcade game in HTML5 canvas with sound effects, high score tracker in localStorage, and keyboard controls.",
  },
];

export default function PlaygroundPage() {
  const [session, setSession] = useState<any>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // App generation state
  const [prompt, setPrompt] = useState("");
  const [currentHtml, setCurrentHtml] = useState(DEFAULT_STARTER_HTML);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [streamInfo, setStreamInfo] = useState<{ model: string; key: string } | null>(null);

  // View state
  const [activeTab, setActiveTab] = useState<"preview" | "code">("preview");
  const [deviceWidth, setDeviceWidth] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [copiedCode, setCopiedCode] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  // History of prompts for this session
  const [promptHistory, setPromptHistory] = useState<string[]>([]);

  // Supabase Auth Listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Handle generation
  async function handleGenerate(customPrompt?: string) {
    const textToSend = (customPrompt || prompt).trim();
    if (!textToSend || isGenerating) return;

    // Check auth
    if (!session?.access_token) {
      setAuthModalOpen(true);
      return;
    }

    setErrorMsg(null);
    setIsGenerating(true);
    setActiveTab("preview");

    try {
      const res = await fetch("/api/playground/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          prompt: textToSend,
          existingHtml: currentHtml !== DEFAULT_STARTER_HTML ? currentHtml : undefined,
          history: promptHistory.map((p) => ({ role: "user", content: p })),
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        if (errJson?.requiresAuth) {
          setAuthModalOpen(true);
        }
        throw new Error(errJson?.error || `Server responded with status ${res.status}`);
      }

      const modelUsed = res.headers.get("X-Tungsten-Model") || "openai/gpt-oss-120b";
      const keyPoolUsed = res.headers.get("X-Tungsten-Key-Pool") || "Pool Active";
      setStreamInfo({ model: modelUsed, key: keyPoolUsed });

      if (!res.body) throw new Error("No response body received from stream.");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedHtml = "";

      // Stream incoming HTML
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        accumulatedHtml += decoder.decode(value, { stream: true });
        setCurrentHtml(accumulatedHtml);
      }

      // Add to prompt history
      setPromptHistory((prev) => [...prev, textToSend]);
      setPrompt("");
      setIframeKey((k) => k + 1);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to generate app.");
    } finally {
      setIsGenerating(false);
    }
  }

  // Copy HTML code
  function handleCopy() {
    navigator.clipboard.writeText(currentHtml);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  }

  // Download .html file
  function handleDownload() {
    const blob = new Blob([currentHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tungsten-app-${Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-base text-ink font-mono selection:bg-accent selection:text-base flex flex-col antialiased">
      {/* Top Header */}
      <header className="border-b-2 border-line bg-surface sticky top-0 z-40 shadow-hard-sm">
        <div className="max-w-[1700px] mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
          {/* Logo & Navigation */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <Link
              href="/"
              className="flex items-center gap-2 font-display text-base uppercase tracking-tight hover:text-accent transition-colors"
            >
              <span className="grid h-7 w-7 place-items-center border-2 border-line bg-accent text-line font-black text-sm">
                74
              </span>
              <span>TUNGSTEN</span>
            </Link>
            <span className="text-accent font-bold text-xs hidden sm:inline">/</span>
            <div className="flex items-center gap-1.5">
              <span className="border-2 border-line bg-accent px-2 py-0.5 text-[10px] sm:text-xs font-black uppercase text-line tracking-wider shadow-hard-sm">
                ⚡ PLAYGROUND
              </span>
              <span className="border border-line bg-surface2 px-2 py-0.5 text-[9px] sm:text-[10px] font-bold text-ink uppercase hidden md:inline">
                GPT-120B ENGINE
              </span>
            </div>
          </div>

          {/* Model Status Pill & Auth Button */}
          <div className="flex items-center gap-2">
            <div className="hidden lg:flex items-center gap-1.5 border border-line bg-base px-2.5 py-1 text-[10px] font-bold text-ink">
              <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
              <span>4-KEY GROQ POOL ACTIVE</span>
            </div>

            <Link
              href="/"
              className="border-2 border-line bg-surface2 px-2.5 sm:px-3 py-1 text-[11px] font-bold uppercase text-ink hover:text-accent hover:border-accent transition-colors shadow-hard-sm"
            >
              💬 CHAT WORKBENCH
            </Link>

            {session?.user ? (
              <div className="flex items-center gap-2 border-2 border-line bg-surface px-2.5 py-1 text-[11px] font-bold shadow-hard-sm">
                <span className="text-accent font-black">●</span>
                <span className="max-w-[120px] truncate text-ink">{session.user.email}</span>
                <button
                  onClick={() => supabase.auth.signOut()}
                  className="text-muted hover:text-danger ml-1 uppercase text-[10px]"
                  title="Sign out"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="border-2 border-line bg-accent px-3 py-1 text-[11px] font-black uppercase text-line shadow-hard-sm hover:bg-accent/90 transition-all"
              >
                🔑 SIGN IN FOR ACCESS
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <main className="flex-1 flex flex-col lg:flex-row max-w-[1700px] w-full mx-auto p-3 sm:p-4 gap-4 overflow-hidden">
        {/* Left Controller / Prompt Pane */}
        <div className="w-full lg:w-[460px] xl:w-[500px] shrink-0 flex flex-col gap-4">
          {/* Prompting Box */}
          <div className="border-2 border-line bg-surface p-4 shadow-hard space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-accent tracking-wider flex items-center gap-1.5">
                <span>⚡</span> APP GENERATOR (120B)
              </span>
              <span className="text-[10px] border border-line bg-base px-1.5 py-0.5 text-ink font-bold uppercase">
                {currentHtml !== DEFAULT_STARTER_HTML ? "REVISE MODE" : "CREATION MODE"}
              </span>
            </div>

            <p className="text-xs text-ink/90 font-medium leading-relaxed">
              Describe any tool, dashboard, calculator, or game. Tungsten will write and run the full code in real time.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleGenerate();
              }}
              className="space-y-2.5"
            >
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    handleGenerate();
                  }
                }}
                disabled={isGenerating}
                rows={4}
                placeholder={
                  currentHtml !== DEFAULT_STARTER_HTML
                    ? "Ask for revisions (e.g. 'Add sound chime when timer ends', 'Add dark mode toggle', 'Add export to CSV')..."
                    : "Describe the app you want to build (e.g. 'A brutalist invoice generator with PDF print & tax presets')..."
                }
                className="w-full border-2 border-line bg-base p-3 text-xs md:text-sm text-ink placeholder:text-muted focus:border-accent resize-none font-mono font-medium leading-relaxed"
              />

              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-muted hidden sm:inline">
                  Press <kbd className="border border-line bg-base px-1 py-0.5">Ctrl+Enter</kbd> to run
                </span>
                <button
                  type="submit"
                  disabled={isGenerating || !prompt.trim()}
                  className="w-full sm:w-auto border-2 border-line bg-accent px-5 py-2 text-xs font-black uppercase text-line shadow-hard-sm disabled:opacity-50 active:translate-x-[2px] active:translate-y-[2px] hover:bg-accent/90 transition-all flex items-center justify-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      <span>SYNTHESIZING...</span>
                    </>
                  ) : (
                    <>
                      <span>{currentHtml !== DEFAULT_STARTER_HTML ? "UPDATE APP ↵" : "CODE APP ↵"}</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {errorMsg && (
              <div className="border-2 border-danger bg-danger/10 p-3 text-xs text-danger font-bold flex items-center justify-between">
                <span>⚠️ {errorMsg}</span>
                <button onClick={() => setErrorMsg(null)} className="ml-2 hover:underline">
                  ✕
                </button>
              </div>
            )}

            {streamInfo && (
              <div className="border border-line bg-base px-2.5 py-1 text-[10px] font-bold text-accent flex items-center justify-between">
                <span>ENGINE: {streamInfo.model}</span>
                <span>KEY: {streamInfo.key}</span>
              </div>
            )}
          </div>

          {/* Quick Starter Inspiration Cards */}
          <div className="border-2 border-line bg-surface p-4 shadow-hard space-y-3 flex-1 overflow-y-auto">
            <span className="text-xs font-black uppercase text-accent tracking-wider block">
              💡 INSTANT APP BLUEPRINTS
            </span>
            <div className="grid grid-cols-1 gap-2">
              {STARTER_PROMPTS.map((starter) => (
                <button
                  key={starter.title}
                  onClick={() => {
                    setPrompt(starter.prompt);
                    handleGenerate(starter.prompt);
                  }}
                  className="border-2 border-line bg-base p-2.5 text-left font-mono hover:border-accent transition-colors shadow-hard-sm group"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{starter.icon}</span>
                    <span className="font-bold text-xs text-ink group-hover:text-accent">
                      {starter.title}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted mt-1 line-clamp-2 leading-relaxed">
                    {starter.prompt}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Live Canvas / Inspector Pane */}
        <div className="flex-1 border-2 border-line bg-surface shadow-hard flex flex-col min-h-[500px] overflow-hidden">
          {/* Canvas Toolbar */}
          <div className="border-b-2 border-line bg-surface2 px-3 py-2 flex flex-wrap items-center justify-between gap-2">
            {/* Mode Switcher */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveTab("preview")}
                className={`border-2 border-line px-3 py-1 text-xs font-black uppercase transition-all shadow-hard-sm ${
                  activeTab === "preview"
                    ? "bg-accent text-line"
                    : "bg-base text-ink hover:text-accent"
                }`}
              >
                👁️ LIVE APP
              </button>
              <button
                onClick={() => setActiveTab("code")}
                className={`border-2 border-line px-3 py-1 text-xs font-black uppercase transition-all shadow-hard-sm ${
                  activeTab === "code"
                    ? "bg-accent text-line"
                    : "bg-base text-ink hover:text-accent"
                }`}
              >
                💻 HTML CODE
              </button>
            </div>

            {/* Device Width Toggles (Active in preview mode) */}
            {activeTab === "preview" && (
              <div className="hidden sm:flex items-center gap-1 border border-line bg-base px-1.5 py-0.5">
                <button
                  onClick={() => setDeviceWidth("desktop")}
                  className={`px-2 py-0.5 text-[10px] font-bold uppercase ${
                    deviceWidth === "desktop" ? "bg-accent text-line" : "text-muted hover:text-ink"
                  }`}
                  title="Desktop (100%)"
                >
                  🖥️ Full
                </button>
                <button
                  onClick={() => setDeviceWidth("tablet")}
                  className={`px-2 py-0.5 text-[10px] font-bold uppercase ${
                    deviceWidth === "tablet" ? "bg-accent text-line" : "text-muted hover:text-ink"
                  }`}
                  title="Tablet (768px)"
                >
                  📟 Tablet
                </button>
                <button
                  onClick={() => setDeviceWidth("mobile")}
                  className={`px-2 py-0.5 text-[10px] font-bold uppercase ${
                    deviceWidth === "mobile" ? "bg-accent text-line" : "text-muted hover:text-ink"
                  }`}
                  title="Mobile (375px)"
                >
                  📱 Mobile
                </button>
              </div>
            )}

            {/* Action Tools */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIframeKey((k) => k + 1)}
                className="border-2 border-line bg-base px-2.5 py-1 text-[11px] font-bold uppercase text-ink hover:text-accent shadow-hard-sm"
                title="Reload preview"
              >
                🔄 RELOAD
              </button>

              <button
                onClick={handleCopy}
                className="border-2 border-line bg-base px-2.5 py-1 text-[11px] font-bold uppercase text-ink hover:text-accent shadow-hard-sm"
              >
                {copiedCode ? "✓ COPIED" : "📋 COPY"}
              </button>

              <button
                onClick={handleDownload}
                className="border-2 border-line bg-accent px-2.5 py-1 text-[11px] font-black uppercase text-line shadow-hard-sm hover:bg-accent/90"
              >
                💾 EXPORT .HTML
              </button>
            </div>
          </div>

          {/* Canvas Display View */}
          <div className="flex-1 bg-base p-2 sm:p-4 flex items-center justify-center overflow-auto relative">
            {activeTab === "preview" ? (
              <div
                className={`h-full border-2 border-line bg-white shadow-hard transition-all duration-300 relative flex flex-col ${
                  deviceWidth === "desktop"
                    ? "w-full"
                    : deviceWidth === "tablet"
                    ? "w-[768px] max-w-full"
                    : "w-[375px] max-w-full"
                }`}
              >
                {/* Streaming / Loading overlay */}
                {isGenerating && (
                  <div className="absolute top-2 right-2 z-20 border-2 border-line bg-accent text-line px-3 py-1 text-xs font-black uppercase shadow-hard-sm flex items-center gap-2">
                    <span className="animate-spin">⚙️</span>
                    <span>GENERATING LIVE HTML...</span>
                  </div>
                )}

                <iframe
                  key={iframeKey}
                  title="Tungsten Live App Preview"
                  sandbox="allow-scripts allow-modals allow-forms allow-same-origin"
                  srcDoc={currentHtml}
                  className="w-full h-full min-h-[480px] border-none bg-white"
                />
              </div>
            ) : (
              <div className="w-full h-full border-2 border-line bg-[#1E2023] p-4 text-xs font-mono text-ink overflow-auto">
                <pre className="whitespace-pre-wrap leading-relaxed select-all">
                  {currentHtml}
                </pre>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Supabase Authentication Modal */}
      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => {
          setAuthModalOpen(false);
          supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
          });
        }}
      />
    </div>
  );
}
