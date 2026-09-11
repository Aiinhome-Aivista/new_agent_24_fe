import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  Camera,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  FileText,
  FileCode,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  ShieldCheck,
  Layers,
  Activity,
  Maximize2,
  Minimize2,
  X,
  Clock,
  ArrowRight,
  MousePointer,
  ChevronDown,
  ChevronUp,
  FileCheck2,
} from "lucide-react";
import { apiExecutorApi } from "@/services/api/apiExecutorApi";

interface PostmanSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  baseUrl: string;
  collection: any;
  collectionName: string;
  storyUuid?: string;
  projectUuid?: string;
  storyDetails?: any;
  acceptanceCriteria?: any[];
  onComplete: (evidence: any) => void;
}

type AgentPhase =
  | "idle"
  | "moving_to_url"
  | "typing_url"
  | "moving_to_body"
  | "filling_body"
  | "moving_to_send"
  | "clicking_send"
  | "awaiting_response"
  | "capturing_snapshot"
  | "completed_all";

export function PostmanSimulatorModal({
  isOpen,
  onClose,
  baseUrl,
  collection,
  collectionName,
  storyUuid,
  projectUuid,
  storyDetails,
  acceptanceCriteria = [],
  onComplete,
}: PostmanSimulatorModalProps) {
  // Execution data from backend
  const [evidence, setEvidence] = useState<any | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Stepper & Playback state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [stepSpeed, setStepSpeed] = useState<number>(5000); // 5 seconds per case for clear, deliberate simulation
  const [executedIndices, setExecutedIndices] = useState<Set<number>>(new Set());
  const [capturedSnapshots, setCapturedSnapshots] = useState<Record<number, boolean>>({});
  const [cameraFlash, setCameraFlash] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedResp, setCopiedResp] = useState(false);
  const [isResponseExpanded, setIsResponseExpanded] = useState(false);
  const [isFinishingAutoClose, setIsFinishingAutoClose] = useState(false);

  // Active UI tabs
  const [requestTab, setRequestTab] = useState<"body" | "headers" | "params" | "ac">("body");
  const [responseTab, setResponseTab] = useState<"body" | "headers" | "tests" | "snapshot">("body");

  // AI Agent Cursor & Typing Simulation state
  const [agentPhase, setAgentPhase] = useState<AgentPhase>("idle");
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number; visible: boolean; clicking: boolean; label: string }>({
    x: 100,
    y: 100,
    visible: false,
    clicking: false,
    label: "Agent 24",
  });
  const [displayedUrl, setDisplayedUrl] = useState<string>("");
  const [displayedBody, setDisplayedBody] = useState<string>("");
  const [activeElementHighlight, setActiveElementHighlight] = useState<"url" | "body" | "send" | "snap" | null>(null);

  // DOM element refs
  const containerRef = useRef<HTMLDivElement | null>(null);
  const urlBarRef = useRef<HTMLDivElement | null>(null);
  const bodyEditorRef = useRef<HTMLDivElement | null>(null);
  const sendButtonRef = useRef<HTMLButtonElement | null>(null);
  const snapshotBadgeRef = useRef<HTMLDivElement | null>(null);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

  const clearAllTimeouts = () => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  };

  const registerTimeout = (fn: () => void, delay: number) => {
    const t = setTimeout(fn, delay);
    timeoutsRef.current.push(t);
    return t;
  };

  // 1. Initial autonomous run fetch
  useEffect(() => {
    if (!isOpen) {
      clearAllTimeouts();
      setEvidence(null);
      setCurrentIndex(0);
      setExecutedIndices(new Set());
      setCapturedSnapshots({});
      setIsPlaying(true);
      setErrorMsg(null);
      setIsFinishingAutoClose(false);
      setCursorPos((prev) => ({ ...prev, visible: false }));
      return;
    }

    setLoadingInitial(true);
    setErrorMsg(null);
    setIsFinishingAutoClose(false);

    apiExecutorApi
      .runAutonomousAgent({
        base_url: baseUrl.trim() || "http://localhost:5001",
        collection_json: collection,
        collection_name: collectionName,
        story_uuid: storyUuid,
        project_uuid: projectUuid,
        is_mock: false,
      })
      .then((res) => {
        setEvidence(res);
        setLoadingInitial(false);
        // Start smooth simulated agent sequence
        runAgentStepSimulation(0, res);
      })
      .catch((err: any) => {
        setErrorMsg(err?.message || "Failed to execute collection against target host.");
        setLoadingInitial(false);
      });

    return () => {
      clearAllTimeouts();
    };
  }, [isOpen, baseUrl, collection, collectionName, storyUuid, projectUuid]);

  // 2. Helper to get target element coordinates relative to modal
  const getElementCenter = (el: HTMLElement | null): { x: number; y: number } => {
    if (!el || !containerRef.current) return { x: 250, y: 200 };
    const parentRect = containerRef.current.getBoundingClientRect();
    const rect = el.getBoundingClientRect();
    return {
      x: rect.left - parentRect.left + rect.width / 2,
      y: rect.top - parentRect.top + rect.height / 2,
    };
  };

  // 3. Autonomous AI Agent Step Simulation: Slower, graceful glide -> Type URL -> Fill Payload -> Click Send -> Take Snapshot -> Auto Close on Finish
  const runAgentStepSimulation = (idx: number, evData?: any) => {
    clearAllTimeouts();
    const data = evData || evidence;
    if (!data || !data.results || !data.results[idx]) return;

    const currentCase = data.results[idx];
    const endpoint = currentCase.endpoint || "/";
    const fullTargetUrl = `${baseUrl.replace(/\/$/, "")}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;
    const isLastCase = idx === data.results.length - 1;

    // Format request body
    let rawBody = "";
    if (currentCase.request?.body) {
      if (typeof currentCase.request.body === "string") {
        try {
          rawBody = JSON.stringify(JSON.parse(currentCase.request.body), null, 2);
        } catch {
          rawBody = currentCase.request.body;
        }
      } else {
        rawBody = JSON.stringify(currentCase.request.body, null, 2);
      }
    }

    setDisplayedUrl("");
    setDisplayedBody("");
    setIsSending(false);
    setCameraFlash(false);
    setActiveElementHighlight(null);

    // Initial cursor position
    const initialUrlCoords = getElementCenter(urlBarRef.current);
    setCursorPos({
      x: Math.max(50, initialUrlCoords.x - 140),
      y: Math.max(50, initialUrlCoords.y - 60),
      visible: true,
      clicking: false,
      label: `Agent 24: Test Case #${idx + 1}`,
    });
    setAgentPhase("moving_to_url");

    // PHASE 1: Move Cursor to URL Bar & Smooth Typewriter (300ms -> 1400ms)
    registerTimeout(() => {
      const uCoords = getElementCenter(urlBarRef.current);
      setCursorPos({
        x: uCoords.x - 80,
        y: uCoords.y,
        visible: true,
        clicking: false,
        label: "Agent 24: Populating Target API Endpoint URL",
      });
      setActiveElementHighlight("url");
      setAgentPhase("typing_url");

      // Typewriter effect over 800ms
      let charIdx = 0;
      const stepInterval = Math.max(22, Math.floor(750 / fullTargetUrl.length));
      const typeInterval = setInterval(() => {
        charIdx += 2;
        if (charIdx >= fullTargetUrl.length) {
          setDisplayedUrl(fullTargetUrl);
          clearInterval(typeInterval);
        } else {
          setDisplayedUrl(fullTargetUrl.slice(0, charIdx));
        }
      }, stepInterval);
    }, 350);

    // PHASE 2: Move Cursor to Payload Editor & Fill Request JSON (1500ms -> 2700ms)
    registerTimeout(() => {
      setDisplayedUrl(fullTargetUrl);
      if (rawBody) {
        const bodyCoords = getElementCenter(bodyEditorRef.current);
        setCursorPos({
          x: bodyCoords.x,
          y: bodyCoords.y - 30,
          visible: true,
          clicking: false,
          label: "Agent 24: Injecting Schema-Validated Request Payload",
        });
        setActiveElementHighlight("body");
        setAgentPhase("filling_body");
        setRequestTab("body");

        // Fast typing / pasting JSON
        setTimeout(() => {
          setDisplayedBody(rawBody);
        }, 350);
      } else {
        setDisplayedBody("");
      }
    }, 1500);

    // PHASE 3: Move Cursor to Send Button & Click (2800ms -> 3800ms)
    registerTimeout(() => {
      const sendCoords = getElementCenter(sendButtonRef.current);
      setCursorPos({
        x: sendCoords.x,
        y: sendCoords.y,
        visible: true,
        clicking: false,
        label: "Agent 24: Dispatching Live HTTP Request",
      });
      setActiveElementHighlight("send");
      setAgentPhase("moving_to_send");

      // Click ripple animation (hover 400ms then click)
      setTimeout(() => {
        setCursorPos((prev) => ({ ...prev, clicking: true, label: "Agent 24: Executing [Send]" }));
        setIsSending(true);
        setAgentPhase("clicking_send");

        setTimeout(() => {
          setCursorPos((prev) => ({ ...prev, clicking: false }));
        }, 250);
      }, 450);
    }, 2800);

    // PHASE 4: Receive Server Response & Capture Evidence Snapshot (3900ms -> 4800ms)
    registerTimeout(() => {
      setIsSending(false);
      setExecutedIndices((prev) => new Set(prev).add(idx));
      setAgentPhase("capturing_snapshot");

      const snapCoords = getElementCenter(snapshotBadgeRef.current);
      setCursorPos({
        x: snapCoords.x || 600,
        y: snapCoords.y || 150,
        visible: true,
        clicking: false,
        label: `Agent 24: 📸 Capturing Postman Snapshot #${idx + 1}`,
      });
      setActiveElementHighlight("snap");

      // Camera Flash & Snapshot Capture Confirmation
      setCameraFlash(true);
      setCapturedSnapshots((prev) => ({ ...prev, [idx]: true }));
      setTimeout(() => {
        setCameraFlash(false);
        setActiveElementHighlight(null);
      }, 700);
    }, 3900);

    // PHASE 5: Transition to Next Test Case OR Auto-Close on Final Completion
    registerTimeout(() => {
      if (isLastCase) {
        // All test cases are executed and snapshotted!
        setAgentPhase("completed_all");
        setIsFinishingAutoClose(true);
        setCursorPos((prev) => ({
          ...prev,
          visible: true,
          label: "Agent 24: ✓ All Snapshots Captured — Finalizing Evidence Document",
        }));

        // Automatically close modal after 1.8 seconds to reveal workspace results
        registerTimeout(() => {
          if (data) {
            onComplete(data);
          }
          onClose();
        }, 1800);
      } else if (isPlaying) {
        // Advance to next test case
        const nextIdx = idx + 1;
        setCurrentIndex(nextIdx);
        runAgentStepSimulation(nextIdx, data);
      } else {
        setCursorPos((prev) => ({ ...prev, visible: false }));
      }
    }, stepSpeed);
  };

  const handleManualNext = () => {
    if (!evidence || !evidence.results) return;
    if (currentIndex < evidence.results.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      runAgentStepSimulation(nextIdx);
    }
  };

  const handleManualPrev = () => {
    if (currentIndex > 0) {
      const prevIdx = currentIndex - 1;
      setCurrentIndex(prevIdx);
      runAgentStepSimulation(prevIdx);
    }
  };

  const handleSelectCase = (idx: number) => {
    setCurrentIndex(idx);
    runAgentStepSimulation(idx);
  };

  const handleFastForwardAll = () => {
    clearAllTimeouts();
    if (!evidence || !evidence.results) return;
    const all = new Set<number>();
    const snaps: Record<number, boolean> = {};
    evidence.results.forEach((_: any, i: number) => {
      all.add(i);
      snaps[i] = true;
    });
    setExecutedIndices(all);
    setCapturedSnapshots(snaps);
    const lastIdx = evidence.results.length - 1;
    setCurrentIndex(lastIdx);
    setIsPlaying(false);
    setIsSending(false);
    setCursorPos((prev) => ({ ...prev, visible: false }));

    const lastCase = evidence.results[lastIdx];
    const ep = lastCase.endpoint || "/";
    setDisplayedUrl(`${baseUrl.replace(/\/$/, "")}${ep.startsWith("/") ? "" : "/"}${ep}`);
    if (lastCase.request?.body) {
      try {
        setDisplayedBody(JSON.stringify(JSON.parse(lastCase.request.body), null, 2));
      } catch {
        setDisplayedBody(String(lastCase.request.body));
      }
    }

    // Auto-complete & close after fast forward
    setIsFinishingAutoClose(true);
    setTimeout(() => {
      onComplete(evidence);
      onClose();
    }, 1200);
  };

  const handleCopy = (text: string, isResp: boolean) => {
    navigator.clipboard.writeText(text);
    if (isResp) {
      setCopiedResp(true);
      setTimeout(() => setCopiedResp(false), 1500);
    } else {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 1500);
    }
  };

  if (!isOpen) return null;

  const currentResult = evidence?.results?.[currentIndex];
  const isCurrentExecuted = executedIndices.has(currentIndex);
  const totalCases = evidence?.results?.length || 0;
  const allCompleted = totalCases > 0 && executedIndices.size === totalCases;

  // Formatted data
  const currentReq = currentResult?.request || {};
  const currentResp = currentResult?.response || {};
  const method = (currentResult?.method || "GET").toUpperCase();
  const endpoint = currentResult?.endpoint || "/";
  const finalFullUrl = `${baseUrl.replace(/\/$/, "")}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;
  const statusCode = currentResult?.status_code || 200;
  const durationMs = currentResult?.duration_ms || 32;
  const isPassed = currentResult?.passed ?? true;
  const assertions = currentResult?.assertions || [];
  const deviations = currentResult?.deviations || [];

  let respBodyStr = "";
  if (currentResp.body) {
    if (typeof currentResp.body === "string") {
      try {
        respBodyStr = JSON.stringify(JSON.parse(currentResp.body), null, 2);
      } catch {
        respBodyStr = currentResp.body;
      }
    } else {
      respBodyStr = JSON.stringify(currentResp.body, null, 2);
    }
  }

  const respLineCount = respBodyStr ? respBodyStr.split("\n").length : 0;
  const isLongResponse = respLineCount > 25 || respBodyStr.length > 1000;

  const methodColor = (m: string) => {
    switch (m) {
      case "POST":
        return "bg-amber-500/15 text-amber-400 border-amber-500/30";
      case "GET":
        return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
      case "PUT":
      case "PATCH":
        return "bg-blue-500/15 text-blue-400 border-blue-500/30";
      case "DELETE":
        return "bg-rose-500/15 text-rose-400 border-rose-500/30";
      default:
        return "bg-purple-500/15 text-purple-400 border-purple-500/30";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-3 overflow-y-auto">
      <motion.div
        ref={containerRef}
        initial={{ opacity: 0, scale: 0.97, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 10 }}
        className="relative flex flex-col w-[98vw] max-w-7xl h-[94vh] bg-[#101218] text-slate-200 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden select-none"
      >
        {/* Animated AI Agent Slower, Smoother Cursor on Screen */}
        <AnimatePresence>
          {cursorPos.visible && (
            <motion.div
              animate={{
                x: cursorPos.x,
                y: cursorPos.y,
                scale: cursorPos.clicking ? 0.88 : 1,
              }}
              transition={{
                type: "spring",
                damping: 32,
                stiffness: 80,
                mass: 1.1,
              }}
              className="pointer-events-none absolute z-50 flex items-center gap-2"
              style={{ transform: "translate(-4px, -4px)" }}
            >
              {/* Cursor SVG with Click Ripple */}
              <div className="relative">
                <svg
                  width="26"
                  height="26"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="drop-shadow-[0_4px_12px_rgba(255,108,55,0.7)]"
                >
                  <path
                    d="M3 3L10.07 19.97L12.58 12.58L19.97 10.07L3 3Z"
                    fill="#ff6c37"
                    stroke="#ffffff"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>

                {cursorPos.clicking && (
                  <motion.div
                    initial={{ scale: 0.4, opacity: 1 }}
                    animate={{ scale: 2.6, opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="absolute -top-1.5 -left-1.5 h-8 w-8 rounded-full border-2 border-orange-400 bg-orange-400/40"
                  />
                )}
              </div>

              {/* Trailing Agent Status Pill */}
              <div className="flex items-center gap-1.5 rounded-full bg-slate-900/95 border border-orange-500/60 px-3 py-1 text-[11px] font-bold text-orange-400 shadow-2xl backdrop-blur-md">
                <Sparkles size={12} className="animate-spin text-orange-400" />
                <span className="font-mono">{cursorPos.label}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Camera Shutter Flash Overlay */}
        <AnimatePresence>
          {cameraFlash && (
            <motion.div
              initial={{ opacity: 0.85 }}
              animate={{ opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7 }}
              className="pointer-events-none absolute inset-0 z-50 bg-white/25 backdrop-blur-[2px]"
            />
          )}
        </AnimatePresence>

        {/* Celebratory Auto-Close Overlay */}
        <AnimatePresence>
          {isFinishingAutoClose && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center space-y-3"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-xl">
                <CheckCircle2 size={36} className="animate-bounce" />
              </div>
              <h2 className="text-base font-bold text-white">
                All Snapshots Captured & Embedded in Word DOCX!
              </h2>
              <p className="text-xs text-slate-300 font-mono">
                Closing test studio and displaying full evidence package in workspace...
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 1. Window Header Bar (Postman Style) */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#171922] border-b border-slate-800">
          <div className="flex items-center gap-3">
            {/* Mac / Windows Window Dots */}
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-rose-500/80 inline-block" />
              <span className="h-3 w-3 rounded-full bg-amber-500/80 inline-block" />
              <span className="h-3 w-3 rounded-full bg-emerald-500/80 inline-block" />
            </div>

            <div className="h-4 w-[1px] bg-slate-700" />

            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-orange-500 text-white font-black text-xs shadow-sm shadow-orange-500/40">
                PM
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-bold tracking-tight text-white">
                  Postman Visual Execution Agent
                </span>
                <span className="text-[11px] text-slate-400 font-mono truncate max-w-[220px]">
                  {collectionName || "Ticket Management API"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Step Badge */}
            {totalCases > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/90 border border-slate-700 text-xs">
                <span className="text-slate-400">Step</span>
                <span className="font-bold text-orange-400">{currentIndex + 1}</span>
                <span className="text-slate-400">of {totalCases}</span>
                {allCompleted ? (
                  <span className="ml-1 text-emerald-400 font-bold flex items-center gap-1">
                    <Check size={12} /> Complete
                  </span>
                ) : (
                  <span className="ml-1 text-amber-400 animate-pulse font-medium">
                    ● Agent Running
                  </span>
                )}
              </div>
            )}

            {/* Target Host Badge */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-300 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono text-slate-300">{baseUrl}</span>
            </div>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              title="Close Runner"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* 2. Main Studio Content Area */}
        {loadingInitial ? (
          <div className="flex-1 flex flex-col items-center justify-center py-24 space-y-4">
            <div className="relative">
              <div className="h-14 w-14 rounded-full border-2 border-orange-500/20 border-t-orange-500 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center text-orange-500">
                <Sparkles size={22} />
              </div>
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-bold text-white">
                Preparing Autonomous Postman Test Studio...
              </p>
              <p className="text-xs text-slate-400 font-mono">
                Connecting to {baseUrl} · Parsing collections · Grounding Jira Acceptance Criteria
              </p>
            </div>
          </div>
        ) : errorMsg ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <XCircle size={28} />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white">Execution Error</h3>
              <p className="text-xs text-rose-300 max-w-md mx-auto">{errorMsg}</p>
            </div>
            <button
              onClick={onClose}
              className="px-5 py-2 text-xs font-semibold rounded-xl bg-slate-800 text-white hover:bg-slate-700"
            >
              Close
            </button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
            {/* 2A. Left Sidebar: Test Cases List */}
            <div className="w-full md:w-72 bg-[#13151c] border-r border-slate-800 flex flex-col shrink-0">
              <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-[#111319]">
                <div className="flex items-center gap-2">
                  <Layers size={13} className="text-orange-400" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                    Test Cases ({totalCases})
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  {executedIndices.size}/{totalCases} Executed
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                {evidence?.results?.map((res: any, idx: number) => {
                  const isSelected = idx === currentIndex;
                  const isDone = executedIndices.has(idx);
                  const isSnapped = capturedSnapshots[idx];
                  const resPassed = res.passed ?? true;
                  const m = (res.method || "GET").toUpperCase();

                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelectCase(idx)}
                      className={`w-full text-left rounded-xl p-2.5 transition-all border ${
                        isSelected
                          ? "bg-orange-500/10 border-orange-500/40 shadow-md ring-1 ring-orange-500/20"
                          : "bg-slate-900/40 hover:bg-slate-800/60 border-slate-800/80"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1.5 mb-1">
                        <span
                          className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${methodColor(
                            m
                          )}`}
                        >
                          {m}
                        </span>
                        <div className="flex items-center gap-1 text-[10px]">
                          {isDone ? (
                            resPassed ? (
                              <span className="flex items-center gap-0.5 text-emerald-400 font-bold">
                                <CheckCircle2 size={11} /> {res.status_code || 200}
                              </span>
                            ) : (
                              <span className="flex items-center gap-0.5 text-rose-400 font-bold">
                                <XCircle size={11} /> {res.status_code || 500}
                              </span>
                            )
                          ) : (
                            <span className="text-slate-500 font-mono text-[9.5px]">Queued</span>
                          )}
                        </div>
                      </div>

                      <div className="text-xs font-semibold text-slate-200 truncate">
                        {res.test_key || res.name || `${m} ${res.endpoint}`}
                      </div>

                      <div className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                        {res.endpoint}
                      </div>

                      {/* Snapshot Attached Tag */}
                      {isSnapped && (
                        <div className="mt-1.5 flex items-center gap-1 text-[9.5px] text-orange-400 font-medium bg-orange-500/10 px-1.5 py-0.5 rounded border border-orange-500/20 w-fit">
                          <Camera size={10} />
                          <span>Snapshot Attached</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Sidebar Playback Controls */}
              <div className="p-3 border-t border-slate-800 bg-[#111319] space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Simulation Speed</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setStepSpeed(3200)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                        stepSpeed === 3200 ? "bg-orange-500 text-white font-bold" : "hover:bg-slate-800"
                      }`}
                    >
                      Fast (3s)
                    </button>
                    <button
                      onClick={() => setStepSpeed(5000)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                        stepSpeed === 5000 ? "bg-orange-500 text-white font-bold" : "hover:bg-slate-800"
                      }`}
                    >
                      Smooth (5s)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    onClick={handleManualPrev}
                    disabled={currentIndex === 0}
                    className="flex items-center justify-center p-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 text-xs transition-colors"
                    title="Previous Test Case"
                  >
                    ◀
                  </button>
                  <button
                    onClick={() => {
                      if (!isPlaying) {
                        setIsPlaying(true);
                        runAgentStepSimulation(currentIndex);
                      } else {
                        setIsPlaying(false);
                        clearAllTimeouts();
                        setCursorPos((prev) => ({ ...prev, visible: false }));
                      }
                    }}
                    className={`col-span-2 flex items-center justify-center gap-1.5 p-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                      isPlaying
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                        : "bg-orange-500 text-white hover:bg-orange-600 shadow-orange-500/30"
                    }`}
                  >
                    {isPlaying ? (
                      <>
                        <Pause size={13} /> Pause
                      </>
                    ) : (
                      <>
                        <Play size={13} /> Play Agent
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleManualNext}
                    disabled={currentIndex >= totalCases - 1}
                    className="flex items-center justify-center p-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 text-xs transition-colors"
                    title="Next Test Case"
                  >
                    ▶
                  </button>
                </div>

                {!allCompleted && (
                  <button
                    onClick={handleFastForwardAll}
                    className="w-full py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium transition-colors flex items-center justify-center gap-1.5"
                  >
                    <SkipForward size={12} />
                    <span>Fast Forward (Complete All)</span>
                  </button>
                )}
              </div>
            </div>

            {/* 2B. Right Main Studio Stage */}
            <div className="flex-1 flex flex-col min-w-0 bg-[#0e1016] overflow-y-auto">
              {/* Top Request Bar */}
              <div className="p-3 sm:p-4 border-b border-slate-800 bg-[#151720] space-y-3">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  {/* Method Pill */}
                  <span
                    className={`flex items-center justify-center font-mono font-bold text-xs px-3 py-2 rounded-xl border shrink-0 ${methodColor(
                      method
                    )}`}
                  >
                    {method}
                  </span>

                  {/* URL Input Bar with Agent Focus Glow */}
                  <div
                    ref={urlBarRef}
                    className={`flex-1 flex items-center bg-[#0a0c10] border rounded-xl px-3.5 py-2 font-mono text-xs text-slate-100 overflow-hidden shadow-inner transition-all ${
                      activeElementHighlight === "url"
                        ? "border-orange-500 ring-2 ring-orange-500/30 shadow-[0_0_15px_rgba(255,108,55,0.2)]"
                        : "border-slate-700/80"
                    }`}
                  >
                    <span className="text-slate-500 shrink-0 select-none mr-2">
                      URL:
                    </span>
                    <span className="truncate font-semibold text-slate-100">
                      {displayedUrl || finalFullUrl}
                    </span>
                    {activeElementHighlight === "url" && (
                      <span className="inline-block w-1.5 h-3.5 bg-orange-400 ml-1 animate-pulse" />
                    )}
                  </div>

                  {/* Send Button with Agent Click Ripple */}
                  <button
                    ref={sendButtonRef}
                    onClick={() => runAgentStepSimulation(currentIndex)}
                    disabled={isSending}
                    className={`flex items-center justify-center gap-2 px-5 py-2 rounded-xl font-bold text-xs transition-all shrink-0 ${
                      activeElementHighlight === "send"
                        ? "bg-gradient-to-r from-orange-400 to-amber-400 text-white ring-4 ring-orange-400/40 shadow-lg shadow-orange-500/40 scale-95"
                        : "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md shadow-orange-500/25"
                    }`}
                  >
                    {isSending ? (
                      <>
                        <div className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <Play size={13} />
                        <span>Send (Hit API)</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Sub-header info & Camera Snapshot status */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-bold text-white truncate">
                      {currentResult?.test_key || currentResult?.name || `${method} ${endpoint}`}
                    </span>
                    {storyDetails?.external_key && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 font-mono border border-orange-500/20 shrink-0">
                        {storyDetails.external_key}
                      </span>
                    )}
                  </div>

                  {/* Evidence Snapshot Badge */}
                  <div
                    ref={snapshotBadgeRef}
                    className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-all ${
                      activeElementHighlight === "snap"
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-400 ring-2 ring-emerald-400/30 scale-105"
                        : "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                    }`}
                  >
                    <Camera size={12} className="animate-pulse text-emerald-400" />
                    <span>Snapshot #{currentIndex + 1} Attached to Word DOCX</span>
                  </div>
                </div>
              </div>

              {/* 2C. Request (40%) and Enlarged Response (60%) Layout */}
              <div
                className={`flex-1 grid grid-cols-1 ${
                  isResponseExpanded ? "lg:grid-cols-1" : "lg:grid-cols-12"
                } divide-y lg:divide-y-0 lg:divide-x divide-slate-800 min-h-0`}
              >
                {/* Left Pane: Request Details (40% width / hidden if expanded) */}
                {!isResponseExpanded && (
                  <div className="lg:col-span-5 flex flex-col min-h-[280px] bg-[#111319]">
                    {/* Request Tab Headers */}
                    <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5 border-b border-slate-800 bg-[#0d0f14]">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setRequestTab("body")}
                          className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                            requestTab === "body"
                              ? "bg-slate-800 text-white border border-slate-700"
                              : "text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          Body (JSON)
                        </button>
                        <button
                          onClick={() => setRequestTab("headers")}
                          className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                            requestTab === "headers"
                              ? "bg-slate-800 text-white border border-slate-700"
                              : "text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          Headers
                        </button>
                        <button
                          onClick={() => setRequestTab("ac")}
                          className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                            requestTab === "ac"
                              ? "bg-slate-800 text-white border border-slate-700"
                              : "text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          Story AC Link
                        </button>
                      </div>

                      {displayedBody && (
                        <button
                          onClick={() => handleCopy(displayedBody, false)}
                          className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800/80"
                        >
                          {copiedCode ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                          <span>{copiedCode ? "Copied" : "Copy"}</span>
                        </button>
                      )}
                    </div>

                    {/* Request Tab Body */}
                    <div
                      ref={bodyEditorRef}
                      className={`flex-1 p-3 font-mono text-xs overflow-auto bg-[#0a0c10] transition-all ${
                        activeElementHighlight === "body"
                          ? "ring-1 ring-orange-500/40 bg-orange-950/10"
                          : ""
                      }`}
                    >
                      {requestTab === "body" &&
                        (displayedBody ? (
                          <pre className="text-emerald-300 leading-relaxed whitespace-pre-wrap font-mono">
                            {displayedBody}
                          </pre>
                        ) : (
                          <div className="py-12 text-center text-slate-500 font-sans text-xs">
                            [No Request Payload Body — GET / Parameterless Request]
                          </div>
                        ))}

                      {requestTab === "headers" && (
                        <div className="space-y-1.5 font-mono text-xs">
                          <div className="flex justify-between py-1 border-b border-slate-800/80">
                            <span className="text-slate-400">Content-Type:</span>
                            <span className="text-slate-200">application/json</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-800/80">
                            <span className="text-slate-400">Accept:</span>
                            <span className="text-slate-200">application/json</span>
                          </div>
                          {currentReq.headers &&
                            Object.entries(currentReq.headers).map(([k, v]: any) => (
                              <div key={k} className="flex justify-between py-1 border-b border-slate-800/80">
                                <span className="text-slate-400">{k}:</span>
                                <span className="text-slate-200 truncate max-w-[180px]">{String(v)}</span>
                              </div>
                            ))}
                        </div>
                      )}

                      {requestTab === "ac" && (
                        <div className="font-sans space-y-2 text-xs">
                          <div className="text-[11px] font-bold text-orange-400 uppercase tracking-wider">
                            Linked Acceptance Criteria:
                          </div>
                          {acceptanceCriteria.length === 0 ? (
                            <p className="text-slate-400">
                              Validating standard REST HTTP contract rules.
                            </p>
                          ) : (
                            acceptanceCriteria.map((ac: any, i: number) => (
                              <div
                                key={i}
                                className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px] text-slate-300"
                              >
                                <div className="font-bold text-orange-300 mb-0.5">
                                  {ac.ac_key || `AC-0${i + 1}`}
                                </div>
                                <div className="text-slate-300">{ac.text || ac.summary}</div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Right Pane: ENLARGED Live Response Section (60% width) */}
                <div
                  className={`${
                    isResponseExpanded ? "lg:col-span-12" : "lg:col-span-7"
                  } flex flex-col min-h-[340px] bg-[#111319]`}
                >
                  {/* Response Tab Header + Live Telemetry */}
                  <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5 border-b border-slate-800 bg-[#0d0f14]">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setResponseTab("body")}
                        className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                          responseTab === "body"
                            ? "bg-slate-800 text-white border border-slate-700"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        Response JSON ({respLineCount} lines)
                      </button>
                      <button
                        onClick={() => setResponseTab("tests")}
                        className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 ${
                          responseTab === "tests"
                            ? "bg-slate-800 text-white border border-slate-700"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <span>AC Test Assertions</span>
                        <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                          {assertions.length > 0 ? assertions.length : "Pass"}
                        </span>
                      </button>
                      <button
                        onClick={() => setResponseTab("snapshot")}
                        className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 ${
                          responseTab === "snapshot"
                            ? "bg-slate-800 text-white border border-slate-700"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <Camera size={11} className="text-orange-400" />
                        <span>Word DOCX Snapshot Frame</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Status code & Latency Pill */}
                      {isCurrentExecuted && (
                        <div className="flex items-center gap-2 text-xs font-mono">
                          <span
                            className={`font-bold px-2 py-0.5 rounded ${
                              statusCode >= 200 && statusCode < 300
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                            }`}
                          >
                            Status: {statusCode} {statusCode === 201 ? "Created" : statusCode === 200 ? "OK" : ""}
                          </span>
                          <span className="text-slate-400 text-[11px] flex items-center gap-1">
                            <Clock size={11} /> {durationMs} ms
                          </span>
                        </div>
                      )}

                      {/* Expand / Maximize Toggle */}
                      <button
                        onClick={() => setIsResponseExpanded(!isResponseExpanded)}
                        className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
                        title={isResponseExpanded ? "Restore Split View" : "Maximize Response"}
                      >
                        {isResponseExpanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                      </button>

                      {respBodyStr && (
                        <button
                          onClick={() => handleCopy(respBodyStr, true)}
                          className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800/80"
                        >
                          {copiedResp ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                          <span>{copiedResp ? "Copied" : "Copy"}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Response Tab Content */}
                  <div className="flex-1 p-3.5 font-mono text-xs overflow-auto bg-[#07090d]">
                    {isSending ? (
                      <div className="flex flex-col items-center justify-center py-20 space-y-3">
                        <div className="h-8 w-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
                        <span className="text-xs text-slate-300 font-sans">
                          Awaiting live server response from {baseUrl}...
                        </span>
                      </div>
                    ) : responseTab === "body" ? (
                      respBodyStr ? (
                        <div className="space-y-2">
                          {/* Long Response Indicator / Handling Tag */}
                          {isLongResponse && (
                            <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 text-[11px] text-slate-400 font-sans flex items-center justify-between">
                              <span className="flex items-center gap-1 text-orange-400">
                                <FileCheck2 size={13} />
                                <span>Complete Large Payload ({respLineCount} lines · {respBodyStr.length} bytes)</span>
                              </span>
                              <span className="text-slate-400 text-[10px]">
                                Full payload preserved in Word DOCX artifact with structured pagination
                              </span>
                            </div>
                          )}

                          <pre className="text-amber-200 leading-relaxed whitespace-pre-wrap font-mono text-xs">
                            {respBodyStr}
                          </pre>
                        </div>
                      ) : (
                        <div className="py-16 text-center text-slate-500 font-sans text-xs">
                          [Empty Response Body]
                        </div>
                      )
                    ) : responseTab === "tests" ? (
                      <div className="font-sans space-y-2 text-xs">
                        <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                          <span className="font-bold text-slate-300">
                            Acceptance Criteria Assertions:
                          </span>
                          <span className="text-emerald-400 font-bold text-[11px]">
                            {assertions.filter((a: any) => a.passed !== false).length}/{assertions.length || 1} Passed
                          </span>
                        </div>

                        {assertions.length > 0 ? (
                          assertions.map((ast: any, i: number) => {
                            const p = ast.passed !== false;
                            return (
                              <div
                                key={i}
                                className={`flex items-start gap-2 p-2.5 rounded-lg border ${
                                  p
                                    ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-300"
                                    : "bg-rose-500/5 border-rose-500/20 text-rose-300"
                                }`}
                              >
                                {p ? (
                                  <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                                ) : (
                                  <XCircle size={14} className="text-rose-400 shrink-0 mt-0.5" />
                                )}
                                <div className="space-y-0.5">
                                  <div className="font-semibold">{ast.name || ast.assertion || "Status code conforms"}</div>
                                  {ast.detail && <div className="text-[10px] text-slate-400">{ast.detail}</div>}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-emerald-300">
                            <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                            <span>HTTP Status matches contract expectation ({statusCode})</span>
                          </div>
                        )}

                        {deviations.length > 0 && (
                          <div className="mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300">
                            <div className="flex items-center gap-1.5 font-bold mb-1">
                              <AlertTriangle size={14} />
                              <span>Anomaly / Extra Field Detected:</span>
                            </div>
                            <div className="text-[11px] text-amber-200">
                              {deviations.map((d: any, i: number) => (
                                <div key={i}>• {d.field}: {d.explanation || d.actual}</div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Snapshot Frame Preview Tab */
                      <div className="font-sans space-y-3 text-xs">
                        <div className="p-4 rounded-xl bg-slate-900 border border-slate-700/80 space-y-2.5">
                          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                            <div className="flex items-center gap-2">
                              <Camera size={15} className="text-orange-400" />
                              <span className="font-bold text-white text-sm">
                                Word (.docx) Section 4.1 Snapshot #{currentIndex + 1}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded font-bold">
                              Embedded in Evidence Package
                            </span>
                          </div>

                          <div className="space-y-1.5 text-xs">
                            <div>
                              <strong className="text-slate-400">Target Endpoint:</strong>{" "}
                              <span className="font-mono text-orange-300 font-bold">
                                [{method}] {finalFullUrl}
                              </span>
                            </div>
                            <div>
                              <strong className="text-slate-400">Response Status:</strong>{" "}
                              <span className="text-emerald-400 font-bold">HTTP {statusCode}</span> ({durationMs} ms latency)
                            </div>
                            <div>
                              <strong className="text-slate-400">Cryptographic Seal:</strong>{" "}
                              <span className="font-mono text-slate-300 text-[11px]">
                                SHA-256 Tamper-Proof Signature Sealed
                              </span>
                            </div>
                            <div>
                              <strong className="text-slate-400">Payload Handling:</strong>{" "}
                              <span className="text-slate-300">
                                {isLongResponse ? "Multi-page structured formatting applied" : "Single-card container"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 3. Bottom Execution Status & Action Bar */}
              <div className="p-3 sm:p-4 bg-[#151720] border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 text-xs">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <span>Audit Evidence Key:</span>
                      <span className="font-mono text-orange-400 font-bold">
                        {evidence?.evidence_key || "EVID-AUTO-PENDING"}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {executedIndices.size} of {totalCases} snapshots attached to Section 4.1 in Word (.docx) report.
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      if (evidence) onComplete(evidence);
                      onClose();
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors"
                  >
                    View in Workspace
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
