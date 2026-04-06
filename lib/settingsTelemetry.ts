import { FirebaseError } from "firebase/app";

type SettingsScope = "profile" | "preferences";
type SettingsAction = "load" | "save" | "reset";

export function trackSettingsFailure(
  scope: SettingsScope,
  action: SettingsAction,
  error: unknown
): void {
  const code = error instanceof FirebaseError ? error.code : "unknown";
  const message = error instanceof Error ? error.message : String(error);

  console.error("[settings-telemetry]", {
    scope,
    action,
    code,
    message,
    at: new Date().toISOString(),
  });
}
