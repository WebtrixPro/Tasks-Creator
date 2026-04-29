"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
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

function EmptyState({ title, description, icon: Icon }: { title: string; description: string; icon?: React.ComponentType<{ className?: string }> }) {
  const IconComponent = Icon || FolderIcon;
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-[var(--secondary)] p-4">
        <IconComponent className="h-8 w-8 text-[var(--muted-foreground)]" />
      </div>
      <h3 className="mt-4 text-sm font-medium">{title}</h3>
      <p className="mt-1 text-sm text-[var(--muted-foreground)]">{description}</p>
    </div>
  );
}

function LoadingSpinner({ size = "default" }: { size?: "small" | "default" }) {
  const sizeClass = size === "small" ? "h-4 w-4" : "h-8 w-8";
  return (
    <svg
      className={`${sizeClass} animate-spin text-[var(--primary)]`}
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
  );
}

// Configuration icon
function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

// Column icon
function ColumnIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
    </svg>
  );
}

// Search icon
function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

// Plus icon
function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
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
  
  // Dialog state
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [tempColumnId, setTempColumnId] = useState("");
  const [tempAssigneeId, setTempAssigneeId] = useState<string | null>(null);
  const [projectSearch, setProjectSearch] = useState("");
  
  // Create project dialog state
  const [createProjectDialogOpen, setCreateProjectDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [creatingProject, setCreatingProject] = useState(false);

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
        setTempColumnId(data.lists[0].id);
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
      setImportMessage({ type: "error", text: "Please configure a project first." });
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

  const handleProjectSelect = (projectId: string) => {
    setSelectedProjectId(projectId);
    setTempColumnId("");
    setTempAssigneeId(null);
    void loadProjectColumns(projectId);
    void loadProjectPeople(projectId);
    setConfigDialogOpen(true);
  };

  const handleConfigSave = () => {
    setColumnListId(tempColumnId);
    setSelectedAssigneeId(tempAssigneeId);
    setConfigDialogOpen(false);
    setProjectSearch("");
  };

const handleConfigCancel = () => {
    setConfigDialogOpen(false);
    // Reset temp values and search
    setTempColumnId(columnListId);
    setTempAssigneeId(selectedAssigneeId);
    setProjectSearch("");
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    
    setCreatingProject(true);
    try {
      const res = await fetch("/api/basecamp/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newProjectName.trim(),
          description: newProjectDescription.trim() || undefined,
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to create project");
      }
      
      // Add the new project to the list
      setProjects((prev) => [data.project, ...prev]);
      
      // Reset form and close dialog
      setNewProjectName("");
      setNewProjectDescription("");
      setCreateProjectDialogOpen(false);
      
      // Show success message
      setImportMessage({ type: "success", text: `Project "${data.project.name}" created successfully!` });
      
      // Auto-select the new project if it has a card table
      if (data.project.cardTable?.enabled) {
        handleProjectSelect(data.project.id);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to create project";
      setImportMessage({ type: "error", text: message });
    } finally {
      setCreatingProject(false);
    }
  };

  const projectsWithCardTable = useMemo(
    () => projects.filter((p) => p.cardTable?.enabled),
    [projects]
  );

  const filteredProjects = useMemo(() => {
    if (!projectSearch.trim()) return projectsWithCardTable;
    const searchLower = projectSearch.toLowerCase();
    return projectsWithCardTable.filter(
      (p) =>
        p.name.toLowerCase().includes(searchLower) ||
        p.description?.toLowerCase().includes(searchLower)
    );
  }, [projectsWithCardTable, projectSearch]);

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId),
    [projects, selectedProjectId]
  );

  const selectedAssignee = useMemo(
    () => projectPeople.find((p) => p.id === selectedAssigneeId),
    [projectPeople, selectedAssigneeId]
  );

  const selectedColumn = useMemo(
    () => projectColumns.find((c) => c.id === columnListId),
    [projectColumns, columnListId]
  );

  const isConfigured = selectedProjectId && columnListId && selectedBucketId;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-lg">
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
            <span className="flex-1">{importMessage.text}</span>
            <button
              onClick={() => setImportMessage(null)}
              className="text-current opacity-70 hover:opacity-100"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Configuration Bar */}
        {bcStatus?.connected && (
          <div className="mb-6 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
            <div className="flex flex-wrap items-center gap-4">
              {/* Connection Status */}
              <div className="flex items-center gap-3 border-r border-[var(--border)] pr-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--success)]/10">
                  <CheckCircleIcon className="h-5 w-5 text-[var(--success)]" />
                </div>
                <div>
                  <p className="text-xs text-[var(--muted-foreground)]">Basecamp</p>
                  <p className="text-sm font-medium">Connected</p>
                </div>
              </div>

              {/* Project Selection */}
              <div className="flex flex-1 items-center gap-3">
                {isConfigured ? (
                  <>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--primary)]/10">
                      <FolderIcon className="h-5 w-5 text-[var(--primary)]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-[var(--muted-foreground)]">Pushing to</p>
                      <p className="truncate text-sm font-medium">{selectedProject?.name}</p>
                    </div>
                    <div className="hidden items-center gap-2 sm:flex">
                      <Badge variant="outline" className="gap-1">
                        <ColumnIcon className="h-3 w-3" />
                        {selectedColumn?.title}
                      </Badge>
                      {selectedAssignee && (
                        <Badge variant="outline" className="gap-1">
                          <UserIcon className="h-3 w-3" />
                          {selectedAssignee.name}
                        </Badge>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--warning)]/10">
                      <ExclamationIcon className="h-5 w-5 text-[var(--warning)]" />
                    </div>
                    <div>
                      <p className="text-xs text-[var(--muted-foreground)]">Project</p>
                      <p className="text-sm font-medium">Not configured</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {isConfigured ? (
                  <Button variant="outline" size="sm" onClick={() => setConfigDialogOpen(true)}>
                    <SettingsIcon className="mr-2 h-4 w-4" />
                    Change
                  </Button>
                ) : (
                  <Button onClick={() => setConfigDialogOpen(true)} disabled={loadingProjects}>
                    {loadingProjects ? (
                      <>
                        <LoadingSpinner size="small" />
                        <span className="ml-2">Loading...</span>
                      </>
                    ) : (
                      <>
                        <SettingsIcon className="mr-2 h-4 w-4" />
                        Configure Project
                      </>
                    )}
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => void onDisconnect()}>
                  Disconnect
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Connect Basecamp CTA */}
        {!bcStatus?.connected && (
          <Card className="mb-6">
            <CardContent className="flex items-center justify-between py-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary)]/10">
                  <LinkIcon className="h-6 w-6 text-[var(--primary)]" />
                </div>
                <div>
                  <h3 className="font-semibold">Connect to Basecamp</h3>
                  <p className="text-sm text-[var(--muted-foreground)]">Link your account to push tasks to Basecamp projects</p>
                </div>
              </div>
              <a
                href="/api/basecamp/connect"
                className="inline-flex h-10 items-center justify-center rounded-lg bg-[var(--primary)] px-6 text-sm font-medium text-[var(--primary-foreground)] transition-colors hover:bg-[var(--primary-hover)]"
              >
                Connect Basecamp
              </a>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Import Section */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <div className="flex items-center gap-2">
                <UploadIcon className="h-5 w-5 text-[var(--primary)]" />
                <CardTitle>Import Tasks</CardTitle>
              </div>
              <CardDescription>
                Upload markdown or paste content
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
                <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-[var(--border)] bg-[var(--secondary)]/50 px-4 py-6 transition-colors hover:border-[var(--primary)]/50 hover:bg-[var(--secondary)]">
                  <div className="text-center">
                    <UploadIcon className="mx-auto h-6 w-6 text-[var(--muted-foreground)]" />
                    <p className="mt-2 text-sm font-medium">
                      {fileName ? fileName : "Drop file or browse"}
                    </p>
                    <p className="mt-1 text-xs text-[var(--muted-foreground)]">.md files</p>
                  </div>
                </div>
              </div>

              <textarea
                value={markdown}
                onChange={(e) => setMarkdown(e.target.value)}
                rows={6}
                placeholder="Or paste markdown here..."
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] p-3 font-mono text-sm placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
              />

              <Button 
                onClick={() => void onImport()} 
                disabled={importing || !markdown.trim()} 
                isLoading={importing}
                className="w-full"
              >
                {importing ? "Importing..." : "Parse & Save"}
              </Button>
            </CardContent>
          </Card>

          {/* Tasks Table */}
          <Card className="lg:col-span-2">
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
                <div className="flex items-center justify-center py-12">
                  <LoadingSpinner />
                </div>
              ) : tasks.length === 0 ? (
                <div className="p-6">
                  <EmptyState 
                    title="No tasks yet" 
                    description="Import a markdown file to get started"
                    icon={UploadIcon}
                  />
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
                                variant={isConfigured ? "default" : "secondary"}
                                onClick={() => void onSync(t.id)}
                                disabled={!isConfigured || syncingId === t.id}
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
      </main>

      {/* Configuration Dialog */}
      <Dialog open={configDialogOpen} onClose={handleConfigCancel}>
        <DialogContent>
          <DialogClose onClose={handleConfigCancel} />
          <DialogHeader>
            <DialogTitle>Configure Basecamp Project</DialogTitle>
            <DialogDescription>
              Select a project, column, and optionally assign tasks to a team member.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-6">
            {/* Project Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <FolderIcon className="h-4 w-4 text-[var(--primary)]" />
                  Project
                  {projectsWithCardTable.length > 0 && (
                    <span className="text-xs font-normal text-[var(--muted-foreground)]">
                      ({projectsWithCardTable.length} available)
                    </span>
                  )}
                </label>
                <button
                  onClick={() => setCreateProjectDialogOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-md bg-[var(--secondary)] px-2.5 py-1.5 text-xs font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--secondary)]/80"
                >
                  <PlusIcon className="h-3.5 w-3.5" />
                  New Project
                </button>
              </div>
              
              {/* Search Input */}
              {!loadingProjects && projectsWithCardTable.length > 3 && (
                <div className="relative">
                  <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
                  <input
                    type="text"
                    placeholder="Search projects..."
                    value={projectSearch}
                    onChange={(e) => setProjectSearch(e.target.value)}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] py-2.5 pl-10 pr-4 text-sm placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                  />
                  {projectSearch && (
                    <button
                      onClick={() => setProjectSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)]"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              )}
              
              {loadingProjects ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : projectsWithCardTable.length === 0 ? (
                <div className="rounded-lg border border-[var(--border)] bg-[var(--secondary)]/50 p-4 text-center">
                  <p className="text-sm text-[var(--muted-foreground)]">No projects with Card Tables found</p>
                </div>
              ) : filteredProjects.length === 0 ? (
                <div className="rounded-lg border border-[var(--border)] bg-[var(--secondary)]/50 p-4 text-center">
                  <p className="text-sm text-[var(--muted-foreground)]">No projects match &quot;{projectSearch}&quot;</p>
                  <button 
                    onClick={() => setProjectSearch("")}
                    className="mt-2 text-xs text-[var(--primary)] hover:underline"
                  >
                    Clear search
                  </button>
                </div>
              ) : (
                <div className="max-h-56 space-y-2 overflow-y-auto rounded-lg border border-[var(--border)] p-2">
                  {filteredProjects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => handleProjectSelect(project.id)}
                      className={`w-full rounded-lg p-3 text-left transition-all ${
                        selectedProjectId === project.id
                          ? "bg-[var(--primary)]/10 ring-2 ring-[var(--primary)]"
                          : "hover:bg-[var(--secondary)]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{project.name}</span>
                        {selectedProjectId === project.id && (
                          <CheckCircleIcon className="h-4 w-4 text-[var(--primary)]" />
                        )}
                      </div>
                      {project.description && (
                        <p className="mt-1 text-xs text-[var(--muted-foreground)] line-clamp-1">
                          {project.description}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Column Selection */}
            {selectedProjectId && (
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <ColumnIcon className="h-4 w-4 text-[var(--accent)]" />
                  Target Column
                  {loadingProjectColumns && (
                    <LoadingSpinner size="small" />
                  )}
                </label>
                {projectColumns.length > 0 ? (
                  <div className="relative">
                    <select
                      className="w-full appearance-none rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-3 pr-10 text-sm focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                      value={tempColumnId}
                      onChange={(e) => setTempColumnId(e.target.value)}
                    >
                      <option value="">Select a column...</option>
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
                ) : !loadingProjectColumns && (
                  <div className="rounded-lg border border-[var(--destructive)]/20 bg-[var(--destructive)]/5 p-3 text-sm text-[var(--destructive)]">
                    No columns found in this project
                  </div>
                )}
              </div>
            )}

            {/* Assignee Selection */}
            {selectedProjectId && (
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <UserIcon className="h-4 w-4 text-[var(--accent)]" />
                  Assign To
                  <span className="rounded-full bg-[var(--secondary)] px-2 py-0.5 text-xs font-normal text-[var(--muted-foreground)]">
                    Optional
                  </span>
                  {loadingProjectPeople && (
                    <LoadingSpinner size="small" />
                  )}
                </label>
                {projectPeople.length > 0 ? (
                  <div className="relative">
                    <select
                      className="w-full appearance-none rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-3 pr-10 text-sm focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                      value={tempAssigneeId ?? ""}
                      onChange={(e) => setTempAssigneeId(e.target.value || null)}
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
                ) : !loadingProjectPeople && (
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--secondary)] p-3 text-sm text-[var(--muted-foreground)]">
                    No team members found
                  </div>
                )}
              </div>
            )}

            {/* Open in Basecamp link */}
            {selectedProject?.appUrl && (
              <a
                href={selectedProject.appUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-[var(--primary)] hover:underline"
              >
                <LinkIcon className="h-4 w-4" />
                Open project in Basecamp
                <ArrowRightIcon className="h-3 w-3" />
              </a>
            )}
          </DialogBody>

          <DialogFooter>
            <Button variant="outline" onClick={handleConfigCancel}>
              Cancel
            </Button>
            <Button
              onClick={handleConfigSave}
              disabled={!selectedProjectId || !tempColumnId}
            >
              Save Configuration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Project Dialog */}
      <Dialog 
        open={createProjectDialogOpen} 
        onClose={() => {
          setCreateProjectDialogOpen(false);
          setNewProjectName("");
          setNewProjectDescription("");
        }}
      >
        <DialogContent className="max-w-md">
          <DialogClose 
            onClose={() => {
              setCreateProjectDialogOpen(false);
              setNewProjectName("");
              setNewProjectDescription("");
            }} 
          />
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Create a new project in Basecamp. The project will include a Card Table for managing tasks.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="project-name" className="text-sm font-medium">
                Project Name <span className="text-[var(--destructive)]">*</span>
              </label>
              <input
                id="project-name"
                type="text"
                placeholder="Enter project name..."
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="project-description" className="flex items-center gap-2 text-sm font-medium">
                Description
                <span className="rounded-full bg-[var(--secondary)] px-2 py-0.5 text-xs font-normal text-[var(--muted-foreground)]">
                  Optional
                </span>
              </label>
              <textarea
                id="project-description"
                placeholder="Add a description for your project..."
                value={newProjectDescription}
                onChange={(e) => setNewProjectDescription(e.target.value)}
                rows={3}
                className="w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              />
            </div>

            <div className="rounded-lg border border-[var(--accent)]/20 bg-[var(--accent)]/5 p-3">
              <p className="text-xs text-[var(--accent)]">
                <strong>Note:</strong> After creating the project, you may need to enable the Card Table in Basecamp settings for it to appear in the project list.
              </p>
            </div>
          </DialogBody>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setCreateProjectDialogOpen(false);
                setNewProjectName("");
                setNewProjectDescription("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateProject}
              disabled={!newProjectName.trim() || creatingProject}
            >
              {creatingProject ? (
                <>
                  <LoadingSpinner size="small" />
                  Creating...
                </>
              ) : (
                <>
                  <PlusIcon className="h-4 w-4" />
                  Create Project
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
