"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  useTasks,
  useProjects,
  useTeamMembers,
  useTaskMutations,
  type Task,
} from "@/hooks/use-task-api";

// Icons
function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function FilterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function EditIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

function LoadingSpinner({ size = "default" }: { size?: "small" | "default" }) {
  const sizeClass = size === "small" ? "h-4 w-4" : "h-8 w-8";
  return (
    <svg className={`${sizeClass} animate-spin text-[var(--primary)]`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending", color: "bg-gray-500" },
  { value: "in_progress", label: "In Progress", color: "bg-blue-500" },
  { value: "review", label: "Review", color: "bg-yellow-500" },
  { value: "done", label: "Done", color: "bg-green-500" },
  { value: "blocked", label: "Blocked", color: "bg-red-500" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low", color: "bg-slate-400" },
  { value: "medium", label: "Medium", color: "bg-blue-400" },
  { value: "high", label: "High", color: "bg-orange-400" },
  { value: "critical", label: "Critical", color: "bg-red-500" },
];

function StatusBadge({ status }: { status: string }) {
  const option = STATUS_OPTIONS.find((o) => o.value === status) || STATUS_OPTIONS[0];
  return (
    <Badge variant="outline" className="gap-1.5">
      <span className={`h-2 w-2 rounded-full ${option.color}`} />
      {option.label}
    </Badge>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const option = PRIORITY_OPTIONS.find((o) => o.value === priority) || PRIORITY_OPTIONS[1];
  return (
    <Badge variant="secondary" className="gap-1.5">
      <span className={`h-2 w-2 rounded-full ${option.color}`} />
      {option.label}
    </Badge>
  );
}

export default function TaskManager() {
  // State
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [priorityFilter, setPriorityFilter] = useState<string>("");
  const [projectFilter, setProjectFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  
  // Dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [deleteConfirmTask, setDeleteConfirmTask] = useState<Task | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    userStory: "",
    acceptanceCriteria: "",
    estimate: "",
    priority: "medium",
    status: "pending",
    projectId: "",
    assigneeId: "",
    dueDate: "",
  });
  
  // Hooks
  const { data: tasksData, isLoading: loadingTasks, mutate: mutateTasks } = useTasks({
    page,
    limit: 20,
    search: search || undefined,
    status: statusFilter || undefined,
    priority: priorityFilter || undefined,
    projectId: projectFilter || undefined,
  });
  
  const { data: projectsData } = useProjects({ limit: 100 });
  const { data: membersData } = useTeamMembers({ limit: 100 });
  
  const { createTask, updateTask, deleteTask, bulkOperation, loading: mutationLoading } = useTaskMutations();
  
  const tasks = tasksData?.data ?? [];
  const pagination = tasksData?.pagination;
  const projects = projectsData?.data ?? [];
  const members = membersData?.data ?? [];
  
  // Handlers
  const handleSelectAll = () => {
    if (selectedTasks.size === tasks.length) {
      setSelectedTasks(new Set());
    } else {
      setSelectedTasks(new Set(tasks.map((t) => t.id)));
    }
  };
  
  const handleSelectTask = (taskId: string) => {
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedTasks(newSelected);
  };
  
  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      userStory: "",
      acceptanceCriteria: "",
      estimate: "",
      priority: "medium",
      status: "pending",
      projectId: "",
      assigneeId: "",
      dueDate: "",
    });
  };
  
  const handleOpenCreate = () => {
    resetForm();
    setCreateDialogOpen(true);
  };
  
  const handleOpenEdit = (task: Task) => {
    setFormData({
      title: task.title,
      description: task.description,
      userStory: task.userStory,
      acceptanceCriteria: task.acceptanceCriteria,
      estimate: task.estimate,
      priority: task.priority,
      status: task.status,
      projectId: task.projectId || "",
      assigneeId: task.assigneeId || "",
      dueDate: task.dueDate ? task.dueDate.split("T")[0] : "",
    });
    setEditTask(task);
  };
  
  const handleCreate = async () => {
    try {
      await createTask({
        title: formData.title,
        description: formData.description,
        userStory: formData.userStory,
        acceptanceCriteria: formData.acceptanceCriteria,
        estimate: formData.estimate,
        priority: formData.priority,
        status: formData.status,
        projectId: formData.projectId || null,
        assigneeId: formData.assigneeId || null,
        dueDate: formData.dueDate || null,
      });
      setCreateDialogOpen(false);
      resetForm();
      mutateTasks();
    } catch {
      // Error handled by hook
    }
  };
  
  const handleUpdate = async () => {
    if (!editTask) return;
    try {
      await updateTask(editTask.id, {
        title: formData.title,
        description: formData.description,
        userStory: formData.userStory,
        acceptanceCriteria: formData.acceptanceCriteria,
        estimate: formData.estimate,
        priority: formData.priority,
        status: formData.status,
        projectId: formData.projectId || null,
        assigneeId: formData.assigneeId || null,
        dueDate: formData.dueDate || null,
      });
      setEditTask(null);
      resetForm();
      mutateTasks();
    } catch {
      // Error handled by hook
    }
  };
  
  const handleDelete = async () => {
    if (!deleteConfirmTask) return;
    try {
      await deleteTask(deleteConfirmTask.id);
      setDeleteConfirmTask(null);
      mutateTasks();
    } catch {
      // Error handled by hook
    }
  };
  
  const handleBulkDelete = async () => {
    if (selectedTasks.size === 0) return;
    try {
      await bulkOperation("delete", Array.from(selectedTasks));
      setSelectedTasks(new Set());
      mutateTasks();
    } catch {
      // Error handled by hook
    }
  };
  
  const handleBulkStatusChange = async (status: string) => {
    if (selectedTasks.size === 0) return;
    try {
      await bulkOperation("updateStatus", Array.from(selectedTasks), { status });
      setSelectedTasks(new Set());
      mutateTasks();
    } catch {
      // Error handled by hook
    }
  };
  
  const clearFilters = () => {
    setSearch("");
    setStatusFilter("");
    setPriorityFilter("");
    setProjectFilter("");
    setPage(1);
  };
  
  const hasActiveFilters = search || statusFilter || priorityFilter || projectFilter;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Task Manager</h2>
          <p className="text-sm text-[var(--muted-foreground)]">
            Manage your tasks with full CRUD operations
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <PlusIcon className="mr-2 h-4 w-4" />
          New Task
        </Button>
      </div>
      
      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            {/* Search */}
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
              <Input
                placeholder="Search tasks..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
            
            {/* Filter Toggle */}
            <Button
              variant={showFilters ? "default" : "outline"}
              onClick={() => setShowFilters(!showFilters)}
            >
              <FilterIcon className="mr-2 h-4 w-4" />
              Filters
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-2">
                  Active
                </Badge>
              )}
            </Button>
            
            {/* Refresh */}
            <Button variant="outline" onClick={() => mutateTasks()}>
              <RefreshIcon className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Filter Options */}
          {showFilters && (
            <div className="mt-4 grid gap-4 border-t border-[var(--border)] pt-4 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                >
                  <option value="">All Statuses</option>
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="mb-1.5 block text-sm font-medium">Priority</label>
                <select
                  value={priorityFilter}
                  onChange={(e) => {
                    setPriorityFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                >
                  <option value="">All Priorities</option>
                  {PRIORITY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="mb-1.5 block text-sm font-medium">Project</label>
                <select
                  value={projectFilter}
                  onChange={(e) => {
                    setProjectFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                >
                  <option value="">All Projects</option>
                  {projects.map((proj) => (
                    <option key={proj.id} value={proj.id}>
                      {proj.name}
                    </option>
                  ))}
                </select>
              </div>
              
              {hasActiveFilters && (
                <div className="sm:col-span-3">
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    Clear all filters
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Bulk Actions */}
      {selectedTasks.size > 0 && (
        <Card className="border-[var(--primary)]/50 bg-[var(--primary)]/5">
          <CardContent className="flex items-center gap-4 p-4">
            <span className="text-sm font-medium">
              {selectedTasks.size} task{selectedTasks.size > 1 ? "s" : ""} selected
            </span>
            <div className="flex gap-2">
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleBulkStatusChange(e.target.value);
                    e.target.value = "";
                  }
                }}
                className="rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-sm"
                defaultValue=""
              >
                <option value="">Change Status...</option>
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                disabled={mutationLoading}
              >
                <TrashIcon className="mr-2 h-4 w-4" />
                Delete Selected
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedTasks(new Set())}
            >
              Clear Selection
            </Button>
          </CardContent>
        </Card>
      )}
      
      {/* Task List */}
      <Card>
        <CardHeader className="border-b border-[var(--border)]">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              Tasks {pagination && `(${pagination.total})`}
            </CardTitle>
            {tasks.length > 0 && (
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedTasks.size === tasks.length && tasks.length > 0}
                  onChange={handleSelectAll}
                  className="h-4 w-4 rounded border-[var(--border)]"
                />
                Select All
              </label>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loadingTasks ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : tasks.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-[var(--muted-foreground)]">
                {hasActiveFilters ? "No tasks match your filters" : "No tasks yet"}
              </p>
              {!hasActiveFilters && (
                <Button className="mt-4" onClick={handleOpenCreate}>
                  <PlusIcon className="mr-2 h-4 w-4" />
                  Create your first task
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-4 p-4 transition-colors hover:bg-[var(--secondary)]/50"
                >
                  <input
                    type="checkbox"
                    checked={selectedTasks.has(task.id)}
                    onChange={() => handleSelectTask(task.id)}
                    className="h-4 w-4 rounded border-[var(--border)]"
                  />
                  
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-[var(--muted-foreground)]">
                        #{task.ticketNumber}
                      </span>
                      <h3 className="truncate font-medium">{task.title}</h3>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <StatusBadge status={task.status} />
                      <PriorityBadge priority={task.priority} />
                      {task.project && (
                        <Badge
                          variant="outline"
                          style={{ borderColor: task.project.color }}
                        >
                          {task.project.name}
                        </Badge>
                      )}
                      {task.assignee && (
                        <span className="text-xs text-[var(--muted-foreground)]">
                          Assigned to {task.assignee.name}
                        </span>
                      )}
                      {task.dueDate && (
                        <span className={`text-xs ${new Date(task.dueDate) < new Date() ? "text-[var(--destructive)]" : "text-[var(--muted-foreground)]"}`}>
                          Due {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEdit(task)}
                    >
                      <EditIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteConfirmTask(task)}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-[var(--border)] p-4">
              <span className="text-sm text-[var(--muted-foreground)]">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!pagination.hasMore}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Create/Edit Dialog */}
      <Dialog
        open={createDialogOpen || !!editTask}
        onOpenChange={(open) => {
          if (!open) {
            setCreateDialogOpen(false);
            setEditTask(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editTask ? "Edit Task" : "Create New Task"}
            </DialogTitle>
            <DialogDescription>
              {editTask
                ? "Update the task details below"
                : "Fill in the details to create a new task"}
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="max-h-[60vh] space-y-4 overflow-y-auto">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Title *</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter task title"
              />
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                >
                  {PRIORITY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Project</label>
                <select
                  value={formData.projectId}
                  onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                >
                  <option value="">No Project</option>
                  {projects.map((proj) => (
                    <option key={proj.id} value={proj.id}>
                      {proj.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Assignee</label>
                <select
                  value={formData.assigneeId}
                  onChange={(e) => setFormData({ ...formData, assigneeId: e.target.value })}
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                >
                  <option value="">Unassigned</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Due Date</label>
                <Input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Estimate</label>
                <Input
                  value={formData.estimate}
                  onChange={(e) => setFormData({ ...formData, estimate: e.target.value })}
                  placeholder="e.g., 2h, 1d, 3sp"
                />
              </div>
            </div>
            
            <div>
              <label className="mb-1.5 block text-sm font-medium">User Story</label>
              <textarea
                value={formData.userStory}
                onChange={(e) => setFormData({ ...formData, userStory: e.target.value })}
                placeholder="As a [user], I want to [action] so that [benefit]"
                rows={2}
                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
              />
            </div>
            
            <div>
              <label className="mb-1.5 block text-sm font-medium">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detailed description of the task"
                rows={3}
                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
              />
            </div>
            
            <div>
              <label className="mb-1.5 block text-sm font-medium">Acceptance Criteria</label>
              <textarea
                value={formData.acceptanceCriteria}
                onChange={(e) => setFormData({ ...formData, acceptanceCriteria: e.target.value })}
                placeholder="List the acceptance criteria"
                rows={3}
                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              onClick={editTask ? handleUpdate : handleCreate}
              disabled={!formData.title.trim() || mutationLoading}
            >
              {mutationLoading ? (
                <LoadingSpinner size="small" />
              ) : editTask ? (
                "Update Task"
              ) : (
                "Create Task"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteConfirmTask}
        onOpenChange={(open) => !open && setDeleteConfirmTask(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Task</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete task #{deleteConfirmTask?.ticketNumber} &quot;{deleteConfirmTask?.title}&quot;?
              This will move the task to trash.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={mutationLoading}
            >
              {mutationLoading ? <LoadingSpinner size="small" /> : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
