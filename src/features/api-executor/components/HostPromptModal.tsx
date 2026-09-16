import { useState, useEffect } from "react";
import {
  Globe,
  Zap,
  Activity,
  AlertCircle,
  X,
  Sparkles,
  Server,
  Layers,
  ArrowRight,
} from "lucide-react";
import { apiExecutorApi } from "@/services/api/apiExecutorApi";
import { Button } from "@/components/ui/Button";

interface HostPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (targetHost: string) => void;
  storyTitle?: string;
  storyKey?: string;
  collectionName?: string;
  initialHost?: string;
}

const PRESET_HOSTS = [
  { label: "Python App (5001)", url: "http://localhost:5001" },
  { label: "Spring Boot (8080)", url: "http://localhost:8080" },
  { label: "Node / Express (3000)", url: "http://localhost:3000" },
  { label: "Local Dev (5000)", url: "http://127.0.0.1:5000" },
  { label: "HttpBin (Public)", url: "https://httpbin.org" },
];

export function HostPromptModal({
  isOpen,
  onClose,
  onConfirm,
  storyTitle,
  storyKey,
  collectionName,
  initialHost = "",
}: HostPromptModalProps) {
  const [hostInput, setHostInput] = useState(initialHost);
  const [pinging, setPinging] = useState(false);
  const [pingResult, setPingResult] = useState<{
    reachable: boolean;
    latency_ms?: number;
    status_code?: number;
    error?: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setHostInput(initialHost);
      setPingResult(null);
    }
  }, [isOpen, initialHost]);

  if (!isOpen) return null;

  const handlePing = async (overrideUrl?: string) => {
    const target = (overrideUrl || hostInput).trim();
    if (!target) return;
    setPinging(true);
    setPingResult(null);
    try {
      const res = await apiExecutorApi.pingTarget(target);
      setPingResult(res);
    } catch (e: any) {
      setPingResult({ reachable: false, error: e?.message || "Failed to reach host" });
    } finally {
      setPinging(false);
    }
  };

  const handleSelectPreset = (url: string) => {
    setHostInput(url);
    handlePing(url);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = hostInput.trim().replace(/\/+$/, "");
    if (!clean) return;
    onConfirm(clean);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4 bg-gradient-to-r from-[var(--color-surface-elevated)] via-[var(--color-surface)] to-[var(--color-surface-elevated)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500 border border-amber-500/30 shadow-sm">
              <Server size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-base font-bold text-[var(--color-text-primary)]">
                  Target API Host Required
                </h2>
                <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-600">
                  Postman Host Missing
                </span>
              </div>
              <p className="text-xs text-[var(--color-text-secondary)]">
                Please specify the target API Host / Base URL before launching execution.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-elevated)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Explanation Alert */}
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 flex items-start gap-3">
            <AlertCircle size={18} className="text-amber-500 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-semibold text-[var(--color-text-primary)]">
                No Base URL detected in Postman Collection
              </p>
              <p className="text-[var(--color-text-secondary)]">
                The uploaded Postman collection uses relative paths without a pre-configured <code className="font-mono text-amber-600">baseUrl</code> variable. Enter the live API host to connect with.
              </p>
            </div>
          </div>

          {/* Context Badges */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {storyKey && (
              <span className="rounded-lg bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 px-2.5 py-1 font-mono font-bold text-[var(--color-primary)] flex items-center gap-1.5">
                <Sparkles size={12} />
                <span>Story: {storyKey}</span>
              </span>
            )}
            {collectionName && (
              <span className="rounded-lg bg-[var(--color-surface-elevated)] border border-[var(--color-border)] px-2.5 py-1 text-[var(--color-text-secondary)] font-medium flex items-center gap-1.5">
                <Layers size={12} />
                <span>Collection: {collectionName}</span>
              </span>
            )}
          </div>

          {/* Host Input & Ping Button */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-primary)] flex items-center gap-1.5">
                <Globe size={14} className="text-[var(--color-primary)]" />
                <span>Target Host / Base URL</span>
                <span className="text-[var(--color-primary)]">*</span>
              </label>

              {pingResult && (
                <span
                  className={`flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] font-bold ${
                    pingResult.reachable
                      ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30"
                      : "bg-rose-500/15 text-rose-600 border border-rose-500/30"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      pingResult.reachable ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
                    }`}
                  />
                  {pingResult.reachable
                    ? `ONLINE (${pingResult.latency_ms}ms · HTTP ${pingResult.status_code})`
                    : `OFFLINE (${pingResult.error || "Unreachable"})`}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={hostInput}
                onChange={(e) => setHostInput(e.target.value)}
                placeholder="http://localhost:5001 or https://api.example.com"
                autoFocus
                className="flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3.5 py-2.5 font-mono text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]/50 focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
              />

              <Button
                type="button"
                variant="secondary"
                onClick={() => handlePing()}
                loading={pinging}
                disabled={!hostInput.trim()}
                className="text-xs px-3 py-2.5 shrink-0"
              >
                <Activity size={13} className="text-[var(--color-primary)]" />
                <span>Ping Host</span>
              </Button>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--color-text-secondary)]">
              Quick Target Presets:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_HOSTS.map((preset) => (
                <button
                  type="button"
                  key={preset.url}
                  onClick={() => handleSelectPreset(preset.url)}
                  className={`rounded-lg border px-2.5 py-1 text-xs font-mono transition-all ${
                    hostInput.trim() === preset.url
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-bold shadow-sm"
                      : "border-[var(--color-border)] bg-[var(--color-surface-elevated)]/60 text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]/50 hover:text-[var(--color-text-primary)]"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
            <Button type="button" variant="secondary" onClick={onClose} className="text-xs">
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={!hostInput.trim()}
              className="text-xs flex items-center gap-1.5"
            >
              <Zap size={14} />
              <span>Confirm & Launch Agent</span>
              <ArrowRight size={13} />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
