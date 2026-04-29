"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type ImportBatchSummary = { id: string; fileName: string | null; createdAt: string };

type TaskRow = {
  id: string;
  ticketNumber: number;
  title: string;
  userStory: string;
  description: string;
  acceptanceCriteria: string;
  estimate: string;
  priority: string;
  syncStatus: string;
  basecampCardId: string | null;
  lastSyncError: string | null;
  importBatch: ImportBatchSummary;
};

type ColumnOption = { id: string; title: string; type: string };

type BasecampProject = {
  id: string;
  name: string;
  description: string;
  purpose: string;
  status: string;
  appUrl: string;
  url: string;
  createdAt: string;
  updatedAt: string;
  cardTable?: {
    id: number;
    title: string;
    name: string;
    enabled: boolean;
    url: string;
    app_url: string;
  };
};

export default function HomeClient() {
  const [markdown, setMarkdown] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [bcStatus, setBcStatus] = useState<{ connected: boolean; accountId?: string; expiresAt?: string } | null>(null);
  const [columns, setColumns] = useState<ColumnOption[]>([]);
  const [columnListId, setColumnListId] = useState("");
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [projects, setProjects] = useState<BasecampProject[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    setLoadingTasks(true);
    try {
      const res = await fetch("/api/tasks");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load tasks");
      setTasks(data.tasks ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingTasks(false);
    }
  }, []);

  const loadProjects = useCallback(async () => {
    setLoadingProjects(true);
    try {
      const res = await fetch("/api/basecamp/projects");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load projects");
      setProjects(data.projects ?? []);
    } catch (e) {
      console.error(e);
      setProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  }, []);

  const loadBc = useCallback(async () => {
    try {
      const st = await fetch("/api/basecamp/status");
      const stJson = await st.json();
      setBcStatus(stJson);
      if (!stJson.connected) {
        setColumns([]);
        return;
      }
      const cols = await fetch("/api/basecamp/columns");
      const cj = await cols.json();
      if (!cols.ok) {
        setColumns([]);
        return;
      }
      if (cj.lists?.length) {
        setColumns(cj.lists);
        setColumnListId((prev) => prev || cj.lists[0].id);
      } else {
        setColumns([]);
      }
    } catch {
      setBcStatus({ connected: false });
      setColumns([]);
    }
  }, []);

  useEffect(() => {
    void loadTasks();
    void loadBc();
  }, [loadTasks, loadBc]);

  // Load projects only when connected
  useEffect(() => {
    if (bcStatus?.connected) {
      void loadProjects();
    } else {
      setProjects([]);
    }
  }, [bcStatus?.connected, loadProjects]);

  useEffect(() => {
    const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    const err = params.get("bc_error");
    const ok = params.get("bc_connected");
    if (err) setImportMessage(`Basecamp error: ${err}`);
    if (ok) setImportMessage("Basecamp connected.");
    if (err || ok) {
      window.history.replaceState({}, "", "/");
      void loadBc();
    }
  }, [loadBc]);

  const onPickFile = async (f: File | null) => {
    if (!f) return;
    setFileName(f.name);
    const text = await f.text();
    setMarkdown(text);
  };

  const onImport = async () => {
    setImporting(true);
    setImportMessage(null);
    try {
      const res = await fetch("/api/imports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown, fileName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Import failed");
      const warn = (data.warnings as string[] | undefined)?.length
        ? ` Warnings: ${(data.warnings as string[]).join("; ")}`
        : "";
      setImportMessage(`Imported ${data.taskCount} task(s).${warn}`);
      setMarkdown("");
      setFileName(null);
      await loadTasks();
    } catch (e) {
      setImportMessage(e instanceof Error ? e.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const onSync = async (taskId: string) => {
    if (!columnListId) {
      setImportMessage("Pick a Basecamp column first (or set BASECAMP_DEFAULT_COLUMN_LIST_ID).");
      return;
    }
    setSyncingId(taskId);
    setImportMessage(null);
    try {
      const res = await fetch(`/api/tasks/${taskId}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ columnListId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Sync failed");
      setImportMessage(`Synced to Basecamp (card ${data.basecampCardId}).`);
      await loadTasks();
    } catch (e) {
      setImportMessage(e instanceof Error ? e.message : "Sync failed");
      await loadTasks();
    } finally {
      setSyncingId(null);
    }
  };

  const onDisconnect = async () => {
    await fetch("/api/basecamp/disconnect", { method: "POST" });
    setBcStatus({ connected: false });
    setColumns([]);
    setImportMessage("Basecamp disconnected.");
  };

  const bcHint = useMemo(() => {
    if (!bcStatus?.connected) return "Connect Basecamp to enable push.";
    return `Connected (account ${bcStatus.accountId}).`;
  }, [bcStatus]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-10 border-b border-[var(--border)] pb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Scrum task creator</h1>
        <p className="mt-2 text-[var(--muted)]">
          Import ticket-style markdown, store tasks in the database, push cards to your Basecamp board.
        </p>
      </header>

      <section className="mb-10 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
        <h2 className="text-lg font-medium">Basecamp</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">{bcHint}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <a
            href="/api/basecamp/connect"
            className="inline-flex rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
          >
            Connect Basecamp
          </a>
          {bcStatus?.connected ? (
            <button
              type="button"
              onClick={() => void onDisconnect()}
              className="rounded-md border border-[var(--border)] px-4 py-2 text-sm hover:bg-[var(--bg)]"
            >
              Disconnect
            </button>
          ) : null}
        </div>
        {bcStatus?.connected ? (
          <div className="mt-4 max-w-md">
            <label className="block text-sm font-medium text-[var(--muted)]">Column for new cards</label>
            <select
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
              value={columnListId}
              onChange={(e) => setColumnListId(e.target.value)}
            >
              {columns.length === 0 ? (
                <option value="">Load columns (connect + env bucket/table)</option>
              ) : (
                columns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} ({c.type})
                  </option>
                ))
              )}
            </select>
            <button
              type="button"
              className="mt-2 text-sm text-[var(--accent)] hover:underline"
              onClick={() => void loadBc()}
            >
              Refresh columns
            </button>
          </div>
        ) : null}
      </section>

      {bcStatus?.connected ? (
        <section className="mb-10 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium">Basecamp Projects</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                All active projects in your Basecamp account.
              </p>
            </div>
            <button
              type="button"
              className="text-sm text-[var(--accent)] hover:underline"
              onClick={() => void loadProjects()}
              disabled={loadingProjects}
            >
              {loadingProjects ? "Loading..." : "Refresh"}
            </button>
          </div>
          
          {loadingProjects ? (
            <p className="mt-4 text-sm text-[var(--muted)]">Loading projects...</p>
          ) : projects.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--muted)]">No projects found.</p>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className={`rounded-lg border p-4 transition-colors cursor-pointer ${
                    selectedProjectId === project.id
                      ? "border-[var(--accent)] bg-[var(--accent)]/5"
                      : "border-[var(--border)] hover:border-[var(--accent)]/50"
                  }`}
                  onClick={() => setSelectedProjectId(project.id)}
                >
                  <h3 className="font-medium text-sm">{project.name}</h3>
                  {project.description && (
                    <p className="mt-1 text-xs text-[var(--muted)] line-clamp-2">
                      {project.description}
                    </p>
                  )}
                  <div className="mt-3 flex items-center justify-between">
                    <span className="inline-flex items-center rounded-full bg-[var(--success)]/10 px-2 py-0.5 text-xs font-medium text-[var(--success)]">
                      {project.status}
                    </span>
                    {project.cardTable?.enabled && (
                      <span className="text-xs text-[var(--muted)]">Has Card Table</span>
                    )}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <a
                      href={project.appUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[var(--accent)] hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Open in Basecamp
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}

      <section className="mb-10 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
        <h2 className="text-lg font-medium">Import markdown</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">Use the same structure as your ticket files (Ticket blocks separated by ### ---).</p>
        <div className="mt-4 space-y-3">
          <input
            type="file"
            accept=".md,.markdown,text/markdown,text/plain"
            onChange={(e) => void onPickFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-[var(--muted)] file:mr-4 file:rounded-md file:border-0 file:bg-[var(--accent)] file:px-4 file:py-2 file:text-sm file:font-medium file:text-white"
          />
          <textarea
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            rows={12}
            placeholder="Paste markdown here…"
            className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] p-3 font-mono text-sm"
          />
          <button
            type="button"
            disabled={importing || !markdown.trim()}
            onClick={() => void onImport()}
            className="rounded-md bg-[var(--success)] px-4 py-2 text-sm font-medium text-black disabled:opacity-40"
          >
            {importing ? "Saving…" : "Parse and save to database"}
          </button>
        </div>
      </section>

      {importMessage ? (
        <p className="mb-6 rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm">{importMessage}</p>
      ) : null}

      <section>
        <h2 className="text-lg font-medium">Saved tasks</h2>
        {loadingTasks ? (
          <p className="mt-4 text-sm text-[var(--muted)]">Loading…</p>
        ) : tasks.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--muted)]">No tasks yet. Import a markdown file above.</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-lg border border-[var(--border)]">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]">
                <tr>
                  <th className="px-3 py-2 font-medium">#</th>
                  <th className="px-3 py-2 font-medium">Title</th>
                  <th className="px-3 py-2 font-medium">Batch</th>
                  <th className="px-3 py-2 font-medium">Sync</th>
                  <th className="px-3 py-2 font-medium">Basecamp</th>
                  <th className="px-3 py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {tasks.map((t) => (
                  <tr key={t.id} className="border-b border-[var(--border)] last:border-0">
                    <td className="px-3 py-2 align-top">{t.ticketNumber}</td>
                    <td className="px-3 py-2 align-top">
                      <div className="font-medium">{t.title}</div>
                      {t.lastSyncError ? (
                        <div className="mt-1 text-xs text-[var(--danger)]">{t.lastSyncError}</div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 align-top text-xs text-[var(--muted)]">
                      {t.importBatch.fileName ?? t.importBatch.id.slice(0, 8)}
                    </td>
                    <td className="px-3 py-2 align-top text-xs">{t.syncStatus}</td>
                    <td className="px-3 py-2 align-top text-xs font-mono">{t.basecampCardId ?? "—"}</td>
                    <td className="px-3 py-2 align-top">
                      <button
                        type="button"
                        disabled={!bcStatus?.connected || !!t.basecampCardId || syncingId === t.id}
                        onClick={() => void onSync(t.id)}
                        className="rounded-md border border-[var(--border)] px-2 py-1 text-xs hover:bg-[var(--surface)] disabled:opacity-40"
                      >
                        {syncingId === t.id ? "Pushing…" : "Push"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
