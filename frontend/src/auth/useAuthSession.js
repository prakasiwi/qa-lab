import { useSyncExternalStore } from "react";
import { authSession } from "./authSession";

export function useAuthSession() {
  return useSyncExternalStore(
    authSession.subscribe,
    authSession.getSnapshot,
    authSession.getSnapshot,
  );
}
