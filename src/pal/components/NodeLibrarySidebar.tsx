import React, { useMemo, useState, useEffect } from 'react';
import {
  Search,
  ArrowRight,
  ArrowLeft,
  Bot,
  Globe,
  PenLine,
  GitBranch,
  Briefcase,
  ShieldCheck,
  Zap,
  Play,
  StickyNote,
  Plus,
  Sparkles,
  PanelRightClose,
  PanelRightOpen,
  Cpu,
  Blocks,
  Users,
  FileText,
  MessageSquare,
  Calendar,
  DollarSign,
  Share2,
  GraduationCap,
  PhoneCall,
  Sliders,
  Repeat,
  Sparkle,
} from 'lucide-react';
import { useWorkflowStore } from '../../bal/useWorkflowStore';
import {
  buildCustomIntegrationTemplate,
  FEATURED_APP_PLATFORMS,
  N8N_FULL_INTEGRATIONS_CATALOG,
  GHL_FULL_INTEGRATIONS_CATALOG,
  GHL_BUILTIN_TRIGGERS,
  GHL_BUILTIN_ACTIONS,
  GHL_TRIGGER_CATEGORIES,
  GHL_ACTION_CATEGORIES,
} from '../../bal/platformTranslator';
import {
  APP_ACCENT_BADGES,
  renderNodeIcon,
} from '../nodes/nodeIcons';
import type { LibraryNodeTemplate, NodeRole } from '../../types/workflow';

type TopBlueprintSection = 'triggers' | 'actions';
type PlatformLibraryMode = 'n8n' | 'ghl';

type DrillDownView =
  | { type: 'root' }
  // n8n specific drilldowns
  | { type: 'core_triggers' }
  | { type: 'app_triggers_platforms' }
  | { type: 'ai_nodes' }
  | { type: 'app_actions_platforms' }
  | { type: 'app_platform_detail'; appPlatform: string }
  | { type: 'data_transformation' }
  | { type: 'flow_logic' }
  | { type: 'core_network' }
  | { type: 'human_review' }
  // GHL specific category drilldown
  | { type: 'ghl_category'; category: string; role: 'trigger' | 'action' };

export const NodeLibrarySidebar: React.FC = () => {
  const {
    platform,
    isLightMode,
    addNodeFromLibrary,
    addGroupFrame,
  } = useWorkflowStore();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [libraryMode, setLibraryMode] = useState<PlatformLibraryMode>(
    platform === 'ghl' ? 'ghl' : 'n8n'
  );
  const [section, setSection] = useState<TopBlueprintSection>('actions');
  const [view, setView] = useState<DrillDownView>({ type: 'root' });
  const [searchQuery, setSearchQuery] = useState('');

  // Keep libraryMode in sync if user changes platform in global top bar
  useEffect(() => {
    if (platform === 'ghl') {
      setLibraryMode('ghl');
      setView({ type: 'root' });
    } else if (platform === 'n8n') {
      setLibraryMode('n8n');
      setView({ type: 'root' });
    }
  }, [platform]);

  // Active Catalog strictly separated by platform
  const activeCatalog = useMemo(() => {
    return libraryMode === 'ghl'
      ? GHL_FULL_INTEGRATIONS_CATALOG
      : N8N_FULL_INTEGRATIONS_CATALOG;
  }, [libraryMode]);

  // Group all external app nodes for n8n by their App Platform ('Gmail', 'Google Sheets', 'Notion', etc.)
  const n8nAppPlatformsSummary = useMemo(() => {
    const map = new Map<
      string,
      {
        appPlatform: string;
        iconName: string;
        triggers: LibraryNodeTemplate[];
        actions: LibraryNodeTemplate[];
      }
    >();

    for (const tpl of N8N_FULL_INTEGRATIONS_CATALOG) {
      if (tpl.nodeGroup !== 'app') continue;
      const existing = map.get(tpl.appPlatform);
      if (existing) {
        if (tpl.role === 'trigger') existing.triggers.push(tpl);
        else existing.actions.push(tpl);
      } else {
        map.set(tpl.appPlatform, {
          appPlatform: tpl.appPlatform,
          iconName: tpl.iconName,
          triggers: tpl.role === 'trigger' ? [tpl] : [],
          actions: tpl.role !== 'trigger' ? [tpl] : [],
        });
      }
    }

    const list = Array.from(map.values());
    list.sort((a, b) => {
      const idxA = FEATURED_APP_PLATFORMS.indexOf(a.appPlatform as any);
      const idxB = FEATURED_APP_PLATFORMS.indexOf(b.appPlatform as any);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.appPlatform.localeCompare(b.appPlatform);
    });
    return list;
  }, []);

  const n8nCoreTriggers = useMemo(
    () =>
      N8N_FULL_INTEGRATIONS_CATALOG.filter(
        (t) => t.nodeGroup === 'core' && t.role === 'trigger'
      ),
    []
  );

  const n8nAppTriggers = useMemo(
    () =>
      N8N_FULL_INTEGRATIONS_CATALOG.filter(
        (t) => t.nodeGroup === 'app' && t.role === 'trigger'
      ),
    []
  );

  const n8nActionsCount = useMemo(
    () => N8N_FULL_INTEGRATIONS_CATALOG.filter((t) => t.role !== 'trigger').length,
    []
  );

  // Search Results across active catalog
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return { triggers: [], actions: [] };
    const q = searchQuery.toLowerCase();
    const matches = activeCatalog.filter((tpl) => {
      const label = (tpl.defaultLabel[platform] || tpl.defaultLabel.n8n || '').toLowerCase();
      const service = (tpl.defaultService[platform] || tpl.defaultService.n8n || '').toLowerCase();
      const op = (tpl.operation || '').toLowerCase();
      const sub = tpl.subtitle.toLowerCase();
      const cat = String(tpl.category || '').toLowerCase();
      const appPlat = tpl.appPlatform.toLowerCase();
      return (
        label.includes(q) ||
        service.includes(q) ||
        op.includes(q) ||
        sub.includes(q) ||
        cat.includes(q) ||
        appPlat.includes(q)
      );
    });
    return {
      triggers: matches.filter((m) => m.role === 'trigger'),
      actions: matches.filter((m) => m.role !== 'trigger'),
    };
  }, [activeCatalog, platform, searchQuery]);

  const handleDragStart = (
    event: React.DragEvent<HTMLDivElement>,
    template: LibraryNodeTemplate
  ) => {
    event.dataTransfer.setData(
      'application/flowarchitect-node',
      JSON.stringify(template)
    );
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleAddByTemplateId = (id: string) => {
    const found = activeCatalog.find((t) => t.id === id);
    if (found) {
      addNodeFromLibrary(found);
    }
  };

  const handleAddCustomSearchNode = (asRole: NodeRole) => {
    if (!searchQuery.trim()) return;
    const customTpl = buildCustomIntegrationTemplate(
      searchQuery.trim(),
      libraryMode === 'ghl' ? 'core' : 'app',
      asRole,
      'CRM, Sales & Support',
      asRole === 'trigger' ? 'trigger: onEvent' : 'action: execute',
      libraryMode === 'ghl' ? 'GoHighLevel' : searchQuery.trim()
    );
    addNodeFromLibrary(customTpl);
    setSearchQuery('');
  };

  // Render single node row
  const renderNodeRow = (tpl: LibraryNodeTemplate) => {
    const customBadge = APP_ACCENT_BADGES[tpl.iconName];
    const title =
      libraryMode === 'ghl'
        ? tpl.defaultLabel.ghl || tpl.defaultLabel.n8n
        : tpl.defaultLabel[platform] || tpl.defaultLabel.n8n;
    const isTrigger = tpl.role === 'trigger';

    const badgeClasses = customBadge
      ? isLightMode
        ? `${customBadge.bgLight} ${customBadge.textLight} ring-1 ${customBadge.ring}`
        : `${customBadge.bgDark} ${customBadge.textDark} ring-1 ${customBadge.ring}`
      : isLightMode
      ? 'bg-slate-100 text-slate-700 ring-1 ring-slate-200'
      : 'bg-slate-800/90 text-slate-200 ring-1 ring-slate-700';

    return (
      <div
        key={tpl.id}
        draggable
        onDragStart={(e) => handleDragStart(e, tpl)}
        onClick={() => addNodeFromLibrary(tpl)}
        className={`group flex items-start gap-3 px-3 py-2 rounded-xl border border-transparent transition-all cursor-pointer ${
          isLightMode
            ? 'hover:bg-slate-50 hover:border-slate-200/80'
            : 'hover:bg-slate-800/50 hover:border-slate-800'
        }`}
      >
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 shadow-2xs ${badgeClasses}`}
        >
          {renderNodeIcon(tpl.iconName, 'w-4 h-4')}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`text-xs font-bold tracking-tight truncate ${
                isLightMode ? 'text-slate-900' : 'text-slate-100'
              }`}
            >
              {title}
            </span>
            <span
              className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded shrink-0 ${
                isTrigger
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                  : tpl.role === 'ai'
                  ? 'bg-violet-500/15 text-violet-600 dark:text-violet-400'
                  : tpl.role === 'router'
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                  : 'bg-sky-500/15 text-sky-600 dark:text-sky-400'
              }`}
            >
              {isTrigger ? 'TRIGGER' : tpl.role.toUpperCase()}
            </span>
            {libraryMode === 'ghl' && tpl.category && (
              <span className="text-[9px] text-slate-400 truncate max-w-[120px]">
                {tpl.category}
              </span>
            )}
          </div>
          <p
            className={`text-[11px] leading-snug line-clamp-2 mt-0.5 ${
              isLightMode ? 'text-slate-500' : 'text-slate-400'
            }`}
          >
            {tpl.subtitle}
          </p>
        </div>

        <Plus className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity mt-1 shrink-0" />
      </div>
    );
  };

  if (isCollapsed) {
    return (
      <aside
        className={`no-export shrink-0 w-12 border-l flex flex-col items-center py-3 gap-3 z-20 ${
          isLightMode
            ? 'bg-white border-slate-200 text-slate-700'
            : 'bg-[#0F172A] border-slate-800/90 text-slate-300'
        }`}
      >
        <button
          type="button"
          onClick={() => setIsCollapsed(false)}
          title="Open Node Library"
          className="p-2 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
        >
          <PanelRightOpen className="w-4 h-4" />
        </button>
      </aside>
    );
  }

  const getHeaderTitle = () => {
    if (view.type === 'root') {
      if (libraryMode === 'ghl') {
        return section === 'triggers'
          ? 'GoHighLevel Triggers (Entry Nodes)'
          : 'GoHighLevel Actions (Workflow Steps)';
      }
      return section === 'triggers'
        ? '1. Choose a Trigger'
        : '2. What happens next?';
    }

    if (view.type === 'ghl_category') {
      return view.category;
    }

    switch (view.type) {
      case 'core_triggers':
        return 'n8n Core Triggers';
      case 'app_triggers_platforms':
        return 'App Event Triggers';
      case 'ai_nodes':
        return 'AI Agents & LLMs';
      case 'app_actions_platforms':
        return 'Action in an app';
      case 'app_platform_detail':
        return view.appPlatform;
      case 'data_transformation':
        return 'Data transformation';
      case 'flow_logic':
        return 'Flow & Routing Logic';
      case 'core_network':
        return 'Core (HTTP, Code & Network)';
      case 'human_review':
        return 'Human review & Approval';
    }
  };

  const handleBack = () => {
    if (view.type === 'app_platform_detail') {
      setView(
        section === 'triggers'
          ? { type: 'app_triggers_platforms' }
          : { type: 'app_actions_platforms' }
      );
    } else {
      setView({ type: 'root' });
    }
  };

  // Helper icons for GHL Trigger categories
  const getGhlTriggerCategoryIcon = (category: string) => {
    switch (category) {
      case 'Contact':
        return <Users className="w-4 h-4 text-emerald-500" />;
      case 'Events, Forms & Web':
        return <FileText className="w-4 h-4 text-sky-500" />;
      case 'Communication & Reputation':
        return <MessageSquare className="w-4 h-4 text-violet-500" />;
      case 'Appointments & Bookings':
        return <Calendar className="w-4 h-4 text-indigo-500" />;
      case 'Opportunities & Pipeline':
        return <GitBranch className="w-4 h-4 text-blue-500" />;
      case 'Payments, Commerce & Shopify':
        return <DollarSign className="w-4 h-4 text-emerald-600" />;
      case 'Social & Ad Channels':
        return <Share2 className="w-4 h-4 text-pink-500" />;
      case 'Memberships, Courses & Communities':
        return <GraduationCap className="w-4 h-4 text-amber-500" />;
      case 'Affiliates & IVR':
        return <PhoneCall className="w-4 h-4 text-teal-500" />;
      default:
        return <Zap className="w-4 h-4 text-emerald-500" />;
    }
  };

  // Helper icons for GHL Action categories
  const getGhlActionCategoryIcon = (category: string) => {
    switch (category) {
      case 'Flow Control & Internal Tools':
        return <Sliders className="w-4 h-4 text-indigo-500" />;
      case 'Contact & CRM Management':
        return <Users className="w-4 h-4 text-blue-500" />;
      case 'Communication':
        return <MessageSquare className="w-4 h-4 text-sky-500" />;
      case 'Appointments, Pipelines & Payments':
        return <Calendar className="w-4 h-4 text-emerald-500" />;
      case 'Workflow AI & AI Employee':
        return <Bot className="w-4 h-4 text-violet-500" />;
      case 'Marketing, Courses, Communities, Affiliates & IVR':
        return <GraduationCap className="w-4 h-4 text-amber-500" />;
      case 'Native App Integrations':
        return <Globe className="w-4 h-4 text-teal-500" />;
      default:
        return <Play className="w-4 h-4 text-indigo-500" />;
    }
  };

  return (
    <aside
      className={`no-export shrink-0 w-[370px] border-l flex flex-col h-full select-none z-20 transition-colors ${
        isLightMode
          ? 'bg-white border-slate-200/90 text-slate-900'
          : 'bg-[#0F172A] border-slate-800/90 text-slate-100'
      }`}
    >
      {/* Platform Library Switcher: STRICT SEPARATION BETWEEN n8n & GHL */}
      <div className="px-3 pt-3 pb-1 border-b border-slate-200/60 dark:border-slate-800/60">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
          <span>Active Node Library Catalog</span>
          <span className="text-[9px] font-mono text-emerald-500 bg-emerald-500/10 px-1 rounded">
            {libraryMode === 'ghl' ? 'GHL Native' : 'n8n Fair-Code'}
          </span>
        </div>
        <div
          className={`grid grid-cols-2 gap-1 p-0.5 rounded-lg border ${
            isLightMode ? 'bg-slate-100 border-slate-200' : 'bg-slate-950 border-slate-800'
          }`}
        >
          <button
            type="button"
            onClick={() => {
              setLibraryMode('n8n');
              setView({ type: 'root' });
            }}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              libraryMode === 'n8n'
                ? 'bg-rose-500 text-white shadow-xs'
                : isLightMode
                ? 'text-slate-600 hover:text-slate-900'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5 shrink-0" />
            <span>n8n Nodes</span>
            <span className="text-[10px] opacity-75 font-mono">
              ({N8N_FULL_INTEGRATIONS_CATALOG.length})
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setLibraryMode('ghl');
              setView({ type: 'root' });
            }}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              libraryMode === 'ghl'
                ? 'bg-emerald-600 text-white shadow-xs'
                : isLightMode
                ? 'text-slate-600 hover:text-slate-900'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5 shrink-0" />
            <span>GHL Nodes</span>
            <span className="text-[10px] opacity-75 font-mono">
              ({GHL_FULL_INTEGRATIONS_CATALOG.length})
            </span>
          </button>
        </div>
      </div>

      {/* Top Header */}
      <div className="px-3.5 pt-3 pb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {view.type !== 'root' && !searchQuery.trim() && (
            <button
              type="button"
              onClick={handleBack}
              title="Back"
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isLightMode
                  ? 'hover:bg-slate-100 text-slate-600'
                  : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="min-w-0">
            <h2 className="text-sm font-bold tracking-tight truncate">
              {searchQuery.trim()
                ? `Search ${libraryMode === 'ghl' ? 'GHL' : 'n8n'} Nodes`
                : getHeaderTitle()}
            </h2>
            <p className="text-[11px] text-slate-400 truncate">
              {libraryMode === 'ghl'
                ? 'Native GoHighLevel Workflow Builder Library'
                : 'Click or drag onto canvas to build workflow'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsCollapsed(true)}
          title="Collapse Panel"
          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
            isLightMode
              ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <PanelRightClose className="w-4 h-4" />
        </button>
      </div>

      {/* Organized 2-Tab Switcher: Triggers vs Actions */}
      <div className="px-3.5 pb-2">
        <div
          className={`grid grid-cols-2 gap-1 p-1 rounded-xl border ${
            isLightMode
              ? 'bg-slate-100 border-slate-200'
              : 'bg-slate-950/90 border-slate-800'
          }`}
        >
          <button
            type="button"
            onClick={() => {
              setSection('triggers');
              setView({ type: 'root' });
            }}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              section === 'triggers'
                ? 'bg-emerald-600 text-white shadow-xs'
                : isLightMode
                ? 'text-slate-600 hover:text-slate-900'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5 shrink-0" />
            <span>1. Triggers</span>
            <span className="font-mono text-[10px] opacity-85 tabular-nums">
              ({libraryMode === 'ghl' ? GHL_BUILTIN_TRIGGERS.length : n8nCoreTriggers.length + n8nAppTriggers.length})
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSection('actions');
              setView({ type: 'root' });
            }}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              section === 'actions'
                ? libraryMode === 'ghl' ? 'bg-emerald-700 text-white shadow-xs' : 'bg-indigo-600 text-white shadow-xs'
                : isLightMode
                ? 'text-slate-600 hover:text-slate-900'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Play className="w-3.5 h-3.5 shrink-0" />
            <span>2. Actions</span>
            <span className="font-mono text-[10px] opacity-85 tabular-nums">
              ({libraryMode === 'ghl' ? GHL_BUILTIN_ACTIONS.length : n8nActionsCount})
            </span>
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="px-3.5 pb-2.5 border-b border-slate-200/70 dark:border-slate-800/70">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              libraryMode === 'ghl'
                ? 'Search GHL triggers, actions, or filters...'
                : 'Search n8n triggers, actions, or apps...'
            }
            className={`w-full pl-8 pr-3 py-1.5 rounded-lg text-xs border transition-colors focus:outline-none ${
              isLightMode
                ? 'bg-white border-slate-300 focus:border-indigo-600 text-slate-900 placeholder:text-slate-400'
                : 'bg-slate-900 border-slate-700 focus:border-indigo-400 text-slate-100 placeholder:text-slate-500'
            }`}
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {/* A. SEARCH RESULTS VIEW */}
        {searchQuery.trim() ? (
          <div className="space-y-3">
            <div className="px-2">
              <div
                className={`p-2.5 rounded-xl border border-dashed space-y-1.5 ${
                  isLightMode
                    ? 'border-indigo-300 bg-indigo-50/50'
                    : 'border-indigo-500/40 bg-indigo-500/10'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-300">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Add Custom "{searchQuery.trim()}" Node:</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleAddCustomSearchNode('trigger')}
                    className="flex items-center justify-center gap-1 py-1 px-2 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs font-semibold cursor-pointer"
                  >
                    <Zap className="w-3 h-3" />
                    <span>+ As Trigger</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddCustomSearchNode('action')}
                    className="flex items-center justify-center gap-1 py-1 px-2 rounded-lg bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 text-xs font-semibold cursor-pointer"
                  >
                    <Play className="w-3 h-3" />
                    <span>+ As Action</span>
                  </button>
                </div>
              </div>
            </div>

            {searchResults.triggers.length > 0 && (
              <div>
                <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  ⚡ Matching Triggers ({searchResults.triggers.length})
                </div>
                {searchResults.triggers.map((tpl) => renderNodeRow(tpl))}
              </div>
            )}

            {searchResults.actions.length > 0 && (
              <div>
                <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  ▶ Matching Actions ({searchResults.actions.length})
                </div>
                {searchResults.actions.map((tpl) => renderNodeRow(tpl))}
              </div>
            )}

            {searchResults.triggers.length === 0 && searchResults.actions.length === 0 && (
              <div className="text-center py-6 px-4">
                <p className="text-xs text-slate-400">
                  No matching nodes found in {libraryMode === 'ghl' ? 'GoHighLevel' : 'n8n'} catalog.
                </p>
                <button
                  type="button"
                  onClick={() => setLibraryMode(libraryMode === 'ghl' ? 'n8n' : 'ghl')}
                  className="mt-2 text-xs font-semibold text-indigo-500 hover:underline cursor-pointer"
                >
                  Switch to {libraryMode === 'ghl' ? 'n8n' : 'GoHighLevel'} Catalog
                </button>
              </div>
            )}
          </div>
        ) : libraryMode === 'ghl' ? (
          /* ========================================================================= */
          /* B. GOHIGHLEVEL (GHL) NATIVE WORKFLOW BUILDER CATALOG                      */
          /* ========================================================================= */
          view.type === 'root' && section === 'triggers' ? (
            /* GHL TRIGGERS: 9 BUILT-IN WORKFLOW TRIGGER CATEGORIES */
            <div className="space-y-3">
              <div className="px-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Built-In Workflow Triggers (9 Categories)
                </div>
                <div className="space-y-1.5">
                  {GHL_TRIGGER_CATEGORIES.map((category) => {
                    const count = GHL_BUILTIN_TRIGGERS.filter(
                      (t) => t.category === category
                    ).length;
                    return (
                      <button
                        key={category}
                        type="button"
                        onClick={() =>
                          setView({
                            type: 'ghl_category',
                            category,
                            role: 'trigger',
                          })
                        }
                        className={`w-full flex items-center justify-between gap-3 p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                          isLightMode
                            ? 'bg-slate-50/80 border-slate-200/80 hover:bg-slate-100/90 text-slate-900'
                            : 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/70 text-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0">
                            {getGhlTriggerCategoryIcon(category)}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold truncate">
                              {category}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {count} trigger{count !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Common GHL Triggers (1-Click Add) */}
              <div className="pt-1">
                <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Common GHL Triggers (1-Click Add)
                </div>
                {[
                  'ghl_trig_contact_created',
                  'ghl_trig_form_submitted',
                  'ghl_trig_customer_replied',
                  'ghl_trig_booked_appointment',
                  'ghl_trig_opp_status_changed',
                  'ghl_trig_payment_received',
                  'ghl_trig_inbound_webhook',
                ].map((id) => {
                  const tpl = GHL_BUILTIN_TRIGGERS.find((t) => t.id === id);
                  return tpl ? renderNodeRow(tpl) : null;
                })}
              </div>
            </div>
          ) : view.type === 'root' && section === 'actions' ? (
            /* GHL ACTIONS: 7 BUILT-IN WORKFLOW ACTION CATEGORIES */
            <div className="space-y-3">
              <div className="px-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Built-In Workflow Actions (7 Categories)
                </div>
                <div className="space-y-1.5">
                  {GHL_ACTION_CATEGORIES.map((category) => {
                    const count = GHL_BUILTIN_ACTIONS.filter(
                      (t) => t.category === category
                    ).length;
                    return (
                      <button
                        key={category}
                        type="button"
                        onClick={() =>
                          setView({
                            type: 'ghl_category',
                            category,
                            role: 'action',
                          })
                        }
                        className={`w-full flex items-center justify-between gap-3 p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                          isLightMode
                            ? 'bg-slate-50/80 border-slate-200/80 hover:bg-slate-100/90 text-slate-900'
                            : 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/70 text-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-indigo-500/15 text-indigo-500 flex items-center justify-center shrink-0">
                            {getGhlActionCategoryIcon(category)}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold truncate">
                              {category}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {count} action{count !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quick-Add Controls */}
              <div className="px-3 pt-1 space-y-1.5">
                <button
                  type="button"
                  onClick={() => handleAddByTemplateId('ghl_act_goto')}
                  className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                    isLightMode
                      ? 'border-emerald-400 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                      : 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25'
                  }`}
                >
                  <Repeat className="w-4 h-4 text-emerald-500" />
                  <span>+ Add Go To (Loop / Merge Step)</span>
                </button>

                <button
                  type="button"
                  onClick={() => addGroupFrame()}
                  className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-dashed text-xs font-semibold transition-colors cursor-pointer ${
                    isLightMode
                      ? 'border-amber-300 bg-[#FEF9C3]/60 text-slate-800 hover:bg-[#FEF9C3]'
                      : 'border-amber-500/40 bg-amber-950/20 text-amber-200 hover:bg-amber-950/40'
                  }`}
                >
                  <StickyNote className="w-4 h-4 text-amber-500" />
                  <span>+ Add Workflow Sticky Note</span>
                </button>
              </div>
            </div>
          ) : view.type === 'ghl_category' ? (
            /* GHL DRILLDOWN DETAIL FOR A CATEGORY */
            <div className="space-y-1">
              <div className="px-3 py-1 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <span>
                  {view.category} ({
                    activeCatalog.filter(
                      (t) =>
                        t.category === view.category &&
                        (view.role === 'trigger' ? t.role === 'trigger' : t.role !== 'trigger')
                    ).length
                  })
                </span>
                <span className="text-[10px] font-mono text-emerald-500">GoHighLevel</span>
              </div>
              {activeCatalog
                .filter(
                  (t) =>
                    t.category === view.category &&
                    (view.role === 'trigger' ? t.role === 'trigger' : t.role !== 'trigger')
                )
                .map((tpl) => renderNodeRow(tpl))}
            </div>
          ) : null
        ) : (
          /* ========================================================================= */
          /* C. N8N FAIR-CODE BLUEPRINT CATALOG                                        */
          /* ========================================================================= */
          view.type === 'root' && section === 'triggers' ? (
            /* n8n Triggers */
            <div className="space-y-2">
              <div className="px-2 space-y-1.5">
                <button
                  type="button"
                  onClick={() => setView({ type: 'app_triggers_platforms' })}
                  className={`w-full flex items-center justify-between gap-3 p-3.5 rounded-xl border text-left transition-colors cursor-pointer ${
                    isLightMode
                      ? 'bg-slate-50/80 border-slate-200 hover:bg-slate-100/80 text-slate-900'
                      : 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/70 text-slate-100'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-violet-500/15 text-violet-500 flex items-center justify-center shrink-0 mt-0.5">
                      <Blocks className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold">
                        On an App Event ({n8nAppTriggers.length})
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 leading-snug">
                        Start blueprint from Gmail, Google Sheets, Notion, Slack, Stripe, etc.
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => setView({ type: 'core_triggers' })}
                  className={`w-full flex items-center justify-between gap-3 p-3.5 rounded-xl border text-left transition-colors cursor-pointer ${
                    isLightMode
                      ? 'bg-slate-50/80 border-slate-200 hover:bg-slate-100/80 text-slate-900'
                      : 'bg-slate-50/5 border-slate-800 hover:bg-slate-800/70 text-slate-100'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
                      <Cpu className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold">
                        All Built-in Core Triggers ({n8nCoreTriggers.length})
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 leading-snug">
                        Webhook, Schedule/Cron, Form, Chat, Sub-Workflow, Error, IMAP, Calendar, RSS
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                </button>
              </div>

              {/* Common Core Triggers */}
              <div className="pt-1">
                <div className="px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Common n8n Triggers (1-Click Add)
                </div>
                {[
                  'core_webhook',
                  'core_schedule',
                  'core_calendar_trigger',
                  'core_form_trigger',
                  'core_chat_trigger',
                  'core_subworkflow_trigger',
                  'core_manual_trigger',
                  'core_error_trigger',
                  'core_imap_email_trigger',
                ].map((id) => {
                  const tpl = N8N_FULL_INTEGRATIONS_CATALOG.find((t) => t.id === id);
                  return tpl ? renderNodeRow(tpl) : null;
                })}
              </div>
            </div>
          ) : view.type === 'root' && section === 'actions' ? (
            /* n8n Actions */
            <div className="space-y-1">
              {[
                {
                  id: 'app_actions_platforms',
                  title: 'Action in an app',
                  subtitle:
                    'Perform an action in Gmail, Google Sheets, Notion, Slack, Stripe, etc.',
                  icon: <Globe className="w-5 h-5 text-indigo-500" />,
                  onClick: () => setView({ type: 'app_actions_platforms' }),
                },
                {
                  id: 'ai_nodes',
                  title: 'AI Agents & LLMs',
                  subtitle:
                    'Autonomous LangChain agents, structured JSON extractors, OpenAI, DeepSeek & Claude',
                  icon: <Bot className="w-5 h-5 text-violet-500" />,
                  onClick: () => setView({ type: 'ai_nodes' }),
                },
                {
                  id: 'flow_logic',
                  title: 'Flow & Routing Logic (Core)',
                  subtitle:
                    'Branch with Switch / If, Merge paths, Loop in batches, Filter, or Wait',
                  icon: <GitBranch className="w-5 h-5 text-amber-500" />,
                  onClick: () => setView({ type: 'flow_logic' }),
                },
                {
                  id: 'data_transformation',
                  title: 'Data transformation (Core)',
                  subtitle:
                    'Edit Fields (Set), run custom JS/Python Code, Split Out, Aggregate, or Parse HTML',
                  icon: <PenLine className="w-5 h-5 text-emerald-500" />,
                  onClick: () => setView({ type: 'data_transformation' }),
                },
                {
                  id: 'core_network',
                  title: 'Core Network, HTTP & Calendar',
                  subtitle:
                    'Make REST HTTP requests, Respond to Webhooks, Google/Cal.com Calendar, or GraphQL',
                  icon: <Briefcase className="w-5 h-5 text-sky-500" />,
                  onClick: () => setView({ type: 'core_network' }),
                },
                {
                  id: 'human_review',
                  title: 'Human review & Approval',
                  subtitle:
                    'Pause blueprint for human approval via Slack, Gmail Drafts, or Telegram',
                  icon: <ShieldCheck className="w-5 h-5 text-teal-500" />,
                  onClick: () => setView({ type: 'human_review' }),
                },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={item.onClick}
                  className={`w-full flex items-center justify-between gap-3.5 px-3.5 py-3.5 rounded-xl text-left transition-colors cursor-pointer ${
                    isLightMode
                      ? 'hover:bg-slate-50 text-slate-900'
                      : 'hover:bg-slate-800/50 text-slate-100'
                  }`}
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="mt-0.5 shrink-0">{item.icon}</div>
                    <div className="min-w-0">
                      <div className="text-[14px] font-semibold leading-snug">
                        {item.title}
                      </div>
                      <p
                        className={`text-xs leading-relaxed mt-0.5 ${
                          isLightMode ? 'text-slate-500' : 'text-slate-400'
                        }`}
                      >
                        {item.subtitle}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                </button>
              ))}

              <div className="my-2 px-3.5">
                <div
                  className={`border-t ${
                    isLightMode ? 'border-slate-200' : 'border-slate-800'
                  }`}
                />
              </div>

              {/* Quick-Add Looping Node & Sticky Note */}
              <div className="px-3.5 pt-1 space-y-2">
                <button
                  type="button"
                  onClick={() => handleAddByTemplateId('core_loop_batches')}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                    isLightMode
                      ? 'border-amber-400 bg-amber-50 text-amber-800 hover:bg-amber-100'
                      : 'border-amber-500/45 bg-amber-500/15 text-amber-200 hover:bg-amber-500/25'
                  }`}
                >
                  {renderNodeIcon('loop', 'w-4 h-4 text-amber-500')}
                  <span>+ Add Looping Node (Split in Batches)</span>
                </button>

                <button
                  type="button"
                  onClick={() => addGroupFrame()}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-dashed text-xs font-semibold transition-colors cursor-pointer ${
                    isLightMode
                      ? 'border-amber-300 bg-[#FEF9C3]/60 text-slate-800 hover:bg-[#FEF9C3]'
                      : 'border-amber-500/40 bg-amber-950/20 text-amber-200 hover:bg-amber-950/40'
                  }`}
                >
                  <StickyNote className="w-4 h-4 text-amber-500" />
                  <span>+ Add Blueprint Sticky Note</span>
                </button>
              </div>
            </div>
          ) : view.type === 'app_actions_platforms' ||
            view.type === 'app_triggers_platforms' ? (
            /* n8n App Platforms Directory */
            <div className="space-y-1">
              <div className="px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Select an App Platform ({n8nAppPlatformsSummary.length})
              </div>
              {n8nAppPlatformsSummary
                .filter((app) =>
                  view.type === 'app_triggers_platforms'
                    ? app.triggers.length > 0
                    : true
                )
                .map((app) => {
                  const badge = APP_ACCENT_BADGES[app.iconName];
                  const badgeClasses = badge
                    ? isLightMode
                      ? `${badge.bgLight} ${badge.textLight} ring-1 ${badge.ring}`
                      : `${badge.bgDark} ${badge.textDark} ring-1 ${badge.ring}`
                    : isLightMode
                    ? 'bg-slate-100 text-slate-700 ring-1 ring-slate-200'
                    : 'bg-slate-800 text-slate-200 ring-1 ring-slate-700';

                  return (
                    <button
                      key={app.appPlatform}
                      type="button"
                      onClick={() =>
                        setView({
                          type: 'app_platform_detail',
                          appPlatform: app.appPlatform,
                        })
                      }
                      className={`w-full flex items-center justify-between gap-3 px-3.5 py-3 rounded-xl text-left transition-colors cursor-pointer ${
                        isLightMode
                          ? 'hover:bg-slate-50 text-slate-900'
                          : 'hover:bg-slate-800/50 text-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 shadow-2xs ${badgeClasses}`}
                        >
                          {renderNodeIcon(app.iconName, 'w-4 h-4')}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold truncate">
                            {app.appPlatform}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400">
                            {app.triggers.length > 0 && (
                              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                ⚡ {app.triggers.length} Trigger
                                {app.triggers.length > 1 ? 's' : ''}
                              </span>
                            )}
                            {app.actions.length > 0 && (
                              <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                                ▶ {app.actions.length} Action
                                {app.actions.length > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                    </button>
                  );
                })}
            </div>
          ) : view.type === 'app_platform_detail' ? (
            /* n8n App Platform Detail */
            <div className="space-y-4">
              {(() => {
                const appNodes = N8N_FULL_INTEGRATIONS_CATALOG.filter(
                  (t) =>
                    t.nodeGroup === 'app' && t.appPlatform === view.appPlatform
                );
                const triggers = appNodes.filter((t) => t.role === 'trigger');
                const actions = appNodes.filter((t) => t.role !== 'trigger');

                return (
                  <>
                    {triggers.length > 0 && (
                      <div>
                        <div className="px-3.5 py-1.5 flex items-center justify-between">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                            ⚡ {view.appPlatform} Triggers ({triggers.length})
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Starts Blueprint
                          </span>
                        </div>
                        <div className="space-y-0.5">
                          {triggers.map((tpl) => renderNodeRow(tpl))}
                        </div>
                      </div>
                    )}

                    {actions.length > 0 && (
                      <div>
                        <div className="px-3.5 py-1.5 flex items-center justify-between">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                            ▶ {view.appPlatform} Actions ({actions.length})
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Blueprint Step
                          </span>
                        </div>
                        <div className="space-y-0.5">
                          {actions.map((tpl) => renderNodeRow(tpl))}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          ) : view.type === 'core_triggers' ? (
            /* n8n Built-in Core Triggers */
            <div className="space-y-0.5">
              <div className="px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                ⚡ Built-in Core Triggers ({n8nCoreTriggers.length})
              </div>
              {n8nCoreTriggers.map((tpl) => renderNodeRow(tpl))}
            </div>
          ) : view.type === 'ai_nodes' ? (
            /* n8n AI Agents & LLMs */
            <div className="space-y-3">
              {[
                {
                  title: '🤖 1. Autonomous AI Agents & Chains',
                  colorClass: 'text-violet-600 dark:text-violet-400',
                  items: N8N_FULL_INTEGRATIONS_CATALOG.filter(
                    (t) => t.role === 'ai' && !t.aiSubNodeType
                  ),
                },
                {
                  title: '✦ 2. Standalone LLM Nodes (Direct Execution)',
                  colorClass: 'text-emerald-600 dark:text-emerald-400',
                  items: N8N_FULL_INTEGRATIONS_CATALOG.filter(
                    (t) => t.category === 'Core AI & LangChain' && t.role === 'action'
                  ),
                },
                {
                  title: '✦ 3. Chat Models (Connects to AI Agent)',
                  colorClass: 'text-purple-600 dark:text-purple-400',
                  items: N8N_FULL_INTEGRATIONS_CATALOG.filter(
                    (t) => t.aiSubNodeType === 'llm'
                  ),
                },
                {
                  title: '🧠 4. Memory Sub-Nodes (Connects to AI Agent)',
                  colorClass: 'text-sky-600 dark:text-sky-400',
                  items: N8N_FULL_INTEGRATIONS_CATALOG.filter(
                    (t) => t.aiSubNodeType === 'memory'
                  ),
                },
                {
                  title: '🛠️ 5. MCP & Agent Tools (Connects to AI Agent)',
                  colorClass: 'text-teal-600 dark:text-teal-400',
                  items: N8N_FULL_INTEGRATIONS_CATALOG.filter(
                    (t) => t.aiSubNodeType === 'tool'
                  ),
                },
                {
                  title: '📋 6. Output Parsers (Connects to AI Agent)',
                  colorClass: 'text-amber-600 dark:text-amber-400',
                  items: N8N_FULL_INTEGRATIONS_CATALOG.filter(
                    (t) => t.aiSubNodeType === 'parser'
                  ),
                },
              ].map((group) => (
                <div key={group.title} className="space-y-0.5">
                  <div
                    className={`px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider ${group.colorClass}`}
                  >
                    {group.title} ({group.items.length})
                  </div>
                  {group.items.map((tpl) => renderNodeRow(tpl))}
                </div>
              ))}
            </div>
          ) : view.type === 'flow_logic' ? (
            <div className="space-y-0.5">
              {N8N_FULL_INTEGRATIONS_CATALOG.filter(
                (t) =>
                  t.nodeGroup === 'core' &&
                  (t.category === 'Flow Control & Logic' || t.id === 'core_respond_webhook')
              ).map((tpl) => renderNodeRow(tpl))}
            </div>
          ) : view.type === 'data_transformation' ? (
            <div className="space-y-0.5">
              {N8N_FULL_INTEGRATIONS_CATALOG.filter(
                (t) =>
                  t.nodeGroup === 'core' &&
                  t.category === 'Data & Code Transform'
              ).map((tpl) => renderNodeRow(tpl))}
            </div>
          ) : view.type === 'core_network' ? (
            <div className="space-y-0.5">
              {N8N_FULL_INTEGRATIONS_CATALOG.filter(
                (t) =>
                  t.nodeGroup === 'core' &&
                  (t.category === 'HTTP & Core Network' ||
                    t.id === 'core_code' ||
                    t.id === 'core_calendar')
              ).map((tpl) => renderNodeRow(tpl))}
            </div>
          ) : (
            <div className="space-y-0.5">
              {N8N_FULL_INTEGRATIONS_CATALOG.filter(
                (t) =>
                  t.id === 'core_wait' ||
                  t.appPlatform === 'Slack' ||
                  t.appPlatform === 'Telegram' ||
                  t.appPlatform === 'Gmail'
              ).map((tpl) => renderNodeRow(tpl))}
            </div>
          )
        )}
      </div>
    </aside>
  );
};
