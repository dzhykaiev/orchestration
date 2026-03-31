import { createDelegationHandler } from "../application/delegation/delegation-use-cases.js";
import type { HandleDelegationInput } from "../application/delegation/ports.js";
import { defaultDelegationDependencies } from "../infrastructure/delegation/delegation-dependencies.js";

const delegationHandler = createDelegationHandler(defaultDelegationDependencies);

export async function handleDelegation(params: HandleDelegationInput) {
  return delegationHandler(params);
}
