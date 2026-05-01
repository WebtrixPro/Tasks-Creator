"use client";

import { useState, useCallback } from "react";
import { 
  useTasks, 
  useProjects, 
  useMembers, 
  useStats, 
  useTrash,
  useBasecampStatus,
  useBasecampProjects,
  useBasecampColumns,
  useSyncTask,
  useImportFromBasecamp,
} from "@/hooks/use-task-api";
import { TaskDialog } from "@/components/task-manager/TaskDialog";
import { ActivityFeed } from "@/components/task-manager/ActivityFeed";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  CheckSquareIcon,
  ClockIcon,
  ExclamationIcon,
  RefreshIcon,
  FolderIcon,
  UserIcon,
  CloudArrowUpIcon,
  DownloadIcon,
  UsersIcon,
  CheckCircleIcon,
  LinkIcon,
} from "@/components/ui/icons";
import { formatDistanceToNow } from "date-fns";
import type { Task, CreateTaskInput, UpdateTaskInput, TaskFilters } from "@/types/task";

const PRIORITY_BADGE_VARIANT: Record<string, "default" | "success" | "warning" | "danger" | "outline"> = {
  low: "outline",
  medium: "default",
  high: "warning",
  urgent: "danger",
};

const STATUS_BADGE_VARIANT: Record<string, "default" | "success" | "warning" | "danger" | "outline"> = {
  pending: "outline",
  in_progress: "default",
  review: "warning",
  completed: "success",
  blocked: "danger",
};

const STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "review", label: "In Review" },
  { value: "completed", label: "Completed" },
  { value: "blocked", label: "Blocked" },
];

const PRIORITY_OPTIONS = [
  { value: "all", label: "All Priority" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

export function TasksClient() {
  // Filters state
  const [filters, setFilters] = useState<TaskFilters>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  
  // Dialog states
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  
  // Basecamp sync state
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [taskToSync, setTaskToSync] = useState<Task | null>(null);
  const [selectedBasecampProject, setSelectedBasecampProject] = useState<string>("");
  const [selectedColumn, setSelectedColumn] = useState<string>("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Data hooks
  const { 
    tasks, 
    pagination, 
    isLoading: tasksLoading, 
    createTask, 
    updateTask, 
    deleteTask,
    bulkDelete,
    bulkUpdate,
    mutate: mutateTasks 
  } = useTasks({ ...filters, search: searchQuery || undefined });
  
  const { projects, isLoading: projectsLoading, mutate: mutateProjects } = useProjects();
  const { members, isLoading: membersLoading, mutate: mutateMembers } = useMembers();
  const { stats, isLoading: statsLoading } = useStats();
  const { trashedItems, restoreItem, permanentDelete, emptyTrash, mutate: mutateTrash } = useTrash();
  
  // Basecamp hooks
  const { connected: basecampConnected } = useBasecampStatus();
  const { projects: basecampProjects, isLoading: bcProjectsLoading } = useBasecampProjects();
  const { columns: basecampColumns, isLoading: bcColumnsLoading } = useBasecampColumns(selectedBasecampProject);
  const { syncTask } = useSyncTask();
  const { importProjects, importMembers } = useImportFromBasecamp();

  // Handlers
  const handleCreateTask = useCallback(async (data: CreateTaskInput) => {
    await createTask(data);
    setTaskDialogOpen(false);
  }, [createTask]);

  const handleUpdateTask = useCallback(async (data: UpdateTaskInput) => {
    if (!editingTask) return;
    await updateTask(editingTask.id, data);
    setEditingTask(null);
    setTaskDialogOpen(false);
  }, [editingTask, updateTask]);

  const handleDeleteTask = useCallback(async () => {
    if (!taskToDelete) return;
    await deleteTask(taskToDelete.id);
    setTaskToDelete(null);
    setDeleteDialogOpen(false);
    mutateTrash();
  }, [taskToDelete, deleteTask, mutateTrash]);

  const handleBulkDelete = useCallback(async () => {
    const ids = Array.from(selectedTasks);
    await bulkDelete(ids);
    setSelectedTasks(new Set());
    setBulkDeleteDialogOpen(false);
    mutateTrash();
  }, [selectedTasks, bulkDelete, mutateTrash]);

  const handleBulkStatusUpdate = useCallback(async (status: string) => {
    const ids = Array.from(selectedTasks);
    await bulkUpdate(ids, { status });
    setSelectedTasks(new Set());
  }, [selectedTasks, bulkUpdate]);

  const handleRestoreTask = useCallback(async (id: string) => {
    await restoreItem("task", id);
    mutateTasks();
  }, [restoreItem, mutateTasks]);

  const handlePermanentDelete = useCallback(async (id: string) => {
    await permanentDelete("task", id);
  }, [permanentDelete]);

  // Basecamp sync handlers
  const openSyncDialog = (task: Task) => {
    setTaskToSync(task);
    setSelectedBasecampProject("");
    setSelectedColumn("");
    setSyncDialogOpen(true);
  };

  const handleSyncTask = useCallback(async () => {
    if (!taskToSync || !selectedBasecampProject || !selectedColumn) return;
    
    setIsSyncing(true);
    try {
      // Find the bucket ID from the selected project
      const projectsList = Array.isArray(basecampProjects) ? basecampProjects : [];
      const bcProject = projectsList.find(p => p.id === selectedBasecampProject);
      
      if (!bcProject?.cardTable) {
        throw new Error("Card Table not found in selected project");
      }

      await syncTask(taskToSync.id, {
        columnListId: selectedColumn,
        bucketId: bcProject.id,
      });

      setSyncDialogOpen(false);
      setTaskToSync(null);
      mutateTasks();
    } catch (error) {
      console.error("Sync failed:", error);
    } finally {
      setIsSyncing(false);
    }
  }, [taskToSync, selectedBasecampProject, selectedColumn, basecampProjects, syncTask, mutateTasks]);

  const handleImportProjects = useCallback(async () => {
    setIsImporting(true);
    try {
      await importProjects();
      mutateProjects();
    } catch (error) {
      console.error("Import projects failed:", error);
    } finally {
      setIsImporting(false);
    }
  }, [importProjects, mutateProjects]);

  const handleImportMembers = useCallback(async () => {
    setIsImporting(true);
    try {
      await importMembers("");
      mutateMembers();
    } catch (error) {
      console.error("Import members failed:", error);
    } finally {
      setIsImporting(false);
    }
  }, [importMembers, mutateMembers]);

  const toggleTaskSelection = (taskId: string) => {
    setSelectedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const toggleAllTasks = () => {
    if (selectedTasks.size === tasks.length) {
      setSelectedTasks(new Set());
    } else {
      setSelectedTasks(new Set(tasks.map(t => t.id)));
    }
  };

  const openEditDialog = (task: Task) => {
    setEditingTask(task);
    setTaskDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingTask(null);
    setTaskDialogOpen(true);
  };

  const isLoading = tasksLoading || projectsLoading || membersLoading;

  const projectOptions = [
    { value: "all", label: "All Projects" },
    ...projects.map((p) => ({ value: p.id, label: p.name })),
  ];

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="container mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex flex-col gap-4 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Task Manager</h1>
              <p className="text-[var(--muted-foreground)] mt-1">
                Comprehensive CRUD with projects, team members, and activity tracking
              </p>
            </div>
            <div className="flex items-center gap-3">
              {basecampConnected ? (
                <Badge variant="success" className="flex items-center gap-1.5">
                  <CheckCircleIcon className="h-3.5 w-3.5" />
                  Basecamp Connected
                </Badge>
              ) : (
                <Badge variant="outline" className="flex items-center gap-1.5">
                  <ExclamationIcon className="h-3.5 w-3.5" />
                  Basecamp Disconnected
                </Badge>
              )}
              <Button onClick={openCreateDialog}>
                <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Task
              </Button>
            </div>
          </div>

          {/* Basecamp Integration Actions */}
          {basecampConnected && (
            <div className="flex items-center gap-2 p-3 bg-[var(--secondary)]/50 rounded-lg border border-[var(--border)]">
              <span className="text-sm font-medium mr-2">Basecamp Sync:</span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleImportProjects}
                disabled={isImporting}
              >
                {isImporting ? (
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <DownloadIcon className="mr-2 h-4 w-4" />
                )}
                Import Projects
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleImportMembers}
                disabled={isImporting}
              >
                {isImporting ? (
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <UsersIcon className="mr-2 h-4 w-4" />
                )}
                Import Team Members
              </Button>
              <span className="ml-auto text-xs text-[var(--muted-foreground)]">
                {Array.isArray(basecampProjects) ? basecampProjects.length : 0} Basecamp projects available
              </span>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
              <CheckSquareIcon className="h-4 w-4 text-[var(--muted-foreground)]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? (
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
                ) : (
                  stats?.tasks?.total || 0
                )}
              </div>
              <p className="text-xs text-[var(--muted-foreground)]">
                {stats?.tasks?.completed || 0} completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Projects</CardTitle>
              <FolderIcon className="h-4 w-4 text-[var(--muted-foreground)]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? (
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
                ) : (
                  stats?.projects?.total || 0
                )}
              </div>
              <p className="text-xs text-[var(--muted-foreground)]">
                {stats?.projects?.active || 0} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Team Members</CardTitle>
              <UserIcon className="h-4 w-4 text-[var(--muted-foreground)]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? (
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
                ) : (
                  stats?.members?.total || 0
                )}
              </div>
              <p className="text-xs text-[var(--muted-foreground)]">
                {stats?.members?.active || 0} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <ClockIcon className="h-4 w-4 text-[var(--muted-foreground)]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? (
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
                ) : (
                  stats?.tasks?.inProgress || 0
                )}
              </div>
              <p className="text-xs text-[var(--muted-foreground)]">
                {stats?.tasks?.overdue || 0} overdue
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="tasks" className="space-y-4">
          <TabsList>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="trash">
              Trash
              {trashedItems && trashedItems.length > 0 && (
                <Badge variant="default" className="ml-2">
                  {trashedItems.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="space-y-4">
            {/* Filters & Search */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <svg 
                      className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <Input
                      placeholder="Search tasks..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>

                  <Select
                    value={filters.status || "all"}
                    onValueChange={(value) => setFilters({ ...filters, status: value === "all" ? undefined : value })}
                    options={STATUS_OPTIONS}
                    placeholder="Status"
                    className="w-[150px]"
                  />

                  <Select
                    value={filters.priority || "all"}
                    onValueChange={(value) => setFilters({ ...filters, priority: value === "all" ? undefined : value })}
                    options={PRIORITY_OPTIONS}
                    placeholder="Priority"
                    className="w-[150px]"
                  />

                  <Select
                    value={filters.projectId || "all"}
                    onValueChange={(value) => setFilters({ ...filters, projectId: value === "all" ? undefined : value })}
                    options={projectOptions}
                    placeholder="Project"
                    className="w-[180px]"
                  />
                </div>

                {/* Bulk Actions */}
                {selectedTasks.size > 0 && (
                  <div className="mt-4 flex items-center gap-4 p-3 bg-[var(--secondary)] rounded-lg">
                    <span className="text-sm font-medium">
                      {selectedTasks.size} task{selectedTasks.size > 1 ? "s" : ""} selected
                    </span>
                    <Separator orientation="vertical" className="h-6" />
                    <DropdownMenu>
                      <DropdownMenuTrigger>
                        <Button variant="outline" size="sm">
                          Change Status
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => handleBulkStatusUpdate("pending")}>
                          Pending
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleBulkStatusUpdate("in_progress")}>
                          In Progress
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleBulkStatusUpdate("review")}>
                          In Review
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleBulkStatusUpdate("completed")}>
                          Completed
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => setBulkDeleteDialogOpen(true)}
                    >
                      <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete Selected
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setSelectedTasks(new Set())}
                    >
                      Clear Selection
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Task List */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle>Tasks</CardTitle>
                  <span className="text-sm text-[var(--muted-foreground)]">
                    {pagination?.total || 0} total
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
                  </div>
                ) : tasks.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckSquareIcon className="mx-auto h-12 w-12 text-[var(--muted-foreground)] opacity-50" />
                    <h3 className="mt-4 text-lg font-semibold">No tasks found</h3>
                    <p className="text-[var(--muted-foreground)] mt-2">
                      {searchQuery || Object.keys(filters).length > 0
                        ? "Try adjusting your filters"
                        : "Create your first task to get started"}
                    </p>
                    <Button onClick={openCreateDialog} className="mt-4">
                      <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Create Task
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Header row */}
                    <div className="flex items-center gap-4 px-4 py-2 text-sm font-medium text-[var(--muted-foreground)] border-b border-[var(--border)]">
                      <Checkbox
                        checked={selectedTasks.size === tasks.length && tasks.length > 0}
                        onCheckedChange={toggleAllTasks}
                      />
                      <span className="flex-1">Title</span>
                      <span className="w-24 text-center">Status</span>
                      <span className="w-20 text-center">Priority</span>
                      <span className="w-32">Project</span>
                      <span className="w-32">Assignee</span>
                      <span className="w-20 text-center">Sync</span>
                      <span className="w-24 text-right">Due Date</span>
                      <span className="w-10"></span>
                    </div>

                    {/* Task rows */}
                    <ScrollArea className="h-[500px]">
                      {tasks.map((task) => (
                        <div
                          key={task.id}
                          className={`
                            flex items-center gap-4 px-4 py-3 hover:bg-[var(--secondary)]/50 rounded-lg transition-colors
                            ${selectedTasks.has(task.id) ? "bg-[var(--secondary)]" : ""}
                          `}
                        >
                          <Checkbox
                            checked={selectedTasks.has(task.id)}
                            onCheckedChange={() => toggleTaskSelection(task.id)}
                          />
                          
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{task.title}</p>
                            {task.description && (
                              <p className="text-sm text-[var(--muted-foreground)] truncate">
                                {task.description}
                              </p>
                            )}
                          </div>

                          <div className="w-24 flex justify-center">
                            <Badge variant={STATUS_BADGE_VARIANT[task.status] || "outline"}>
                              {task.status.replace("_", " ")}
                            </Badge>
                          </div>

                          <div className="w-20 flex justify-center">
                            <Badge variant={PRIORITY_BADGE_VARIANT[task.priority] || "outline"}>
                              {task.priority}
                            </Badge>
                          </div>

                          <div className="w-32 truncate">
                            {task.project ? (
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: task.project.color || "#6366f1" }}
                                />
                                <span className="text-sm truncate">{task.project.name}</span>
                              </div>
                            ) : (
                              <span className="text-sm text-[var(--muted-foreground)]">-</span>
                            )}
                          </div>

                          <div className="w-32 truncate">
                            {task.assignee ? (
                              <span className="text-sm">{task.assignee.name}</span>
                            ) : (
                              <span className="text-sm text-[var(--muted-foreground)]">Unassigned</span>
                            )}
                          </div>

                          <div className="w-20 flex justify-center">
                            {task.basecampCardId ? (
                              <Badge variant="success" className="flex items-center gap-1">
                                <LinkIcon className="h-3 w-3" />
                                <span className="text-xs">Synced</span>
                              </Badge>
                            ) : task.syncStatus === "failed" ? (
                              <Badge variant="danger" className="flex items-center gap-1">
                                <ExclamationIcon className="h-3 w-3" />
                                <span className="text-xs">Failed</span>
                              </Badge>
                            ) : (
                              <span className="text-xs text-[var(--muted-foreground)]">Local</span>
                            )}
                          </div>

                          <div className="w-24 text-right">
                            {task.dueDate ? (
                              <span className="text-sm">
                                {formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })}
                              </span>
                            ) : (
                              <span className="text-sm text-[var(--muted-foreground)]">-</span>
                            )}
                          </div>

                          <DropdownMenu>
                            <DropdownMenuTrigger>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                                </svg>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDialog(task)}>
                                <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Edit
                              </DropdownMenuItem>
                              {basecampConnected && !task.basecampCardId && (
                                <DropdownMenuItem onClick={() => openSyncDialog(task)}>
                                  <CloudArrowUpIcon className="mr-2 h-4 w-4" />
                                  Sync to Basecamp
                                </DropdownMenuItem>
                              )}
                              {task.basecampCardId && (
                                <DropdownMenuItem disabled>
                                  <CheckCircleIcon className="mr-2 h-4 w-4 text-green-500" />
                                  Already Synced
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                destructive
                                onClick={() => {
                                  setTaskToDelete(task);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      ))}
                    </ScrollArea>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trash Tab */}
          <TabsContent value="trash">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Trash</CardTitle>
                    <CardDescription>
                      Deleted items can be restored or permanently deleted
                    </CardDescription>
                  </div>
                  {trashedItems && trashedItems.length > 0 && (
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => emptyTrash("task")}
                    >
                      Empty Trash
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {!trashedItems || trashedItems.length === 0 ? (
                  <div className="text-center py-12">
                    <FolderIcon className="mx-auto h-12 w-12 text-[var(--muted-foreground)] opacity-50" />
                    <h3 className="mt-4 text-lg font-semibold">Trash is empty</h3>
                    <p className="text-[var(--muted-foreground)] mt-2">
                      Deleted items will appear here
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {trashedItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-4 border border-[var(--border)] rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{item.title || item.name}</p>
                          <p className="text-sm text-[var(--muted-foreground)]">
                            {item.type} - Deleted {formatDistanceToNow(new Date(item.deletedAt), { addSuffix: true })}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRestoreTask(item.id)}
                          >
                            <RefreshIcon className="mr-2 h-4 w-4" />
                            Restore
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handlePermanentDelete(item.id)}
                          >
                            <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete Forever
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClockIcon className="h-5 w-5" />
                  Activity Feed
                </CardTitle>
                <CardDescription>
                  Track all changes across tasks, projects, and team members
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ActivityFeed limit={100} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Task Dialog */}
      <TaskDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        task={editingTask}
        projects={projects}
        members={members}
        onSubmit={editingTask ? handleUpdateTask : handleCreateTask}
        mode={editingTask ? "edit" : "create"}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{taskToDelete?.title}&quot;? 
              This task will be moved to trash and can be restored later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTask} destructive>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Multiple Tasks</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedTasks.size} task{selectedTasks.size > 1 ? "s" : ""}?
              These tasks will be moved to trash and can be restored later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} destructive>Delete All</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Sync to Basecamp Dialog */}
      <Dialog open={syncDialogOpen} onOpenChange={setSyncDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CloudArrowUpIcon className="h-5 w-5 text-[var(--primary)]" />
              Sync to Basecamp
            </DialogTitle>
            <DialogDescription>
              Sync &quot;{taskToSync?.title}&quot; to a Basecamp project card table.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Basecamp Project</label>
              <Select
                value={selectedBasecampProject}
                onValueChange={(value) => {
                  setSelectedBasecampProject(value);
                  setSelectedColumn("");
                }}
                options={[
                  { value: "", label: "Select a project..." },
                  ...(Array.isArray(basecampProjects) ? basecampProjects.map((p) => ({ value: p.id, label: p.name })) : []),
                ]}
                placeholder="Select project"
                disabled={bcProjectsLoading}
              />
            </div>

            {selectedBasecampProject && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Card Table Column</label>
                {bcColumnsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
                    Loading columns...
                  </div>
                ) : basecampColumns.length > 0 ? (
                  <Select
                    value={selectedColumn}
                    onValueChange={setSelectedColumn}
                    options={[
                      { value: "", label: "Select a column..." },
                      ...basecampColumns.map((c) => ({ value: c.id, label: c.title })),
                    ]}
                    placeholder="Select column"
                  />
                ) : (
                  <p className="text-sm text-[var(--muted-foreground)]">
                    No Card Table found in this project. Please enable Card Table in Basecamp first.
                  </p>
                )}
              </div>
            )}

            {taskToSync && (
              <div className="rounded-lg border border-[var(--border)] p-3 bg-[var(--secondary)]/30">
                <h4 className="font-medium text-sm mb-2">Task Details</h4>
                <div className="space-y-1 text-sm text-[var(--muted-foreground)]">
                  <p><span className="font-medium">Title:</span> {taskToSync.title}</p>
                  <p><span className="font-medium">Priority:</span> {taskToSync.priority}</p>
                  <p><span className="font-medium">Status:</span> {taskToSync.status.replace("_", " ")}</p>
                  {taskToSync.dueDate && (
                    <p><span className="font-medium">Due:</span> {new Date(taskToSync.dueDate).toLocaleDateString()}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSyncDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSyncTask}
              disabled={!selectedBasecampProject || !selectedColumn || isSyncing}
            >
              {isSyncing ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Syncing...
                </>
              ) : (
                <>
                  <CloudArrowUpIcon className="mr-2 h-4 w-4" />
                  Sync Task
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
