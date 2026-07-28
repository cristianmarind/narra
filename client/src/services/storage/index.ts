/**
 * Persistence of phrase lists.
 *
 * Only a local implementation exists today. When the backend lands, an
 * API-backed StorageService goes here and the provider chooses between them.
 */

export { createAsyncStorageService } from "./async-storage";
