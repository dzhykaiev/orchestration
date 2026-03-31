import { escalationRepo } from "@orchestration/db";
import type { EscalationsDependencies } from "../../application/escalations/ports.js";

export const defaultEscalationsDependencies: EscalationsDependencies = {
  escalationRepo,
};
