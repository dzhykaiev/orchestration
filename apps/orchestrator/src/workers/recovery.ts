import { createRecoveryJobHandler } from "../application/recovery/recovery-use-cases.js";
import { defaultRecoveryDependencies } from "../infrastructure/recovery/recovery-dependencies.js";

export const handleRecoveryJob = createRecoveryJobHandler(defaultRecoveryDependencies);
