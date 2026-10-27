import { profile } from "../api/authApi";
import { createAuthSession } from "./createAuthSession";

export const authSession = createAuthSession(profile);

if (typeof window !== "undefined") {
  const listenerKey = "__qaLabUnauthorizedListener";
  const previousListener = window[listenerKey];
  if (previousListener)
    window.removeEventListener("auth:unauthorized", previousListener);
  const unauthorizedListener = () => authSession.clear();
  window[listenerKey] = unauthorizedListener;
  window.addEventListener("auth:unauthorized", unauthorizedListener);
  import.meta.hot?.dispose(() => {
    window.removeEventListener("auth:unauthorized", unauthorizedListener);
    if (window[listenerKey] === unauthorizedListener)
      delete window[listenerKey];
  });
}
