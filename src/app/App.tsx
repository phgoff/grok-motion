import { useEffect } from "react";
import { MotionConfig } from "motion/react";
import { useRoute } from "@/app/router";
import { EditorPage } from "@/pages/EditorPage";
import { GalleryPage } from "@/pages/GalleryPage";

function Shell() {
  const [route, navigate] = useRoute();

  useEffect(() => {
    document.title = route === "editor" ? "Editor · Grok Motion" : "Grok Motion";
  }, [route]);

  return (
    <div
      className="grid grid-rows-[minmax(0,1fr)] grid-cols-[minmax(0,1fr)] h-dvh overflow-hidden max-[1080px]:h-auto max-[1080px]:min-h-dvh max-[1080px]:overflow-visible"
      data-route={route}
    >
      {route === "editor" ? (
        <EditorPage navigate={navigate} />
      ) : (
        <GalleryPage navigate={navigate} />
      )}
    </div>
  );
}

export function App() {
  return (
    <MotionConfig reducedMotion="user">
      <Shell />
    </MotionConfig>
  );
}
