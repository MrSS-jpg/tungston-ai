"use client";

import React from "react";
import { FilamentMark } from "./FilamentMark";
import type { User } from "@supabase/supabase-js";
import type { Conversation, Project } from "@/lib/types";

export function DashboardView({
  onNavigate,
  user,
  onOpenAuth,
  conversations = [],
  projects = [],
  onSelectConversation,
  onNewChat,
}: {
  onNavigate: (view: "dashboard" | "chat" | "playground", blueprintPrompt?: string) => void;
  user: User | null;
  onOpenAuth: () => void;
  conversations?: Conversation[];
  projects?: Project[];
  onSelectConversation?: (id: string) => void;
  onNewChat?: () => void;
}) {
  const BLUEPRINTS = [
    {
      icon: "⏱️",
      title: "Pomodoro & Task Board",
      desc: "Brutalist focus timer with intervals, audio chime, and local storage tasks.",
      prompt: "Create a brutalist Pomodoro Timer with customizable work/break intervals, sound chime, and a localStorage task list.",
    },
    {
      icon: "💰",
      title: "Invoice & Tax Generator",
      desc: "Client invoicing tool with automatic tax calculation and 1-click PDF print.",
      prompt: "Build an interactive client invoice generator that calculates subtotal, discounts, tax rates, and has a 1-click 'Print to PDF' view.",
    },
    {
      icon: "📊",
      title: "Kanban Board Drag & Drop",
      desc: "3-column workflow board with smooth task dragging, color tags, and state saving.",
      prompt: "Create a 3-column Kanban board (To Do, In Progress, Done) with smooth drag and drop, color tags, and localStorage saving.",
    },
    {
      icon: "🎨",
      title: "WCAG Contrast & Palette",
      desc: "Color generator testing foreground/background ratios against WCAG AAA in real time.",
      prompt: "Build an interactive color palette generator that tests foreground/background contrast ratios against WCAG AA and AAA standards in real time.",
    },
    {
      icon: "📝",
      title: "Markdown Scratchpad",
      desc: "Split-screen editor with real-time markdown preview, word count, and HTML export.",
      prompt: "Create a distraction-free split-screen Markdown editor with live preview, word/character count, reading time, and HTML export.",
    },
    {
      icon: "🕹️",
      title: "Retro 80s Arcade Game",
      desc: "HTML5 canvas arcade game with keyboard controls, sound effects, and high score board.",
      prompt: "Build a retro 80s arcade game in HTML5 canvas with sound effects, high score tracker in localStorage, and keyboard controls.",
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-base p-3 sm:p-6 font-mono text-ink">
      <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8 pb-12">
        {/* Hero Header */}
        <div className="border-3 border-line bg-surface p-4 sm:p-8 shadow-hard">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-line pb-5 mb-5">
            <div className="flex items-center gap-3.5">
              <FilamentMark size={42} />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-display text-xl sm:text-2xl md:text-3xl uppercase tracking-tight text-ink">
                    Tungsten Command Center
                  </h1>
                  <span className="border border-line bg-accent px-1.5 py-0.5 text-[9px] sm:text-[10px] font-black uppercase text-line">
                    ELEMENT 74
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-muted font-bold uppercase tracking-wider mt-0.5">
                  Unified AI Foundry // Chat Workbench &amp; Live HTML Playground
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {user ? (
                <div className="border-2 border-line bg-surface2 px-3 py-1.5 text-xs font-bold shadow-hard-sm">
                  <span className="text-accent mr-1">●</span>
                  <span className="text-ink">{user.email?.split("@")[0]}</span>
                  <span className="text-[10px] text-accent ml-2 uppercase">MEMBER</span>
                </div>
              ) : (
                <button
                  onClick={onOpenAuth}
                  className="border-2 border-line bg-accent px-4 py-1.5 text-xs font-black uppercase text-line shadow-hard-sm hover:bg-accent/90 transition-all"
                >
                  🔑 Sign In for 120B Access
                </button>
              )}
            </div>
          </div>

          {/* Telemetry Status Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="border-2 border-line bg-base p-3 shadow-hard-sm space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-muted uppercase">LPU CLUSTER</span>
                <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
              </div>
              <div className="font-bold text-ink text-sm">4-Key Groq Array</div>
              <p className="text-[11px] text-muted">
                Pooled round-robin rotation active across 4 independent API accounts.
              </p>
            </div>

            <div className="border-2 border-line bg-base p-3 shadow-hard-sm space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-muted uppercase">ENGINE TIER</span>
                <span className="text-[10px] font-bold text-accent uppercase">
                  {user ? "FRONTIER UNLOCKED" : "GUEST SPEED"}
                </span>
              </div>
              <div className="font-bold text-ink text-sm">
                {user ? "GPT-OSS 120B + QWEN 27B" : "GPT-OSS 20B ENGINE"}
              </div>
              <p className="text-[11px] text-muted">
                {user
                  ? "Full access to 120B app synthesis and deep code reasoning."
                  : "Instant zero-friction guest sessions. Sign in to unlock 120B."}
              </p>
            </div>

            <div className="border-2 border-line bg-base p-3 shadow-hard-sm space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-muted uppercase">PERSISTENCE</span>
                <span className="text-[10px] font-bold text-accent uppercase">SUPABASE</span>
              </div>
              <div className="font-bold text-ink text-sm">Context &amp; Auth</div>
              <p className="text-[11px] text-muted">
                {projects.length} Knowledge project{projects.length === 1 ? "" : "s"} &bull; {conversations.length} Chat session{conversations.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>
        </div>

        {/* The Two Core Tools Section (Prominent Launchers) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-accent tracking-wider flex items-center gap-1.5">
              <span>🛠️</span> THE TWO CORE FOUNDRY TOOLS
            </span>
            <span className="text-[10px] font-bold text-muted uppercase">
              PURE TWO-TOOL ECOSYSTEM
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Tool 1: Tungsten AI */}
            <div className="border-3 border-line bg-surface p-5 sm:p-6 shadow-hard flex flex-col justify-between space-y-4 hover:border-accent transition-colors">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="border-2 border-line bg-surface2 px-2 py-0.5 text-[10px] font-bold uppercase text-accent">
                    TOOL 01 // CONVERSATION
                  </span>
                  <span className="text-[10px] font-bold text-ink">ACTIVE</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">💬</span>
                  <h2 className="font-display text-xl sm:text-2xl uppercase tracking-tight text-ink">
                    Tungsten AI
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-ink/90 leading-relaxed font-medium">
                  High-speed conversational intelligence with multi-turn reasoning, persistent project context injection, edge image synthesis, and Markdown export.
                </p>
                <div className="pt-2 border-t border-line/50 space-y-1.5 text-xs text-muted">
                  <div className="flex items-center gap-2">
                    <span className="text-accent font-bold">✓</span>
                    <span>Qwen 3.8 27B &amp; GPT-OSS 120B reasoning models</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-accent font-bold">✓</span>
                    <span>Multi-file project context injection for architectural specs</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-accent font-bold">✓</span>
                    <span>Built-in image generator &amp; code syntax highlighter</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => onNavigate("chat")}
                className="w-full border-2 border-line bg-accent py-2.5 sm:py-3 text-xs sm:text-sm font-black uppercase text-line shadow-hard-sm hover:bg-accent/90 active:translate-x-[2px] active:translate-y-[2px] transition-all flex items-center justify-center gap-2"
              >
                <span>OPEN TUNGSTEN AI</span>
                <span>→</span>
              </button>
            </div>

            {/* Tool 2: Playground */}
            <div className="border-3 border-line bg-surface p-5 sm:p-6 shadow-hard flex flex-col justify-between space-y-4 hover:border-accent transition-colors">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="border-2 border-line bg-accent px-2 py-0.5 text-[10px] font-black uppercase text-line">
                    TOOL 02 // CODE SYNTHESIZER
                  </span>
                  <span className="text-[10px] font-bold text-accent">120B POWERED</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">⚡</span>
                  <h2 className="font-display text-xl sm:text-2xl uppercase tracking-tight text-ink">
                    Playground
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-ink/90 leading-relaxed font-medium">
                  Autonomous single-file web app generator powered by GPT-120B. Describe any tool, dashboard, calculator, or game and run it live in a browser sandbox.
                </p>
                <div className="pt-2 border-t border-line/50 space-y-1.5 text-xs text-muted">
                  <div className="flex items-center gap-2">
                    <span className="text-accent font-bold">✓</span>
                    <span>Real-time code streaming directly into interactive iframe</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-accent font-bold">✓</span>
                    <span>Iterative revise mode to add features and tweak styling</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-accent font-bold">✓</span>
                    <span>Responsive view modes (Full, Tablet, Mobile) &amp; 1-click HTML download</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => onNavigate("playground")}
                className="w-full border-2 border-line bg-accent py-2.5 sm:py-3 text-xs sm:text-sm font-black uppercase text-line shadow-hard-sm hover:bg-accent/90 active:translate-x-[2px] active:translate-y-[2px] transition-all flex items-center justify-center gap-2"
              >
                <span>LAUNCH PLAYGROUND</span>
                <span>⚡</span>
              </button>
            </div>
          </div>
        </div>

        {/* Instant App Blueprints Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-accent tracking-wider flex items-center gap-1.5">
              <span>💡</span> 1-CLICK APP BLUEPRINTS
            </span>
            <span className="text-[10px] font-bold text-muted uppercase">
              TAP TO GENERATE IN PLAYGROUND
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {BLUEPRINTS.map((b) => (
              <button
                key={b.title}
                onClick={() => onNavigate("playground", b.prompt)}
                className="border-2 border-line bg-surface p-3.5 sm:p-4 text-left shadow-hard-sm hover:border-accent hover:bg-surface2 transition-all active:translate-x-[1px] active:translate-y-[1px] group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-lg">{b.icon}</span>
                    <span className="font-bold text-xs sm:text-sm text-ink group-hover:text-accent">
                      {b.title}
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-muted leading-relaxed line-clamp-2">
                    {b.desc}
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-line/40 flex items-center justify-between text-[10px] font-bold text-accent uppercase">
                  <span>Code this app</span>
                  <span>↗</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Chats Row (if available) */}
        {conversations.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-accent tracking-wider flex items-center gap-1.5">
                <span>💬</span> RECENT TUNGSTEN AI SESSIONS
              </span>
              {onNewChat && (
                <button
                  onClick={() => {
                    onNewChat();
                    onNavigate("chat");
                  }}
                  className="text-[10px] font-bold text-accent uppercase hover:underline"
                >
                  + New Chat
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {conversations.slice(0, 3).map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    if (onSelectConversation) onSelectConversation(c.id);
                    onNavigate("chat");
                  }}
                  className="border-2 border-line bg-surface p-3 text-left shadow-hard-sm hover:border-accent hover:bg-surface2 transition-all truncate"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-accent uppercase">
                      {c.messages.length} msg{c.messages.length === 1 ? "" : "s"}
                    </span>
                    <span className="text-[10px] text-muted">
                      {new Date(c.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div className="font-bold text-xs text-ink truncate">
                    {c.title || "New chat"}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}