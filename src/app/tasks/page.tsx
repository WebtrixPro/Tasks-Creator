import { TasksClient } from "./TasksClient";

export const metadata = {
  title: "Task Manager - Full CRUD",
  description: "Comprehensive task management with projects, team members, and activity tracking",
};

export default function TasksPage() {
  return <TasksClient />;
}
