/**
 * @file TabbyPanel.tsx
 * @description Expanded Tabby panel: live status header, quick navigation
 *   actions, and a local "Ask" box. Pure presentational — all data and the
 *   ask/navigation behavior are injected by the container.
 * @author Son Nguyen <hoangson091104@gmail.com>
 */

import { useState, type FormEvent } from "react";
import {
  Play,
  Activity,
  LayoutList,
  Bell,
  BellOff,
  Trash2,
  X,
  Send,
  AlertTriangle,
} from "lucide-react";
import type { TabbyStatus } from "./brain";

interface TabbyPanelProps {
  status: TabbyStatus;
  muted: boolean;
  onToggleMute: () => void;
  onClearAlerts: () => void;
  onNavigate: (route: string) => void;
  /** Returns an answer to display, or null when the query was handed off. */
  onAsk: (query: string) => string | null;
  onClose: () => void;
}

export function TabbyPanel({
  status,
  muted,
  onToggleMute,
  onClearAlerts,
  onNavigate,
  onAsk,
  onClose,
}: TabbyPanelProps) {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const result = onAsk(query);
    setAnswer(result); // null means it handed off (container navigates/closes)
    setQuery("");
  };

  const dot = status.connected ? "bg-emerald-400" : "bg-red-500";

  return (
    <div
      className="card bg-surface-3/95 backdrop-blur border-border-light shadow-xl p-3 w-72 animate-slide-up"
      role="dialog"
      aria-label="Tabby companion"
    >
      {/* header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-sm text-gray-200">
          <span aria-hidden>🐾</span>
          <span className="font-medium">{status.liveCount} live</span>
          <span className="text-gray-500">·</span>
          <span className={status.errorCount > 0 ? "text-red-400 font-medium" : "text-gray-400"}>
            {status.errorCount} errored
          </span>
          <span className={`inline-block w-2 h-2 rounded-full ${dot}`} aria-hidden />
        </div>
        <button
          className="text-gray-500 hover:text-gray-200 transition-colors"
          onClick={onClose}
          aria-label="Close Tabby"
        >
          <X size={16} />
        </button>
      </div>

      {/* quick actions */}
      <div className="grid grid-cols-2 gap-1.5 mb-3">
        <ActionButton icon={Play} label="Run Claude" onClick={() => onNavigate("/run")} />
        <ActionButton icon={Activity} label="Activity" onClick={() => onNavigate("/activity")} />
        <ActionButton icon={LayoutList} label="Sessions" onClick={() => onNavigate("/sessions")} />
        <ActionButton
          icon={AlertTriangle}
          label="Errored"
          disabled={status.errorCount === 0}
          onClick={() => onNavigate("/sessions")}
        />
        <ActionButton
          icon={muted ? BellOff : Bell}
          label={muted ? "Unmute" : "Mute"}
          onClick={onToggleMute}
        />
        <ActionButton
          icon={Trash2}
          label="Clear alerts"
          disabled={status.errorCount === 0}
          onClick={onClearAlerts}
        />
      </div>

      {/* ask */}
      <form onSubmit={submit} className="flex items-center gap-1.5">
        <input
          className="input flex-1 text-xs py-1.5"
          placeholder="Ask Tabby… (e.g. any errors?)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Ask Tabby"
        />
        <button type="submit" className="btn-primary px-2.5 py-1.5" aria-label="Send">
          <Send size={14} />
        </button>
      </form>
      {answer && <p className="mt-2 text-xs text-gray-300 leading-relaxed">{answer}</p>}
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: typeof Play;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs text-gray-300 bg-surface-2 hover:bg-surface-4 hover:text-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      onClick={onClick}
      disabled={disabled}
    >
      <Icon size={14} className="shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  );
}
