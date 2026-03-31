import { type ApiAppOptions, buildHttpApp } from "../../interfaces/http/build-app.js";

export type CreateApiAppOptions = ApiAppOptions;

export async function createApiApp(options: CreateApiAppOptions = {}) {
  return buildHttpApp(options);
}
