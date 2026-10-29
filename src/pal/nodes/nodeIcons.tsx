import React from 'react';
import {
  Globe,
  FileText,
  Cpu,
  Filter,
  Calendar,
  Phone,
  Layers,
  HardDrive,
  ShoppingBag,
  Send,
  Hash,
  Clock,
  Repeat,
  Sliders,
  GitMerge,
  Terminal,
  Server,
  Cloud,
  CheckSquare,
  Search,
  Volume2,
  ShieldAlert,
  Play,
  Split,
  Braces,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { NodeRole } from '../../types/workflow';

/**
 * Custom Bespoke SVG Emblems for Architectural Blueprint Nodes & App Platforms
 * Gives FlowArchitect AI its own signature Systems Architecture visual identity.
 */
const CustomSvgIcons: Record<string, React.FC<{ className?: string }>> = {
  // Architectural Webhook Radar Emblem
  webhook: ({ className = 'w-4 h-4' }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="6" r="2.5" />
      <circle cx="6.5" cy="16.5" r="2.5" />
      <circle cx="17.5" cy="16.5" r="2.5" />
      <path d="M12 8.5v3.5l-3.5 2.5" />
      <path d="M12 12l3.5 2.5" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  ),
  // AI Neural Hexagon Core Emblem
  bot: ({ className = 'w-4 h-4' }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polygon points="12 2.5 20 7 20 17 12 21.5 4 17 4 7 12 2.5" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.5V9" />
      <path d="M12 15v6.5" />
      <path d="M4 7l5.4 3.2" />
      <path d="M14.6 13.8L20 17" />
      <path d="M20 7l-5.4 3.2" />
      <path d="M9.4 13.8L4 17" />
    </svg>
  ),
  // LLM Sparkle / Reasoning Matrix Emblem
  sparkles: ({ className = 'w-4 h-4' }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 3l2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2L12 3z" />
      <circle cx="19" cy="5" r="1.5" fill="currentColor" />
      <circle cx="5" cy="19" r="1.5" fill="currentColor" />
    </svg>
  ),
  // Architectural Diamond Decision / Switch Router Emblem
  'git-branch': ({ className = 'w-4 h-4' }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polygon points="12 3 21 12 12 21 3 12 12 3" />
      <path d="M8.5 12h7" />
      <path d="M13 9.5l2.5 2.5-2.5 2.5" />
    </svg>
  ),
  // Gmail / Workspace Envelope M-Chevron Emblem
  mail: ({ className = 'w-4 h-4' }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="2.5" y="4.5" width="19" height="15" rx="3" />
      <path d="M3 7l9 6.5L21 7" />
      <path d="M6.5 19.5V10" />
      <path d="M17.5 19.5V10" />
    </svg>
  ),
  // Google Sheets / Airtable Structured Grid Emblem
  sheet: ({ className = 'w-4 h-4' }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M3 9h18" />
      <path d="M3 15h18" />
      <path d="M9.5 3v18" />
    </svg>
  ),
  // Notion / Document Block Architecture Emblem
  notion: ({ className = 'w-4 h-4' }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
      <path d="M8 16.5V7.5l8 9V7.5" />
    </svg>
  ),
  // GoHighLevel / HubSpot CRM Pipeline Funnel Emblem
  crm: ({ className = 'w-4 h-4' }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4 17l4-4 4 4 8-8" />
      <path d="M15 9h5v5" />
      <circle cx="8" cy="8" r="2.5" />
    </svg>
  ),
  // Slack / Team Messaging Hub Emblem
  'message-square': ({ className = 'w-4 h-4' }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="4" width="18" height="14" rx="3" />
      <path d="M8 21l3-3h7" />
      <path d="M7.5 9.5h9" />
      <path d="M7.5 13h5.5" />
    </svg>
  ),
  // Stripe / Payment Gateway Emblem
  stripe: ({ className = 'w-4 h-4' }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="2.5" y="5" width="19" height="14" rx="3" />
      <path d="M2.5 10h19" />
      <path d="M7 15h4" />
    </svg>
  ),
  // Supabase / Vector & Relational Database Emblem
  database: ({ className = 'w-4 h-4' }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <ellipse cx="12" cy="5.5" rx="8" ry="3" />
      <path d="M4 5.5v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" />
      <path d="M4 11.5v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" />
    </svg>
  ),
  // Code / Script Transform Emblem
  code: ({ className = 'w-4 h-4' }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="8 8 3 12 8 16" />
      <polyline points="16 8 21 12 16 16" />
      <line x1="13.5" y1="6" x2="10.5" y2="18" />
    </svg>
  ),
  // Architectural Loop / Split in Batches Cycle Emblem
  loop: ({ className = 'w-4 h-4' }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.95" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M17 2.5l4 4-4 4" />
      <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
      <path d="M7 21.5l-4-4 4-4" />
      <path d="M21 13v1a4 4 0 0 1-4 4H3" />
    </svg>
  ),
  // Calendar & Scheduling Emblem
  calendar: ({ className = 'w-4 h-4' }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="4" width="18" height="17" rx="3" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="9.5" x2="21" y2="9.5" />
      <circle cx="7.5" cy="13.5" r="1.1" fill="currentColor" />
      <circle cx="12" cy="13.5" r="1.1" fill="currentColor" />
      <circle cx="16.5" cy="13.5" r="1.1" fill="currentColor" />
      <circle cx="7.5" cy="17" r="1.1" fill="currentColor" />
      <circle cx="12" cy="17" r="1.1" fill="currentColor" />
      <circle cx="16.5" cy="17" r="1.1" fill="currentColor" />
    </svg>
  ),
  // OpenAI / ChatGPT Emblem
  openai: ({ className = 'w-4 h-4' }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 2a4 4 0 0 0-3.8 2.7l-.3.9-1.9-.3a4 4 0 0 0-4.3 3.1 4 4 0 0 0 .9 3.5l1.2 1.3-.8 1.7a4 4 0 0 0 .5 4.3 4 4 0 0 0 3.7 1.8l1.9-.3.9 1.7a4 4 0 0 0 3.6 2.3 4 4 0 0 0 3.8-2.7l.3-.9 1.9.3a4 4 0 0 0 4.3-3.1 4 4 0 0 0-.9-3.5l-1.2-1.3.8-1.7a4 4 0 0 0-.5-4.3 4 4 0 0 0-3.7-1.8l-1.9.3-.9-1.7A4 4 0 0 0 12 2z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  ),
  // Google Gemini Emblem
  gemini: ({ className = 'w-4 h-4' }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 2C12 7.52 7.52 12 2 12C7.52 12 12 16.48 12 22C12 16.48 16.48 12 22 12C16.48 12 12 7.52 12 2Z" />
      <circle cx="18.5" cy="5.5" r="1.5" fill="currentColor" />
    </svg>
  ),
  // Anthropic Claude Emblem
  claude: ({ className = 'w-4 h-4' }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v4" />
      <path d="M12 17v4" />
      <path d="M3 12h4" />
      <path d="M17 12h4" />
      <path d="M5.6 5.6l2.9 2.9" />
      <path d="M15.5 15.5l2.9 2.9" />
      <path d="M5.6 18.4l2.9-2.9" />
      <path d="M15.5 8.5l2.9-2.9" />
    </svg>
  ),
  // DeepSeek AI Emblem
  deepseek: ({ className = 'w-4 h-4' }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 3.5a8.5 8.5 0 0 1 8.5 8.5c0 4.7-3.8 8.5-8.5 8.5" />
      <circle cx="15" cy="9.5" r="1.5" fill="currentColor" />
      <path d="M8.5 14.5c1.8 1.5 5.2 1.5 7 0" />
    </svg>
  ),
  // Groq Fast Inference Emblem
  groq: ({ className = 'w-4 h-4' }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  ),
  // Mistral AI Emblem
  mistral: ({ className = 'w-4 h-4' }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="4" width="4" height="4" rx="1" fill="currentColor" />
      <rect x="17" y="4" width="4" height="4" rx="1" fill="currentColor" />
      <rect x="3" y="10" width="4" height="4" rx="1" fill="currentColor" />
      <rect x="10" y="10" width="4" height="4" rx="1" fill="currentColor" />
      <rect x="17" y="10" width="4" height="4" rx="1" fill="currentColor" />
      <rect x="3" y="16" width="4" height="4" rx="1" fill="currentColor" />
      <rect x="10" y="16" width="4" height="4" rx="1" fill="currentColor" />
      <rect x="17" y="16" width="4" height="4" rx="1" fill="currentColor" />
    </svg>
  ),
  // Perplexity AI Emblem
  perplexity: ({ className = 'w-4 h-4' }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v6" />
      <path d="M12 15v6" />
      <path d="M3 12h6" />
      <path d="M15 12h6" />
      <path d="M5.5 5.5l4.5 4.5" />
      <path d="M14 14l4.5 4.5" />
      <path d="M18.5 5.5L14 10" />
      <path d="M10 14l-4.5 4.5" />
    </svg>
  ),
  // Ollama Local LLM Emblem
  ollama: ({ className = 'w-4 h-4' }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="4" y="6" width="16" height="12" rx="4" />
      <circle cx="9" cy="12" r="1.5" fill="currentColor" />
      <circle cx="15" cy="12" r="1.5" fill="currentColor" />
      <path d="M12 14v1" />
      <path d="M8 3v3" />
      <path d="M16 3v3" />
    </svg>
  ),
};

export const ICON_MAP: Record<string, LucideIcon> = {
  webhook: Zap,
  bot: Cpu,
  'git-branch': Split,
  globe: Globe,
  'message-square': Hash,
  database: Server,
  mail: Send,
  zap: Zap,
  'file-text': FileText,
  sparkles: Zap,
  cpu: Cpu,
  filter: Filter,
  calendar: Calendar,
  phone: Phone,
  layers: Layers,
  sheet: Sliders,
  notion: FileText,
  drive: HardDrive,
  stripe: ShoppingBag,
  shopify: ShoppingBag,
  telegram: Send,
  discord: Hash,
  code: Braces,
  clock: Clock,
  loop: Repeat,
  set: Sliders,
  merge: GitMerge,
  terminal: Terminal,
  server: Server,
  cloud: Cloud,
  tasks: CheckSquare,
  crm: Globe,
  search: Search,
  voice: Volume2,
  error: ShieldAlert,
  play: Play,
  split: Split,
  json: Braces,
  openai: Zap,
  gemini: Zap,
  claude: Zap,
  deepseek: Zap,
  groq: Zap,
  mistral: Zap,
  perplexity: Search,
  ollama: Cpu,
};

export const APP_ACCENT_BADGES: Record<
  string,
  { bgDark: string; bgLight: string; textDark: string; textLight: string; ring: string }
> = {
  loop: {
    bgDark: 'bg-amber-500/20',
    bgLight: 'bg-amber-50',
    textDark: 'text-amber-400',
    textLight: 'text-amber-600',
    ring: 'border-amber-500/35',
  },
  mail: {
    bgDark: 'bg-rose-500/15',
    bgLight: 'bg-rose-50',
    textDark: 'text-rose-400',
    textLight: 'text-rose-600',
    ring: 'border-rose-500/30',
  },
  sheet: {
    bgDark: 'bg-emerald-500/15',
    bgLight: 'bg-emerald-50',
    textDark: 'text-emerald-400',
    textLight: 'text-emerald-600',
    ring: 'border-emerald-500/30',
  },
  notion: {
    bgDark: 'bg-slate-100/10',
    bgLight: 'bg-slate-100',
    textDark: 'text-slate-100',
    textLight: 'text-slate-800',
    ring: 'border-slate-500/30',
  },
  crm: {
    bgDark: 'bg-teal-500/15',
    bgLight: 'bg-teal-50',
    textDark: 'text-teal-400',
    textLight: 'text-teal-600',
    ring: 'border-teal-500/30',
  },
  'message-square': {
    bgDark: 'bg-fuchsia-500/15',
    bgLight: 'bg-fuchsia-50',
    textDark: 'text-fuchsia-400',
    textLight: 'text-fuchsia-600',
    ring: 'border-fuchsia-500/30',
  },
  drive: {
    bgDark: 'bg-amber-500/15',
    bgLight: 'bg-amber-50',
    textDark: 'text-amber-400',
    textLight: 'text-amber-600',
    ring: 'border-amber-500/30',
  },
  calendar: {
    bgDark: 'bg-sky-500/15',
    bgLight: 'bg-sky-50',
    textDark: 'text-sky-400',
    textLight: 'text-sky-600',
    ring: 'border-sky-500/30',
  },
  stripe: {
    bgDark: 'bg-indigo-500/15',
    bgLight: 'bg-indigo-50',
    textDark: 'text-indigo-400',
    textLight: 'text-indigo-600',
    ring: 'border-indigo-500/30',
  },
  shopify: {
    bgDark: 'bg-lime-500/15',
    bgLight: 'bg-lime-50',
    textDark: 'text-lime-400',
    textLight: 'text-lime-600',
    ring: 'border-lime-500/30',
  },
  telegram: {
    bgDark: 'bg-sky-500/15',
    bgLight: 'bg-sky-50',
    textDark: 'text-sky-400',
    textLight: 'text-sky-600',
    ring: 'border-sky-500/30',
  },
  discord: {
    bgDark: 'bg-indigo-500/15',
    bgLight: 'bg-indigo-50',
    textDark: 'text-indigo-400',
    textLight: 'text-indigo-600',
    ring: 'border-indigo-500/30',
  },
  code: {
    bgDark: 'bg-amber-500/15',
    bgLight: 'bg-amber-50',
    textDark: 'text-amber-400',
    textLight: 'text-amber-600',
    ring: 'border-amber-500/30',
  },
  database: {
    bgDark: 'bg-cyan-500/15',
    bgLight: 'bg-cyan-50',
    textDark: 'text-cyan-400',
    textLight: 'text-cyan-600',
    ring: 'border-cyan-500/30',
  },
  set: {
    bgDark: 'bg-blue-500/15',
    bgLight: 'bg-blue-50',
    textDark: 'text-blue-400',
    textLight: 'text-blue-600',
    ring: 'border-blue-500/30',
  },
  openai: {
    bgDark: 'bg-emerald-500/20',
    bgLight: 'bg-emerald-50',
    textDark: 'text-emerald-300',
    textLight: 'text-emerald-700',
    ring: 'border-emerald-500/40',
  },
  gemini: {
    bgDark: 'bg-blue-500/20',
    bgLight: 'bg-blue-50',
    textDark: 'text-blue-400',
    textLight: 'text-blue-600',
    ring: 'border-blue-500/40',
  },
  claude: {
    bgDark: 'bg-amber-500/20',
    bgLight: 'bg-amber-50',
    textDark: 'text-amber-400',
    textLight: 'text-amber-700',
    ring: 'border-amber-500/40',
  },
  deepseek: {
    bgDark: 'bg-sky-500/20',
    bgLight: 'bg-sky-50',
    textDark: 'text-sky-400',
    textLight: 'text-sky-600',
    ring: 'border-sky-500/40',
  },
  groq: {
    bgDark: 'bg-orange-500/20',
    bgLight: 'bg-orange-50',
    textDark: 'text-orange-400',
    textLight: 'text-orange-600',
    ring: 'border-orange-500/40',
  },
  mistral: {
    bgDark: 'bg-amber-600/20',
    bgLight: 'bg-amber-50',
    textDark: 'text-amber-400',
    textLight: 'text-amber-700',
    ring: 'border-amber-500/40',
  },
  perplexity: {
    bgDark: 'bg-teal-500/20',
    bgLight: 'bg-teal-50',
    textDark: 'text-teal-400',
    textLight: 'text-teal-600',
    ring: 'border-teal-500/40',
  },
  ollama: {
    bgDark: 'bg-slate-700/30',
    bgLight: 'bg-slate-100',
    textDark: 'text-slate-200',
    textLight: 'text-slate-700',
    ring: 'border-slate-500/40',
  },
};

export function renderNodeIcon(iconName: string, className = 'w-4 h-4') {
  const CustomSvg = CustomSvgIcons[iconName];
  if (CustomSvg) {
    return <CustomSvg className={className} />;
  }
  const IconComponent = ICON_MAP[iconName] || Zap;
  return <IconComponent className={className} />;
}

export interface RoleVisualStyle {
  label: string;
  shortTag: string;
  accentHex: string;
  topBorderClass: string;
  iconBgDark: string;
  iconBgLight: string;
  textAccentDark: string;
  textAccentLight: string;
  glowShadow: string;
}

export const ROLE_STYLES: Record<NodeRole, RoleVisualStyle> = {
  trigger: {
    label: 'Entry Trigger',
    shortTag: 'TRIGGER',
    accentHex: '#10B981',
    topBorderClass: 'border-t-[3px] border-t-[#10B981]',
    iconBgDark: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    iconBgLight: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    textAccentDark: 'text-emerald-400',
    textAccentLight: 'text-emerald-700',
    glowShadow: 'shadow-[0_4px_20px_-4px_rgba(16,185,129,0.22)]',
  },
  ai: {
    label: 'AI / LLM Agent',
    shortTag: 'AI CORE',
    accentHex: '#8B5CF6',
    topBorderClass: 'border-t-[3px] border-t-[#8B5CF6]',
    iconBgDark: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
    iconBgLight: 'bg-violet-50 text-violet-700 border-violet-200',
    textAccentDark: 'text-violet-400',
    textAccentLight: 'text-violet-700',
    glowShadow: 'shadow-[0_4px_20px_-4px_rgba(139,92,246,0.25)]',
  },
  router: {
    label: 'Flow Router',
    shortTag: 'ROUTER',
    accentHex: '#F59E0B',
    topBorderClass: 'border-t-[3px] border-t-[#F59E0B]',
    iconBgDark: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    iconBgLight: 'bg-amber-50 text-amber-700 border-amber-200',
    textAccentDark: 'text-amber-400',
    textAccentLight: 'text-amber-700',
    glowShadow: 'shadow-[0_4px_20px_-4px_rgba(245,158,11,0.22)]',
  },
  action: {
    label: 'Blueprint Step',
    shortTag: 'ACTION',
    accentHex: '#0EA5E9',
    topBorderClass: 'border-t-[3px] border-t-[#0EA5E9]',
    iconBgDark: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
    iconBgLight: 'bg-sky-50 text-sky-700 border-sky-200',
    textAccentDark: 'text-sky-400',
    textAccentLight: 'text-sky-700',
    glowShadow: 'shadow-[0_4px_20px_-4px_rgba(14,165,233,0.22)]',
  },
  group: {
    label: 'Architecture Zone',
    shortTag: 'ZONE',
    accentHex: '#64748B',
    topBorderClass: 'border-t-[3px] border-t-slate-500',
    iconBgDark: 'bg-slate-500/15 text-slate-300 border-slate-600',
    iconBgLight: 'bg-slate-100 text-slate-700 border-slate-200',
    textAccentDark: 'text-slate-300',
    textAccentLight: 'text-slate-700',
    glowShadow: '',
  },
};
