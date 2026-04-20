import { cn } from "@/lib/utils";
import { ReactNode } from "react";

type EmotionType = "positive" | "neutral" | "negative";

interface EmotionBadgeProps {
  emotion: EmotionType;
  label: string;
  percentage?: number;
  className?: string;
}

const emotionStyles: Record<EmotionType, string> = {
  positive: "bg-sage/15 text-sage border-sage/25",
  neutral: "bg-sepia/15 text-sepia border-sepia/25",
  negative: "bg-dusty-rose/15 text-dusty-rose border-dusty-rose/25"
};

const emotionSymbols: Record<EmotionType, string> = {
  positive: "◈",
  neutral: "◇",
  negative: "◆"
};

export function EmotionBadge({ emotion, label, percentage, className }: EmotionBadgeProps) {
  return (
    <div className={cn(
      "inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm font-medium transition-all duration-300",
      emotionStyles[emotion],
      className
    )}>
      <span className="opacity-60">{emotionSymbols[emotion]}</span>
      <span>{label}</span>
      {percentage !== undefined && (
        <span className="text-xs opacity-60">{percentage}%</span>
      )}
    </div>
  );
}

interface EmotionCardProps {
  title: string;
  emotions: Array<{ type: EmotionType; label: string; percentage: number }>;
  summary: string;
  children?: ReactNode;
  className?: string;
}

export function EmotionCard({ title, emotions, summary, children, className }: EmotionCardProps) {
  return (
    <div className={cn(
      "library-card p-6 space-y-4",
      className
    )}>
      <h3 className="font-display text-xl text-foreground tracking-wide">{title}</h3>

      <div className="flex flex-wrap gap-2">
        {emotions.map((em, idx) => (
          <EmotionBadge key={idx} emotion={em.type} label={em.label} percentage={em.percentage} />
        ))}
      </div>

      <p className="text-muted-foreground text-sm leading-relaxed">{summary}</p>

      {children}
    </div>
  );
}