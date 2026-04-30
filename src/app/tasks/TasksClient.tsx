"use client";

import { useState, useCallback } from "react";
import { useTasks, useProjects, useMembers, useStats, useTrash } from "@/hooks/use-task-api";
import { TaskDialog } from "@/components/task-manager/TaskDialog";
import { ActivityFeed } from "@/components/task-manager/ActivityFeed";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Pencil, 
  Trash2, 
  RotateCcw, 
  CheckSquare,
  Clock,
  AlertCircle,
  CheckCircle2,
  Circle,
  BarChart3,
  Users,
  FolderKanban,
  Activity,
  Loader2,
  Archive
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import type { Task, CreateTaskInput, UpdateTaskInput, TaskFilters } from "@/types/task";

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  medium: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300",
  urgent: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
};

const STATUS_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  pending: Circle,
  in_progress: Clock,
  review: AlertCircle,
  completed: CheckCircle2,
  blocked: AlertCircle,
};

const STATUS_COLORS: Record<string, string> = {
  pending: "text-slate-500",
  in_progress: "text-blue-500",
  review: "text-amber-500",
  completed: "text-green-500",
  blocked: "text-red-500",
};

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
  
  const { projects, isLoading: projectsLoading } = useProjects();
  const { members, isLoading: membersLoading } = useMembers();
  const { stats, isLoading: statsLoading } = useStats();
  const { trashedItems, restoreItem, permanentDelete, emptyTrash, mutate: mutateTrash } = useTrash();

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

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Task Manager</h1>
            <p className="text-muted-foreground mt-1">
              Comprehensive CRUD with projects, team members, and activity tracking
            </p>
          </div>
          <Button onClick={openCreateDialog} size="lg">
            <Plus className="mr-2 h-5 w-5" />
            New Task
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
              <CheckSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats?.tasks?.total || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats?.tasks?.completed || 0} completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Projects</CardTitle>
              <FolderKanban className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats?.projects?.total || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats?.projects?.active || 0} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Team Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats?.members?.total || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats?.members?.active || 0} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats?.tasks?.inProgress || 0}
              </div>
              <p className="text-xs text-muted-foreground">
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
                <Badge variant="secondary" className="ml-2">
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
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
                  >
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="review">In Review</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="blocked">Blocked</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={filters.priority || "all"}
                    onValueChange={(value) => setFilters({ ...filters, priority: value === "all" ? undefined : value })}
                  >
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priority</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={filters.projectId || "all"}
                    onValueChange={(value) => setFilters({ ...filters, projectId: value === "all" ? undefined : value })}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Projects</SelectItem>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Bulk Actions */}
                {selectedTasks.size > 0 && (
                  <div className="mt-4 flex items-center gap-4 p-3 bg-muted rounded-lg">
                    <span className="text-sm font-medium">
                      {selectedTasks.size} task{selectedTasks.size > 1 ? "s" : ""} selected
                    </span>
                    <Separator orientation="vertical" className="h-6" />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
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
                      <Trash2 className="mr-2 h-4 w-4" />
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
                  <span className="text-sm text-muted-foreground">
                    {pagination?.total || 0} total
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : tasks.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckSquare className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <h3 className="mt-4 text-lg font-semibold">No tasks found</h3>
                    <p className="text-muted-foreground mt-2">
                      {searchQuery || Object.keys(filters).length > 0
                        ? "Try adjusting your filters"
                        : "Create your first task to get started"}
                    </p>
                    <Button onClick={openCreateDialog} className="mt-4">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Task
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Header row */}
                    <div className="flex items-center gap-4 px-4 py-2 text-sm font-medium text-muted-foreground border-b">
                      <Checkbox
                        checked={selectedTasks.size === tasks.length && tasks.length > 0}
                        onCheckedChange={toggleAllTasks}
                      />
                      <span className="flex-1">Title</span>
                      <span className="w-24 text-center">Status</span>
                      <span className="w-20 text-center">Priority</span>
                      <span className="w-32">Project</span>
                      <span className="w-32">Assignee</span>
                      <span className="w-24 text-right">Due Date</span>
                      <span className="w-10"></span>
                    </div>

                    {/* Task rows */}
                    <ScrollArea className="h-[500px]">
                      {tasks.map((task) => {
                        const StatusIcon = STATUS_ICONS[task.status] || Circle;
                        return (
                          <div
                            key={task.id}
                            className={cn(
                              "flex items-center gap-4 px-4 py-3 hover:bg-muted/50 rounded-lg transition-colors",
                              selectedTasks.has(task.id) && "bg-muted"
                            )}
                          >
                            <Checkbox
                              checked={selectedTasks.has(task.id)}
                              onCheckedChange={() => toggleTaskSelection(task.id)}
                            />
                            
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{task.title}</p>
                              {task.description && (
                                <p className="text-sm text-muted-foreground truncate">
                                  {task.description}
                                </p>
                              )}
                            </div>

                            <div className="w-24 flex justify-center">
                              <StatusIcon className={cn("h-5 w-5", STATUS_COLORS[task.status])} />
                            </div>

                            <div className="w-20 flex justify-center">
                              <Badge className={cn("capitalize", PRIORITY_COLORS[task.priority])}>
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
                                <span className="text-sm text-muted-foreground">-</span>
                              )}
                            </div>

                            <div className="w-32 truncate">
                              {task.assignee ? (
                                <span className="text-sm">{task.assignee.name}</span>
                              ) : (
                                <span className="text-sm text-muted-foreground">Unassigned</span>
                              )}
                            </div>

                            <div className="w-24 text-right">
                              {task.dueDate ? (
                                <span className="text-sm">
                                  {formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })}
                                </span>
                              ) : (
                                <span className="text-sm text-muted-foreground">-</span>
                              )}
                            </div>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEditDialog(task)}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => {
                                    setTaskToDelete(task);
                                    setDeleteDialogOpen(true);
                                  }}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        );
                      })}
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
                    <Archive className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <h3 className="mt-4 text-lg font-semibold">Trash is empty</h3>
                    <p className="text-muted-foreground mt-2">
                      Deleted items will appear here
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {trashedItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{item.title || item.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.type} - Deleted {formatDistanceToNow(new Date(item.deletedAt), { addSuffix: true })}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRestoreTask(item.id)}
                          >
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Restore
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handlePermanentDelete(item.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
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
                  <Activity className="h-5 w-5" />
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
            <AlertDialogAction onClick={handleDeleteTask}>Delete</AlertDialogAction>
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
            <AlertDialogAction onClick={handleBulkDelete}>Delete All</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
