/**
 * Public surface of the services layer.
 *
 * Screens and hooks should get services through `useServices()` rather than
 * importing an implementation directly, so the platform selection lives in one
 * place and tests can inject fakes via `overrides`.
 */

export { ServicesProvider, useServices } from "./provider";
export type { Services } from "./provider";

export * from "./speech";
export * from "./recognition";
export * from "./storage";
export * from "./ads";
export * from "./fullscreen-ads";
