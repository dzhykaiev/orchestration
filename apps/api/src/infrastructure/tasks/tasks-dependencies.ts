import { projectRepo, taskRepo } from "@orchestration/db";
import type { TasksDependencies } from "../../application/tasks/ports.js";

export const defaultTasksDependencies: TasksDependencies = {
  taskRepo,
  projectRepo,
};
