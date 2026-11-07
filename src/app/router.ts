import { useCallback, useEffect, useState } from "react";
import { flushSync } from "react-dom";

export type Route = "gallery" | "editor";

export function parseRoute(pathname: string, base = "/"): Route {
  const relative =
    base !== "/" && pathname.startsWith(base) ? `/${pathname.slice(base.length)}` : pathname;
  const path = relative.replace(/\/+$/, "") || "/";
  return path === "/editor" ? "editor" : "gallery";
}

export function hrefFor(route: Route): string {
  const base = import.meta.env.BASE_URL;
  return route === "editor" ? `${base}editor` : base;
}

function readRoute(): Route {
  return parseRoute(window.location.pathname, import.meta.env.BASE_URL);
}

/**
 * Routes use clean paths. No router dependency, and the swap inside a view
 * transition runs on the compositor so the page crossfades instead of
 * flashing white.
 */
export function useRoute(): [Route, (next: Route) => void] {
  const [route, setRoute] = useState<Route>(readRoute);

  useEffect(() => {
    const sync = () => {
      const next = readRoute();
      setRoute((curr) => {
        if (curr === next) return curr;
        if (
          typeof document.startViewTransition === "function" &&
          !matchMedia("(prefers-reduced-motion: reduce)").matches
        ) {
          const transition = document.startViewTransition(() => {
            flushSync(() => setRoute(next));
          });
          // A new navigation can skip a snapshot before it is ready.
          void transition.ready.catch(() => {});
          return curr;
        }
        return next;
      });
    };
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  const navigate = useCallback((next: Route) => {
    if (next === readRoute()) return;
    const swap = () => {
      flushSync(() => setRoute(next));
      window.history.pushState(null, "", hrefFor(next));
    };
    if (
      typeof document.startViewTransition === "function" &&
      !matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      const transition = document.startViewTransition(swap);
      void transition.ready.catch(() => {});
      return;
    }
    swap();
  }, []);

  return [route, navigate];
}
