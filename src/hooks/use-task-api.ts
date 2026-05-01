"use client";

import { useCallback, useState } from "react";
import useSWR, { mutate as swrMutate } from "swr";

// Fetcher
const fetcher = async <T>(url: string): Promise<T> => {
  const res = await fetch(url);
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || "Request failed");
  }
  return res.json();
};

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
};

export type TeamMember = {
  id: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  role: string;
  deletedAt: string | null;
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

type PaginatedResponse<T> = {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
};

// ===== TASKS HOOK =====
export function useTasks(params?: {
  page?: number;
  limit?: number;
  projectId?: string;
  assigneeId?: string;
  status?: string;
  priority?: string;
  search?: string;
}) {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.projectId) searchParams.set("projectId", params.projectId);
  if (params?.assigneeId) searchParams.set("assigneeId", params.assigneeId);
  if (params?.status) searchParams.set("status", params.status);
  if (params?.priority) searchParams.set("priority", params.priority);
  if (params?.search) searchParams.set("search", params.search);

  const url = `/api/v2/tasks?${searchParams.toString()}`;
  const { data, error, isLoading, mutate } = useSWR<PaginatedResponse<Task>>(url, fetcher);

  const createTask = useCallback(async (taskData: Partial<Task>) => {
    const res = await fetch("/api/v2/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(taskData),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error);
    await mutate();
    return result.data as Task;
  }, [mutate]);

  const updateTask = useCallback(async (taskId: string, taskData: Partial<Task>) => {
    const res = await fetch(`/api/v2/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(taskData),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error);
    await mutate();
    return result.data as Task;
  }, [mutate]);

  const deleteTask = useCallback(async (taskId: string) => {
    const res = await fetch(`/api/v2/tasks/${taskId}`, { method: "DELETE" });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error);
    await mutate();
    return result;
  }, [mutate]);

  const bulkDelete = useCallback(async (taskIds: string[]) => {
    const res = await fetch("/api/v2/tasks/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", taskIds }),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error);
    await mutate();
    return result;
  }, [mutate]);

  const bulkUpdate = useCallback(async (taskIds: string[], updates: Partial<Task>) => {
    const res = await fetch("/api/v2/tasks/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", taskIds, updates }),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error);
    await mutate();
    return result;
  }, [mutate]);

  return {
    tasks: data?.data || [],
    pagination: data?.pagination || null,
    isLoading,
    error,
    createTask,
    updateTask,
    deleteTask,
    bulkDelete,
    bulkUpdate,
    mutate,
  };
}

// ===== PROJECTS HOOK =====
export function useProjects(params?: { search?: string }) {
  const searchParams = new URLSearchParams();
  if (params?.search) searchParams.set("search", params.search);

  const url = `/api/v2/projects?${searchParams.toString()}`;
  const { data, error, isLoading, mutate } = useSWR<PaginatedResponse<Project>>(url, fetcher);

  return {
    projects: data?.data || [],
    pagination: data?.pagination || null,
    isLoading,
    error,
    mutate,
  };
}

// ===== MEMBERS HOOK =====
export function useMembers(params?: { search?: string; projectId?: string }) {
  const searchParams = new URLSearchParams();
  if (params?.search) searchParams.set("search", params.search);
  if (params?.projectId) searchParams.set("projectId", params.projectId);

  const url = `/api/v2/members?${searchParams.toString()}`;
  const { data, error, isLoading, mutate } = useSWR<PaginatedResponse<TeamMember>>(url, fetcher);

  return {
    members: data?.data || [],
    pagination: data?.pagination || null,
    isLoading,
    error,
    mutate,
  };
}

// ===== STATS HOOK =====
export function useStats(projectId?: string) {
  const url = projectId ? `/api/v2/stats?projectId=${projectId}` : "/api/v2/stats";
  const { data, error, isLoading } = useSWR<{ data: {
    tasks?: { total: number; completed: number; inProgress: number; overdue: number };
    projects?: { total: number; active: number };
    members?: { total: number; active: number };
  }}>(url, fetcher);

  return {
    stats: data?.data || null,
    isLoading,
    error,
  };
}

// ===== ACTIVITY HOOK =====
export function useActivity(params?: {
  projectId?: string;
  entityType?: string;
  entityId?: string;
  limit?: number;
}) {
  const searchParams = new URLSearchParams();
  if (params?.projectId) searchParams.set("projectId", params.projectId);
  if (params?.entityType) searchParams.set("entityType", params.entityType);
  if (params?.entityId) searchParams.set("entityId", params.entityId);
  if (params?.limit) searchParams.set("limit", String(params.limit));

  const url = `/api/v2/activity?${searchParams.toString()}`;
  const { data, error, isLoading } = useSWR<PaginatedResponse<Activity>>(url, fetcher);

  return {
    activities: data?.data || [],
    isLoading,
    error,
  };
}

// ===== TRASH HOOK =====
type TrashedItem = {
  id: string;
  type: "task" | "project" | "member";
  title?: string;
  name?: string;
  deletedAt: string;
};

export function useTrash(type?: string) {
  const url = type ? `/api/v2/trash?type=${type}` : "/api/v2/trash";
  const { data, error, isLoading, mutate } = useSWR<{ data: { tasks?: TrashedItem[]; projects?: TrashedItem[]; members?: TrashedItem[] }}>(url, fetcher);

  const trashedItems: TrashedItem[] = [];
  if (data?.data) {
    if (data.data.tasks) {
      trashedItems.push(...data.data.tasks.map(t => ({ ...t, type: "task" as const })));
    }
    if (data.data.projects) {
      trashedItems.push(...data.data.projects.map(p => ({ ...p, type: "project" as const })));
    }
    if (data.data.members) {
      trashedItems.push(...data.data.members.map(m => ({ ...m, type: "member" as const })));
    }
  }

  const restoreItem = useCallback(async (type: string, id: string) => {
    const res = await fetch(`/api/v2/trash/restore`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, id }),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error);
    await mutate();
    return result;
  }, [mutate]);

  const permanentDelete = useCallback(async (type: string, id: string) => {
    const res = await fetch(`/api/v2/trash/${type}/${id}`, { method: "DELETE" });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error);
    await mutate();
    return result;
  }, [mutate]);

  const emptyTrash = useCallback(async (type?: string) => {
    const url = type ? `/api/v2/trash/empty?type=${type}` : "/api/v2/trash/empty";
    const res = await fetch(url, { method: "POST" });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error);
    await mutate();
    return result;
  }, [mutate]);

  return {
    trashedItems,
    isLoading,
    error,
    restoreItem,
    permanentDelete,
    emptyTrash,
    mutate,
  };
}

// ===== BASECAMP HOOKS =====
export function useBasecampStatus() {
  const { data, error, isLoading, mutate } = useSWR<{ connected: boolean; accountId?: string }>(
    "/api/basecamp/status",
    fetcher
  );

  return {
    connected: data?.connected ?? false,
    accountId: data?.accountId,
    isLoading,
    error,
    mutate,
  };
}

export type BasecampProject = {
  id: number;
  name: string;
  description: string;
  app_url: string;
  dock: Array<{
    id: number;
    title: string;
    name: string;
    enabled: boolean;
    url: string;
  }>;
};

export type BasecampPerson = {
  id: number;
  name: string;
  email_address: string;
  avatar_url: string;
};

export function useBasecampProjects() {
  const { connected } = useBasecampStatus();
  const { data, error, isLoading, mutate } = useSWR<BasecampProject[]>(
    connected ? "/api/basecamp/projects" : null,
    fetcher
  );

  return {
    projects: data || [],
    isLoading,
    error,
    mutate,
  };
}

export function useBasecampPeople(projectId: string | null) {
  const { connected } = useBasecampStatus();
  const { data, error, isLoading } = useSWR<BasecampPerson[]>(
    connected && projectId ? `/api/basecamp/projects/${projectId}/people` : null,
    fetcher
  );

  return {
    people: data || [],
    isLoading,
    error,
  };
}

export function useBasecampColumns(projectId: string | null) {
  const { connected } = useBasecampStatus();
  const { data, error, isLoading } = useSWR<{ id: string; title: string }[]>(
    connected && projectId ? `/api/basecamp/projects/${projectId}/columns` : null,
    fetcher
  );

  return {
    columns: data || [],
    isLoading,
    error,
  };
}

export function useSyncTask() {
  const syncTask = useCallback(async (
    taskId: string,
    options: { columnListId: string; bucketId: string; assigneeId?: string }
  ) => {
    const res = await fetch(`/api/tasks/${taskId}/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(options),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error);
    return result;
  }, []);

  return { syncTask };
}

export function useImportFromBasecamp() {
  const importProjects = useCallback(async () => {
    const res = await fetch("/api/v2/projects/import-basecamp", { method: "POST" });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error);
    swrMutate((key) => typeof key === "string" && key.startsWith("/api/v2/projects"));
    return result;
  }, []);

  const importMembers = useCallback(async (projectId: string) => {
    const res = await fetch(`/api/v2/members/import-basecamp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId }),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error);
    swrMutate((key) => typeof key === "string" && key.startsWith("/api/v2/members"));
    return result;
  }, []);

  return { importProjects, importMembers };
}
