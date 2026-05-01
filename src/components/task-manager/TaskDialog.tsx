"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogBody } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { Task, CreateTaskInput, UpdateTaskInput, Project, TeamMember } from "@/types/task";

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;
  projects: Project[];
  members: TeamMember[];
  onSubmit: (data: CreateTaskInput | UpdateTaskInput) => Promise<void>;
  mode: "create" | "edit";
}

const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "review", label: "In Review" },
  { value: "completed", label: "Completed" },
  { value: "blocked", label: "Blocked" },
];

export function TaskDialog({
  open,
  onOpenChange,
  task,
  projects,
  members,
  onSubmit,
  mode,
}: TaskDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    userStory: "",
    acceptanceCriteria: "",
    priority: "medium",
    status: "pending",
    estimate: "",
    projectId: "",
    assigneeId: "",
    dueDate: "",
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    if (task && mode === "edit") {
      setFormData({
        title: task.title || "",
        description: task.description || "",
        userStory: task.userStory || "",
        acceptanceCriteria: task.acceptanceCriteria || "",
        priority: task.priority || "medium",
        status: task.status || "pending",
        estimate: task.estimate || "",
        projectId: task.projectId || "",
        assigneeId: task.assigneeId || "",
        dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : "",
        startDate: task.startDate ? new Date(task.startDate).toISOString().split("T")[0] : "",
        endDate: task.endDate ? new Date(task.endDate).toISOString().split("T")[0] : "",
      });
    } else if (mode === "create") {
      setFormData({
        title: "",
        description: "",
        userStory: "",
        acceptanceCriteria: "",
        priority: "medium",
        status: "pending",
        estimate: "",
        projectId: projects[0]?.id || "",
        assigneeId: "",
        dueDate: "",
        startDate: "",
        endDate: "",
      });
    }
  }, [task, mode, open, projects]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const submitData: CreateTaskInput | UpdateTaskInput = {
        title: formData.title,
        description: formData.description || undefined,
        userStory: formData.userStory || undefined,
        acceptanceCriteria: formData.acceptanceCriteria || undefined,
        priority: formData.priority,
        status: formData.status,
        estimate: formData.estimate || undefined,
        projectId: formData.projectId || undefined,
        assigneeId: formData.assigneeId || undefined,
        dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : undefined,
        startDate: formData.startDate ? new Date(formData.startDate).toISOString() : undefined,
        endDate: formData.endDate ? new Date(formData.endDate).toISOString() : undefined,
      };

      await onSubmit(submitData);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to submit task:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const projectOptions = [
    { value: "", label: "No Project" },
    ...projects.map((p) => ({ value: p.id, label: p.name })),
  ];

  const memberOptions = [
    { value: "", label: "Unassigned" },
    ...members.map((m) => ({ value: m.id, label: m.name })),
  ];

  return (
    <Dialog open={open} onClose={() => onOpenChange(false)}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Create New Task" : "Edit Task"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <DialogBody className="space-y-6 max-h-[60vh] overflow-y-auto">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title" required>Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter task title"
                required
              />
            </div>

            {/* Project & Assignee Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="project">Project</Label>
                <Select
                  value={formData.projectId}
                  onValueChange={(value) => setFormData({ ...formData, projectId: value })}
                  options={projectOptions}
                  placeholder="Select project"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="assignee">Assignee</Label>
                <Select
                  value={formData.assigneeId}
                  onValueChange={(value) => setFormData({ ...formData, assigneeId: value })}
                  options={memberOptions}
                  placeholder="Select assignee"
                />
              </div>
            </div>

            {/* Priority & Status Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value })}
                  options={PRIORITIES}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                  options={STATUSES}
                />
              </div>
            </div>

            {/* Estimate */}
            <div className="space-y-2">
              <Label htmlFor="estimate">Estimate</Label>
              <Input
                id="estimate"
                value={formData.estimate}
                onChange={(e) => setFormData({ ...formData, estimate: e.target.value })}
                placeholder="e.g., 2h, 1d, 3 points"
              />
            </div>

            {/* Dates Row */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>

            {/* User Story */}
            <div className="space-y-2">
              <Label htmlFor="userStory">User Story</Label>
              <Textarea
                id="userStory"
                value={formData.userStory}
                onChange={(e) => setFormData({ ...formData, userStory: e.target.value })}
                placeholder="As a [user], I want [goal] so that [benefit]"
                rows={2}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detailed description of the task"
                rows={3}
              />
            </div>

            {/* Acceptance Criteria */}
            <div className="space-y-2">
              <Label htmlFor="acceptanceCriteria">Acceptance Criteria</Label>
              <Textarea
                id="acceptanceCriteria"
                value={formData.acceptanceCriteria}
                onChange={(e) => setFormData({ ...formData, acceptanceCriteria: e.target.value })}
                placeholder="List the criteria that must be met for this task to be considered complete"
                rows={3}
              />
            </div>
          </DialogBody>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !formData.title.trim()} isLoading={isSubmitting}>
              {mode === "create" ? "Create Task" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
