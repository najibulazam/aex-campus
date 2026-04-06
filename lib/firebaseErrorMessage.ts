import { FirebaseError } from "firebase/app";

export function getFirebaseErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof FirebaseError) {
    if (error.code === "permission-denied") {
      return "Missing permission for this settings action. Re-login and ensure Firestore rules are deployed.";
    }

    if (error.code === "unauthenticated") {
      return "You must be signed in to change settings.";
    }

    if (error.code === "unavailable") {
      return "Firestore is currently unavailable. Please try again.";
    }

    if (error.message.trim()) {
      return error.message;
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}
