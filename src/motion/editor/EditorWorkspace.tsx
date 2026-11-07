import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Clock,
  Copy,
  Download,
  Layers,
  Magnet,
  Pause,
  Play,
  Plus,
  Redo2,
  SkipBack,
  Sliders,
  Diamond,
  Trash2,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import type { MascotDesign } from "@/mascot/design";
import { cn } from "@/lib/utils";
import { fontWeights } from "@/lib/font-weight";
import { typeClass } from "@/lib/type-scale";
import { ScrubberInput } from "./ScrubberInput";
import {
  TRACKS,
  type Clip,
  type Ease,
  type ExpressionKeyframe,
  type NumericKeyframe,
  type NumericTrack,
  type Recipes,
  type RecipeState,
} from "@/motion/model/types";
import { clipLabel, stateLabel } from "@/motion/model/program";
import { MascotRuntime, type MascotRuntimeHandle } from "@/motion/ui/MascotRuntime";
import { StageToggle } from "@/motion/ui/StageToggle";
import { stageDesignFor, type StageTheme } from "@/motion/model/stageTheme";
import type { BodyShape } from "@/mascot/geometry";
import { EaseCurveEditor } from "./EaseCurveEditor";
import { AppearancePanel } from "./AppearancePanel";

const BUTTON =
  "inline-flex items-center justify-center gap-1.5 rounded-md border border-line bg-panel px-3 py-1.5 text-[12px] font-medium text-foreground transition-all duration-150 hover:bg-hover active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent";
const ICON_BTN =
  "inline-flex h-8 w-8 items-center justify-center rounded-md border border-line bg-panel text-muted transition-all duration-150 hover:bg-hover hover:text-foreground active:scale-[0.95] disabled:opacity-40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent";
const GHOST_BTN =
  "inline-flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-hover hover:text-foreground disabled:pointer-events-none disabled:opacity-30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent";

const IDLE_CLIP_NAME = "Idle";
/** A blank clip offered as a starting point; it becomes a real clip on first edit. */
const EMPTY_IDLE_CLIP: Clip = { name: IDLE_CLIP_NAME, duration: 4, body: "sphere", tracks: {} };

const DEFAULT_EASE: Ease = [0.65, 0, 0.35, 1];

interface TrackMeta {
  id: NumericTrack | "expression";
  label: string;
  dotColor: string;
  diamondColor: string;
}

const TRACK_METAS: readonly TrackMeta[] = [
  {
    id: "position",
    label: "Position",
    dotColor: "bg-blue-500",
    diamondColor: "bg-blue-500 border-blue-400",
  },
  {
    id: "rotation",
    label: "Rotation",
    dotColor: "bg-purple-500",
    diamondColor: "bg-purple-500 border-purple-400",
  },
  {
    id: "scale",
    label: "Scale",
    dotColor: "bg-emerald-500",
    diamondColor: "bg-emerald-500 border-emerald-400",
  },
  {
    id: "squash",
    label: "Squash",
    dotColor: "bg-amber-500",
    diamondColor: "bg-amber-500 border-amber-400",
  },
  {
    id: "lids",
    label: "Lids",
    dotColor: "bg-rose-500",
    diamondColor: "bg-rose-500 border-rose-400",
  },
  {
    id: "expression",
    label: "Expression",
    dotColor: "bg-orange-500",
    diamondColor: "bg-orange-500 border-orange-400",
  },
];

const LEFT_PAD = 16;
const RIGHT_PAD = 56; // ample space so 4.00s and end keyframe are 100% visible
const BASE_PPS = 140; // 140px per second at 100% zoom - compact and clean

interface DragState {
  trackId: string;
  keyIndex: number;
  initialT: number;
  startX: number;
  laneWidth: number;
}

export function EditorWorkspace({
  design,
  recipes,
  onChange,
  onSave,
  onReset,
  onDiscard,
  onDesignChange,
  status,
  seed,
  stage,
  shape,
  onShapeChange,
  onStageToggle,
}: {
  design: MascotDesign;
  recipes: Recipes;
  onChange: (recipes: Recipes) => void;
  onSave: () => void;
  onReset: () => void;
  onDiscard: () => void;
  onDesignChange?: (design: MascotDesign) => void;
  status?: string | null;
  seed: number;
  stage: StageTheme;
  shape: BodyShape;
  onShapeChange: (shape: BodyShape) => void;
  onStageToggle: () => void;
}) {
  const [showSettings, setShowSettings] = useState(true);
  const [mobileSheet, setMobileSheet] = useState<"mascot" | "inspector" | null>(null);
  const sheetClass = (open: boolean) =>
    cn(
      "max-[900px]:fixed max-[900px]:inset-x-0 max-[900px]:bottom-16 max-[900px]:z-40 max-[900px]:flex max-[900px]:h-[58vh] max-[900px]:w-full max-[900px]:max-w-none max-[900px]:rounded-t-2xl max-[900px]:border-t max-[900px]:border-l-0 max-[900px]:border-r-0 max-[900px]:transition-transform max-[900px]:duration-160 max-[900px]:ease-out max-[900px]:will-change-transform",
      open
        ? "max-[900px]:translate-y-0"
        : "max-[900px]:pointer-events-none max-[900px]:translate-y-[calc(100%_+_4rem)]",
    );
  const isPhone = () =>
    typeof window !== "undefined" && window.matchMedia("(max-width: 900px)").matches;
  const toggleSettings = () => {
    if (isPhone()) setMobileSheet((sheet) => (sheet === "mascot" ? null : "mascot"));
    else setShowSettings((value) => !value);
  };
  const [currentDesign, setCurrentDesign] = useState<MascotDesign>(design);

  useEffect(() => {
    setCurrentDesign(design);
  }, [design]);

  const handleDesignPatch = (patch: Partial<MascotDesign>) => {
    setCurrentDesign((prev) => {
      const next = { ...prev, ...patch };
      onDesignChange?.(next);
      return next;
    });
  };

  const [clipName, setClipName] = useState("Idle_B");
  const [activeTrackId, setActiveTrackId] = useState<string>("position");
  const [selectedKey, setSelectedKey] = useState<{ trackId: string; index: number } | null>({
    trackId: "position",
    index: 0,
  });
  const [inspectorTab, setInspectorTab] = useState<"keyframe" | "clip">("keyframe");
  const openInspector = (tab: "keyframe" | "clip") => {
    setInspectorTab(tab);
    setMobileSheet((sheet) => (sheet === "inspector" && inspectorTab === tab ? null : "inspector"));
  };

  const [past, setPast] = useState<Recipes[]>([]);
  const [future, setFuture] = useState<Recipes[]>([]);
  const lastCommitAt = useRef(0);
  const commit = (next: Recipes) => {
    const now = typeof performance === "undefined" ? Date.now() : performance.now();
    if (now - lastCommitAt.current > 350) setPast((stack) => [...stack.slice(-49), recipes]);
    lastCommitAt.current = now;
    setFuture([]);
    onChange(next);
  };
  const undo = () => {
    if (!past.length) return;
    setFuture((stack) => [recipes, ...stack]);
    setPast(past.slice(0, -1));
    lastCommitAt.current = 0;
    onChange(past[past.length - 1]!);
  };
  const redo = () => {
    if (!future.length) return;
    setPast((stack) => [...stack.slice(-49), recipes]);
    setFuture(future.slice(1));
    lastCommitAt.current = 0;
    onChange(future[0]!);
  };

  const [isPlaying, setIsPlaying] = useState(true);
  const [playheadTime, setPlayheadTime] = useState(0);
  const [seekTime, setSeekTime] = useState<number | undefined>(undefined);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [zoom, setZoom] = useState(1);

  const [dragState, setDragState] = useState<DragState | null>(null);
  const [isScrubbingRuler, setIsScrubbingRuler] = useState(false);

  const runtimeRef = useRef<MascotRuntimeHandle>(null);
  const rulerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const autoFollowResumeAt = useRef(0);
  const [saveMenuOpen, setSaveMenuOpen] = useState(false);
  const saveMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!saveMenuOpen) return;
    const onPointerDown = (e: globalThis.PointerEvent) => {
      if (!saveMenuRef.current?.contains(e.target as Node)) setSaveMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [saveMenuOpen]);
  const downloadComponent = async () => {
    const { downloadMotionReactComponent } = await import("@/motion/model/export-react");
    downloadMotionReactComponent(currentDesign, recipes, stateId);
  };

  const playheadTimeRef = useRef(0);
  const lastStateUpdateRef = useRef(0);
  const playheadFlagRef = useRef<HTMLDivElement>(null);
  const playheadFlagTextRef = useRef<HTMLDivElement>(null);
  const playheadNeedleRef = useRef<HTMLDivElement>(null);
  const timecodeReadoutRef = useRef<HTMLSpanElement>(null);
  const addKeyTimeRef = useRef<HTMLSpanElement>(null);
  const addKeyInspectorTimeRef = useRef<HTMLSpanElement>(null);

  const clip =
    recipes.clips.find((entry) => entry.name === clipName) ??
    (clipName === IDLE_CLIP_NAME ? EMPTY_IDLE_CLIP : recipes.clips[0]);
  const previewRecipes =
    clipName === IDLE_CLIP_NAME && !recipes.clips.some((entry) => entry.name === IDLE_CLIP_NAME)
      ? { ...recipes, clips: [...recipes.clips, EMPTY_IDLE_CLIP] }
      : recipes;
  if (!clip) return null;

  const pixelsPerSecond = BASE_PPS * zoom;

  const maxKeyframeTime = Math.max(
    clip.duration,
    ...(clip.tracks.expression ?? []).map((k) => k.t),
    ...Object.values(clip.tracks).flatMap((keys) =>
      Array.isArray(keys) ? (keys as NumericKeyframe[]).map((k) => k.t) : [],
    ),
  );

  // Total workspace duration: ensure at least 10s or clip.duration + 2s so changing to a shorter clip never collapses the timeline
  const totalTimelineDuration = Math.max(10, clip.duration + 2, maxKeyframeTime + 1);
  const activeClipWidth = Math.round(clip.duration * pixelsPerSecond);
  const timelineLaneWidth = Math.round(totalTimelineDuration * pixelsPerSecond);
  const timelineContentWidth = LEFT_PAD + timelineLaneWidth + RIGHT_PAD;

  const associatedStateId =
    Object.keys(recipes.states).find((id) => recipes.states[id]?.clips.includes(clip.name)) ??
    "idle";
  const [stateId, setStateId] = useState(associatedStateId);
  const state = recipes.states[stateId];

  const isExpressionTrack = activeTrackId === "expression";
  const numericSpec = TRACKS.find((t) => t.id === activeTrackId) ?? TRACKS[0]!;

  const getTrackKeys = (trackId: string): NumericKeyframe[] => {
    if (trackId === "expression") return [];
    return clip.tracks[trackId as NumericTrack] ?? [];
  };

  const getExpressionKeys = (): ExpressionKeyframe[] => {
    return clip.tracks.expression ?? [];
  };

  const activeKeys = isExpressionTrack ? [] : getTrackKeys(activeTrackId);
  const activeExpressionKeys = isExpressionTrack ? getExpressionKeys() : [];

  const expressionOptions = useMemo(() => {
    return Array.from(
      new Set([...recipes.expressionNames, "blink", ...Object.keys(recipes.expressionAliases)]),
    );
  }, [recipes.expressionNames, recipes.expressionAliases]);

  const selectedNumericKey: NumericKeyframe | undefined =
    selectedKey && selectedKey.trackId === activeTrackId && !isExpressionTrack
      ? activeKeys[selectedKey.index]
      : undefined;

  const selectedExprKey: ExpressionKeyframe | undefined =
    selectedKey && selectedKey.trackId === "expression" && isExpressionTrack
      ? activeExpressionKeys[selectedKey.index]
      : undefined;

  const updateClip = (next: Clip) => {
    const exists = recipes.clips.some((entry) => entry.name === next.name);
    commit({
      ...recipes,
      clips: exists
        ? recipes.clips.map((entry) => (entry.name === next.name ? next : entry))
        : [...recipes.clips, next],
    });
  };

  const updateNumericTrack = (trackId: NumericTrack, nextKeys: NumericKeyframe[]) => {
    updateClip({
      ...clip,
      tracks: {
        ...clip.tracks,
        [trackId]: nextKeys,
      },
    });
  };

  const updateExpressionTrack = (nextKeys: ExpressionKeyframe[]) => {
    updateClip({
      ...clip,
      tracks: {
        ...clip.tracks,
        expression: nextKeys,
      },
    });
  };

  const changeState = (changes: Partial<RecipeState>) => {
    if (!state) return;
    const next = { ...state, ...changes };
    if (!next.next) {
      delete next.next;
      delete next.holdSeconds;
    }
    if (!next.face) delete next.face;
    if (!next.morph) delete next.morph;
    commit({ ...recipes, states: { ...recipes.states, [stateId]: next } });
  };

  const duplicateCurrentClip = () => {
    const newName = `${clip.name}_Copy`;
    const copy: Clip = JSON.parse(JSON.stringify(clip));
    copy.name = newName;
    commit({
      ...recipes,
      clips: [...recipes.clips, copy],
    });
    setClipName(newName);
    setSelectedKey(null);
  };

  // Direct DOM update for playhead elements (runs at 60-120fps with zero React reconciliation lag)
  const updatePlayheadDOM = (time: number) => {
    playheadTimeRef.current = time;
    const x = LEFT_PAD + time * pixelsPerSecond;
    if (playheadFlagRef.current) {
      playheadFlagRef.current.style.left = `${x}px`;
    }
    if (playheadNeedleRef.current) {
      playheadNeedleRef.current.style.left = `${x}px`;
    }
    const formatted = `${time.toFixed(2)}s`;
    if (playheadFlagTextRef.current) {
      playheadFlagTextRef.current.textContent = formatted;
    }
    if (timecodeReadoutRef.current) {
      timecodeReadoutRef.current.textContent = formatted;
    }
    if (addKeyTimeRef.current) {
      addKeyTimeRef.current.textContent = `(${formatted})`;
    }
    if (addKeyInspectorTimeRef.current) {
      addKeyInspectorTimeRef.current.textContent = `(${formatted})`;
    }

    // Auto-scroll timeline smoothly to follow playhead during playback without layout thrashing
    const el = scrollContainerRef.current;
    if (
      el &&
      isPlaying &&
      !isScrubbingRuler &&
      !dragState &&
      performance.now() >= autoFollowResumeAt.current
    ) {
      const viewLeft = el.scrollLeft;
      const viewRight = el.scrollLeft + el.clientWidth;
      const RIGHT_LOOKAHEAD = 120;
      if (x > viewRight - RIGHT_LOOKAHEAD) {
        el.scrollLeft = x - el.clientWidth + RIGHT_LOOKAHEAD;
      } else if (x < viewLeft) {
        el.scrollLeft = 0;
      }
    }
  };

  useEffect(() => {
    updatePlayheadDOM(playheadTimeRef.current);
  }, [pixelsPerSecond]);

  const handlePlayerFrame = (time: number) => {
    if (isPlaying && !dragState && !isScrubbingRuler) {
      updatePlayheadDOM(time);
      // Synchronize React state at 4Hz (every 250ms) to keep non-urgent UI synced
      // without triggering 60-120fps React re-renders of the whole 1600-line DOM tree!
      const now = performance.now();
      if (now - lastStateUpdateRef.current > 250) {
        lastStateUpdateRef.current = now;
        setPlayheadTime(time);
        setSeekTime(undefined);
      }
    }
  };

  const togglePlayPause = () => {
    autoFollowResumeAt.current = 0;
    if (isPlaying) {
      setIsPlaying(false);
      runtimeRef.current?.pause();
      const t = playheadTimeRef.current;
      setPlayheadTime(t);
      setSeekTime(t);
      updatePlayheadDOM(t);
    } else {
      setIsPlaying(true);
      runtimeRef.current?.play();
      setSeekTime(undefined);
    }
  };

  const seekTo = (time: number, autoScroll = false) => {
    if (!autoScroll) autoFollowResumeAt.current = 0;
    const t = Math.max(0, Math.min(clip.duration, time));
    playheadTimeRef.current = t;
    setPlayheadTime(t);
    setSeekTime(t);
    updatePlayheadDOM(t);
    runtimeRef.current?.seek(t);

    if (
      autoScroll &&
      !isScrubbingRuler &&
      !dragState &&
      scrollContainerRef.current &&
      performance.now() >= autoFollowResumeAt.current
    ) {
      const el = scrollContainerRef.current;
      const targetX = LEFT_PAD + t * pixelsPerSecond;
      const viewLeft = el.scrollLeft;
      const viewRight = el.scrollLeft + el.clientWidth;
      if (targetX < viewLeft + 40 || targetX > viewRight - 60) {
        el.scrollTo({
          left: Math.max(0, targetX - el.clientWidth / 2),
          behavior: "smooth",
        });
      }
    }
  };

  const handleRulerPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsScrubbingRuler(true);
    setIsPlaying(false);

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    let t = (clickX - LEFT_PAD) / pixelsPerSecond;
    t = Math.max(0, Math.min(clip.duration, t));
    if (snapToGrid && !e.shiftKey) {
      t = Math.round(t / 0.05) * 0.05;
    }
    t = Math.round(t * 1000) / 1000;
    seekTo(t);
  };

  const handleRulerPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!isScrubbingRuler) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    let t = (clickX - LEFT_PAD) / pixelsPerSecond;
    t = Math.max(0, Math.min(clip.duration, t));
    if (snapToGrid && !e.shiftKey) {
      t = Math.round(t / 0.05) * 0.05;
    }
    t = Math.round(t * 1000) / 1000;
    seekTo(t);
  };

  const handleRulerPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setIsScrubbingRuler(false);
  };

  const handleKeyPointerDown = (
    trackId: string,
    keyIndex: number,
    keyT: number,
    e: PointerEvent<HTMLButtonElement>,
  ) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.currentTarget.focus({ preventScroll: true });
    e.currentTarget.setPointerCapture(e.pointerId);

    setSelectedKey({ trackId, index: keyIndex });
    setActiveTrackId(trackId);
    setInspectorTab("keyframe");

    setDragState({
      trackId,
      keyIndex,
      initialT: keyT,
      startX: e.clientX,
      laneWidth: pixelsPerSecond,
    });

    setIsPlaying(false);
    seekTo(keyT);
  };

  const handleKeyPointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    if (!dragState) return;
    const deltaX = e.clientX - dragState.startX;
    const deltaT = deltaX / pixelsPerSecond;
    let newT = Math.max(0, Math.min(clip.duration, dragState.initialT + deltaT));

    if (snapToGrid && !e.shiftKey) {
      const snapped = Math.round(newT / 0.05) * 0.05;
      if (Math.abs(snapped - newT) < 0.035) {
        newT = snapped;
      }
    }
    newT = Math.round(newT * 1000) / 1000;

    if (dragState.trackId === "expression") {
      const list = [...(clip.tracks.expression ?? [])];
      if (list[dragState.keyIndex]) {
        list[dragState.keyIndex] = { ...list[dragState.keyIndex], t: newT };
        updateExpressionTrack(list);
      }
    } else {
      const tid = dragState.trackId as NumericTrack;
      const list = [...(clip.tracks[tid] ?? [])];
      if (list[dragState.keyIndex]) {
        list[dragState.keyIndex] = { ...list[dragState.keyIndex], t: newT };
        updateNumericTrack(tid, list);
      }
    }
    seekTo(newT);
  };

  const handleKeyPointerUp = (e: PointerEvent<HTMLButtonElement>) => {
    if (!dragState) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }

    if (dragState.trackId === "expression") {
      const list = [...(clip.tracks.expression ?? [])];
      const target = list[dragState.keyIndex];
      list.sort((a, b) => a.t - b.t);
      updateExpressionTrack(list);
      const newIdx = list.indexOf(target);
      setSelectedKey({ trackId: "expression", index: newIdx >= 0 ? newIdx : 0 });
    } else {
      const tid = dragState.trackId as NumericTrack;
      const list = [...(clip.tracks[tid] ?? [])];
      const target = list[dragState.keyIndex];
      list.sort((a, b) => a.t - b.t);
      updateNumericTrack(tid, list);
      const newIdx = list.indexOf(target);
      setSelectedKey({ trackId: tid, index: newIdx >= 0 ? newIdx : 0 });
    }
    setDragState(null);
  };

  const handleLaneDoubleClick = (trackId: string, e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    let t = (clickX - LEFT_PAD) / pixelsPerSecond;
    t = Math.max(0, Math.min(clip.duration, t));
    if (snapToGrid && !e.shiftKey) {
      t = Math.round(t / 0.05) * 0.05;
    }
    t = Math.round(t * 1000) / 1000;
    addKeyframeAtTime(trackId, t);
  };

  const addKeyframeAtTime = (trackId: string, time: number) => {
    const t = Math.max(0, Math.min(clip.duration, time));
    setActiveTrackId(trackId);
    setInspectorTab("keyframe");

    if (trackId === "expression") {
      const current = clip.tracks.expression ?? [];
      const next = [...current, { t, v: "blink" }].sort((a, b) => a.t - b.t);
      updateExpressionTrack(next);
      const idx = next.findIndex((k) => k.t === t);
      setSelectedKey({ trackId: "expression", index: idx >= 0 ? idx : 0 });
    } else {
      const tid = trackId as NumericTrack;
      const spec = TRACKS.find((entry) => entry.id === tid)!;
      const current = clip.tracks[tid] ?? [];
      const prevKey = current.filter((k) => k.t <= t).at(-1) ?? current[0];
      const fallbackVal = prevKey?.v ? [...prevKey.v] : [...spec.fallback];
      const next = [...current, { t, v: fallbackVal, ease: DEFAULT_EASE }].sort(
        (a, b) => a.t - b.t,
      );
      updateNumericTrack(tid, next);
      const idx = next.findIndex((k) => k.t === t);
      setSelectedKey({ trackId: tid, index: idx >= 0 ? idx : 0 });
    }
    seekTo(t);
  };

  const deleteSelectedKeyframe = () => {
    if (!selectedKey) return;
    const { trackId, index } = selectedKey;

    if (trackId === "expression") {
      const list = (clip.tracks.expression ?? []).filter((_, i) => i !== index);
      updateExpressionTrack(list);
      setSelectedKey(list.length > 0 ? { trackId, index: Math.max(0, index - 1) } : null);
    } else {
      const tid = trackId as NumericTrack;
      const list = (clip.tracks[tid] ?? []).filter((_, i) => i !== index);
      updateNumericTrack(tid, list);
      setSelectedKey(list.length > 0 ? { trackId, index: Math.max(0, index - 1) } : null);
    }
  };

  const duplicateSelectedKeyframe = () => {
    if (!selectedKey) return;
    const { trackId, index } = selectedKey;

    if (trackId === "expression") {
      const list = clip.tracks.expression ?? [];
      const key = list[index];
      if (!key) return;
      const newT = Math.min(clip.duration, key.t + 0.1);
      const next = [...list, { ...key, t: newT }].sort((a, b) => a.t - b.t);
      updateExpressionTrack(next);
      const newIdx = next.findIndex((k) => k.t === newT);
      setSelectedKey({ trackId, index: newIdx >= 0 ? newIdx : 0 });
      seekTo(newT);
    } else {
      const tid = trackId as NumericTrack;
      const list = clip.tracks[tid] ?? [];
      const key = list[index];
      if (!key) return;
      const newT = Math.min(clip.duration, key.t + 0.1);
      const next = [...list, { ...key, v: [...key.v], t: newT }].sort((a, b) => a.t - b.t);
      updateNumericTrack(tid, next);
      const newIdx = next.findIndex((k) => k.t === newT);
      setSelectedKey({ trackId, index: newIdx >= 0 ? newIdx : 0 });
      seekTo(newT);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      // Space is dedicated to play/pause only across the editor
      if (e.code === "Space") {
        e.preventDefault();
        e.stopPropagation();

        // If an input, button, or select trigger was focused, blur it to prevent unwanted button clicks and commit input values
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }

        togglePlayPause();
        return;
      }

      const target = e.target as HTMLElement | null;
      const isInput =
        target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z" && !isInput) {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }

      if (e.code === "Home" && !isInput) {
        e.preventDefault();
        seekTo(0);
        return;
      }

      if ((e.code === "Delete" || e.code === "Backspace") && !isInput && selectedKey) {
        e.preventDefault();
        deleteSelectedKeyframe();
        return;
      }

      if (e.code === "Escape") {
        setSelectedKey(null);
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        return;
      }

      if ((e.key === "ArrowLeft" || e.key === "ArrowRight") && !isInput && selectedKey) {
        e.preventDefault();
        const step = e.shiftKey ? 0.05 : 0.01;
        const delta = e.key === "ArrowLeft" ? -step : step;
        const { trackId, index } = selectedKey;

        if (trackId === "expression") {
          const list = [...(clip.tracks.expression ?? [])];
          const k = list[index];
          if (k) {
            const newT = Math.max(
              0,
              Math.min(clip.duration, Math.round((k.t + delta) * 1000) / 1000),
            );
            list[index] = { ...k, t: newT };
            list.sort((a, b) => a.t - b.t);
            updateExpressionTrack(list);
            const nextIdx = list.findIndex((entry) => entry.t === newT);
            setSelectedKey({ trackId, index: nextIdx >= 0 ? nextIdx : 0 });
            seekTo(newT);
          }
        } else {
          const tid = trackId as NumericTrack;
          const list = [...(clip.tracks[tid] ?? [])];
          const k = list[index];
          if (k) {
            const newT = Math.max(
              0,
              Math.min(clip.duration, Math.round((k.t + delta) * 1000) / 1000),
            );
            list[index] = { ...k, t: newT };
            list.sort((a, b) => a.t - b.t);
            updateNumericTrack(tid, list);
            const nextIdx = list.findIndex((entry) => entry.t === newT);
            setSelectedKey({ trackId, index: nextIdx >= 0 ? nextIdx : 0 });
            seekTo(newT);
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [isPlaying, selectedKey, clip, snapToGrid, past, future, recipes]);

  const tickInterval = pixelsPerSecond >= 250 ? 0.25 : pixelsPerSecond >= 140 ? 0.5 : 1.0;
  const tickMarks = useMemo(() => {
    const numTicks = Math.floor(totalTimelineDuration / tickInterval) + 1;
    return Array.from({ length: numTicks }, (_, i) => Math.round(i * tickInterval * 100) / 100);
  }, [totalTimelineDuration, tickInterval]);

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-background">
      <header className="flex h-13 shrink-0 items-center justify-between border-b border-line bg-panel px-4 max-[900px]:h-auto max-[900px]:flex-wrap max-[900px]:justify-start max-[900px]:gap-2 max-[900px]:px-3 max-[900px]:py-2 max-[900px]:[&>*]:shrink-0">
        <div className="flex items-center gap-2.5">
          <Button
            variant={showSettings ? "tertiary" : "ghost"}
            size="compact"
            leadingIcon={Sliders}
            className="max-[900px]:hidden"
            title={showSettings ? "Hide mascot settings panel" : "Show mascot settings panel"}
            onClick={toggleSettings}
          >
            Mascot
          </Button>

          <div className="h-4 w-px bg-line max-[900px]:hidden" />

          <div className="flex items-center gap-1.5 text-caption max-[900px]:hidden">
            <span className="font-semibold text-foreground">{currentDesign.name}</span>
            <span className="text-muted/50">/</span>
            <span className="text-muted font-medium">Editor</span>
          </div>

          <div className="h-4 w-px bg-line max-[900px]:hidden" />

          <div className="flex items-center gap-1.5">
            <span className="text-caption font-medium text-muted max-[900px]:hidden">Clip</span>
            <Select
              value={clip.name}
              onValueChange={(val) => {
                setClipName(val);
                setSelectedKey(null);
                seekTo(0, true);
              }}
            >
              <SelectTrigger
                size="compact"
                className="w-[144px] font-semibold max-[900px]:w-[116px]"
              />
              <SelectContent>
                {[
                  ...(recipes.clips.some((entry) => entry.name === IDLE_CLIP_NAME)
                    ? []
                    : [{ name: IDLE_CLIP_NAME }]),
                  ...recipes.clips,
                ].map((entry, idx) => (
                  <SelectItem key={entry.name} value={entry.name} index={idx}>
                    {clipLabel(entry.name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="tertiary"
            size="compact"
            leadingIcon={Copy}
            className="max-[900px]:hidden"
            title="Duplicate current clip"
            onClick={duplicateCurrentClip}
          >
            Duplicate
          </Button>

          <div className="h-4 w-px bg-line max-[900px]:hidden" />

          <ScrubberInput
            label={<Clock className="h-3.5 w-3.5 text-muted/70" />}
            value={clip.duration}
            defaultValue={2.0}
            step={0.1}
            min={0.1}
            max={60}
            decimals={2}
            suffix="s"
            hideReset={true}
            ariaLabel="Clip duration in seconds"
            className="h-7 w-26 px-2.5 max-[900px]:hidden"
            onChange={(duration) => {
              const val = Math.max(0.1, Math.round(duration * 100) / 100);
              const lastKey = Math.max(
                0,
                ...Object.values(clip.tracks).flatMap((tr) => (tr ?? []).map((k) => k.t)),
              );
              if (Number.isFinite(val) && val >= Math.max(0.1, lastKey)) {
                updateClip({ ...clip, duration: val });
              }
            }}
          />
        </div>

        <div className="flex items-center gap-2">
          {status ? (
            <span className="hidden sm:inline-flex items-center font-mono text-[11px] text-muted mr-1 select-none">
              {status}
            </span>
          ) : null}
          <Button variant="ghost" size="compact" onClick={onDiscard}>
            Discard
          </Button>
          <Button variant="tertiary" size="compact" onClick={onReset}>
            Reset
          </Button>
          <div ref={saveMenuRef} className="relative flex items-stretch">
            <Button variant="primary" size="compact" className="rounded-r-none" onClick={onSave}>
              Save Recipes
            </Button>
            <Button
              variant="primary"
              size="compact"
              className="rounded-l-none border-l border-white/25 px-1.5"
              aria-label="Save options"
              aria-haspopup="menu"
              aria-expanded={saveMenuOpen}
              onClick={() => setSaveMenuOpen((open) => !open)}
            >
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 transition-transform duration-80",
                  saveMenuOpen && "rotate-180",
                )}
              />
            </Button>
            {saveMenuOpen ? (
              <div
                role="menu"
                className="absolute right-0 top-full z-50 mt-1.5 min-w-[190px] rounded-lg border border-line bg-panel p-1 shadow-lg"
              >
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-left text-[12px] text-foreground transition-colors duration-80 hover:bg-hover"
                  onClick={() => {
                    setSaveMenuOpen(false);
                    void downloadComponent();
                  }}
                >
                  <Download className="h-3.5 w-3.5 text-muted" />
                  Download state
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 overflow-hidden max-[900px]:relative max-[900px]:flex-col">
        <AppearancePanel
          design={currentDesign}
          onDesignChange={handleDesignPatch}
          shape={shape}
          onShapeChange={onShapeChange}
          className={cn(!showSettings && "hidden", sheetClass(mobileSheet === "mascot"))}
        />

        {/* Stage Viewport (Grok live preview): the whole canvas is one flat
            surface, light paper or dark room. */}
        <main
          className={cn(
            "relative flex flex-1 min-h-0 flex-col overflow-hidden",
            stage === "light" ? "motion-stage-paper" : "motion-stage-dark",
          )}
        >
          <div className="relative flex flex-1 min-h-0 w-full items-center justify-center isolate">
            <StageToggle
              stage={stage}
              onToggle={onStageToggle}
              className="absolute right-4 top-4 z-10"
            />
            <div className="relative flex h-full max-h-[420px] w-full max-w-[420px] aspect-square items-center justify-center p-4">
              <MascotRuntime
                ref={runtimeRef}
                design={stageDesignFor(currentDesign, stage)}
                recipes={previewRecipes}
                seed={seed}
                initialState={associatedStateId}
                soloClipId={clip.name}
                paused={!isPlaying}
                currentTime={seekTime}
                follow={false}
                shape={shape}
                label={`Live loop preview of ${clip.name}`}
                onFrame={handlePlayerFrame}
                className="h-full w-full flex items-center justify-center"
              />
            </div>
          </div>

          <div className="grid h-14 shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center border-t border-line bg-panel px-5 max-[900px]:px-3">
            <div className="flex items-center gap-2 font-mono justify-self-start">
              <span
                ref={timecodeReadoutRef}
                className={cn("tabular-nums text-foreground", typeClass("title"))}
                style={{ fontVariationSettings: fontWeights.semibold }}
              >
                {playheadTime.toFixed(2)}s
              </span>
              <span className="text-[13px] text-muted max-[900px]:hidden">/</span>
              <span className="text-[13px] text-muted tabular-nums max-[900px]:hidden">
                {clip.duration.toFixed(2)}s
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className={ICON_BTN}
                title="Rewind to start (Home)"
                aria-label="Rewind to start"
                onClick={() => seekTo(0, true)}
              >
                <SkipBack className="h-4 w-4" />
              </button>

              <button
                type="button"
                className={ICON_BTN}
                title="Step backward 0.05s"
                onClick={() => seekTo(Math.max(0, playheadTimeRef.current - 0.05), true)}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <button
                type="button"
                className={cn(
                  "inline-flex h-9 w-9 items-center justify-center rounded-full border text-white transition-all duration-150 active:scale-[0.92] shadow-sm",
                  isPlaying
                    ? "border-emerald-500/50 bg-emerald-500 hover:bg-emerald-600"
                    : "border-accent bg-accent hover:bg-accent/90",
                )}
                title="Spacebar to toggle play/pause"
                onClick={togglePlayPause}
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4 fill-current" />
                ) : (
                  <Play className="h-4 w-4 ml-0.5 fill-current" />
                )}
              </button>

              <button
                type="button"
                className={ICON_BTN}
                title="Step forward 0.05s"
                onClick={() =>
                  seekTo(Math.min(clip.duration, playheadTimeRef.current + 0.05), true)
                }
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </main>

        <aside
          className={cn(
            "flex w-[380px] shrink-0 flex-col border-l border-line bg-panel",
            sheetClass(mobileSheet === "inspector"),
          )}
        >
          <div className="flex h-10 shrink-0 items-center border-b border-line bg-panel-raised/50 px-2.5">
            <button
              type="button"
              className={cn(
                "flex-1 pb-1 pt-1.5 text-center text-[12px] font-medium transition-colors border-b-2",
                inspectorTab === "keyframe"
                  ? "border-accent text-foreground font-semibold"
                  : "border-transparent text-muted hover:text-foreground",
              )}
              onClick={() => setInspectorTab("keyframe")}
            >
              <Sliders className="inline mr-1.5 h-3.5 w-3.5" />
              Keyframe
            </button>
            <button
              type="button"
              className={cn(
                "flex-1 pb-1 pt-1.5 text-center text-[12px] font-medium transition-colors border-b-2",
                inspectorTab === "clip"
                  ? "border-accent text-foreground font-semibold"
                  : "border-transparent text-muted hover:text-foreground",
              )}
              onClick={() => setInspectorTab("clip")}
            >
              <Layers className="inline mr-1.5 h-3.5 w-3.5" />
              Clip & States
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto page-scrollbar p-3 flex flex-col gap-3">
            {inspectorTab === "keyframe" ? (
              selectedKey && (selectedNumericKey || selectedExprKey) ? (
                <>
                  <div className="rounded-lg border border-line bg-panel p-2.5">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-mono text-caption font-semibold text-accent">
                        {TRACK_METAS.find((t) => t.id === selectedKey.trackId)?.label ??
                          selectedKey.trackId}{" "}
                        · #{selectedKey.index + 1}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className={cn(ICON_BTN, "h-7 w-7")}
                          title="Duplicate this keyframe (+0.1s)"
                          onClick={duplicateSelectedKeyframe}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          className={cn(ICON_BTN, "h-7 w-7 hover:text-rose-400")}
                          title="Delete selected keyframe (Delete / Backspace)"
                          onClick={deleteSelectedKeyframe}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-caption font-medium text-foreground">Time:</span>
                        <ScrubberInput
                          label="T"
                          value={
                            isExpressionTrack
                              ? (selectedExprKey?.t ?? 0)
                              : (selectedNumericKey?.t ?? 0)
                          }
                          defaultValue={0}
                          min={0}
                          max={clip.duration}
                          step={0.05}
                          decimals={2}
                          className="w-32"
                          onChange={(newT) => {
                            const clamped = Math.max(0, Math.min(clip.duration, newT));
                            if (isExpressionTrack) {
                              const next = (clip.tracks.expression ?? [])
                                .map((k, i) => (i === selectedKey.index ? { ...k, t: clamped } : k))
                                .sort((a, b) => a.t - b.t);
                              updateExpressionTrack(next);
                              const nextIdx = next.findIndex((k) => k.t === clamped);
                              setSelectedKey({
                                trackId: "expression",
                                index: nextIdx >= 0 ? nextIdx : 0,
                              });
                            } else {
                              const tid = selectedKey.trackId as NumericTrack;
                              const next = (clip.tracks[tid] ?? [])
                                .map((k, i) => (i === selectedKey.index ? { ...k, t: clamped } : k))
                                .sort((a, b) => a.t - b.t);
                              updateNumericTrack(tid, next);
                              const nextIdx = next.findIndex((k) => k.t === clamped);
                              setSelectedKey({
                                trackId: tid,
                                index: nextIdx >= 0 ? nextIdx : 0,
                              });
                            }
                            seekTo(clamped);
                          }}
                        />
                      </div>

                      <div className="flex gap-1">
                        <button
                          type="button"
                          className="h-8 rounded-md border border-line bg-panel px-2.5 font-mono text-[11px] font-medium text-muted hover:border-line-2 hover:bg-hover hover:text-foreground active:scale-[0.98]"
                          onClick={() => {
                            const currT = isExpressionTrack
                              ? (selectedExprKey?.t ?? 0)
                              : (selectedNumericKey?.t ?? 0);
                            seekTo(Math.max(0, Math.round((currT - 0.05) * 100) / 100));
                          }}
                        >
                          -0.05
                        </button>
                        <button
                          type="button"
                          className="h-8 rounded-md border border-line bg-panel px-2.5 font-mono text-[11px] font-medium text-muted hover:border-line-2 hover:bg-hover hover:text-foreground active:scale-[0.98]"
                          onClick={() => {
                            const currT = isExpressionTrack
                              ? (selectedExprKey?.t ?? 0)
                              : (selectedNumericKey?.t ?? 0);
                            seekTo(Math.min(clip.duration, Math.round((currT + 0.05) * 100) / 100));
                          }}
                        >
                          +0.05
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-line bg-panel p-2.5">
                    <span className="mb-2 block text-caption font-semibold text-muted">
                      Channels
                    </span>

                    {isExpressionTrack && selectedExprKey ? (
                      <div className="grid gap-1.5 text-caption font-medium text-foreground">
                        <span>Expression Eye Shape:</span>
                        <Select
                          value={selectedExprKey.v}
                          onValueChange={(nextVal) => {
                            const list = (clip.tracks.expression ?? []).map((k, i) =>
                              i === selectedKey.index ? { ...k, v: nextVal } : k,
                            );
                            updateExpressionTrack(list);
                          }}
                        >
                          <SelectTrigger size="compact" className="w-full font-medium" />
                          <SelectContent>
                            {expressionOptions.map((name, idx) => (
                              <SelectItem key={name} value={name} index={idx}>
                                {name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : selectedNumericKey ? (
                      <div className="grid grid-cols-2 gap-2">
                        {numericSpec.axes.map((axisLabel, axisIdx) => (
                          <ScrubberInput
                            key={axisLabel}
                            label={axisLabel}
                            ariaLabel={`${numericSpec.label} ${axisLabel}`}
                            value={
                              selectedNumericKey.v[axisIdx] ?? numericSpec.fallback[axisIdx] ?? 0
                            }
                            defaultValue={numericSpec.fallback[axisIdx] ?? 0}
                            step={
                              numericSpec.id === "position" || numericSpec.id === "rotation"
                                ? 1
                                : 0.05
                            }
                            decimals={
                              numericSpec.id === "position" || numericSpec.id === "rotation" ? 0 : 2
                            }
                            onChange={(val) => {
                              const nextV = [...selectedNumericKey.v];
                              nextV[axisIdx] = val;
                              const tid = selectedKey.trackId as NumericTrack;
                              const list = (clip.tracks[tid] ?? []).map((k, i) =>
                                i === selectedKey.index ? { ...k, v: nextV } : k,
                              );
                              updateNumericTrack(tid, list);
                            }}
                          />
                        ))}
                      </div>
                    ) : null}
                  </div>

                  {!isExpressionTrack && selectedNumericKey ? (
                    <div className="flex-1 flex flex-col min-h-[280px] rounded-xl border border-line bg-panel/75 p-3.5 shadow-xs">
                      <EaseCurveEditor
                        ease={selectedNumericKey.ease ?? DEFAULT_EASE}
                        className="flex-1"
                        onChange={(newEase) => {
                          const tid = selectedKey.trackId as NumericTrack;
                          const list = (clip.tracks[tid] ?? []).map((k, i) =>
                            i === selectedKey.index ? { ...k, ease: newEase } : k,
                          );
                          updateNumericTrack(tid, list);
                        }}
                      />
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-line bg-panel/40 p-6 text-center">
                  <Diamond className="mb-2.5 h-6 w-6 text-muted/75" strokeWidth={1.75} />
                  <p className="text-body font-semibold text-foreground">No Keyframe Selected</p>
                  <p className="mt-1 text-caption text-muted leading-relaxed">
                    Click or drag any diamond pin on the timeline below. Double-click track to add.
                  </p>
                  <button
                    type="button"
                    className={cn(BUTTON, "mt-3.5 h-8 w-[148px] justify-center shrink-0")}
                    onClick={() => addKeyframeAtTime(activeTrackId, playheadTimeRef.current)}
                  >
                    <Plus className="h-3.5 w-3.5 shrink-0" />
                    <span>Add Key</span>
                    <span
                      ref={addKeyInspectorTimeRef}
                      className="font-mono tabular-nums text-muted text-micro inline-block w-[5ch] text-left"
                    >
                      ({playheadTime.toFixed(2)}s)
                    </span>
                  </button>
                </div>
              )
            ) : (
              <div className="rounded-lg border border-line bg-panel p-3.5 space-y-3.5">
                <div>
                  <span className="block text-caption font-semibold text-foreground">
                    State Choreography
                  </span>
                  <p className="mt-0.5 text-[11px] text-muted leading-relaxed">
                    Configures state machine behavior and transitions for Showcase and React
                    exports.
                  </p>
                </div>

                <div className="grid gap-1.5 text-caption font-medium text-foreground">
                  <span>Motion State:</span>
                  <Select value={stateId} onValueChange={(id) => setStateId(id)}>
                    <SelectTrigger size="compact" className="w-full font-medium" />
                    <SelectContent>
                      {Object.keys(recipes.states).map((id, idx) => (
                        <SelectItem key={id} value={id} index={idx}>
                          {stateLabel(id)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-1.5 text-caption font-medium text-foreground">
                  <span>Held Face Expression:</span>
                  <Select
                    value={state?.face || "__follow__"}
                    onValueChange={(val) =>
                      changeState({ face: val === "__follow__" ? undefined : val })
                    }
                  >
                    <SelectTrigger size="compact" className="w-full font-medium" />
                    <SelectContent>
                      <SelectItem value="__follow__" index={0}>
                        Follow clip track
                      </SelectItem>
                      {recipes.expressionNames.map((id, idx) => (
                        <SelectItem key={id} value={id} index={idx + 1}>
                          {id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-1.5 text-caption font-medium text-foreground">
                  <span>Morph Decoration:</span>
                  <Select
                    value={state?.morph || "__none__"}
                    onValueChange={(val) =>
                      changeState({ morph: val === "__none__" ? undefined : val })
                    }
                  >
                    <SelectTrigger size="compact" className="w-full font-medium" />
                    <SelectContent>
                      <SelectItem value="__none__" index={0}>
                        None
                      </SelectItem>
                      {Object.keys(recipes.constants.morph.stateMap).map((id, idx) => (
                        <SelectItem key={id} value={id} index={idx + 1}>
                          {id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-1.5 text-caption font-medium text-foreground">
                  <span>Next State:</span>
                  <Select
                    value={state?.next || "__loop__"}
                    onValueChange={(val) =>
                      changeState({ next: val === "__loop__" ? undefined : val })
                    }
                  >
                    <SelectTrigger size="compact" className="w-full font-medium" />
                    <SelectContent>
                      <SelectItem value="__loop__" index={0}>
                        Loop in this state
                      </SelectItem>
                      {Object.keys(recipes.states).map((id, idx) => (
                        <SelectItem key={id} value={id} index={idx + 1}>
                          {stateLabel(id)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-1.5 text-caption font-medium text-foreground">
                  <span>Hold Duration:</span>
                  <ScrubberInput
                    label="Hold"
                    value={state?.holdSeconds ?? clip.duration}
                    defaultValue={clip.duration}
                    step={0.1}
                    min={0.1}
                    max={60}
                    decimals={2}
                    suffix="s"
                    ariaLabel="State hold duration"
                    className="h-8 w-full"
                    onChange={(val) => {
                      if (val > 0 && Number.isFinite(val)) {
                        changeState({ holdSeconds: Math.round(val * 100) / 100 });
                      }
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      <footer className="flex h-[296px] shrink-0 flex-col border-t border-line bg-panel overflow-hidden max-[900px]:h-[36vh] max-[900px]:min-h-0">
        <div className="flex h-9 shrink-0 items-center justify-between border-b border-line bg-panel-raised/60 px-4 max-[900px]:justify-end max-[900px]:gap-2 max-[900px]:px-3 max-[900px]:[&>*]:shrink-0">
          <div className="flex items-center gap-2.5 max-[900px]:hidden">
            <span className="text-caption font-semibold text-foreground">Timeline</span>
            <span className="rounded-md bg-panel border border-line px-2 py-0.5 font-mono text-micro font-medium text-muted">
              {clipLabel(clip.name)}
            </span>
          </div>

          <div className="flex items-center gap-0.5">
            <div className="flex items-center gap-0.5 max-[900px]:order-last">
              <button
                type="button"
                className={GHOST_BTN}
                disabled={!past.length}
                onClick={undo}
                title="Undo (Ctrl+Z)"
                aria-label="Undo"
              >
                <Undo2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                className={GHOST_BTN}
                disabled={!future.length}
                onClick={redo}
                title="Redo (Ctrl+Shift+Z)"
                aria-label="Redo"
              >
                <Redo2 className="h-4 w-4" />
              </button>
              <div className="mx-1 h-4 w-px bg-line max-[900px]:hidden" />
            </div>

            <button
              type="button"
              className={GHOST_BTN}
              onClick={() => setZoom((z) => Math.max(0.6, Math.round((z - 0.2) * 10) / 10))}
              title="Zoom out timeline (-)"
              aria-label="Zoom out timeline"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="w-9 text-center font-mono text-micro font-medium text-muted tabular-nums select-none">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              className={GHOST_BTN}
              onClick={() => setZoom((z) => Math.min(2.5, Math.round((z + 0.2) * 10) / 10))}
              title="Zoom in timeline (+)"
              aria-label="Zoom in timeline"
            >
              <ZoomIn className="h-4 w-4" />
            </button>

            <button
              type="button"
              className={cn(GHOST_BTN, snapToGrid && "text-accent")}
              aria-pressed={snapToGrid}
              onClick={() => setSnapToGrid((v) => !v)}
              title={
                snapToGrid
                  ? "Grid Snapping: ON (0.05s). Keyframes and scrub snap to grid. Click to disable, or hold Shift while dragging."
                  : "Grid Snapping: OFF. Keyframes move smoothly without grid snapping. Click to enable."
              }
              aria-label="Toggle grid snapping"
            >
              <Magnet className="h-4 w-4" />
            </button>

            <button
              type="button"
              className="inline-flex h-7 w-[134px] shrink-0 items-center justify-center gap-1.5 rounded-md px-2 text-[12px] font-medium text-muted transition-colors hover:bg-hover hover:text-foreground active:scale-[0.98] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent max-[900px]:w-7 max-[900px]:gap-0 max-[900px]:px-0"
              onClick={() => addKeyframeAtTime(activeTrackId, playheadTimeRef.current)}
              title={`Add keyframe to ${activeTrackId}`}
              aria-label="Add keyframe"
            >
              <Plus className="h-3.5 w-3.5 text-muted shrink-0" />
              <span className="max-[900px]:hidden">Add Key</span>
              <span
                ref={addKeyTimeRef}
                className="inline-block w-[5.5ch] text-left font-mono text-[11px] tabular-nums text-muted/80 max-[900px]:hidden"
              >
                ({playheadTime.toFixed(2)}s)
              </span>
            </button>
          </div>
        </div>

        <div className="flex flex-1 min-h-0 overflow-hidden">
          <div className="flex w-36 shrink-0 flex-col border-r border-line bg-panel select-none z-10 shadow-[2px_0_8px_-2px_rgba(0,0,0,0.5)]">
            <div
              className={cn(
                "flex h-7 shrink-0 items-center border-b border-line px-3 text-muted bg-panel-raised/40",
                typeClass("caption"),
              )}
              style={{ fontVariationSettings: fontWeights.semibold }}
            >
              Tracks
            </div>

            <div className="flex flex-1 flex-col">
              {TRACK_METAS.map((meta) => {
                const isCurrent = activeTrackId === meta.id;
                const keys =
                  meta.id === "expression"
                    ? (clip.tracks.expression ?? [])
                    : (clip.tracks[meta.id as NumericTrack] ?? []);

                return (
                  <div
                    key={meta.id}
                    className={cn(
                      "group flex h-9 cursor-pointer items-center justify-between border-b border-line/40 px-3 transition-colors",
                      isCurrent
                        ? "bg-accent/15 text-foreground font-semibold"
                        : "hover:bg-panel/40 text-muted hover:text-foreground",
                    )}
                    onClick={() => {
                      setActiveTrackId(meta.id);
                      if (keys.length > 0) {
                        setSelectedKey({ trackId: meta.id, index: 0 });
                        setInspectorTab("keyframe");
                      }
                    }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={cn("h-2 w-2 shrink-0 rounded-full", meta.dotColor)} />
                      <span className="truncate text-[12px]">{meta.label}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="font-mono text-[11px] text-muted">{keys.length}</span>
                      <button
                        type="button"
                        className="rounded p-1 text-muted opacity-0 hover:text-foreground group-hover:opacity-100 hover:bg-white/10 transition-all"
                        title={`Add keyframe to ${meta.label}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          addKeyframeAtTime(meta.id, playheadTimeRef.current);
                        }}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div
            ref={scrollContainerRef}
            onTouchStart={() => {
              autoFollowResumeAt.current = performance.now() + 2500;
            }}
            onWheel={() => {
              autoFollowResumeAt.current = performance.now() + 2500;
            }}
            className="flex flex-1 min-w-0 flex-col overflow-x-auto overflow-y-hidden timeline-scrollbar bg-background select-none"
          >
            <div
              className="flex flex-col min-w-full shrink-0"
              style={{ width: `${timelineContentWidth}px` }}
            >
              <div
                ref={rulerRef}
                className="relative flex h-7 shrink-0 cursor-pointer select-none border-b border-line bg-panel-raised/50 py-1 touch-none"
                onPointerDown={handleRulerPointerDown}
                onPointerMove={handleRulerPointerMove}
                onPointerUp={handleRulerPointerUp}
                title="Click or drag ruler to scrub time"
              >
                {tickMarks.map((tick) => {
                  const x = LEFT_PAD + tick * pixelsPerSecond;
                  // Prevent overlapping tick label when it collides with clip duration badge (< 28px distance)
                  const isNearClipEnd =
                    Math.abs(x - (LEFT_PAD + clip.duration * pixelsPerSecond)) < 28 &&
                    Math.abs(tick - clip.duration) > 0.02;

                  return (
                    <div
                      key={tick}
                      className="pointer-events-none absolute top-0 -translate-x-1/2 flex flex-col items-center"
                      style={{ left: `${x}px` }}
                    >
                      {!isNearClipEnd && (
                        <span className="font-mono text-[10px] font-medium text-muted tabular-nums">
                          {tick.toFixed(2)}s
                        </span>
                      )}
                      <span className="h-1.5 w-px bg-line-2" />
                    </div>
                  );
                })}

                <div
                  className="pointer-events-none absolute top-0 -translate-x-1/2 flex flex-col items-center z-10"
                  style={{ left: `${LEFT_PAD + clip.duration * pixelsPerSecond}px` }}
                >
                  <span className="font-mono text-[10px] font-bold text-accent tabular-nums bg-panel/90 px-1 rounded shadow-xs">
                    {clip.duration.toFixed(2)}s
                  </span>
                  <span className="h-2 w-px bg-accent" />
                </div>

                <div
                  ref={playheadFlagRef}
                  className="pointer-events-none absolute top-0 z-30 -translate-x-1/2 will-change-[left]"
                  style={{ left: `${LEFT_PAD + playheadTime * pixelsPerSecond}px` }}
                >
                  <div className="flex flex-col items-center">
                    <div
                      ref={playheadFlagTextRef}
                      className="rounded bg-accent px-1.5 py-0.5 font-mono text-[10px] font-bold text-white shadow-md tabular-nums"
                    >
                      {playheadTime.toFixed(2)}s
                    </div>
                    <div className="h-1.5 w-1.5 rotate-45 bg-accent" />
                  </div>
                </div>
              </div>

              <div className="relative flex-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 right-0 z-20 overflow-visible">
                  <div
                    ref={playheadNeedleRef}
                    className="absolute inset-y-0 w-px bg-accent shadow-[0_0_8px_rgba(var(--accent-rgb),0.6)] will-change-[left]"
                    style={{ left: `${LEFT_PAD + playheadTime * pixelsPerSecond}px` }}
                  />
                </div>

                {TRACK_METAS.map((meta) => {
                  const isCurrent = activeTrackId === meta.id;
                  const keys =
                    meta.id === "expression"
                      ? (clip.tracks.expression ?? [])
                      : (clip.tracks[meta.id as NumericTrack] ?? []);

                  return (
                    <div
                      key={meta.id}
                      className={cn(
                        "group relative flex h-9 w-full border-b border-line/40 transition-colors cursor-crosshair select-none touch-pan-x",
                        isCurrent ? "bg-accent/5" : "hover:bg-panel/10",
                      )}
                      onDoubleClick={(e) => handleLaneDoubleClick(meta.id, e)}
                      title="Double click to add keyframe at this time"
                    >
                      {tickMarks.map((tick) => (
                        <div
                          key={tick}
                          className="pointer-events-none absolute bottom-0 top-0 w-px bg-line/20"
                          style={{ left: `${LEFT_PAD + tick * pixelsPerSecond}px` }}
                        />
                      ))}

                      <div
                        className="pointer-events-none absolute bottom-0 top-0 w-px border-r border-dashed border-white/20"
                        style={{ left: `${LEFT_PAD + clip.duration * pixelsPerSecond}px` }}
                      />

                      <div
                        className="pointer-events-none absolute inset-y-0 bg-white/[0.012]"
                        style={{
                          left: `${LEFT_PAD}px`,
                          width: `${activeClipWidth}px`,
                        }}
                      />

                      <div
                        className="absolute top-1/2 -translate-y-1/2 border-b border-line/30"
                        style={{
                          left: `${LEFT_PAD}px`,
                          width: `${timelineLaneWidth + RIGHT_PAD / 2}px`,
                        }}
                      />

                      {keys.map((key, keyIdx) => {
                        const isSelected =
                          selectedKey?.trackId === meta.id && selectedKey.index === keyIdx;
                        const x = LEFT_PAD + key.t * pixelsPerSecond;
                        const isDragging =
                          dragState?.trackId === meta.id && dragState.keyIndex === keyIdx;

                        return (
                          <button
                            key={keyIdx}
                            type="button"
                            aria-label={`${meta.label} keyframe ${keyIdx + 1} at ${key.t.toFixed(2)}s`}
                            aria-pressed={isSelected}
                            className={cn(
                              "absolute top-1/2 z-10 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rotate-45 cursor-grab touch-none border transition-transform duration-75 active:cursor-grabbing focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent",
                              isSelected
                                ? "scale-125 border-white bg-foreground shadow-[0_0_8px_rgba(255,255,255,0.9)]"
                                : cn(
                                    meta.diamondColor,
                                    "hover:scale-110 opacity-85 hover:opacity-100",
                                  ),
                            )}
                            style={{ left: `${x}px` }}
                            onPointerDown={(e) => handleKeyPointerDown(meta.id, keyIdx, key.t, e)}
                            onPointerMove={handleKeyPointerMove}
                            onPointerUp={handleKeyPointerUp}
                            onPointerCancel={handleKeyPointerUp}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedKey({ trackId: meta.id, index: keyIdx });
                              setActiveTrackId(meta.id);
                              setInspectorTab("keyframe");
                              seekTo(key.t);
                            }}
                          >
                            {isDragging ? (
                              <span className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 -rotate-45 whitespace-nowrap rounded bg-foreground px-1.5 py-0.5 font-mono text-[10px] font-bold text-background shadow-md">
                                {key.t.toFixed(2)}s
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </footer>

      {mobileSheet ? (
        <button
          type="button"
          aria-label="Close panel"
          className="hidden max-[900px]:fixed max-[900px]:inset-x-0 max-[900px]:bottom-16 max-[900px]:top-0 max-[900px]:z-30 max-[900px]:block max-[900px]:w-full max-[900px]:cursor-default max-[900px]:bg-black/50"
          onClick={() => setMobileSheet(null)}
        />
      ) : null}

      <nav
        aria-label="Editor tools"
        className="hidden max-[900px]:grid max-[900px]:h-16 max-[900px]:shrink-0 max-[900px]:grid-cols-3 max-[900px]:border-t max-[900px]:border-line max-[900px]:bg-panel max-[900px]:pb-[env(safe-area-inset-bottom)]"
      >
        <button
          type="button"
          data-active={mobileSheet === "mascot"}
          onClick={() => setMobileSheet((sheet) => (sheet === "mascot" ? null : "mascot"))}
          className="flex flex-col items-center justify-center gap-1 text-muted transition-colors duration-80 data-[active=true]:text-foreground"
        >
          <Sliders className="h-5 w-5" />
          <span className="text-caption">Mascot</span>
        </button>
        <button
          type="button"
          data-active={mobileSheet === "inspector" && inspectorTab === "keyframe"}
          onClick={() => openInspector("keyframe")}
          className="flex flex-col items-center justify-center gap-1 text-muted transition-colors duration-80 data-[active=true]:text-foreground"
        >
          <Diamond className="h-5 w-5" />
          <span className="text-caption">Keyframe</span>
        </button>
        <button
          type="button"
          data-active={mobileSheet === "inspector" && inspectorTab === "clip"}
          onClick={() => openInspector("clip")}
          className="flex flex-col items-center justify-center gap-1 text-muted transition-colors duration-80 data-[active=true]:text-foreground"
        >
          <Layers className="h-5 w-5" />
          <span className="text-caption">States</span>
        </button>
      </nav>
    </div>
  );
}
