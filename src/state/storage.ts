import type { AppState } from "../core/types";
import { createDefaultState } from "./defaults";
import { parseStateText } from "./schema";

export const STORAGE_KEY = "feier.state";
export const BACKUP_KEY = "feier.state.backup";
export const CALENDARS_PANEL_KEY = "feier.calendarsPanel.open";

/** Keys from before the rename to Feier, mapped to the keys that replace them. */
const LEGACY_KEYS: [string, string][] = [
  ["los-feier.state", STORAGE_KEY],
  ["los-feier.state.backup", BACKUP_KEY],
  ["los-feier.calendarsPanel.open", CALENDARS_PANEL_KEY],
];

/** Moves each old los-feier value to its new key once; a value already under the new key wins. */
function migrateLegacyKeys(storage: Storage): void {
  for (const [oldKey, newKey] of LEGACY_KEYS) {
    try {
      const value = storage.getItem(oldKey);
      if (value === null) continue;
      if (storage.getItem(newKey) === null) storage.setItem(newKey, value);
      storage.removeItem(oldKey);
    } catch {
      // Best effort: if storage refuses, the old key stays and we try again next time.
    }
  }
}

/** localStorage if it can actually be written, otherwise null (private mode, blocked, …). */
export function getStorage(): Storage | null {
  try {
    const storage = window.localStorage;
    const probe = "__holidays_probe__";
    storage.setItem(probe, "1");
    storage.removeItem(probe);
    return storage;
  } catch {
    return null;
  }
}

export function loadState(storage: Storage | null): { state: AppState; recoveredBackup: string | null } {
  const fresh = { state: createDefaultState(), recoveredBackup: null };
  if (!storage) return fresh;
  migrateLegacyKeys(storage);
  let raw: string | null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return fresh;
  }
  if (raw === null) return fresh;
  const parsed = parseStateText(raw);
  if (parsed.ok) return { state: parsed.state, recoveredBackup: null };
  try {
    storage.setItem(BACKUP_KEY, raw);
  } catch {
    // Keeping the backup is best effort; the user can still download it from the banner.
  }
  return { state: createDefaultState(), recoveredBackup: raw };
}

export function saveState(storage: Storage | null, state: AppState): boolean {
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
