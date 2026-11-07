import { useEffect, useRef } from "react";
import { BrandMark } from "@/components/BrandMark";
import type { Route } from "@/app/router";

const TABS: readonly { id: Route; label: string }[] = [{ id: "editor", label: "Editor" }];

export function TopBar({ route, navigate }: { route: Route; navigate: (next: Route) => void }) {
  const header = useRef<HTMLElement>(null);

  useEffect(() => {
    const update = () => {
      const scrollEl = document.querySelector("main");
      const scrollTop =
        (scrollEl?.scrollTop ?? 0) || window.scrollY || document.documentElement.scrollTop || 0;
      header.current?.toggleAttribute("data-floating", scrollTop > 16);
    };
    update();
    document.addEventListener("scroll", update, { capture: true, passive: true });
    return () => document.removeEventListener("scroll", update, { capture: true });
  }, [route]);

  return (
    <header
      ref={header}
      className="topbar-noise [view-transition-name:app-topbar] fixed inset-x-0 top-4 max-[640px]:top-3 mx-auto w-[calc(100%-64px)] max-[640px]:w-[calc(100%-24px)] max-w-[1440px] h-14 px-2.5 max-[640px]:px-2 rounded-lg bg-transparent isolate z-50 grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 max-[640px]:gap-x-2 items-center border border-transparent data-[floating]:border-line/60 data-[floating]:shadow-[0_4px_24px_rgba(0,0,0,0.24)] data-[floating]:backdrop-blur-[24px] transition-[border-color,box-shadow,backdrop-filter] duration-200"
      data-route={route}
    >
      <button
        type="button"
        className="group justify-self-start flex items-center min-w-0 p-1 rounded-[10px] text-left cursor-pointer transition-transform duration-150 hover:scale-105 active:scale-95"
        aria-label="Gallery"
        onClick={() => navigate("gallery")}
      >
        <span className="relative grid place-items-center shrink-0 w-9 h-9 max-[640px]:w-8 max-[640px]:h-8">
          <BrandMark />
        </span>
      </button>
      <nav className="relative justify-self-center flex h-9" aria-label="Pages">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            data-active={tab.id === route}
            aria-current={tab.id === route ? "page" : undefined}
            className="relative z-[1] w-[92px] max-[640px]:w-[68px] h-full p-0 text-muted hover:text-foreground data-[active=true]:text-foreground data-[active=true]:font-semibold text-[13px] max-[640px]:text-[12.5px] font-medium tracking-[0.005em] transition-colors duration-120 ease-linear focus-visible:rounded-lg focus-visible:outline-offset-[-3px]"
            onClick={() => navigate(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </header>
  );
}
