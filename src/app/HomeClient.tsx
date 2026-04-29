"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircleIcon,
  ClockIcon,
  ExclamationIcon,
  LinkIcon,
  UploadIcon,
  RefreshIcon,
  FolderIcon,
  UserIcon,
  CalendarIcon,
  ArrowRightIcon,
} from "@/components/ui/icons";
import { ThemeToggle } from "@/components/theme-toggle";

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
  startDate: string | null;
  endDate: string | null;
  syncStatus: string;
  basecampCardId: string | null;
  lastSyncError: string | null;
  importBatch: ImportBatchSummary;
};

type ColumnOption = { id: string; title: string; type: string };

type BasecampPerson = {
  id: string;
  name: string;
  email: string;
  title: string | null;
  avatarUrl: string;
  isAdmin: boolean;
  isOwner: boolean;
};

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

function StatusBadge({ status }: { status: string }) {
  if (status === "synced") {
    return (
      <Badge variant="success" className="gap-1">
        <CheckCircleIcon className="h-3 w-3" />
        Synced
      </Badge>
    );
  }
  if (status === "error") {
    return (
      <Badge variant="danger" className="gap-1">
        <ExclamationIcon className="h-3 w-3" />
        Error
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1">
      <ClockIcon className="h-3 w-3" />
      Pending
    </Badge>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-[var(--secondary)] p-4">
        <FolderIcon className="h-8 w-8 text-[var(--muted-foreground)]" />
      </div>
      <h3 className="mt-4 text-sm font-medium">{title}</h3>
      <p className="mt-1 text-sm text-[var(--muted-foreground)]">{description}</p>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <svg
        className="h-8 w-8 animate-spin text-[var(--primary)]"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  );
}

export default function HomeClient() {
  const [markdown, setMarkdown] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [bcStatus, setBcStatus] = useState<{ connected: boolean; accountId?: string; expiresAt?: string } | null>(null);
  const [columnListId, setColumnListId] = useState("");
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [projects, setProjects] = useState<BasecampProject[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectColumns, setProjectColumns] = useState<ColumnOption[]>([]);
  const [loadingProjectColumns, setLoadingProjectColumns] = useState(false);
  const [selectedBucketId, setSelectedBucketId] = useState<string | null>(null);
  const [projectPeople, setProjectPeople] = useState<BasecampPerson[]>([]);
  const [loadingProjectPeople, setLoadingProjectPeople] = useState(false);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string | null>(null);

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

  const loadProjectPeople = useCallback(async (projectId: string) => {
    setLoadingProjectPeople(true);
    try {
      const res = await fetch(`/api/basecamp/projects/${projectId}/people`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load people");
      setProjectPeople(data.people ?? []);
    } catch (e) {
      console.error(e);
      setProjectPeople([]);
    } finally {
      setLoadingProjectPeople(false);
    }
  }, []);

  const loadProjectColumns = useCallback(async (projectId: string) => {
    setLoadingProjectColumns(true);
    try {
      const res = await fetch(`/api/basecamp/projects/${projectId}/columns`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load columns");
      setProjectColumns(data.lists ?? []);
      setSelectedBucketId(data.bucketId ?? null);
      if (data.lists?.length > 0) {
        setColumnListId(data.lists[0].id);
      }
    } catch (e) {
      console.error(e);
      setProjectColumns([]);
      setSelectedBucketId(null);
    } finally {
      setLoadingProjectColumns(false);
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
    } catch {
      setBcStatus({ connected: false });
    }
  }, []);

  useEffect(() => {
    void loadTasks();
    void loadBc();
  }, [loadTasks, loadBc]);

  useEffect(() => {
    if (bcStatus?.connected) {
      void loadProjects();
    } else {
      setProjects([]);
    }
  }, [bcStatus?.connected, loadProjects]);

  useEffect(() => {
    if (selectedProjectId) {
      void loadProjectColumns(selectedProjectId);
      void loadProjectPeople(selectedProjectId);
    } else {
      setProjectColumns([]);
      setSelectedBucketId(null);
      setProjectPeople([]);
      setSelectedAssigneeId(null);
    }
  }, [selectedProjectId, loadProjectColumns, loadProjectPeople]);

  useEffect(() => {
    const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    const err = params.get("bc_error");
    const ok = params.get("bc_connected");
    if (err) setImportMessage({ type: "error", text: `Basecamp error: ${err}` });
    if (ok) setImportMessage({ type: "success", text: "Successfully connected to Basecamp!" });
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
      setImportMessage({ type: "success", text: `Successfully imported ${data.taskCount} task(s).${warn}` });
      setMarkdown("");
      setFileName(null);
      await loadTasks();
    } catch (e) {
      setImportMessage({ type: "error", text: e instanceof Error ? e.message : "Import failed" });
    } finally {
      setImporting(false);
    }
  };

  const onSync = async (taskId: string) => {
    if (!selectedProjectId || !columnListId || !selectedBucketId) {
      setImportMessage({ type: "error", text: "Please select a project and column first." });
      return;
    }
    setSyncingId(taskId);
    setImportMessage(null);
    try {
      const res = await fetch(`/api/tasks/${taskId}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          columnListId,
          bucketId: selectedBucketId,
          assigneeId: selectedAssigneeId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Sync failed");
      setImportMessage({ type: "success", text: `Task synced to Basecamp successfully!` });
      await loadTasks();
    } catch (e) {
      setImportMessage({ type: "error", text: e instanceof Error ? e.message : "Sync failed" });
      await loadTasks();
    } finally {
      setSyncingId(null);
    }
  };

  const onDisconnect = async () => {
    await fetch("/api/basecamp/disconnect", { method: "POST" });
    setBcStatus({ connected: false });
    setProjects([]);
    setSelectedProjectId(null);
    setProjectColumns([]);
    setProjectPeople([]);
    setSelectedAssigneeId(null);
    setImportMessage({ type: "info", text: "Disconnected from Basecamp." });
  };

  const projectsWithCardTable = useMemo(
    () => projects.filter((p) => p.cardTable?.enabled),
    [projects]
  );

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId),
    [projects, selectedProjectId]
  );

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--primary)]">
              <svg className="h-5 w-5 text-[var(--primary-foreground)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Tasks Creator</h1>
              <p className="text-xs text-[var(--muted-foreground)]">Basecamp Integration</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            {bcStatus?.connected ? (
              <Badge variant="success">Connected</Badge>
            ) : (
              <Badge variant="outline">Disconnected</Badge>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Toast Message */}
        {importMessage && (
          <div
            className={`mb-6 flex items-center gap-3 rounded-lg border px-4 py-3 text-sm ${
              importMessage.type === "success"
                ? "border-[var(--success)]/20 bg-[var(--success)]/10 text-[var(--success)]"
                : importMessage.type === "error"
                ? "border-[var(--destructive)]/20 bg-[var(--destructive)]/10 text-[var(--destructive)]"
                : "border-[var(--border)] bg-[var(--secondary)] text-[var(--foreground)]"
            }`}
          >
            {importMessage.type === "success" && <CheckCircleIcon className="h-5 w-5 flex-shrink-0" />}
            {importMessage.type === "error" && <ExclamationIcon className="h-5 w-5 flex-shrink-0" />}
            <span>{importMessage.text}</span>
            <button
              onClick={() => setImportMessage(null)}
              className="ml-auto text-current opacity-70 hover:opacity-100"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Configuration */}
          <div className="space-y-6 lg:col-span-1">
            {/* Basecamp Connection */}
            <Card>
              <CardHeader>
                <CardTitle>Basecamp Connection</CardTitle>
                <CardDescription>
                  {bcStatus?.connected
                    ? `Connected to account ${bcStatus.accountId}`
                    : "Connect your Basecamp account to sync tasks"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  {bcStatus?.connected ? (
                    <Button variant="outline" onClick={() => void onDisconnect()} size="sm">
                      Disconnect
                    </Button>
                  ) : (
                    <a
                      href="/api/basecamp/connect"
                      className="inline-flex h-9 items-center justify-center rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] transition-colors hover:bg-[var(--primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                    >
                      Connect Basecamp
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Project Selection */}
            {bcStatus?.connected && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle>Project</CardTitle>
                    <CardDescription>Select a project with Card Table</CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void loadProjects()}
                    disabled={loadingProjects}
                  >
                    <RefreshIcon className={`h-4 w-4 ${loadingProjects ? "animate-spin" : ""}`} />
                  </Button>
                </CardHeader>
                <CardContent>
                  {loadingProjects ? (
                    <LoadingSpinner />
                  ) : projectsWithCardTable.length === 0 ? (
                    <EmptyState
                      title="No projects found"
                      description="Create a project with a Card Table in Basecamp"
                    />
                  ) : (
                    <div className="space-y-2">
                      {projectsWithCardTable.map((project) => (
                        <button
                          key={project.id}
                          onClick={() => setSelectedProjectId(project.id)}
                          className={`w-full rounded-lg border p-3 text-left transition-all ${
                            selectedProjectId === project.id
                              ? "border-[var(--primary)] bg-[var(--primary)]/5 ring-1 ring-[var(--primary)]"
                              : "border-[var(--border)] hover:border-[var(--primary)]/50 hover:bg-[var(--secondary)]"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <FolderIcon className="h-4 w-4 text-[var(--muted-foreground)]" />
                            <span className="font-medium text-sm">{project.name}</span>
                          </div>
                          {project.description && (
                            <p className="mt-1 text-xs text-[var(--muted-foreground)] line-clamp-1 pl-6">
                              {project.description}
                            </p>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

{/* Column & Assignee Selection */}
            {selectedProjectId && (
              <Card className="overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-[var(--primary)]/10 to-transparent pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <svg className="h-5 w-5 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Configuration
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Set target column and assignee for <span className="font-medium text-[var(--foreground)]">{selectedProject?.name}</span>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5 pt-5">
                  {/* Column Select */}
                  <div className="space-y-2">
                    <label className="flex items-center justify-between text-sm font-medium">
                      <span className="flex items-center gap-2">
                        <svg className="h-4 w-4 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                        </svg>
                        Target Column
                      </span>
                      {loadingProjectColumns && (
                        <span className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
                          <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Loading
                        </span>
                      )}
                    </label>
                    {projectColumns.length > 0 ? (
                      <div className="relative">
                        <select
                          className="w-full appearance-none rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 pr-10 text-sm font-medium shadow-sm transition-all focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                          value={columnListId}
                          onChange={(e) => setColumnListId(e.target.value)}
                        >
                          {projectColumns.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.title}
                            </option>
                          ))}
                        </select>
                        <svg className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    ) : !loadingProjectColumns ? (
                      <div className="flex items-center gap-2 rounded-lg border border-[var(--destructive)]/20 bg-[var(--destructive)]/5 px-3 py-2 text-sm text-[var(--destructive)]">
                        <ExclamationIcon className="h-4 w-4" />
                        No columns found in this project
                      </div>
                    ) : null}
                  </div>

                  {/* Divider */}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-[var(--border)]" />
                    </div>
                  </div>

                  {/* Assignee Select */}
                  <div className="space-y-2">
                    <label className="flex items-center justify-between text-sm font-medium">
                      <span className="flex items-center gap-2">
                        <UserIcon className="h-4 w-4 text-[var(--accent)]" />
                        Assign To
                        <span className="rounded-full bg-[var(--secondary)] px-2 py-0.5 text-xs font-normal text-[var(--muted-foreground)]">
                          Optional
                        </span>
                      </span>
                      {loadingProjectPeople && (
                        <span className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
                          <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Loading
                        </span>
                      )}
                    </label>
                    {projectPeople.length > 0 ? (
                      <div className="relative">
                        <select
                          className="w-full appearance-none rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 pr-10 text-sm shadow-sm transition-all focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                          value={selectedAssigneeId ?? ""}
                          onChange={(e) => setSelectedAssigneeId(e.target.value || null)}
                        >
                          <option value="">No assignee</option>
                          {projectPeople.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                              {p.title ? ` - ${p.title}` : ""}
                              {p.isOwner ? " (Owner)" : p.isAdmin ? " (Admin)" : ""}
                            </option>
                          ))}
                        </select>
                        <svg className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    ) : !loadingProjectPeople ? (
                      <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--secondary)] px-3 py-2 text-sm text-[var(--muted-foreground)]">
                        <UserIcon className="h-4 w-4" />
                        No team members found
                      </div>
                    ) : null}
                  </div>

                  {/* Open in Basecamp */}
                  {selectedProject?.appUrl && (
                    <div className="pt-2">
                      <a
                        href={selectedProject.appUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--secondary)] px-4 py-2.5 text-sm font-medium transition-all hover:border-[var(--primary)] hover:bg-[var(--primary)]/5 hover:text-[var(--primary)]"
                      >
                        <LinkIcon className="h-4 w-4" />
                        Open project in Basecamp
                        <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
                    </label>
                    {projectColumns.length > 0 ? (
                      <select
                        className="w-full rounded-lg border border-[var(--border)] bg-[var(--secondary)] px-3 py-2 text-sm focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                        value={columnListId}
                        onChange={(e) => setColumnListId(e.target.value)}
                      >
                        {projectColumns.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.title}
                          </option>
                        ))}
                      </select>
                    ) : !loadingProjectColumns ? (
                      <p className="text-sm text-[var(--destructive)]">No columns found</p>
                    ) : null}
                  </div>

                  {/* Assignee Select */}
                  <div>
                    <label className="mb-2 flex items-center gap-2 text-sm font-medium">
                      <UserIcon className="h-4 w-4 text-[var(--muted-foreground)]" />
                      Assign To
                      {loadingProjectPeople && (
                        <span className="text-xs text-[var(--muted-foreground)]">(loading...)</span>
                      )}
                    </label>
                    {projectPeople.length > 0 ? (
                      <select
                        className="w-full rounded-lg border border-[var(--border)] bg-[var(--secondary)] px-3 py-2 text-sm focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                        value={selectedAssigneeId ?? ""}
                        onChange={(e) => setSelectedAssigneeId(e.target.value || null)}
                      >
                        <option value="">No assignee (optional)</option>
                        {projectPeople.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                            {p.title ? ` - ${p.title}` : ""}
                            {p.isOwner ? " (Owner)" : p.isAdmin ? " (Admin)" : ""}
                          </option>
                        ))}
                      </select>
                    ) : !loadingProjectPeople ? (
                      <p className="text-sm text-[var(--muted-foreground)]">No team members</p>
                    ) : null}
                  </div>

                  {/* Quick Link */}
                  <a
                    href={selectedProject?.appUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-[var(--primary)] hover:underline"
                  >
                    <LinkIcon className="h-3 w-3" />
                    Open project in Basecamp
                  </a>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Import & Tasks */}
          <div className="space-y-6 lg:col-span-2">
            {/* Import Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <UploadIcon className="h-5 w-5 text-[var(--primary)]" />
                  <CardTitle>Import Tasks</CardTitle>
                </div>
                <CardDescription>
                  Upload a markdown file or paste your ticket content below
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <input
                    type="file"
                    accept=".md,.markdown,text/markdown,text/plain"
                    onChange={(e) => void onPickFile(e.target.files?.[0] ?? null)}
                    className="absolute inset-0 cursor-pointer opacity-0"
                  />
                  <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-[var(--border)] bg-[var(--secondary)]/50 px-6 py-8 transition-colors hover:border-[var(--primary)]/50 hover:bg-[var(--secondary)]">
                    <div className="text-center">
                      <UploadIcon className="mx-auto h-8 w-8 text-[var(--muted-foreground)]" />
                      <p className="mt-2 text-sm font-medium">
                        {fileName ? fileName : "Drop a markdown file or click to browse"}
                      </p>
                      <p className="mt-1 text-xs text-[var(--muted-foreground)]">.md or .markdown files</p>
                    </div>
                  </div>
                </div>

                <textarea
                  value={markdown}
                  onChange={(e) => setMarkdown(e.target.value)}
                  rows={8}
                  placeholder="Or paste your markdown content here..."
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] p-4 font-mono text-sm placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                />

                <Button onClick={() => void onImport()} disabled={importing || !markdown.trim()} isLoading={importing}>
                  {importing ? "Importing..." : "Parse & Save Tasks"}
                </Button>
              </CardContent>
            </Card>

            {/* Tasks Table */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>Tasks</CardTitle>
                  <CardDescription>
                    {tasks.length} task{tasks.length !== 1 ? "s" : ""} in database
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => void loadTasks()} disabled={loadingTasks}>
                  <RefreshIcon className={`h-4 w-4 ${loadingTasks ? "animate-spin" : ""}`} />
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {loadingTasks ? (
                  <LoadingSpinner />
                ) : tasks.length === 0 ? (
                  <div className="p-6">
                    <EmptyState title="No tasks yet" description="Import a markdown file to get started" />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-t border-[var(--border)] bg-[var(--secondary)]/50 text-xs uppercase tracking-wider text-[var(--muted-foreground)]">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium">#</th>
                          <th className="px-4 py-3 text-left font-medium">Task</th>
                          <th className="px-4 py-3 text-left font-medium">Dates</th>
                          <th className="px-4 py-3 text-left font-medium">Status</th>
                          <th className="px-4 py-3 text-right font-medium">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border)]">
                        {tasks.map((t) => (
                          <tr key={t.id} className="group transition-colors hover:bg-[var(--secondary)]/30">
                            <td className="px-4 py-3 font-mono text-xs text-[var(--muted-foreground)]">
                              {t.ticketNumber}
                            </td>
                            <td className="max-w-[300px] px-4 py-3">
                              <div className="font-medium">{t.title}</div>
                              {t.lastSyncError && (
                                <p className="mt-1 text-xs text-[var(--destructive)]">{t.lastSyncError}</p>
                              )}
                              <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                                {t.importBatch.fileName ?? `Batch ${t.importBatch.id.slice(0, 8)}`}
                              </p>
                            </td>
                            <td className="px-4 py-3">
                              {t.startDate || t.endDate ? (
                                <div className="flex items-center gap-2 text-xs">
                                  <CalendarIcon className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
                                  <div>
                                    {t.startDate && (
                                      <span className="text-[var(--muted-foreground)]">
                                        {new Date(t.startDate).toLocaleDateString("en-US", {
                                          month: "short",
                                          day: "numeric",
                                        })}
                                      </span>
                                    )}
                                    {t.startDate && t.endDate && (
                                      <ArrowRightIcon className="mx-1 inline h-3 w-3 text-[var(--muted-foreground)]" />
                                    )}
                                    {t.endDate && (
                                      <span className="font-medium text-[var(--accent)]">
                                        {new Date(t.endDate).toLocaleDateString("en-US", {
                                          month: "short",
                                          day: "numeric",
                                        })}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-xs text-[var(--muted-foreground)]">No dates</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <StatusBadge status={t.syncStatus} />
                            </td>
                            <td className="px-4 py-3 text-right">
                              {t.basecampCardId ? (
                                <Badge variant="outline" className="gap-1">
                                  <CheckCircleIcon className="h-3 w-3" />
                                  Pushed
                                </Badge>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => void onSync(t.id)}
                                  disabled={
                                    !bcStatus?.connected ||
                                    !selectedProjectId ||
                                    !columnListId ||
                                    !selectedBucketId ||
                                    syncingId === t.id
                                  }
                                  isLoading={syncingId === t.id}
                                >
                                  Push
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
