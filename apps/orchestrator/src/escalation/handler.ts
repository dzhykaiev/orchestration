import {
  createEscalationHandler,
  detectEscalation,
} from "../application/escalation/escalation-use-cases.js";
import { defaultEscalationDependencies } from "../infrastructure/escalation/escalation-dependencies.js";

const escalationHandler = createEscalationHandler(defaultEscalationDependencies);

export { detectEscalation };

export async function handleEscalation(taskId: string, projectId: string, output: string) {
  return escalationHandler(taskId, projectId, output);
}
