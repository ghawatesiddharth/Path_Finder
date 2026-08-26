import {
  Accessibility,
  Atom,
  BarChart3,
  Binary,
  BookOpen,
  Brain,
  Cloud,
  Code2,
  Compass,
  FileCode2,
  FlaskConical,
  Gauge,
  LayoutGrid,
  Layers,
  Network,
  Palette,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';

const map: Record<string, LucideIcon> = {
  Accessibility,
  Atom,
  BarChart3,
  Binary,
  BookOpen,
  Brain,
  Cloud,
  Code2,
  Compass,
  FileCode2,
  FlaskConical,
  Gauge,
  LayoutGrid,
  Layers,
  Network,
  Palette,
  Sparkles,
};

export function Icon({
  name,
  className,
  size,
  strokeWidth = 2,
}: {
  name: string;
  className?: string;
  size?: number;
  strokeWidth?: number;
}) {
  const C = map[name] ?? Sparkles;
  return <C className={className} size={size} strokeWidth={strokeWidth} />;
}
