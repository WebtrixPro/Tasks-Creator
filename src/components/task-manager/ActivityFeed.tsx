"use client";

import { useActivity } from "@/hooks/use-task-api";
import { formatDistanceToNow } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ClockIcon, PlusIcon, PencilIcon, TrashIcon, RefreshIcon, UserIcon } from "@/components/ui/icons";

interface ActivityFeedProps {
  projectId?: string;
  entityType?: string;
  entityId?: string;
  limit?: number;
  className?: string;
}

const ACTION_COLORS: Record<string, string> = {
  created: "bg-[var(--success)]/15 text-[var(--success)]",
  updated: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  deleted: "bg-[var(--destructive)]/15 text-[var(--destructive)]",
  restored: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  member_added: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  member_removed: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  project_created: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  comment_added: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  status_changed: "bg-[var(--warning)]/15 text-[var(--warning)]",
  assigned: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  unassigned: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
};

function getActionIcon(action: string) {
  switch (action) {
    case "created":
    case "project_created":
      return PlusIcon;
    case "updated":
    case "status_changed":
      return PencilIcon;
    case "deleted":
      return TrashIcon;
    case "restored":
      return RefreshIcon;
    case "member_added":
    case "member_removed":
    case "assigned":
    case "unassigned":
      return UserIcon;
    default:
      return ClockIcon;
  }
}

function formatActivityMessage(activity: {
  action: string;
  entityType: string;
  metadata?: Record<string, unknown> | null;
  actor?: { name: string } | null;
}): string {
  const actorName = activity.actor?.name || "Someone";
  const entityName = activity.entityType.toLowerCase();
  const metadata = activity.metadata as Record<string, unknown> | undefined;

  switch (activity.action) {
    case "created":
      return `${actorName} created a new ${entityName}`;
    case "updated":
      if (metadata?.changes) {
        const changes = Object.keys(metadata.changes as Record<string, unknown>);
        return `${actorName} updated ${changes.join(", ")} on ${entityName}`;
      }
      return `${actorName} updated the ${entityName}`;
    case "deleted":
      return `${actorName} deleted a ${entityName}`;
    case "restored":
      return `${actorName} restored a ${entityName}`;
    case "member_added":
      return `${actorName} added a member to the project`;
    case "member_removed":
      return `${actorName} removed a member from the project`;
    case "comment_added":
      return `${actorName} added a comment`;
    case "status_changed":
      if (metadata?.from && metadata?.to) {
        return `${actorName} changed status from ${metadata.from} to ${metadata.to}`;
      }
      return `${actorName} changed the status`;
    case "assigned":
      return `${actorName} assigned the task`;
    case "unassigned":
      return `${actorName} unassigned the task`;
    default:
      return `${actorName} performed ${activity.action} on ${entityName}`;
  }
}

export function ActivityFeed({
  projectId,
  entityType,
  entityId,
  limit = 50,
  className = "",
}: ActivityFeedProps) {
  const { activities, isLoading, error } = useActivity({
    projectId,
    entityType,
    entityId,
    limit,
  });

  if (isLoading) {
    return (
      <div className={`space-y-4 p-4 ${className}`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 animate-pulse">
            <div className="h-8 w-8 rounded-full bg-[var(--secondary)]" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 rounded bg-[var(--secondary)]" />
              <div className="h-3 w-1/4 rounded bg-[var(--secondary)]" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 text-center text-[var(--muted-foreground)] ${className}`}>
        Failed to load activity feed
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className={`p-8 text-center ${className}`}>
        <ClockIcon className="mx-auto h-12 w-12 text-[var(--muted-foreground)] opacity-50" />
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">No activity yet</p>
      </div>
    );
  }

  return (
    <ScrollArea className={`h-[400px] ${className}`}>
      <div className="space-y-4 p-4">
        {activities.map((activity) => {
          const IconComponent = getActionIcon(activity.action);
          const colorClass = ACTION_COLORS[activity.action] || "bg-[var(--secondary)] text-[var(--muted-foreground)]";

          return (
            <div key={activity.id} className="flex items-start gap-3">
              <div className={`rounded-full p-2 ${colorClass}`}>
                <IconComponent className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm">
                  {formatActivityMessage(activity)}
                </p>
                <p className="text-xs text-[var(--muted-foreground)] mt-1">
                  {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
