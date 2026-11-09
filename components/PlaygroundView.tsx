"use client";

import React, { useState, useEffect } from "react";
import { AuthModal } from "@/components/AuthModal";

// Default starter app that renders on initial load
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
  <div class="w-full max-w-lg border-2 border-[#0B0C0D] bg-[#2E3237] p-4 sm:p-6 shadow-hard space-y-5">
    <!-- Header -->
    <div class="flex items-center justify-between border-b-2 border-[#0B0C0D] pb-3">
      <div class="flex items-center gap-2">
        <span class="grid h-7 w-7 place-items-center bg-[#FFA85C] text-[#0B0C0D] font-black text-sm">74</span>
        <h1 class="text-sm sm:text-base font-bold tracking-tight uppercase">FOCUS & TASK WORKBENCH</h1>
      </div>
      <span class="bg-[#3A3F45] border border-[#0B0C0D] px-2 py-0.5 text-[10px] font-bold text-[#FFA85C]">READY</span>
    </div>

    <!-- Timer Box -->
    <div class="border-2 border-[#0B0C0D] bg-[#24272B] p-4 sm:p-5 text-center shadow-hard space-y-3">
      <div id="timer-display" class="text-4xl sm:text-5xl font-black text-[#FFA85C] tracking-wider">25:00</div>
      <div class="flex flex-wrap justify-center gap-2">
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
      <ul id="task-list" class="space-y-1.5 text-xs max-h-40 overflow-y-auto"></ul>
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

export function PlaygroundView({
  session,
  onOpenAuth,
  initialPrompt,
  onPromptConsumed,
}: {
  session: any;
  onOpenAuth: () => void;
  initialPrompt?: string | null;
  onPromptConsumed?: () => void;
}) {
  // App generation state
  const [prompt, setPrompt] = useState("");
  const [currentHtml, setCurrentHtml] = useState(DEFAULT_STARTER_HTML);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [streamInfo, setStreamInfo] = useState<{ model: string; key: string } | null>(null);

  // Responsive view state
  const [mobileView, setMobileView] = useState<"prompt" | "preview" | "code">("prompt");
  const [activeTab, setActiveTab] = useState<"preview" | "code">("preview");
  const [deviceWidth, setDeviceWidth] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [copiedCode, setCopiedCode] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  // History of prompts for this session
  const [promptHistory, setPromptHistory] = useState<string[]>([]);

  // Consume incoming initialPrompt from Dashboard
  useEffect(() => {
    if (initialPrompt && initialPrompt.trim()) {
      setPrompt(initialPrompt);
      if (session?.access_token) {
        handleGenerate(initialPrompt);
      }
      onPromptConsumed?.();
    }
  }, [initialPrompt]);

  // Handle generation
  async function handleGenerate(customPrompt?: string) {
    const textToSend = (customPrompt || prompt).trim();
    if (!textToSend || isGenerating) return;

    // Check auth
    if (!session?.access_token) {
      onOpenAuth();
      return;
    }

    setErrorMsg(null);
    setIsGenerating(true);
    setActiveTab("preview");
    // Switch to preview on mobile so the user instantly sees the live app
    setMobileView("preview");

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
          onOpenAuth();
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
    <div className="flex-1 flex flex-col overflow-hidden bg-base text-ink font-mono antialiased">
      {/* Mobile Mode Switcher Bar (< lg screens) */}
      <div className="lg:hidden border-b-2 border-line bg-surface2 px-2.5 py-1.5 flex items-center justify-between gap-1.5 shrink-0 shadow-hard-sm">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMobileView("prompt")}
            className={`border-2 border-line px-2.5 py-1 text-[10px] sm:text-xs uppercase transition-all shadow-hard-sm ${
              mobileView === "prompt"
                ? "bg-accent text-line font-black"
                : "bg-base text-ink font-bold hover:text-accent"
            }`}
          >
            ✏️ PROMPT
          </button>
          <button
            onClick={() => {
              setMobileView("preview");
              setActiveTab("preview");
            }}
            className={`border-2 border-line px-2.5 py-1 text-[10px] sm:text-xs uppercase transition-all shadow-hard-sm flex items-center gap-1 ${
              mobileView === "preview"
                ? "bg-accent text-line font-black"
                : "bg-base text-ink font-bold hover:text-accent"
            }`}
          >
            👁️ LIVE APP
            {isGenerating && <span className="h-1.5 w-1.5 rounded-full bg-accent animate-ping" />}
          </button>
          <button
            onClick={() => {
              setMobileView("code");
              setActiveTab("code");
            }}
            className={`border-2 border-line px-2.5 py-1 text-[10px] sm:text-xs uppercase transition-all shadow-hard-sm ${
              mobileView === "code"
                ? "bg-accent text-line font-black"
                : "bg-base text-ink font-bold hover:text-accent"
            }`}
          >
            💻 HTML
          </button>
        </div>

        {mobileView !== "prompt" && (
          <button
            onClick={() => setMobileView("prompt")}
            className="border-2 border-line bg-accent px-2 py-0.5 text-[10px] font-black text-line uppercase shadow-hard-sm"
          >
            + REVISE
          </button>
        )}
      </div>

      {/* Main Workspace Layout */}
      <div className="flex-1 max-w-[1700px] w-full mx-auto p-2.5 sm:p-4 gap-4 flex flex-col lg:flex-row lg:h-[calc(100vh-62px)] overflow-hidden">
        {/* Left Controller / Prompt & Blueprints Pane */}
        <div
          className={`w-full lg:w-[440px] xl:w-[480px] shrink-0 flex flex-col gap-3 sm:gap-4 overflow-y-auto ${
            mobileView !== "prompt" ? "hidden lg:flex" : "flex"
          }`}
        >
          {/* Prompting Box */}
          <div className="border-2 border-line bg-surface p-3.5 sm:p-4 shadow-hard space-y-3 shrink-0">
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

          {/* Quick Starter Inspiration Blueprints */}
          <div className="border-2 border-line bg-surface p-3.5 sm:p-4 shadow-hard space-y-3 flex-1 overflow-y-auto">
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

        {/* Right Live Canvas & Code Inspector Pane */}
        <div
          className={`flex-1 border-2 border-line bg-surface shadow-hard flex flex-col min-h-[500px] lg:min-h-0 overflow-hidden ${
            mobileView === "prompt" ? "hidden lg:flex" : "flex"
          }`}
        >
          {/* Canvas Toolbar */}
          <div className="border-b-2 border-line bg-surface2 px-2.5 sm:px-3 py-1.5 sm:py-2 flex flex-wrap items-center justify-between gap-2 shrink-0">
            {/* Desktop Mode Switcher */}
            <div className="hidden lg:flex items-center gap-1">
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

            {/* Mobile View Indicator / Mode Title */}
            <div className="lg:hidden flex items-center gap-1.5 text-xs font-bold uppercase text-accent">
              <span>{mobileView === "preview" ? "👁️ LIVE APP PREVIEW" : "💻 HTML CODE INSPECTOR"}</span>
            </div>

            {/* Device Width Toggles (Active in preview mode) */}
            {activeTab === "preview" && mobileView !== "code" && (
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
            <div className="flex items-center gap-1 sm:gap-1.5 ml-auto">
              <button
                onClick={() => setIframeKey((k) => k + 1)}
                className="border-2 border-line bg-base px-2 sm:px-2.5 py-1 text-[10px] sm:text-[11px] font-bold uppercase text-ink hover:text-accent shadow-hard-sm"
                title="Reload preview"
              >
                🔄 RELOAD
              </button>

              <button
                onClick={handleCopy}
                className="border-2 border-line bg-base px-2 sm:px-2.5 py-1 text-[10px] sm:text-[11px] font-bold uppercase text-ink hover:text-accent shadow-hard-sm"
              >
                {copiedCode ? "✓ COPIED" : "📋 COPY"}
              </button>

              <button
                onClick={handleDownload}
                className="border-2 border-line bg-accent px-2 sm:px-2.5 py-1 text-[10px] sm:text-[11px] font-black uppercase text-line shadow-hard-sm hover:bg-accent/90"
              >
                💾 EXPORT
              </button>
            </div>
          </div>

          {/* Canvas Display View */}
          <div className="flex-1 bg-base p-1.5 sm:p-3 flex items-center justify-center overflow-auto relative min-h-0">
            {activeTab === "preview" && mobileView !== "code" ? (
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
                  <div className="absolute top-2 right-2 z-20 border-2 border-line bg-accent text-line px-2.5 py-1 text-[10px] sm:text-xs font-black uppercase shadow-hard-sm flex items-center gap-1.5">
                    <span className="animate-spin">⚙️</span>
                    <span>GENERATING LIVE HTML...</span>
                  </div>
                )}

                <iframe
                  key={iframeKey}
                  title="Tungsten Live App Preview"
                  sandbox="allow-scripts allow-modals allow-forms allow-same-origin"
                  srcDoc={currentHtml}
                  className="w-full h-full min-h-[450px] border-none bg-white flex-1"
                />
              </div>
            ) : (
              <div className="w-full h-full border-2 border-line bg-[#1E2023] p-3 sm:p-4 text-xs font-mono text-ink overflow-auto">
                <pre className="whitespace-pre-wrap leading-relaxed select-all">
                  {currentHtml}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}