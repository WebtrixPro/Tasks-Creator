"use client";

import { useCallback, useState } from "react";
import useSWR, { mutate } from "swr";

// Types
export type Task = {
  id: string;
  ticketNumber: number;
  title: string;
  userStory: string;
  description: string;
  acceptanceCriteria: string;
  estimate: string;
  priority: string;
  status: string;
  position: number;
  startDate: string | null;
  endDate: string | null;
  dueDate: string | null;
  projectId: string | null;
  columnId: string | null;
  assigneeId: string | null;
  creatorId: string | null;
  syncStatus: string;
  basecampCardId: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  project?: { id: string; name: string; color: string } | null;
  column?: { id: string; name: string; color: string } | null;
  assignee?: { id: string; name: string; email: string; avatarUrl: string | null } | null;
  creator?: { id: string; name: string } | null;
  _count?: { comments: number };
};

export type Project = {
  id: string;
  name: string;
  description: string | null;
  color: string;
  basecampProjectId: string | null;
  isArchived: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  members?: ProjectMember[];
  columns?: Column[];
  _count?: { tasks: number; activities: number };
};

export type Column = {
  id: string;
  name: string;
  position: number;
  color: string | null;
  projectId: string;
  deletedAt: string | null;
  _count?: { tasks: number };
};

export type TeamMember = {
  id: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  role: string;
  basecampPersonId: string | null;
  deletedAt: string | null;
  projectMemberships?: ProjectMember[];
  _count?: { assignedTasks: number; createdTasks: number };
};

export type ProjectMember = {
  id: string;
  projectId: string;
  memberId: string;
  role: string;
  joinedAt: string;
  project?: { id: string; name: string; color: string };
  member?: TeamMember;
};

export type TaskComment = {
  id: string;
  content: string;
  taskId: string;
  authorId: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  author?: { id: string; name: string; avatarUrl: string | null } | null;
};

export type Activity = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  projectId: string | null;
  actorId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actor?: { id: string; name: string; avatarUrl: string | null } | null;
  project?: { id: string; name: string; color: string } | null;
};

export type PaginatedResponse<T> = {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
};

// Fetcher
const fetcher = async <T>(url: string): Promise<T> => {
  const res = await fetch(url);
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || "Request failed");
  }
  return res.json();
};

// Task Hooks
export function useTasks(params?: {
  page?: number;
  limit?: number;
  projectId?: string;
  columnId?: string;
  assigneeId?: string;
  status?: string;
  priority?: string;
  search?: string;
  overdue?: boolean;
  includeDeleted?: boolean;
}) {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.projectId) searchParams.set("projectId", params.projectId);
  if (params?.columnId) searchParams.set("columnId", params.columnId);
  if (params?.assigneeId) searchParams.set("assigneeId", params.assigneeId);
  if (params?.status) searchParams.set("status", params.status);
  if (params?.priority) searchParams.set("priority", params.priority);
  if (params?.search) searchParams.set("search", params.search);
  if (params?.overdue) searchParams.set("overdue", "true");
  if (params?.includeDeleted) searchParams.set("includeDeleted", "true");

  const url = `/api/v2/tasks?${searchParams.toString()}`;
  return useSWR<PaginatedResponse<Task>>(url, fetcher);
}

export function useTask(taskId: string | null) {
  return useSWR<{ data: Task; activity?: Activity[] }>(
    taskId ? `/api/v2/tasks/${taskId}?includeComments=true&includeActivity=true` : null,
    fetcher
  );
}

export function useTaskMutations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createTask = useCallback(async (data: Partial<Task>) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v2/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      await mutate((key) => typeof key === "string" && key.startsWith("/api/v2/tasks"));
      return result.data as Task;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to create task";
      setError(message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateTask = useCallback(async (taskId: string, data: Partial<Task>) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v2/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      await mutate((key) => typeof key === "string" && key.startsWith("/api/v2/tasks"));
      return result.data as Task;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to update task";
      setError(message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteTask = useCallback(async (taskId: string, permanent = false) => {
    setLoading(true);
    setError(null);
    try {
      const url = permanent ? `/api/v2/tasks/${taskId}?permanent=true` : `/api/v2/tasks/${taskId}`;
      const res = await fetch(url, { method: "DELETE" });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      await mutate((key) => typeof key === "string" && key.startsWith("/api/v2/tasks"));
      return result;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to delete task";
      setError(message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const restoreTask = useCallback(async (taskId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v2/tasks/${taskId}/restore`, {
        method: "POST",
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      await mutate((key) => typeof key === "string" && key.startsWith("/api/v2/tasks"));
      return result.data as Task;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to restore task";
      setError(message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const bulkOperation = useCallback(async (
    action: string,
    taskIds: string[],
    additionalData?: Record<string, unknown>
  ) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v2/tasks/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, taskIds, ...additionalData }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      await mutate((key) => typeof key === "string" && key.startsWith("/api/v2/tasks"));
      return result;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to perform bulk operation";
      setError(message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    createTask,
    updateTask,
    deleteTask,
    restoreTask,
    bulkOperation,
    loading,
    error,
    clearError: () => setError(null),
  };
}

// Project Hooks
export function useProjects(params?: {
  page?: number;
  limit?: number;
  search?: string;
  isArchived?: boolean;
  includeDeleted?: boolean;
}) {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.search) searchParams.set("search", params.search);
  if (params?.isArchived !== undefined) searchParams.set("isArchived", String(params.isArchived));
  if (params?.includeDeleted) searchParams.set("includeDeleted", "true");

  const url = `/api/v2/projects?${searchParams.toString()}`;
  return useSWR<PaginatedResponse<Project>>(url, fetcher);
}

export function useProject(projectId: string | null) {
  return useSWR<{ data: Project; stats?: Record<string, unknown> }>(
    projectId ? `/api/v2/projects/${projectId}?includeStats=true` : null,
    fetcher
  );
}

export function useProjectMutations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createProject = useCallback(async (data: Partial<Project> & { memberIds?: string[] }) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v2/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      await mutate((key) => typeof key === "string" && key.startsWith("/api/v2/projects"));
      return result.data as Project;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to create project";
      setError(message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProject = useCallback(async (projectId: string, data: Partial<Project>) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v2/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      await mutate((key) => typeof key === "string" && key.startsWith("/api/v2/projects"));
      return result.data as Project;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to update project";
      setError(message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteProject = useCallback(async (projectId: string, permanent = false) => {
    setLoading(true);
    setError(null);
    try {
      const url = permanent ? `/api/v2/projects/${projectId}?permanent=true` : `/api/v2/projects/${projectId}`;
      const res = await fetch(url, { method: "DELETE" });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      await mutate((key) => typeof key === "string" && key.startsWith("/api/v2/projects"));
      return result;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to delete project";
      setError(message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const restoreProject = useCallback(async (projectId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v2/projects/${projectId}/restore`, {
        method: "POST",
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      await mutate((key) => typeof key === "string" && key.startsWith("/api/v2/projects"));
      return result.data as Project;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to restore project";
      setError(message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    createProject,
    updateProject,
    deleteProject,
    restoreProject,
    loading,
    error,
    clearError: () => setError(null),
  };
}

// Team Member Hooks
export function useTeamMembers(params?: {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  projectId?: string;
  includeDeleted?: boolean;
}) {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.search) searchParams.set("search", params.search);
  if (params?.role) searchParams.set("role", params.role);
  if (params?.projectId) searchParams.set("projectId", params.projectId);
  if (params?.includeDeleted) searchParams.set("includeDeleted", "true");

  const url = `/api/v2/members?${searchParams.toString()}`;
  return useSWR<PaginatedResponse<TeamMember>>(url, fetcher);
}

export function useTeamMemberMutations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createMember = useCallback(async (data: Partial<TeamMember> & { projectIds?: string[] }) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v2/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      await mutate((key) => typeof key === "string" && key.startsWith("/api/v2/members"));
      return result.data as TeamMember;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to create member";
      setError(message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateMember = useCallback(async (memberId: string, data: Partial<TeamMember>) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v2/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      await mutate((key) => typeof key === "string" && key.startsWith("/api/v2/members"));
      return result.data as TeamMember;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to update member";
      setError(message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteMember = useCallback(async (memberId: string, permanent = false) => {
    setLoading(true);
    setError(null);
    try {
      const url = permanent ? `/api/v2/members/${memberId}?permanent=true` : `/api/v2/members/${memberId}`;
      const res = await fetch(url, { method: "DELETE" });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      await mutate((key) => typeof key === "string" && key.startsWith("/api/v2/members"));
      return result;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to delete member";
      setError(message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    createMember,
    updateMember,
    deleteMember,
    loading,
    error,
    clearError: () => setError(null),
  };
}

// Activity Hook
export function useActivity(params?: {
  page?: number;
  limit?: number;
  projectId?: string;
  entityType?: string;
  entityId?: string;
  actorId?: string;
}) {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.projectId) searchParams.set("projectId", params.projectId);
  if (params?.entityType) searchParams.set("entityType", params.entityType);
  if (params?.entityId) searchParams.set("entityId", params.entityId);
  if (params?.actorId) searchParams.set("actorId", params.actorId);

  const url = `/api/v2/activity?${searchParams.toString()}`;
  return useSWR<PaginatedResponse<Activity>>(url, fetcher);
}

// Stats Hook
export function useStats(projectId?: string) {
  const url = projectId ? `/api/v2/stats?projectId=${projectId}` : "/api/v2/stats";
  return useSWR<{ data: Record<string, unknown> }>(url, fetcher);
}

// Trash Hook
export function useTrash(type?: string) {
  const url = type ? `/api/v2/trash?type=${type}` : "/api/v2/trash";
  return useSWR<{ data: Record<string, unknown[]>; counts: Record<string, number> }>(url, fetcher);
}

// Task Comments Hooks
export function useTaskComments(taskId: string | null) {
  return useSWR<{ data: TaskComment[] }>(
    taskId ? `/api/v2/tasks/${taskId}/comments` : null,
    fetcher
  );
}

export function useCommentMutations(taskId: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addComment = useCallback(async (content: string, authorId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v2/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, authorId }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      await mutate(`/api/v2/tasks/${taskId}/comments`);
      return result.data as TaskComment;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to add comment";
      setError(message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  const updateComment = useCallback(async (commentId: string, content: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v2/tasks/${taskId}/comments/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      await mutate(`/api/v2/tasks/${taskId}/comments`);
      return result.data as TaskComment;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to update comment";
      setError(message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  const deleteComment = useCallback(async (commentId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v2/tasks/${taskId}/comments/${commentId}`, {
        method: "DELETE",
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      await mutate(`/api/v2/tasks/${taskId}/comments`);
      return result;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to delete comment";
      setError(message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  return {
    addComment,
    updateComment,
    deleteComment,
    loading,
    error,
    clearError: () => setError(null),
  };
}
