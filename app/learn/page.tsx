"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";

// 4-Part Prompt Formula Presets
const ROLES = [
  { label: "Polite Advocate", value: "Act as a courteous but firm consumer rights advocate" },
  { label: "Thrifty Chef", value: "Act as a creative, budget-conscious family home cook" },
  { label: "Patient Doctor", value: "Act as an empathetic doctor explaining medical terms to a 10-year-old" },
  { label: "Career Coach", value: "Act as a supportive, professional career negotiation coach" },
  { label: "Concise Editor", value: "Act as a ruthless editor who cuts corporate jargon" },
];

const TASKS = [
  { label: "Refund Email", value: "Draft an email requesting a full refund for a defective order" },
  { label: "15-Min Dinner", value: "Create a delicious dinner recipe using only ingredients I already have" },
  { label: "Decode Jargon", value: "Translate this confusing notice into 3 simple bullet points" },
  { label: "Ask for Raise", value: "Write polite, persuasive talking points to discuss a salary review" },
  { label: "Polite Decline", value: "Write a kind, guilt-free text declining a social invitation" },
];

const CONTEXTS = [
  { label: "Late & Damaged", value: "The order arrived 12 days late and the packaging was torn open." },
  { label: "Leftover Pantry", value: "I only have eggs, stale bread, canned tomatoes, and cheddar cheese." },
  { label: "Medical Letter", value: "The insurance company sent a denial stating 'Out-of-network non-emergent code 404'." },
  { label: "Work Review", value: "I have taken on two extra client accounts over the past 6 months with zero pay change." },
  { label: "Weekend Fatigue", value: "I am completely exhausted from a 50-hour work week and need to rest." },
];

const RULES = [
  { label: "Under 120 Words", value: "Keep the message under 120 words. No robotic or passive-aggressive words." },
  { label: "Step-by-Step", value: "Format as simple numbered steps with prep time and no fancy culinary terms." },
  { label: "Grade-School English", value: "Explain as if speaking to a 5th grader. Avoid all insurance terminology." },
  { label: "Confident & Friendly", value: "Maintain a calm, confident, and appreciative tone." },
];

// Pre-built Real World Daily Scenarios
const REAL_WORLD_TEMPLATES = [
  {
    category: "Shopping & Refunds",
    icon: "📦",
    title: "The Polite Refund Demander",
    description: "Get your money back for broken, late, or missing items without getting angry.",
    prompt:
      "Act as a polite consumer rights advocate. Draft a short, courteous email to customer service requesting a full refund for order #88412. Context: The package was promised in 2 days but arrived 11 days late, and the glass bottle inside was shattered. Rules: Keep it under 100 words, attach a polite tone, and ask for confirmation within 48 hours.",
  },
  {
    category: "Cooking & Groceries",
    icon: "🍳",
    title: "The 'What's In My Fridge?' Meal Planner",
    description: "Turn random leftover ingredients into a hot meal without ordering takeout.",
    prompt:
      "Act as a creative home chef. Plan a simple, comforting dinner recipe for 2 people. Context: I only have 3 eggs, half an onion, leftover cooked rice, soy sauce, and a handful of spinach. I have basic spices, butter, and oil. Rules: 15-minute cook time, numbered step-by-step instructions, and zero specialty equipment.",
  },
  {
    category: "Health & Bureaucracy",
    icon: "🏥",
    title: "Jargon & Bill Decrypter",
    description: "Turn confusing insurance, hospital, or government letters into plain English.",
    prompt:
      "Act as a patient patient-advocate. Explain this confusing bill notice in plain, simple English: 'Claim denied: Service rendered by non-par provider outside pre-authorized geographic network envelope. Adjudicated under section 14-B.' Rules: Tell me exactly what happened, what it means for my wallet, and what 2 questions I should ask when I call them tomorrow.",
  },
  {
    category: "Work & Careers",
    icon: "💼",
    title: "The Respectful Salary Review Script",
    description: "Prepare calm, fact-based talking points to ask your manager for a compensation review.",
    prompt:
      "Act as an executive career coach. Write 4 calm, professional talking points for an upcoming 1-on-1 meeting with my manager to request a salary review. Context: I have consistently met all targets for 14 months and took on onboarding two new team members. Rules: Keep it appreciative, focused on business impact, and free of emotional complaints.",
  },
  {
    category: "Relationships & Life",
    icon: "💬",
    title: "Guilt-Free Polite Decline",
    description: "Say 'no' to an invitation or request kindly without making excuses or feeling guilty.",
    prompt:
      "Act as a thoughtful communication specialist. Write a warm, polite text message declining an invitation to a Saturday dinner party. Context: I like the host very much, but I am mentally drained and need a quiet evening to recharge. Rules: 2 to 3 sentences maximum, express genuine gratitude, say no clearly without fake excuses, and suggest grabbing coffee next week instead.",
  },
  {
    category: "Contracts & Housing",
    icon: "📑",
    title: "Apartment Lease Red-Flag Spotter",
    description: "Spot sneaky clauses, auto-renewals, or surprise fees before you sign.",
    prompt:
      "Act as a tenant rights advisor. Review this paragraph from an apartment lease agreement and highlight any red flags or unfair terms: 'Tenant agrees to automatic 12-month lease renewal unless 90 days written notice via certified mail is received. Security deposit non-refundable if move-out occurs within 15 calendar days of month-end.' Rules: Explain what each sentence means in everyday terms and suggest safer alternative wording.",
  },
];

// Interactive Quiz Questions
const QUIZ_CHALLENGES = [
  {
    question: "Scenario: You want an email asking your landlord to fix a leaky faucet.",
    optionA: {
      text: "Prompt A: 'Write an email to my landlord to fix my sink.'",
      verdict: "BAD PROMPT (Generic Slop)",
      reason:
        "The AI doesn't know your unit number, how long it's been leaking, or the urgency. It will generate a vague template you still have to manually rewrite.",
      correct: false,
    },
    optionB: {
      text: "Prompt B: 'Act as a respectful tenant. Draft a 70-word email to my landlord asking to repair a leaking bathroom faucet in Apt 4B that has been dripping for 3 days. Mention I will be home on Thursday between 2-5 PM for maintenance.'",
      verdict: "GOLD PROMPT (Ready to Send)",
      reason:
        "Provides Role, Task, Context (Apt 4B, 3 days), and Rules (70 words, specific availability). The result requires zero editing!",
      correct: true,
    },
  },
  {
    question: "Scenario: You want ideas for a weekend day trip on a tight budget.",
    optionA: {
      text: "Prompt A: 'Give me a 1-day budget itinerary for Austin, Texas under $35 total. Include free public parks, a cheap local food truck taco spot, and free parking advice. Group activities geographically so I don't waste gas driving across town.'",
      verdict: "GOLD PROMPT (Practical & Local)",
      reason:
        "Specifies exact budget ($35), location, meal preference, logistics (free parking, fuel savings), and geographic clustering.",
      correct: true,
    },
    optionB: {
      text: "Prompt B: 'What can I do this weekend for fun?'",
      verdict: "BAD PROMPT (Total Guesswork)",
      reason:
        "The AI doesn't know where you live, your budget, whether you have a car, or what you enjoy. It will list generic tourist traps.",
      correct: false,
    },
  },
];

export default function LearnPage() {
  // Formula builder state
  const [selectedRole, setSelectedRole] = useState(ROLES[0].value);
  const [selectedTask, setSelectedTask] = useState(TASKS[0].value);
  const [selectedContext, setSelectedContext] = useState(CONTEXTS[0].value);
  const [selectedRules, setSelectedRules] = useState(RULES[0].value);

  // Live Chat Simulator state
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([
    {
      role: "assistant",
      content:
        "👋 **Welcome! I am your Tungston Everyday AI Guide.**\n\nI am here to help you get real, practical everyday tasks done in seconds — from polite refund emails to meal plans and plain-English translations.\n\n👇 **Try clicking one of the templates above, or type any daily problem in the box below!**",
    },
  ]);
  const [inputVal, setInputVal] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // BYOK Modal & Local State
  const [byokModalOpen, setByokModalOpen] = useState(false);
  const [byokKey, setByokKey] = useState("");
  const [byokProvider, setByokProvider] = useState("groq");
  const [byokSaved, setByokSaved] = useState(false);

  // Quiz interactive state
  const [quizAnswers, setQuizAnswers] = useState<Record<number, "A" | "B">>({});

  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Load saved BYOK key on mount
  useEffect(() => {
    try {
      const savedKey = localStorage.getItem("tungston:learn:byok_key");
      const savedProv = localStorage.getItem("tungston:learn:byok_provider") || "groq";
      if (savedKey) {
        setByokKey(savedKey);
        setByokProvider(savedProv);
        setByokSaved(true);
      }
    } catch {
      // localStorage disabled
    }
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const assembledPrompt = `${selectedRole}. ${selectedTask}. Context: ${selectedContext} Rules: ${selectedRules}`;

  const handleSaveByok = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = byokKey.trim();
    try {
      if (cleanKey) {
        localStorage.setItem("tungston:learn:byok_key", cleanKey);
        localStorage.setItem("tungston:learn:byok_provider", byokProvider);
        setByokSaved(true);
      } else {
        localStorage.removeItem("tungston:learn:byok_key");
        localStorage.removeItem("tungston:learn:byok_provider");
        setByokSaved(false);
      }
    } catch {}
    setByokModalOpen(false);
  };

  const handleSendPrompt = async (promptToSend: string) => {
    if (!promptToSend.trim() || isLoading) return;

    setErrorMsg(null);
    const userMessage = { role: "user" as const, content: promptToSend.trim() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputVal("");
    setIsLoading(true);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (byokSaved && byokKey.trim()) {
        headers["x-byok-key"] = byokKey.trim();
        headers["x-byok-provider"] = byokProvider;
      }

      const res = await fetch("/api/learn/chat", {
        method: "POST",
        headers,
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Server returned error status ${res.status}`);
      }

      if (!res.body) throw new Error("No response body received.");

      // Stream assistant response
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantText += decoder.decode(value, { stream: true });

        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: "assistant", content: assistantText };
          return next;
        });
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to contact the AI learning tutor.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadScenarioIntoSimulator = (promptText: string) => {
    setInputVal(promptText);
    const simulatorEl = document.getElementById("ai-simulator");
    if (simulatorEl) {
      simulatorEl.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-base text-ink font-mono selection:bg-accent selection:text-base flex flex-col">
      {/* Top Brutalist Navigation Bar */}
      <header className="border-b-2 border-line bg-surface sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 font-display text-sm md:text-base uppercase tracking-tight hover:text-accent transition-colors"
            >
              <span className="grid h-7 w-7 place-items-center border-2 border-line bg-accent text-line font-black">
                74
              </span>
              <span>TUNGSTON</span>
            </Link>
            <span className="text-muted text-xs hidden sm:inline">/</span>
            <span className="border border-line bg-surface2 px-2 py-0.5 text-[10px] font-bold uppercase text-accent tracking-wider">
              EVERYDAY AI GUIDE
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setByokModalOpen(true)}
              className={`border-2 border-line px-2.5 py-1 text-[11px] font-bold uppercase transition-colors shadow-hard-sm ${
                byokSaved
                  ? "bg-accent text-line"
                  : "bg-surface2 text-ink hover:bg-surface hover:text-accent"
              }`}
              title="Configure Bring-Your-Own-Key"
            >
              🔑 {byokSaved ? "BYOK KEY: ACTIVE" : "BYOK: FREE TIER"}
            </button>

            <Link
              href="/tools"
              className="border-2 border-line bg-surface2 px-2.5 py-1 text-[11px] font-bold uppercase text-ink hover:bg-surface hover:text-accent transition-colors shadow-hard-sm"
            >
              🛠️ TOOLS ↗
            </Link>

            <Link
              href="/"
              className="border-2 border-line bg-accent px-3 py-1 text-[11px] font-bold uppercase text-line hover:bg-accent/90 transition-colors shadow-hard-sm"
            >
              CHAT WORKBENCH ↗
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 py-8 flex-1 space-y-12">
        {/* Hero Section */}
        <section className="border-2 border-line bg-surface p-6 md:p-8 shadow-hard relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 font-display text-9xl text-surface2/30 select-none pointer-events-none">
            74
          </div>

          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 border border-line bg-accent/10 px-2.5 py-1 text-xs font-bold text-accent uppercase">
              <span>●</span> ZERO JARGON. ZERO INTIMIDATION. 100% PRACTICAL.
            </div>

            <h1 className="font-display text-2xl sm:text-3xl md:text-5xl uppercase tracking-tight leading-tight">
              Stop Being Intimidated By AI. <br />
              <span className="text-accent underline decoration-line decoration-4">
                Use It For Real Daily Life.
              </span>
            </h1>

            <p className="text-sm md:text-base text-ink/90 leading-relaxed font-body">
              You do <strong>not</strong> need a computer science degree, math skills, or weird tech
              buzzwords. AI is simply a patient, tireless helper that speaks normal human English. Once you know
              the <strong>4 simple ingredients</strong>, you can write difficult emails, plan meals from whatever is
              left in your fridge, and translate confusing letters in 10 seconds.
            </p>

            <div className="pt-2 flex flex-wrap gap-2 text-xs font-bold uppercase">
              <span className="border border-line bg-surface2 px-2 py-1 text-muted">
                ⚡ Instant Edge Speed
              </span>
              <span className="border border-line bg-surface2 px-2 py-1 text-muted">
                📱 Mobile & Desktop
              </span>
              <span className="border border-line bg-surface2 px-2 py-1 text-muted">
                🛡️ Zero Data Retention
              </span>
              <span className="border border-line bg-surface2 px-2 py-1 text-muted">
                💸 100% Free Shared Access
              </span>
            </div>
          </div>
        </section>

        {/* Section 1: The Golden Formula (The 4-Piece Puzzle) */}
        <section className="border-2 border-line bg-surface p-6 shadow-hard space-y-6">
          <div className="border-b-2 border-line pb-4 flex flex-col md:flex-row md:items-end justify-between gap-2">
            <div>
              <span className="text-xs font-bold uppercase text-accent tracking-wider block mb-1">
                RULE #1 // THE PROMPT BLUEPRINT
              </span>
              <h2 className="font-display text-xl md:text-2xl uppercase">
                The 4-Piece Puzzle of Great Prompts
              </h2>
            </div>
            <p className="text-xs text-muted max-w-md">
              Whenever everyday people get robotic, useless answers from AI, it is because they only gave 1 piece of the puzzle. Give all 4 pieces and the answer is pure gold.
            </p>
          </div>

          {/* Interactive Formula Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Box 1: Role */}
            <div className="border-2 border-line bg-surface2 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-accent">1. WHO IS IT? (Role)</span>
                <span className="text-[10px] text-muted">Who does it pretend to be?</span>
              </div>
              <p className="text-xs text-ink/80">
                Tell the AI its job or personality. An &quot;Italian Grandma Cook&quot; answers differently than a &quot;Corporate Chef&quot;.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {ROLES.map((r) => (
                  <button
                    key={r.label}
                    onClick={() => setSelectedRole(r.value)}
                    className={`border px-2 py-1 text-[11px] font-bold uppercase transition-all ${
                      selectedRole === r.value
                        ? "border-line bg-accent text-line shadow-hard-sm"
                        : "border-line bg-surface text-muted hover:text-ink hover:border-accent"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full border-2 border-line bg-base px-3 py-1.5 text-xs text-ink focus:border-accent"
                placeholder="Or type a custom role..."
              />
            </div>

            {/* Box 2: Task */}
            <div className="border-2 border-line bg-surface2 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-accent">2. WHAT SHOULD IT DO? (Task)</span>
                <span className="text-[10px] text-muted">The exact mission</span>
              </div>
              <p className="text-xs text-ink/80">
                Be specific. Don&apos;t say &quot;Help me with food&quot; — say &quot;Draft a 3-step recipe using leftover chicken&quot;.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {TASKS.map((t) => (
                  <button
                    key={t.label}
                    onClick={() => setSelectedTask(t.value)}
                    className={`border px-2 py-1 text-[11px] font-bold uppercase transition-all ${
                      selectedTask === t.value
                        ? "border-line bg-accent text-line shadow-hard-sm"
                        : "border-line bg-surface text-muted hover:text-ink hover:border-accent"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={selectedTask}
                onChange={(e) => setSelectedTask(e.target.value)}
                className="w-full border-2 border-line bg-base px-3 py-1.5 text-xs text-ink focus:border-accent"
                placeholder="Or type a custom task..."
              />
            </div>

            {/* Box 3: Context */}
            <div className="border-2 border-line bg-surface2 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-accent">3. WHAT IS THE SITUATION? (Context)</span>
                <span className="text-[10px] text-muted">Your real-life facts</span>
              </div>
              <p className="text-xs text-ink/80">
                Include the exact details: unit number, budget amount, ingredients on hand, or dates.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {CONTEXTS.map((c) => (
                  <button
                    key={c.label}
                    onClick={() => setSelectedContext(c.value)}
                    className={`border px-2 py-1 text-[11px] font-bold uppercase transition-all ${
                      selectedContext === c.value
                        ? "border-line bg-accent text-line shadow-hard-sm"
                        : "border-line bg-surface text-muted hover:text-ink hover:border-accent"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={selectedContext}
                onChange={(e) => setSelectedContext(e.target.value)}
                className="w-full border-2 border-line bg-base px-3 py-1.5 text-xs text-ink focus:border-accent"
                placeholder="Or type your specific facts..."
              />
            </div>

            {/* Box 4: Rules & Tone */}
            <div className="border-2 border-line bg-surface2 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-accent">4. HOW SHOULD IT SAY IT? (Rules)</span>
                <span className="text-[10px] text-muted">Length, tone & constraints</span>
              </div>
              <p className="text-xs text-ink/80">
                Prevent walls of text! Set boundaries like &quot;Under 100 words&quot; or &quot;No corporate buzzwords&quot;.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {RULES.map((ru) => (
                  <button
                    key={ru.label}
                    onClick={() => setSelectedRules(ru.value)}
                    className={`border px-2 py-1 text-[11px] font-bold uppercase transition-all ${
                      selectedRules === ru.value
                        ? "border-line bg-accent text-line shadow-hard-sm"
                        : "border-line bg-surface text-muted hover:text-ink hover:border-accent"
                    }`}
                  >
                    {ru.label}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={selectedRules}
                onChange={(e) => setSelectedRules(e.target.value)}
                className="w-full border-2 border-line bg-base px-3 py-1.5 text-xs text-ink focus:border-accent"
                placeholder="Or type custom rules..."
              />
            </div>
          </div>

          {/* Live Assembled Prompt Preview */}
          <div className="border-2 border-line bg-base p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-accent flex items-center gap-1.5">
                <span>⚡</span> LIVE ASSEMBLED PROMPT
              </span>
              <span className="text-[10px] text-muted font-bold uppercase">Ready to test</span>
            </div>

            <div className="border border-line bg-surface p-3 font-mono text-xs md:text-sm text-ink leading-relaxed break-words">
              {assembledPrompt}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <span className="text-[11px] text-muted">
                Notice how clear and foolproof this instruction is for the AI.
              </span>
              <button
                onClick={() => handleSendPrompt(assembledPrompt)}
                disabled={isLoading}
                className="border-2 border-line bg-accent px-4 py-2 text-xs font-bold uppercase text-line shadow-hard-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none hover:bg-accent/90 transition-all flex items-center gap-2"
              >
                <span>🧪 TEST THIS PROMPT IN AI LAB ↓</span>
              </button>
            </div>
          </div>
        </section>

        {/* Section 2: Real-World Daily Task Templates */}
        <section className="border-2 border-line bg-surface p-6 shadow-hard space-y-6">
          <div className="border-b-2 border-line pb-4 flex flex-col md:flex-row md:items-end justify-between gap-2">
            <div>
              <span className="text-xs font-bold uppercase text-accent tracking-wider block mb-1">
                1-CLICK BLUEPRINTS // SOLVE REAL PROBLEMS
              </span>
              <h2 className="font-display text-xl md:text-2xl uppercase">
                6 Everyday Superpowers You Can Use Right Now
              </h2>
            </div>
            <p className="text-xs text-muted max-w-md">
              Tap &quot;Load Into Simulator&quot; on any card below to see the AI solve a real headache in seconds.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {REAL_WORLD_TEMPLATES.map((tpl) => (
              <div
                key={tpl.title}
                className="border-2 border-line bg-surface2 p-4 flex flex-col justify-between space-y-4 hover:border-accent transition-colors"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{tpl.icon}</span>
                    <span className="border border-line bg-surface px-1.5 py-0.5 text-[9px] font-bold uppercase text-accent">
                      {tpl.category}
                    </span>
                  </div>
                  <h3 className="font-display text-sm md:text-base uppercase text-ink">{tpl.title}</h3>
                  <p className="text-xs text-muted leading-relaxed">{tpl.description}</p>
                </div>

                <div className="space-y-3 pt-2 border-t border-line/40">
                  <div className="bg-base border border-line p-2 text-[11px] text-ink/80 line-clamp-3 font-mono">
                    {tpl.prompt}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => loadScenarioIntoSimulator(tpl.prompt)}
                      className="flex-1 border-2 border-line bg-surface hover:bg-accent hover:text-line py-1.5 text-center text-[10px] font-bold uppercase transition-colors"
                    >
                      ✏️ Edit Prompt
                    </button>
                    <button
                      onClick={() => handleSendPrompt(tpl.prompt)}
                      disabled={isLoading}
                      className="flex-1 border-2 border-line bg-accent py-1.5 text-center text-[10px] font-bold uppercase text-line shadow-hard-sm hover:bg-accent/90 transition-colors"
                    >
                      ▶️ Run Now
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 3: Live Interactive AI Simulator */}
        <section id="ai-simulator" className="border-2 border-line bg-surface p-6 shadow-hard space-y-4">
          <div className="border-b-2 border-line pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold uppercase text-accent tracking-wider block mb-1">
                PRACTICE LAB // INTERACTIVE TUTOR
              </span>
              <h2 className="font-display text-xl md:text-2xl uppercase">
                Interactive Everyday AI Tutor
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`border border-line px-2 py-0.5 text-[10px] font-bold uppercase ${
                  byokSaved
                    ? "bg-accent text-line"
                    : "bg-surface2 text-accent"
                }`}
              >
                {byokSaved ? "🔑 PERSONAL KEY ACTIVE" : "⚡ SHARED FREE KEY ACTIVE"}
              </span>
              <button
                onClick={() =>
                  setMessages([
                    {
                      role: "assistant",
                      content:
                        "Chat restarted! Pick any prompt above or ask a new question about your daily life.",
                    },
                  ])
                }
                className="border border-line bg-surface2 px-2 py-0.5 text-[10px] font-bold uppercase text-muted hover:text-danger hover:border-danger transition-colors"
              >
                Reset Chat
              </button>
            </div>
          </div>

          {/* Chat Messages Display Box */}
          <div className="border-2 border-line bg-base p-4 min-h-[360px] max-h-[520px] overflow-y-auto space-y-4">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${
                  m.role === "user" ? "items-end" : "items-start"
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1 px-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
                    {m.role === "user" ? "👤 YOU" : "🤖 TUNGSTON TUTOR"}
                  </span>
                </div>

                <div
                  className={`max-w-[90%] md:max-w-[80%] border-2 border-line p-3 text-xs md:text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-accent text-line font-bold shadow-hard-sm"
                      : "bg-surface text-ink shadow-hard-sm prose-tungston"
                  }`}
                >
                  {m.role === "assistant" ? (
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  ) : (
                    <span className="whitespace-pre-wrap">{m.content}</span>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 text-accent font-bold text-xs p-2">
                <span className="animate-pulse">●</span>
                <span className="animate-pulse">Tungston Tutor is drafting your solution...</span>
              </div>
            )}

            {errorMsg && (
              <div className="border-2 border-danger bg-danger/10 p-3 text-xs text-danger font-bold">
                ⚠️ {errorMsg}
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>

          {/* Quick Starter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-[10px] font-bold uppercase text-muted mr-1">Quick tries:</span>
            <button
              onClick={() =>
                handleSendPrompt(
                  "Draft a 2-sentence polite reply telling a pushy salesperson I am not interested and to remove my email from their list."
                )
              }
              className="border border-line bg-surface2 px-2 py-0.5 text-[10px] text-ink hover:border-accent hover:text-accent transition-colors"
            >
              🚫 Unsubscribe Polite Text
            </button>
            <button
              onClick={() =>
                handleSendPrompt(
                  "Explain in 2 simple sentences what a 401(k) employer match means without using finance jargon."
                )
              }
              className="border border-line bg-surface2 px-2 py-0.5 text-[10px] text-ink hover:border-accent hover:text-accent transition-colors"
            >
              💰 Explain 401(k) Match
            </button>
            <button
              onClick={() =>
                handleSendPrompt(
                  "What are 3 quick meals I can make with canned tuna and pasta in under 12 minutes?"
                )
              }
              className="border border-line bg-surface2 px-2 py-0.5 text-[10px] text-ink hover:border-accent hover:text-accent transition-colors"
            >
              🍝 12-Min Tuna & Pasta
            </button>
          </div>

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendPrompt(inputVal);
            }}
            className="flex flex-col sm:flex-row gap-2"
          >
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Ask anything or test a daily task prompt here..."
              disabled={isLoading}
              className="flex-1 border-2 border-line bg-base px-3 py-2 text-xs md:text-sm text-ink placeholder-muted focus:border-accent"
            />
            <button
              type="submit"
              disabled={isLoading || !inputVal.trim()}
              className="border-2 border-line bg-accent px-6 py-2 text-xs md:text-sm font-bold uppercase text-line shadow-hard-sm disabled:opacity-50 active:translate-x-[2px] active:translate-y-[2px]"
            >
              {isLoading ? "Sending..." : "SEND PROMPT ↵"}
            </button>
          </form>
        </section>

        {/* Section 4: Interactive Quiz (Spot the Slop vs. Gold) */}
        <section className="border-2 border-line bg-surface p-6 shadow-hard space-y-6">
          <div className="border-b-2 border-line pb-4 flex flex-col md:flex-row md:items-end justify-between gap-2">
            <div>
              <span className="text-xs font-bold uppercase text-accent tracking-wider block mb-1">
                KNOWLEDGE CHECK // PRACTICE YOUR EYE
              </span>
              <h2 className="font-display text-xl md:text-2xl uppercase">
                Spot The Slop vs. Spot The Gold
              </h2>
            </div>
            <p className="text-xs text-muted max-w-md">
              Tap the prompt you think will produce a truly useful, ready-to-use answer.
            </p>
          </div>

          <div className="space-y-6">
            {QUIZ_CHALLENGES.map((challenge, cIdx) => (
              <div key={cIdx} className="border-2 border-line bg-surface2 p-4 space-y-3">
                <span className="font-bold text-xs md:text-sm text-ink block">
                  {challenge.question}
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Option A */}
                  <button
                    onClick={() => setQuizAnswers((prev) => ({ ...prev, [cIdx]: "A" }))}
                    className={`border-2 p-3 text-left font-mono text-xs transition-all ${
                      quizAnswers[cIdx] === "A"
                        ? challenge.optionA.correct
                          ? "border-accent bg-accent/10"
                          : "border-danger bg-danger/10"
                        : "border-line bg-surface hover:border-accent"
                    }`}
                  >
                    <div className="font-bold mb-1 text-ink">{challenge.optionA.text}</div>
                    {quizAnswers[cIdx] && (
                      <div
                        className={`text-[11px] font-bold mt-2 ${
                          challenge.optionA.correct ? "text-accent" : "text-danger"
                        }`}
                      >
                        {challenge.optionA.verdict}: {challenge.optionA.reason}
                      </div>
                    )}
                  </button>

                  {/* Option B */}
                  <button
                    onClick={() => setQuizAnswers((prev) => ({ ...prev, [cIdx]: "B" }))}
                    className={`border-2 p-3 text-left font-mono text-xs transition-all ${
                      quizAnswers[cIdx] === "B"
                        ? challenge.optionB.correct
                          ? "border-accent bg-accent/10"
                          : "border-danger bg-danger/10"
                        : "border-line bg-surface hover:border-accent"
                    }`}
                  >
                    <div className="font-bold mb-1 text-ink">{challenge.optionB.text}</div>
                    {quizAnswers[cIdx] && (
                      <div
                        className={`text-[11px] font-bold mt-2 ${
                          challenge.optionB.correct ? "text-accent" : "text-danger"
                        }`}
                      >
                        {challenge.optionB.verdict}: {challenge.optionB.reason}
                      </div>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 5: Educational BYOK Key Vault Guide */}
        <section className="border-2 border-line bg-surface p-6 shadow-hard space-y-6">
          <div className="border-b-2 border-line pb-4 flex flex-col md:flex-row md:items-end justify-between gap-2">
            <div>
              <span className="text-xs font-bold uppercase text-accent tracking-wider block mb-1">
                ADVANCED TIP // COMPLETE DIGITAL FREEDOM
              </span>
              <h2 className="font-display text-xl md:text-2xl uppercase">
                What is an &quot;API Key&quot; in Plain English?
              </h2>
            </div>
            <button
              onClick={() => setByokModalOpen(true)}
              className="border-2 border-line bg-accent px-3 py-1.5 text-xs font-bold uppercase text-line shadow-hard-sm"
            >
              🔑 Manage Your Key
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border border-line bg-surface2 p-4 space-y-2">
              <span className="text-xl">🎟️</span>
              <h3 className="font-display text-xs uppercase text-ink">1. Like a Personal Train Pass</h3>
              <p className="text-xs text-muted leading-relaxed">
                Tungston provides a free shared train pass for everyone. But when thousands of people visit at once, the shared pass has to wait in line. A personal API key is your own private express pass.
              </p>
            </div>

            <div className="border border-line bg-surface2 p-4 space-y-2">
              <span className="text-xl">🆓</span>
              <h3 className="font-display text-xs uppercase text-ink">2. They Are 100% Free</h3>
              <p className="text-xs text-muted leading-relaxed">
                AI infrastructure providers (like Groq or OpenRouter) give every single human free accounts with generous daily allowances. You do not need a paid subscription or credit card.
              </p>
            </div>

            <div className="border border-line bg-surface2 p-4 space-y-2">
              <span className="text-xl">🔒</span>
              <h3 className="font-display text-xs uppercase text-ink">3. Kept Only On Your Device</h3>
              <p className="text-xs text-muted leading-relaxed">
                Your key never touches our database. It stays strictly inside your browser&apos;s local memory, meaning you have 100% private control over your own AI usage at all times.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* BYOK Modal */}
      {byokModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md border-2 border-line bg-surface p-6 shadow-hard space-y-4">
            <div className="flex items-center justify-between border-b-2 border-line pb-3">
              <h3 className="font-display text-sm uppercase text-ink">
                🔑 Personal Key Vault (BYOK)
              </h3>
              <button
                onClick={() => setByokModalOpen(false)}
                className="text-muted hover:text-ink font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-muted leading-relaxed">
              Paste your free Groq or OpenRouter API key below. When entered, your practice lab requests use your personal speed quota and bypass all shared public limits.
            </p>

            <form onSubmit={handleSaveByok} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-accent mb-1">
                  Provider
                </label>
                <select
                  value={byokProvider}
                  onChange={(e) => setByokProvider(e.target.value)}
                  className="w-full border-2 border-line bg-base px-3 py-2 text-xs text-ink focus:border-accent"
                >
                  <option value="groq">Groq (Ultra-Fast Free Tier - Recommended)</option>
                  <option value="openrouter">OpenRouter (Multi-Model Free Tier)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-accent mb-1">
                  API Key
                </label>
                <input
                  type="password"
                  value={byokKey}
                  onChange={(e) => setByokKey(e.target.value)}
                  placeholder="gsk_... or sk-or-..."
                  className="w-full border-2 border-line bg-base px-3 py-2 text-xs text-ink focus:border-accent font-mono"
                />
                <span className="text-[10px] text-muted block mt-1">
                  Need a free key? Get one in 60s at{" "}
                  <a
                    href="https://console.groq.com/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent underline"
                  >
                    console.groq.com
                  </a>
                </span>
              </div>

              <div className="flex justify-between items-center pt-2">
                {byokSaved && (
                  <button
                    type="button"
                    onClick={() => {
                      setByokKey("");
                      localStorage.removeItem("tungston:learn:byok_key");
                      setByokSaved(false);
                      setByokModalOpen(false);
                    }}
                    className="text-[10px] font-bold uppercase text-danger hover:underline"
                  >
                    Remove Key
                  </button>
                )}
                <div className="flex gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => setByokModalOpen(false)}
                    className="border border-line bg-surface2 px-3 py-1.5 text-xs font-bold uppercase text-muted hover:text-ink"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="border-2 border-line bg-accent px-4 py-1.5 text-xs font-bold uppercase text-line shadow-hard-sm"
                  >
                    Save Key
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Brutalist Footer */}
      <footer className="border-t-2 border-line bg-surface mt-12 py-6">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-muted">
          <div>
            <span className="font-display text-ink uppercase">TUNGSTON AI</span> // ELEMENT 74
          </div>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-accent underline">
              Chat Workbench
            </Link>
            <Link href="/tools" className="hover:text-accent underline">
              Developer Tools
            </Link>
            <Link href="/privacy" className="hover:text-accent underline">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-accent underline">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
