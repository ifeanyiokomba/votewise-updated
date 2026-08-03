"use client";

import { useEffect, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, Info, X, Vote, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "success" | "info" | "warning" | "vote";
  icon?: typeof Info;
}

const SAMPLE_NOTIFICATIONS: Notification[] = [
  { id: "1", title: "Vote recorded", message: "Receipt VW-2025-A7K9M2XP issued", type: "vote", icon: Vote },
  { id: "2", title: "Election opened", message: "SUG General Elections 2025 is now live", type: "success", icon: CheckCircle2 },
  { id: "3", title: "Chain verified", message: "All 4,812 audit entries verified", type: "info", icon: ShieldCheck },
  { id: "4", title: "Turnout milestone", message: "50% turnout reached — 7,500 votes", type: "success", icon: CheckCircle2 },
  { id: "5", title: "Election certified", message: "Results signed with integrity hash", type: "success", icon: CheckCircle2 },
];

const TYPE_STYLES: Record<string, { bg: string; border: string; text: string; defaultIcon: typeof Info }> = {
  success: { bg: "bg-success/10", border: "border-success/30", text: "text-success", defaultIcon: CheckCircle2 },
  info: { bg: "bg-info/10", border: "border-info/30", text: "text-info", defaultIcon: Info },
  warning: { bg: "bg-warning/10", border: "border-warning/30", text: "text-warning", defaultIcon: AlertCircle },
  vote: { bg: "bg-primary/10", border: "border-primary/30", text: "text-primary", defaultIcon: Vote },
};

/**
 * Animated notification popups that appear in the bottom-right corner,
 * cycling through sample election events. Inspired by Termii's
 * notification toast animations.
 */
export function NotificationPopups() {
  const [visible, setVisible] = useState<Notification | null>(null);
  const [index, setIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  const showNext = useCallback(() => {
    if (dismissed) return;
    setVisible(SAMPLE_NOTIFICATIONS[index % SAMPLE_NOTIFICATIONS.length] ?? null);
    setIndex((prev) => prev + 1);
  }, [index, dismissed]);

  useEffect(() => {
    if (dismissed) return;
    // Show first notification after 3s
    const initial = setTimeout(showNext, 3000);
    return () => clearTimeout(initial);
  }, [dismissed, showNext]);

  useEffect(() => {
    if (!visible || dismissed) return;
    // Auto-dismiss after 4s, then show next after 2s gap
    const dismiss = setTimeout(() => setVisible(null), 4000);
    const next = setTimeout(showNext, 6000);
    return () => { clearTimeout(dismiss); clearTimeout(next); };
  }, [visible, dismissed, showNext]);

  if (dismissed || !visible) return null;

  const style = TYPE_STYLES[visible.type] ?? TYPE_STYLES.info;
  const Icon = visible.icon ?? style.defaultIcon;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <div
        key={visible.id + "-" + index}
        className={cn(
          "vw-notif-enter relative overflow-hidden rounded-xl border bg-card shadow-lg p-4 flex items-start gap-3",
          style.border
        )}
      >
        <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg", style.bg, style.text)}>
          <Icon className="size-4" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium">{visible.title}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{visible.message}</div>
        </div>
        <button
          onClick={() => { setVisible(null); setDismissed(true); }}
          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Dismiss notifications"
        >
          <X className="size-3.5" />
        </button>
        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 h-0.5 vw-notif-progress-bar" style={{ background: "var(--primary)" }} />
      </div>
    </div>
  );
}
