"use client";

import { useState } from "react";
import type { Project, ProjectFile } from "@/lib/types";
import { CloseIcon, PlusIcon } from "./Icons";

const MAX_FILES_PER_PROJECT = 5;
const MAX_FILE_SIZE_BYTES = 40 * 1024; // 40 KB per file (~10,000 tokens)
const MAX_TOTAL_PROJECT_BYTES = 64 * 1024; // 64 KB total context (~16,000 tokens)

export function ProjectsModal({
  open,
  onClose,
  projects,
  activeProjectId,
  onSelectProject,
  onSaveProjects,
}: {
  open: boolean;
  onClose: () => void;
  projects: Project[];
  activeProjectId: string | null;
  onSelectProject: (id: string | null) => void;
  onSaveProjects: (projects: Project[]) => void;
}) {
  const [selectedProjId, setSelectedProjId] = useState<string | null>(
    activeProjectId || (projects[0]?.id ?? null)
  );
  const [newProjName, setNewProjName] = useState("");
  const [creating, setCreating] = useState(false);
  const [previewFile, setPreviewFile] = useState<ProjectFile | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!open) return null;

  const currentProject = projects.find((p) => p.id === selectedProjId) || null;

  function handleCreateProject(e: React.FormEvent) {
    e.preventDefault();
    const name = newProjName.trim();
    if (!name) return;

    const newProj: Project = {
      id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
      name,
      files: [],
      createdAt: Date.now(),
    };

    const updated = [newProj, ...projects];
    onSaveProjects(updated);
    setSelectedProjId(newProj.id);
    setNewProjName("");
    setCreating(false);
  }

  function handleDeleteProject(id: string) {
    if (!confirm("Are you sure you want to delete this project?")) return;
    const updated = projects.filter((p) => p.id !== id);
    onSaveProjects(updated);
    if (activeProjectId === id) onSelectProject(null);
    if (selectedProjId === id) setSelectedProjId(updated[0]?.id || null);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    setErrorMsg(null);
    if (!currentProject) return;
    const files = e.target.files;
    if (!files || !files.length) return;

    if (currentProject.files.length + files.length > MAX_FILES_PER_PROJECT) {
      setErrorMsg(`Maximum of ${MAX_FILES_PER_PROJECT} files (.md, .txt) allowed per project.`);
      return;
    }

    const existingBytes = currentProject.files.reduce((sum, f) => sum + (f.sizeBytes || 0), 0);
    let runningBytes = existingBytes;
    const newFiles: ProjectFile[] = [];

    for (const file of Array.from(files)) {
      const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
      if (ext !== ".md" && ext !== ".txt") {
        setErrorMsg(`Unsupported file: "${file.name}". Only .md and .txt files are allowed.`);
        continue;
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        setErrorMsg(
          `File "${file.name}" (${(file.size / 1024).toFixed(1)} KB) exceeds the 40 KB limit. Large files are rejected to protect your Groq token limits.`
        );
        continue;
      }

      if (runningBytes + file.size > MAX_TOTAL_PROJECT_BYTES) {
        setErrorMsg(
          `Adding "${file.name}" would exceed the 64 KB total context limit for this project (${((runningBytes + file.size) / 1024).toFixed(1)} KB). Remove or trim existing files first.`
        );
        continue;
      }

      try {
        const text = await file.text();
        if (text.length > 50_000) {
          setErrorMsg(`File "${file.name}" contains too much text (${text.length.toLocaleString()} characters). Max allowed is 50,000 characters.`);
          continue;
        }

        runningBytes += file.size;
        newFiles.push({
          id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
          name: file.name,
          content: text,
          sizeBytes: file.size,
        });
      } catch {
        setErrorMsg(`Failed reading ${file.name}`);
      }
    }

    if (newFiles.length) {
      const updatedProject: Project = {
        ...currentProject,
        files: [...currentProject.files, ...newFiles],
      };
      const updatedProjects = projects.map((p) =>
        p.id === currentProject.id ? updatedProject : p
      );
      onSaveProjects(updatedProjects);
    }

    e.target.value = "";
  }

  function handleDeleteFile(fileId: string) {
    if (!currentProject) return;
    const updatedProject: Project = {
      ...currentProject,
      files: currentProject.files.filter((f) => f.id !== fileId),
    };
    const updatedProjects = projects.map((p) =>
      p.id === currentProject.id ? updatedProject : p
    );
    onSaveProjects(updatedProjects);
    if (previewFile?.id === fileId) setPreviewFile(null);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 md:p-6">
      <div className="flex h-[90vh] max-h-[720px] w-full max-w-4xl flex-col border-3 border-line bg-surface shadow-hard text-ink">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-line bg-surface2 px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="border-2 border-line bg-accent px-1.5 py-0.5 font-mono text-[11px] font-bold uppercase text-line">
              CONTEXT ENGINE
            </span>
            <span className="font-display text-base md:text-lg uppercase tracking-tight">
              Projects &amp; Knowledge Files
            </span>
          </div>
          <button
            onClick={onClose}
            className="grid h-7 w-7 place-items-center border-2 border-line bg-surface text-ink hover:bg-accent hover:text-line"
            aria-label="Close dialog"
          >
            <CloseIcon size={12} />
          </button>
        </div>

        {/* Body Split */}
        <div className="flex flex-1 flex-col md:flex-row overflow-hidden">
          {/* Sidebar: Projects list */}
          <div className="w-full md:w-64 border-b-2 md:border-b-0 md:border-r-2 border-line bg-surface2 flex flex-col p-3 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-xs font-bold uppercase text-muted">
                PROJECT LIST
              </span>
              <button
                onClick={() => setCreating((v) => !v)}
                className="flex items-center gap-1 border border-line bg-accent px-2 py-1 font-mono text-[11px] font-bold text-line hover:bg-accent/80"
              >
                <PlusIcon size={10} /> NEW
              </button>
            </div>

            {creating && (
              <form onSubmit={handleCreateProject} className="mb-3 space-y-2 border-2 border-line bg-surface p-2">
                <input
                  type="text"
                  required
                  placeholder="Project name..."
                  value={newProjName}
                  onChange={(e) => setNewProjName(e.target.value)}
                  className="w-full border border-line bg-base px-2 py-1 font-mono text-xs text-ink outline-none"
                  autoFocus
                />
                <div className="flex gap-1">
                  <button
                    type="submit"
                    className="flex-1 bg-accent py-1 font-mono text-[10px] font-bold uppercase text-line"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreating(false)}
                    className="border border-line px-2 py-1 font-mono text-[10px] text-muted hover:text-ink"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <div className="flex-1 space-y-1 overflow-y-auto">
              {projects.length === 0 ? (
                <p className="font-mono text-xs text-muted py-2">No projects created yet.</p>
              ) : (
                projects.map((proj) => {
                  const isActive = activeProjectId === proj.id;
                  const isSelected = selectedProjId === proj.id;
                  return (
                    <div
                      key={proj.id}
                      onClick={() => setSelectedProjId(proj.id)}
                      className={`flex cursor-pointer items-center justify-between border-2 p-2 font-mono text-xs transition-colors ${
                        isSelected
                          ? "border-line bg-ink font-bold text-[var(--color-base)]"
                          : "border-transparent bg-surface text-ink hover:border-line"
                      }`}
                    >
                      <div className="truncate flex items-center gap-1.5">
                        {isActive && (
                          <span className="h-1.5 w-1.5 bg-accent inline-block" title="Active Project" />
                        )}
                        <span className="truncate">{proj.name}</span>
                      </div>
                      <span className="text-[10px] opacity-75">
                        {proj.files.length}/5
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {activeProjectId && (
              <button
                onClick={() => onSelectProject(null)}
                className="mt-3 border border-line bg-surface py-1 font-mono text-[11px] font-bold uppercase text-danger hover:bg-danger hover:text-white"
              >
                Detach Project Context
              </button>
            )}
          </div>

          {/* Main Area: Files and Preview */}
          <div className="flex-1 flex flex-col p-4 md:p-6 overflow-y-auto">
            {!currentProject ? (
              <div className="flex flex-1 items-center justify-center font-mono text-xs text-muted">
                Select or create a project to manage its persistent context files.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-line pb-3">
                  <div>
                    <h2 className="font-display text-xl uppercase tracking-tight">
                      {currentProject.name}
                    </h2>
                    <p className="font-mono text-xs text-muted">
                      {currentProject.files.length} of {MAX_FILES_PER_PROJECT} context files attached (.md, .txt)
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onSelectProject(currentProject.id)}
                      className={`border-2 border-line px-3 py-1.5 font-mono text-xs font-bold uppercase shadow-hard-sm ${
                        activeProjectId === currentProject.id
                          ? "bg-accent text-line"
                          : "bg-surface2 text-ink hover:bg-accent hover:text-line"
                      }`}
                    >
                      {activeProjectId === currentProject.id
                        ? "✓ ACTIVE FOR CHAT"
                        : "ACTIVATE PROJECT"}
                    </button>
                    <button
                      onClick={() => handleDeleteProject(currentProject.id)}
                      className="border-2 border-line bg-surface2 px-2 py-1.5 font-mono text-xs text-danger hover:bg-danger hover:text-white"
                      title="Delete Project"
                    >
                      DELETE
                    </button>
                  </div>
                </div>

                {errorMsg && (
                  <div className="border-2 border-danger bg-danger/10 p-2 font-mono text-xs text-danger">
                    {errorMsg}
                  </div>
                )}

                {/* Context Budget Indicator */}
                <div className="border-2 border-line bg-surface p-3 font-mono text-xs">
                  <div className="flex items-center justify-between mb-1.5 font-bold">
                    <span className="uppercase text-ink">Context Budget Limit:</span>
                    <span className={((currentProject?.files.reduce((sum, f) => sum + (f.sizeBytes || 0), 0) || 0) / MAX_TOTAL_PROJECT_BYTES) > 0.8 ? "text-danger" : "text-accent"}>
                      {((currentProject?.files.reduce((sum, f) => sum + (f.sizeBytes || 0), 0) || 0) / 1024).toFixed(1)} KB / 64 KB ({Math.min(100, Math.round(((currentProject?.files.reduce((sum, f) => sum + (f.sizeBytes || 0), 0) || 0) / MAX_TOTAL_PROJECT_BYTES) * 100))}%)
                    </span>
                  </div>
                  <div className="h-2 w-full border border-line bg-base overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        ((currentProject?.files.reduce((sum, f) => sum + (f.sizeBytes || 0), 0) || 0) / MAX_TOTAL_PROJECT_BYTES) > 0.8 ? "bg-danger" : "bg-accent"
                      }`}
                      style={{
                        width: `${Math.min(100, Math.round(((currentProject?.files.reduce((sum, f) => sum + (f.sizeBytes || 0), 0) || 0) / MAX_TOTAL_PROJECT_BYTES) * 100))}%`,
                      }}
                    />
                  </div>
                  <p className="text-[10px] text-muted mt-1.5">
                    Max 40 KB per file · Max 64 KB total. Enforced to protect Groq API limits from sudden exhaustion.
                  </p>
                </div>

                {/* Upload Section */}
                <div className="border-2 border-dashed border-line bg-surface2 p-4 text-center">
                  <p className="font-mono text-xs font-bold uppercase text-ink mb-1">
                    Add Context Files (.md &amp; .txt)
                  </p>
                  <p className="font-mono text-[11px] text-muted mb-3">
                    These files will be loaded into Tungston AI's memory window for every message in this project.
                  </p>
                  <label className="inline-block cursor-pointer border-2 border-line bg-accent px-4 py-1.5 font-mono text-xs font-bold uppercase text-line shadow-hard-sm hover:opacity-90">
                    Browse Files
                    <input
                      type="file"
                      multiple
                      accept=".md,.txt,text/markdown,text/plain"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={currentProject.files.length >= MAX_FILES_PER_PROJECT}
                    />
                  </label>
                </div>

                {/* File list */}
                <div className="space-y-2">
                  <span className="font-mono text-xs font-bold uppercase text-muted block">
                    ATTACHED FILES ({currentProject.files.length}/{MAX_FILES_PER_PROJECT})
                  </span>
                  {currentProject.files.length === 0 ? (
                    <div className="border border-line bg-surface2 p-4 text-center font-mono text-xs text-muted">
                      No files uploaded yet. Add READMEs, documentation, or instruction files.
                    </div>
                  ) : (
                    currentProject.files.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between border-2 border-line bg-surface2 p-2.5 font-mono text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="border border-line bg-surface px-1 py-0.5 text-[10px] font-bold text-accent">
                            {file.name.slice(file.name.lastIndexOf(".") + 1).toUpperCase()}
                          </span>
                          <span className="font-bold text-ink truncate">{file.name}</span>
                          <span className="text-[10px] text-muted">
                            ({(file.sizeBytes / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => setPreviewFile(file)}
                            className="border border-line bg-surface px-2 py-0.5 text-[10px] font-bold uppercase text-ink hover:bg-accent hover:text-line"
                          >
                            Preview
                          </button>
                          <button
                            onClick={() => handleDeleteFile(file.id)}
                            className="border border-line bg-surface px-2 py-0.5 text-[10px] font-bold uppercase text-danger hover:bg-danger hover:text-white"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* File Preview Drawer */}
                {previewFile && (
                  <div className="border-2 border-line bg-base p-4 mt-4 space-y-2">
                    <div className="flex items-center justify-between border-b border-line pb-2">
                      <span className="font-mono text-xs font-bold text-accent truncate">
                        Preview: {previewFile.name}
                      </span>
                      <button
                        onClick={() => setPreviewFile(null)}
                        className="font-mono text-xs text-muted hover:text-ink"
                      >
                        ✕ CLOSE
                      </button>
                    </div>
                    <pre className="max-h-48 overflow-y-auto font-mono text-xs text-ink/90 whitespace-pre-wrap">
                      {previewFile.content}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
