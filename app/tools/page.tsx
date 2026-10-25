"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";

type ToolTab =
  | "curl"
  | "jwt"
  | "sql"
  | "diff"
  | "crypto"
  | "tokens"
  | "schema"
  | "cron"
  | "regex"
  | "json-ts"
  | "uuid"
  | "color"
  | "brutalist-css"
  | "epoch"
  | "chmod"
  | "prompt-cleaner";

export default function DeveloperToolsPage() {
  const [activeTab, setActiveTab] = useState<ToolTab>("curl");
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string = "Copied!") => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(label);
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  // -------------------------------------------------------------
  // Tool 1: cURL Converter
  // -------------------------------------------------------------
  const [curlInput, setCurlInput] = useState(
    `curl -X POST https://api.example.com/v1/orders \\\n  -H "Content-Type: application/json" \\\n  -H "Authorization: Bearer my_secret_token" \\\n  -d '{"product_id": "74A", "quantity": 3}'`
  );
  const [curlTarget, setCurlTarget] = useState<"fetch" | "python" | "go">("fetch");

  const convertedCurl = useMemo(() => {
    try {
      const clean = curlInput.replace(/\\\n/g, " ").replace(/\s+/g, " ").trim();
      const urlMatch = clean.match(/curl\s+(?:-[A-Za-z]+\s+)?["']?(https?:\/\/[^\s"']+)["']?/i);
      const url = urlMatch ? urlMatch[1] : "https://api.example.com";

      const methodMatch = clean.match(/-X\s+([A-Z]+)/i);
      const method = methodMatch ? methodMatch[1].toUpperCase() : clean.includes("-d ") ? "POST" : "GET";

      const headerMatches = Array.from(clean.matchAll(/-H\s+["']([^"']+)["']/g));
      const headers: Record<string, string> = {};
      headerMatches.forEach((m) => {
        const [k, ...v] = m[1].split(":");
        if (k && v.length) headers[k.trim()] = v.join(":").trim();
      });

      const dataMatch = clean.match(/(?:-d|--data(?:-raw)?)\s+['"]({.*?}|[^'"]+)['"]/);
      const dataRaw = dataMatch ? dataMatch[1] : null;

      if (curlTarget === "fetch") {
        return `const response = await fetch("${url}", {
  method: "${method}",
  headers: ${JSON.stringify(headers, null, 4)},
  ${dataRaw ? `body: JSON.stringify(${dataRaw})` : ""}
});
const data = await response.json();
console.log(data);`;
      } else if (curlTarget === "python") {
        return `import requests

url = "${url}"
headers = ${JSON.stringify(headers, null, 4).replace(/true/g, "True").replace(/false/g, "False")}
${dataRaw ? `payload = ${dataRaw}\nresponse = requests.${method.toLowerCase()}(url, json=payload, headers=headers)` : `response = requests.${method.toLowerCase()}(url, headers=headers)`}

print(response.status_code)
print(response.json())`;
      } else {
        return `package main

import (
    "bytes"
    "fmt"
    "net/http"
    "io"
)

func main() {
    url := "${url}"
    ${dataRaw ? `payload := []byte(\`${dataRaw}\`)\n    req, _ := http.NewRequest("${method}", url, bytes.NewBuffer(payload))` : `req, _ := http.NewRequest("${method}", url, nil)`}
    ${Object.entries(headers)
      .map(([k, v]) => `req.Header.Set("${k}", "${v}")`)
      .join("\n    ")}

    client := &http.Client{}
    resp, err := client.Do(req)
    if err != nil {
        panic(err)
    }
    defer resp.Body.Close()

    body, _ := io.ReadAll(resp.Body)
    fmt.Println(string(body))
}`;
      }
    } catch {
      return "// Could not parse cURL string. Check syntax.";
    }
  }, [curlInput, curlTarget]);

  // -------------------------------------------------------------
  // Tool 2: JWT Inspector
  // -------------------------------------------------------------
  const [jwtInput, setJwtInput] = useState(
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkVsZW1lbnQgNzQiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE1MTYyMzkwMjIsImV4cCI6MjExNDM4MDgwMH0.4smV_f2Z7oX8J8b8mJgV2tJ3M8rZ4p8K8d7w2r4b5e6"
  );

  const inspectedJwt = useMemo(() => {
    try {
      const parts = jwtInput.trim().split(".");
      if (parts.length < 2) return { error: "Invalid JWT: Must have at least header and payload segments." };

      const decodeB64 = (str: string) => {
        const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
        const json = decodeURIComponent(
          atob(base64)
            .split("")
            .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
            .join("")
        );
        return JSON.parse(json);
      };

      const header = decodeB64(parts[0]);
      const payload = decodeB64(parts[1]);

      let expiryInfo = "No exp claim found";
      if (payload.exp && typeof payload.exp === "number") {
        const expDate = new Date(payload.exp * 1000);
        const isExpired = Date.now() > expDate.getTime();
        expiryInfo = `${isExpired ? "EXPIRED" : "ACTIVE"} (${expDate.toISOString()})`;
      }

      return { header, payload, expiryInfo, signature: parts[2] || "None" };
    } catch (e: any) {
      return { error: `Failed to decode JWT: ${e.message}` };
    }
  }, [jwtInput]);

  // -------------------------------------------------------------
  // Tool 3: SQL to TypeScript / Zod
  // -------------------------------------------------------------
  const [sqlInput, setSqlInput] = useState(`CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(255) NOT NULL,
  email TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  credits INTEGER DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);`);
  const [sqlMode, setSqlMode] = useState<"ts" | "zod">("ts");

  const convertedSql = useMemo(() => {
    try {
      const lines = sqlInput.split("\n");
      const fields: Array<{ name: string; type: string; nullable: boolean }> = [];

      for (const line of lines) {
        const trimmed = line.trim().replace(/,$/, "");
        if (
          !trimmed ||
          trimmed.toUpperCase().startsWith("CREATE") ||
          trimmed.startsWith(")") ||
          trimmed.toUpperCase().startsWith("CONSTRAINT") ||
          trimmed.toUpperCase().startsWith("PRIMARY KEY")
        ) {
          continue;
        }

        const tokens = trimmed.split(/\s+/);
        if (tokens.length >= 2) {
          const colName = tokens[0].replace(/["`]/g, "");
          const colType = tokens[1].toUpperCase();
          const notNull = trimmed.toUpperCase().includes("NOT NULL") || trimmed.toUpperCase().includes("PRIMARY KEY");

          let tsType = "string";
          if (colType.includes("INT") || colType.includes("NUMERIC") || colType.includes("FLOAT") || colType.includes("DECIMAL")) {
            tsType = "number";
          } else if (colType.includes("BOOL")) {
            tsType = "boolean";
          } else if (colType.includes("JSON")) {
            tsType = "Record<string, any>";
          } else if (colType.includes("DATE") || colType.includes("TIME")) {
            tsType = "string";
          }

          fields.push({ name: colName, type: tsType, nullable: !notNull });
        }
      }

      if (sqlMode === "ts") {
        return `export interface UserRecord {
${fields.map((f) => `  ${f.name}${f.nullable ? "?" : ""}: ${f.type};`).join("\n")}
}`;
      } else {
        return `import { z } from "zod";

export const UserSchema = z.object({
${fields
  .map((f) => {
    let zodType = "z.string()";
    if (f.type === "number") zodType = "z.number()";
    if (f.type === "boolean") zodType = "z.boolean()";
    if (f.type.includes("Record")) zodType = "z.record(z.any())";
    if (f.nullable) zodType += ".optional()";
    return `  ${f.name}: ${zodType},`;
  })
  .join("\n")}
});

export type User = z.infer<typeof UserSchema>;`;
      }
    } catch {
      return "// Could not parse SQL CREATE TABLE statement.";
    }
  }, [sqlInput, sqlMode]);

  // -------------------------------------------------------------
  // Tool 4: Crypto Forge (SHA-256, Base64, Hex, URL)
  // -------------------------------------------------------------
  const [cryptoInput, setCryptoInput] = useState("Tungston Element 74 Heavy Duty");
  const [cryptoOutputs, setCryptoOutputs] = useState<{
    sha256: string;
    base64Encode: string;
    base64Decode: string;
    urlEncode: string;
    urlDecode: string;
    hex: string;
  }>({
    sha256: "",
    base64Encode: "",
    base64Decode: "",
    urlEncode: "",
    urlDecode: "",
    hex: "",
  });

  useEffect(() => {
    async function computeCrypto() {
      try {
        const enc = new TextEncoder();
        const data = enc.encode(cryptoInput);

        // SHA-256
        const hashBuf = await crypto.subtle.digest("SHA-256", data);
        const hashArray = Array.from(new Uint8Array(hashBuf));
        const sha256Hex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

        // Base64
        let b64Enc = "";
        try {
          b64Enc = btoa(unescape(encodeURIComponent(cryptoInput)));
        } catch {
          b64Enc = "Encoding error";
        }

        let b64Dec = "";
        try {
          b64Dec = decodeURIComponent(escape(atob(cryptoInput)));
        } catch {
          b64Dec = "[Not valid Base64 string]";
        }

        // Hex
        const hex = Array.from(data)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join(" ");

        setCryptoOutputs({
          sha256: sha256Hex,
          base64Encode: b64Enc,
          base64Decode: b64Dec,
          urlEncode: encodeURIComponent(cryptoInput),
          urlDecode: decodeURIComponent(cryptoInput),
          hex,
        });
      } catch {
        // Fallback
      }
    }
    computeCrypto();
  }, [cryptoInput]);

  // -------------------------------------------------------------
  // Tool 5: UUID v4 & NanoID Generator
  // -------------------------------------------------------------
  const [uuidCount, setUuidCount] = useState(5);
  const [generatedUuids, setGeneratedUuids] = useState<string[]>([]);
  const [generatedNanoIds, setGeneratedNanoIds] = useState<string[]>([]);

  const generateIds = () => {
    const uuids: string[] = [];
    const nanoIds: string[] = [];
    const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz-";

    for (let i = 0; i < uuidCount; i++) {
      uuids.push(crypto.randomUUID());

      // NanoID generator (21 chars)
      const randomValues = new Uint8Array(21);
      crypto.getRandomValues(randomValues);
      let nano = "";
      for (let j = 0; j < 21; j++) {
        nano += alphabet[randomValues[j] % alphabet.length];
      }
      nanoIds.push(nano);
    }
    setGeneratedUuids(uuids);
    setGeneratedNanoIds(nanoIds);
  };

  useEffect(() => {
    generateIds();
  }, [uuidCount]);

  // -------------------------------------------------------------
  // Tool 6: Color Palette & WCAG AAA Contrast Forge
  // -------------------------------------------------------------
  const [fgColor, setFgColor] = useState("#FFA85C"); // Tungston Accent
  const [bgColor, setBgColor] = useState("#24272B"); // Tungston Base

  const contrastMetrics = useMemo(() => {
    const getLuminance = (hex: string) => {
      const cleanHex = hex.replace("#", "");
      if (cleanHex.length !== 6) return 0;
      const rgb = [0, 2, 4].map((i) => parseInt(cleanHex.substring(i, i + 2), 16) / 255);
      const [r, g, b] = rgb.map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };

    const l1 = getLuminance(fgColor);
    const l2 = getLuminance(bgColor);
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    const rounded = Number(ratio.toFixed(2));

    return {
      ratio: rounded,
      wcagAaNormal: rounded >= 4.5,
      wcagAaLarge: rounded >= 3.0,
      wcagAaaNormal: rounded >= 7.0,
      wcagAaaLarge: rounded >= 4.5,
    };
  }, [fgColor, bgColor]);

  // -------------------------------------------------------------
  // Tool 7: CSS Brutalist Shadow & Border Styler
  // -------------------------------------------------------------
  const [shadowX, setShadowX] = useState(6);
  const [shadowY, setShadowY] = useState(6);
  const [shadowColor, setShadowColor] = useState("#0B0C0D");
  const [borderWidth, setBorderWidth] = useState(2);
  const [borderColor, setBorderColor] = useState("#0B0C0D");
  const [boxBg, setBoxBg] = useState("#2E3237");

  const brutalistCss = `/* Element 74 Brutalist Card */
.brutalist-box {
  background-color: ${boxBg};
  border: ${borderWidth}px solid ${borderColor};
  box-shadow: ${shadowX}px ${shadowY}px 0px ${shadowColor};
  border-radius: 0px;
  transition: transform 0.1s ease, box-shadow 0.1s ease;
}
.brutalist-box:active {
  transform: translate(2px, 2px);
  box-shadow: ${Math.max(0, shadowX - 2)}px ${Math.max(0, shadowY - 2)}px 0px ${shadowColor};
}`;

  // -------------------------------------------------------------
  // Tool 8: Unix Epoch & Date Converter
  // -------------------------------------------------------------
  const [epochInput, setEpochInput] = useState(String(Math.floor(Date.now() / 1000)));

  const parsedEpoch = useMemo(() => {
    try {
      const num = Number(epochInput.trim());
      if (isNaN(num)) return { error: "Invalid epoch number" };
      // Distinguish seconds vs milliseconds
      const date = num > 1e11 ? new Date(num) : new Date(num * 1000);
      return {
        utc: date.toUTCString(),
        iso: date.toISOString(),
        local: date.toLocaleString(),
        relative: `${Math.round((Date.now() - date.getTime()) / 60000)} minutes ago`,
      };
    } catch {
      return { error: "Parse error" };
    }
  }, [epochInput]);

  // -------------------------------------------------------------
  // Tool 9: Linux Chmod Permission Calculator
  // -------------------------------------------------------------
  const [chmodOwner, setChmodOwner] = useState({ r: true, w: true, x: true }); // 7
  const [chmodGroup, setChmodGroup] = useState({ r: true, w: false, x: true }); // 5
  const [chmodPublic, setChmodPublic] = useState({ r: true, w: false, x: true }); // 5

  const chmodOctal = useMemo(() => {
    const calc = (p: { r: boolean; w: boolean; x: boolean }) =>
      (p.r ? 4 : 0) + (p.w ? 2 : 0) + (p.x ? 1 : 0);
    return `${calc(chmodOwner)}${calc(chmodGroup)}${calc(chmodPublic)}`;
  }, [chmodOwner, chmodGroup, chmodPublic]);

  const chmodSymbolic = useMemo(() => {
    const s = (p: { r: boolean; w: boolean; x: boolean }) =>
      `${p.r ? "r" : "-"}${p.w ? "w" : "-"}${p.x ? "x" : "-"}`;
    return `${s(chmodOwner)}${s(chmodGroup)}${s(chmodPublic)}`;
  }, [chmodOwner, chmodGroup, chmodPublic]);

  // -------------------------------------------------------------
  // Tool 10: Prompt Minifier & Context Cleaner
  // -------------------------------------------------------------
  const [promptRaw, setPromptRaw] = useState(
    `// Configuration instructions for LLM assistant\n/* Multi-line comment here\n   Remove this redundant fluff */\n\nYou are a high-performance system.\n\n\n\n\nTask: Analyze the input thoroughly.\n   - Ensure zero errors.\n   - Output in markdown.\n\n\n\nResult:\n`
  );

  const minifiedPrompt = useMemo(() => {
    const originalChars = promptRaw.length;
    // Strip single-line comments, multi-line comments, multiple empty lines, and trailing spaces
    const cleaned = promptRaw
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "")
      .replace(/[ \t]+$/gm, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    const newChars = cleaned.length;
    const estTokensBefore = Math.ceil(originalChars / 4);
    const estTokensAfter = Math.ceil(newChars / 4);
    const percentSaved = originalChars > 0 ? Math.round(((originalChars - newChars) / originalChars) * 100) : 0;

    return {
      text: cleaned,
      originalChars,
      newChars,
      estTokensBefore,
      estTokensAfter,
      percentSaved,
    };
  }, [promptRaw]);

  return (
    <div className="min-h-screen bg-base text-ink font-mono selection:bg-accent selection:text-base flex flex-col">
      {/* Header */}
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
              CLIENT DEVELOPER TOOLS
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="border border-line bg-surface2 px-2 py-0.5 text-[10px] font-bold uppercase text-muted hidden md:inline">
              💾 100% BROWSER CACHED (0 SERVER COMPUTE)
            </span>
            <Link
              href="/learn"
              className="border-2 border-line bg-surface2 px-2.5 py-1 text-[11px] font-bold uppercase text-ink hover:bg-surface hover:text-accent transition-colors shadow-hard-sm"
            >
              📚 EVERYDAY AI GUIDE ↗
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
      <main className="max-w-6xl mx-auto px-4 py-8 flex-1 space-y-6">
        {/* Title Bar */}
        <div className="border-2 border-line bg-surface p-4 shadow-hard flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-xl md:text-2xl uppercase tracking-tight">
              Developer Utilities Suite
            </h1>
            <p className="text-xs text-muted mt-1">
              Zero network roundtrips. All transformations run client-side via WebAssembly, Web Crypto, and local AST parsers.
            </p>
          </div>

          {copyFeedback && (
            <div className="border border-accent bg-accent/10 px-3 py-1 text-xs text-accent font-bold animate-pulse">
              ✓ {copyFeedback}
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-1.5 border-2 border-line bg-surface2 p-2">
          {[
            { id: "curl", label: "🔌 cURL Converter" },
            { id: "jwt", label: "🛡️ JWT Inspector" },
            { id: "sql", label: "🗄️ SQL Schema" },
            { id: "crypto", label: "🔐 Crypto Forge" },
            { id: "uuid", label: "🎲 UUID & NanoID" },
            { id: "color", label: "🎨 Color & WCAG AAA" },
            { id: "brutalist-css", label: "📐 Brutalist CSS" },
            { id: "epoch", label: "⏱️ Unix Epoch" },
            { id: "chmod", label: "🔒 Linux Chmod" },
            { id: "prompt-cleaner", label: "🧹 Prompt Minifier" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ToolTab)}
              className={`border px-3 py-1.5 text-xs font-bold uppercase transition-all ${
                activeTab === tab.id
                  ? "border-line bg-accent text-line shadow-hard-sm"
                  : "border-transparent bg-surface text-muted hover:border-line hover:text-ink"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content Panels */}
        <div className="border-2 border-line bg-surface p-6 shadow-hard min-h-[460px]">
          {/* TAB 1: cURL */}
          {activeTab === "curl" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-accent">cURL Input</span>
                <div className="flex gap-1.5">
                  {(["fetch", "python", "go"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setCurlTarget(t)}
                      className={`border px-2 py-0.5 text-[10px] font-bold uppercase ${
                        curlTarget === t ? "border-line bg-accent text-line" : "border-line bg-surface2 text-muted"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                value={curlInput}
                onChange={(e) => setCurlInput(e.target.value)}
                rows={5}
                className="w-full border-2 border-line bg-base p-3 text-xs font-mono text-ink focus:border-accent"
              />

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-bold uppercase text-accent">
                  Generated {curlTarget.toUpperCase()} Code
                </span>
                <button
                  onClick={() => copyToClipboard(convertedCurl)}
                  className="border border-line bg-surface2 px-2.5 py-1 text-[10px] font-bold uppercase text-ink hover:text-accent"
                >
                  Copy Code
                </button>
              </div>

              <pre className="border-2 border-line bg-base p-4 text-xs font-mono text-ink overflow-x-auto whitespace-pre-wrap">
                {convertedCurl}
              </pre>
            </div>
          )}

          {/* TAB 2: JWT Inspector */}
          {activeTab === "jwt" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-accent">Raw JWT Token</span>
                <button
                  onClick={() =>
                    setJwtInput(
                      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkVsZW1lbnQgNzQiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE1MTYyMzkwMjIsImV4cCI6MjExNDM4MDgwMH0.4smV_f2Z7oX8J8b8mJgV2tJ3M8rZ4p8K8d7w2r4b5e6"
                    )
                  }
                  className="border border-line bg-surface2 px-2 py-0.5 text-[10px] font-bold uppercase text-muted hover:text-ink"
                >
                  Load Sample Token
                </button>
              </div>

              <textarea
                value={jwtInput}
                onChange={(e) => setJwtInput(e.target.value)}
                rows={3}
                className="w-full border-2 border-line bg-base p-3 text-xs font-mono text-ink focus:border-accent"
              />

              {"error" in inspectedJwt ? (
                <div className="border border-danger bg-danger/10 p-3 text-xs text-danger font-bold">
                  {inspectedJwt.error}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="border border-line bg-surface2 p-3 space-y-2">
                    <span className="text-[10px] font-bold uppercase text-accent block">Header</span>
                    <pre className="text-xs bg-base p-2 border border-line overflow-x-auto">
                      {JSON.stringify(inspectedJwt.header, null, 2)}
                    </pre>
                  </div>

                  <div className="border border-line bg-surface2 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase text-accent">Payload Claims</span>
                      <span className="text-[10px] font-bold text-accent">{inspectedJwt.expiryInfo}</span>
                    </div>
                    <pre className="text-xs bg-base p-2 border border-line overflow-x-auto">
                      {JSON.stringify(inspectedJwt.payload, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SQL to TS/Zod */}
          {activeTab === "sql" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-accent">SQL CREATE TABLE</span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setSqlMode("ts")}
                    className={`border px-2 py-0.5 text-[10px] font-bold uppercase ${
                      sqlMode === "ts" ? "border-line bg-accent text-line" : "border-line bg-surface2 text-muted"
                    }`}
                  >
                    TypeScript
                  </button>
                  <button
                    onClick={() => setSqlMode("zod")}
                    className={`border px-2 py-0.5 text-[10px] font-bold uppercase ${
                      sqlMode === "zod" ? "border-line bg-accent text-line" : "border-line bg-surface2 text-muted"
                    }`}
                  >
                    Zod Schema
                  </button>
                </div>
              </div>

              <textarea
                value={sqlInput}
                onChange={(e) => setSqlInput(e.target.value)}
                rows={6}
                className="w-full border-2 border-line bg-base p-3 text-xs font-mono text-ink focus:border-accent"
              />

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-bold uppercase text-accent">
                  Generated {sqlMode === "ts" ? "TypeScript Interface" : "Zod Validation Schema"}
                </span>
                <button
                  onClick={() => copyToClipboard(convertedSql)}
                  className="border border-line bg-surface2 px-2.5 py-1 text-[10px] font-bold uppercase text-ink hover:text-accent"
                >
                  Copy
                </button>
              </div>

              <pre className="border-2 border-line bg-base p-4 text-xs font-mono text-ink overflow-x-auto">
                {convertedSql}
              </pre>
            </div>
          )}

          {/* TAB 4: Crypto Forge */}
          {activeTab === "crypto" && (
            <div className="space-y-4">
              <span className="text-xs font-bold uppercase text-accent block">Raw Input String</span>
              <input
                type="text"
                value={cryptoInput}
                onChange={(e) => setCryptoInput(e.target.value)}
                className="w-full border-2 border-line bg-base p-3 text-xs font-mono text-ink focus:border-accent"
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="border border-line bg-surface2 p-3 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold uppercase text-accent">SHA-256 Hash</span>
                    <button
                      onClick={() => copyToClipboard(cryptoOutputs.sha256)}
                      className="text-[9px] uppercase font-bold text-muted hover:text-accent"
                    >
                      Copy
                    </button>
                  </div>
                  <div className="bg-base p-2 border border-line text-xs font-mono break-all">
                    {cryptoOutputs.sha256}
                  </div>
                </div>

                <div className="border border-line bg-surface2 p-3 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold uppercase text-accent">Base64 Encoded</span>
                    <button
                      onClick={() => copyToClipboard(cryptoOutputs.base64Encode)}
                      className="text-[9px] uppercase font-bold text-muted hover:text-accent"
                    >
                      Copy
                    </button>
                  </div>
                  <div className="bg-base p-2 border border-line text-xs font-mono break-all">
                    {cryptoOutputs.base64Encode}
                  </div>
                </div>

                <div className="border border-line bg-surface2 p-3 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold uppercase text-accent">Hex Bytes</span>
                    <button
                      onClick={() => copyToClipboard(cryptoOutputs.hex)}
                      className="text-[9px] uppercase font-bold text-muted hover:text-accent"
                    >
                      Copy
                    </button>
                  </div>
                  <div className="bg-base p-2 border border-line text-xs font-mono break-all">
                    {cryptoOutputs.hex}
                  </div>
                </div>

                <div className="border border-line bg-surface2 p-3 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold uppercase text-accent">URL Encoded</span>
                    <button
                      onClick={() => copyToClipboard(cryptoOutputs.urlEncode)}
                      className="text-[9px] uppercase font-bold text-muted hover:text-accent"
                    >
                      Copy
                    </button>
                  </div>
                  <div className="bg-base p-2 border border-line text-xs font-mono break-all">
                    {cryptoOutputs.urlEncode}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: UUID & NanoID */}
          {activeTab === "uuid" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-accent">ID Generator (Web Crypto)</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted">Count:</span>
                  {[5, 10, 25].map((cnt) => (
                    <button
                      key={cnt}
                      onClick={() => setUuidCount(cnt)}
                      className={`border px-2 py-0.5 text-[10px] font-bold ${
                        uuidCount === cnt ? "border-line bg-accent text-line" : "border-line bg-surface2 text-muted"
                      }`}
                    >
                      {cnt}
                    </button>
                  ))}
                  <button
                    onClick={generateIds}
                    className="border-2 border-line bg-accent px-3 py-1 text-xs font-bold uppercase text-line shadow-hard-sm"
                  >
                    🎲 Regenerate
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-line bg-surface2 p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold uppercase text-accent">UUID v4</span>
                    <button
                      onClick={() => copyToClipboard(generatedUuids.join("\n"))}
                      className="text-[10px] uppercase font-bold text-muted hover:text-accent"
                    >
                      Copy All
                    </button>
                  </div>
                  <pre className="bg-base border border-line p-3 text-xs font-mono overflow-y-auto max-h-56">
                    {generatedUuids.join("\n")}
                  </pre>
                </div>

                <div className="border border-line bg-surface2 p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold uppercase text-accent">NanoID (21 Chars)</span>
                    <button
                      onClick={() => copyToClipboard(generatedNanoIds.join("\n"))}
                      className="text-[10px] uppercase font-bold text-muted hover:text-accent"
                    >
                      Copy All
                    </button>
                  </div>
                  <pre className="bg-base border border-line p-3 text-xs font-mono overflow-y-auto max-h-56">
                    {generatedNanoIds.join("\n")}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: Color & WCAG AAA */}
          {activeTab === "color" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-line bg-surface2 p-4 space-y-3">
                  <span className="text-xs font-bold uppercase text-accent block">Foreground Color</span>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={fgColor}
                      onChange={(e) => setFgColor(e.target.value)}
                      className="h-10 w-16 border-2 border-line bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={fgColor}
                      onChange={(e) => setFgColor(e.target.value)}
                      className="flex-1 border-2 border-line bg-base px-3 py-2 text-xs font-mono text-ink"
                    />
                  </div>
                </div>

                <div className="border border-line bg-surface2 p-4 space-y-3">
                  <span className="text-xs font-bold uppercase text-accent block">Background Color</span>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="h-10 w-16 border-2 border-line bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="flex-1 border-2 border-line bg-base px-3 py-2 text-xs font-mono text-ink"
                    />
                  </div>
                </div>
              </div>

              {/* Live Preview Box */}
              <div
                className="border-2 border-line p-6 text-center space-y-2 shadow-hard"
                style={{ backgroundColor: bgColor, color: fgColor }}
              >
                <div className="font-display text-2xl uppercase">ELEMENT 74 WCAG PREVIEW</div>
                <p className="text-xs font-mono">
                  This text demonstrates the real contrast ratio between your selected colors.
                </p>
              </div>

              {/* WCAG Compliance Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2 text-center">
                <div className="border border-line bg-surface2 p-3">
                  <span className="text-[10px] text-muted block">Contrast Ratio</span>
                  <span className="font-display text-lg text-accent">{contrastMetrics.ratio}:1</span>
                </div>
                <div className="border border-line bg-surface2 p-3">
                  <span className="text-[10px] text-muted block">AA Normal (4.5:1)</span>
                  <span className={`font-bold text-xs ${contrastMetrics.wcagAaNormal ? "text-accent" : "text-danger"}`}>
                    {contrastMetrics.wcagAaNormal ? "PASS ✓" : "FAIL ✗"}
                  </span>
                </div>
                <div className="border border-line bg-surface2 p-3">
                  <span className="text-[10px] text-muted block">AA Large (3.0:1)</span>
                  <span className={`font-bold text-xs ${contrastMetrics.wcagAaLarge ? "text-accent" : "text-danger"}`}>
                    {contrastMetrics.wcagAaLarge ? "PASS ✓" : "FAIL ✗"}
                  </span>
                </div>
                <div className="border border-line bg-surface2 p-3">
                  <span className="text-[10px] text-muted block">AAA Normal (7.0:1)</span>
                  <span className={`font-bold text-xs ${contrastMetrics.wcagAaaNormal ? "text-accent" : "text-danger"}`}>
                    {contrastMetrics.wcagAaaNormal ? "PASS ✓" : "FAIL ✗"}
                  </span>
                </div>
                <div className="border border-line bg-surface2 p-3">
                  <span className="text-[10px] text-muted block">AAA Large (4.5:1)</span>
                  <span className={`font-bold text-xs ${contrastMetrics.wcagAaaLarge ? "text-accent" : "text-danger"}`}>
                    {contrastMetrics.wcagAaaLarge ? "PASS ✓" : "FAIL ✗"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: Brutalist CSS Styler */}
          {activeTab === "brutalist-css" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-accent block mb-1">
                      Shadow Offset: {shadowX}px
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="20"
                      value={shadowX}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setShadowX(val);
                        setShadowY(val);
                      }}
                      className="w-full accent-accent"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase text-accent block mb-1">
                      Border Width: {borderWidth}px
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="8"
                      value={borderWidth}
                      onChange={(e) => setBorderWidth(Number(e.target.value))}
                      className="w-full accent-accent"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase text-accent block mb-1">
                      Box Background
                    </label>
                    <input
                      type="text"
                      value={boxBg}
                      onChange={(e) => setBoxBg(e.target.value)}
                      className="w-full border-2 border-line bg-base p-2 text-xs font-mono text-ink"
                    />
                  </div>
                </div>

                {/* Live Box Preview */}
                <div className="flex items-center justify-center p-6 bg-base border border-line">
                  <div
                    style={{
                      backgroundColor: boxBg,
                      border: `${borderWidth}px solid ${borderColor}`,
                      boxShadow: `${shadowX}px ${shadowY}px 0px ${shadowColor}`,
                    }}
                    className="p-6 text-center select-none"
                  >
                    <span className="font-display text-sm uppercase text-ink block">BRUTALIST CARD</span>
                    <span className="text-[10px] text-muted">Click or hover to inspect</span>
                  </div>
                </div>

                {/* Generated CSS */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold uppercase text-accent">CSS Code</span>
                    <button
                      onClick={() => copyToClipboard(brutalistCss)}
                      className="text-[10px] uppercase font-bold text-muted hover:text-accent"
                    >
                      Copy CSS
                    </button>
                  </div>
                  <pre className="bg-base border border-line p-3 text-[11px] font-mono overflow-x-auto h-48">
                    {brutalistCss}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: Unix Epoch */}
          {activeTab === "epoch" && (
            <div className="space-y-4">
              <span className="text-xs font-bold uppercase text-accent block">Unix Timestamp</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={epochInput}
                  onChange={(e) => setEpochInput(e.target.value)}
                  className="flex-1 border-2 border-line bg-base p-3 text-xs font-mono text-ink focus:border-accent"
                />
                <button
                  onClick={() => setEpochInput(String(Math.floor(Date.now() / 1000)))}
                  className="border-2 border-line bg-accent px-4 py-2 text-xs font-bold uppercase text-line"
                >
                  Current Now
                </button>
              </div>

              {"error" in parsedEpoch ? (
                <div className="border border-danger bg-danger/10 p-3 text-xs text-danger font-bold">
                  {parsedEpoch.error}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="border border-line bg-surface2 p-3 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-accent block">UTC Time</span>
                    <div className="bg-base p-2 border border-line text-xs font-mono">{parsedEpoch.utc}</div>
                  </div>
                  <div className="border border-line bg-surface2 p-3 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-accent block">ISO 8601</span>
                    <div className="bg-base p-2 border border-line text-xs font-mono">{parsedEpoch.iso}</div>
                  </div>
                  <div className="border border-line bg-surface2 p-3 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-accent block">Local Time</span>
                    <div className="bg-base p-2 border border-line text-xs font-mono">{parsedEpoch.local}</div>
                  </div>
                  <div className="border border-line bg-surface2 p-3 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-accent block">Relative</span>
                    <div className="bg-base p-2 border border-line text-xs font-mono">{parsedEpoch.relative}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 9: Linux Chmod */}
          {activeTab === "chmod" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Owner */}
                <div className="border border-line bg-surface2 p-4 space-y-3">
                  <span className="text-xs font-bold uppercase text-accent block">Owner (User)</span>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs text-ink cursor-pointer">
                      <input
                        type="checkbox"
                        checked={chmodOwner.r}
                        onChange={(e) => setChmodOwner({ ...chmodOwner, r: e.target.checked })}
                        className="accent-accent"
                      />
                      Read (r) - 4
                    </label>
                    <label className="flex items-center gap-2 text-xs text-ink cursor-pointer">
                      <input
                        type="checkbox"
                        checked={chmodOwner.w}
                        onChange={(e) => setChmodOwner({ ...chmodOwner, w: e.target.checked })}
                        className="accent-accent"
                      />
                      Write (w) - 2
                    </label>
                    <label className="flex items-center gap-2 text-xs text-ink cursor-pointer">
                      <input
                        type="checkbox"
                        checked={chmodOwner.x}
                        onChange={(e) => setChmodOwner({ ...chmodOwner, x: e.target.checked })}
                        className="accent-accent"
                      />
                      Execute (x) - 1
                    </label>
                  </div>
                </div>

                {/* Group */}
                <div className="border border-line bg-surface2 p-4 space-y-3">
                  <span className="text-xs font-bold uppercase text-accent block">Group</span>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs text-ink cursor-pointer">
                      <input
                        type="checkbox"
                        checked={chmodGroup.r}
                        onChange={(e) => setChmodGroup({ ...chmodGroup, r: e.target.checked })}
                        className="accent-accent"
                      />
                      Read (r) - 4
                    </label>
                    <label className="flex items-center gap-2 text-xs text-ink cursor-pointer">
                      <input
                        type="checkbox"
                        checked={chmodGroup.w}
                        onChange={(e) => setChmodGroup({ ...chmodGroup, w: e.target.checked })}
                        className="accent-accent"
                      />
                      Write (w) - 2
                    </label>
                    <label className="flex items-center gap-2 text-xs text-ink cursor-pointer">
                      <input
                        type="checkbox"
                        checked={chmodGroup.x}
                        onChange={(e) => setChmodGroup({ ...chmodGroup, x: e.target.checked })}
                        className="accent-accent"
                      />
                      Execute (x) - 1
                    </label>
                  </div>
                </div>

                {/* Public */}
                <div className="border border-line bg-surface2 p-4 space-y-3">
                  <span className="text-xs font-bold uppercase text-accent block">Public (Others)</span>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs text-ink cursor-pointer">
                      <input
                        type="checkbox"
                        checked={chmodPublic.r}
                        onChange={(e) => setChmodPublic({ ...chmodPublic, r: e.target.checked })}
                        className="accent-accent"
                      />
                      Read (r) - 4
                    </label>
                    <label className="flex items-center gap-2 text-xs text-ink cursor-pointer">
                      <input
                        type="checkbox"
                        checked={chmodPublic.w}
                        onChange={(e) => setChmodPublic({ ...chmodPublic, w: e.target.checked })}
                        className="accent-accent"
                      />
                      Write (w) - 2
                    </label>
                    <label className="flex items-center gap-2 text-xs text-ink cursor-pointer">
                      <input
                        type="checkbox"
                        checked={chmodPublic.x}
                        onChange={(e) => setChmodPublic({ ...chmodPublic, x: e.target.checked })}
                        className="accent-accent"
                      />
                      Execute (x) - 1
                    </label>
                  </div>
                </div>
              </div>

              {/* Chmod Output */}
              <div className="border-2 border-line bg-base p-4 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] text-muted block uppercase">Octal Notation</span>
                  <span className="font-display text-2xl text-accent">{chmodOctal}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted block uppercase">Symbolic Notation</span>
                  <span className="font-display text-xl text-ink">-{chmodSymbolic}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted block uppercase">Command</span>
                  <code className="text-xs bg-surface p-1.5 border border-line">chmod {chmodOctal} file.txt</code>
                </div>
                <button
                  onClick={() => copyToClipboard(`chmod ${chmodOctal} filename`)}
                  className="border-2 border-line bg-accent px-4 py-2 text-xs font-bold uppercase text-line shadow-hard-sm"
                >
                  Copy Command
                </button>
              </div>
            </div>
          )}

          {/* TAB 10: Prompt Cleaner & Minifier */}
          {activeTab === "prompt-cleaner" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-accent">Raw Prompt / System Context</span>
                <span className="text-xs text-accent font-bold">
                  {minifiedPrompt.percentSaved}% Tokens Saved
                </span>
              </div>

              <textarea
                value={promptRaw}
                onChange={(e) => setPromptRaw(e.target.value)}
                rows={6}
                className="w-full border-2 border-line bg-base p-3 text-xs font-mono text-ink focus:border-accent"
              />

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="border border-line bg-surface2 p-2">
                  <span className="text-[10px] text-muted block">Original Chars</span>
                  <span className="font-bold text-xs">{minifiedPrompt.originalChars}</span>
                </div>
                <div className="border border-line bg-surface2 p-2">
                  <span className="text-[10px] text-muted block">Minified Chars</span>
                  <span className="font-bold text-xs text-accent">{minifiedPrompt.newChars}</span>
                </div>
                <div className="border border-line bg-surface2 p-2">
                  <span className="text-[10px] text-muted block">Est. Tokens Before</span>
                  <span className="font-bold text-xs">{minifiedPrompt.estTokensBefore}</span>
                </div>
                <div className="border border-line bg-surface2 p-2">
                  <span className="text-[10px] text-muted block">Est. Tokens After</span>
                  <span className="font-bold text-xs text-accent">{minifiedPrompt.estTokensAfter}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-bold uppercase text-accent">Minified Prompt</span>
                <button
                  onClick={() => copyToClipboard(minifiedPrompt.text)}
                  className="border border-line bg-surface2 px-2.5 py-1 text-[10px] font-bold uppercase text-ink hover:text-accent"
                >
                  Copy Minified Text
                </button>
              </div>

              <pre className="border-2 border-line bg-base p-4 text-xs font-mono text-ink overflow-x-auto whitespace-pre-wrap">
                {minifiedPrompt.text}
              </pre>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t-2 border-line bg-surface mt-12 py-6">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-muted">
          <div>
            <span className="font-display text-ink uppercase">TUNGSTON TOOLS</span> // ELEMENT 74
          </div>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-accent underline">
              Chat Workbench
            </Link>
            <Link href="/learn" className="hover:text-accent underline">
              Everyday AI Guide
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
