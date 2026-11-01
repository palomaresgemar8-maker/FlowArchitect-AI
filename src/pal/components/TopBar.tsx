import React, { useRef, useState } from 'react';
import {
  Undo2,
  Redo2,
  LayoutGrid,
  Sun,
  Moon,
  Download,
  Upload,
  Settings,
  FileText,
  Plus,
  ChevronDown,
  Trash2,
  FolderKanban,
  Network,
  Workflow,
  Film,
  Loader2,
  Repeat,
  Map,
} from 'lucide-react';
import { useWorkflowStore } from '../../bal/useWorkflowStore';
import { PLATFORM_META } from '../../bal/platformTranslator';
import type { PlatformType, WorkflowProject } from '../../types/workflow';
import {
  exportCanvasAsPng,
  exportCanvasAsSvg,
  exportMakeBlueprint,
  exportN8nBlueprint,
  exportProjectAsGif,
  exportWorkspaceBackup,
  parseImportedWorkflowJson,
} from '../../sal/exportService';
import { eventBus } from '../../bal/eventBus';

interface TopBarProps {
  canvasViewportRef: React.RefObject<HTMLDivElement | null>;
}

const PLATFORMS: PlatformType[] = ['n8n', 'make', 'zapier', 'ghl'];

export const TopBar: React.FC<TopBarProps> = ({ canvasViewportRef }) => {
  const {
    projects,
    activeProjectId,
    projectName,
    platform,
    canvasMode,
    nodes,
    edges,
    past,
    future,
    isLightMode,
    showMiniMap,
    undo,
    redo,
    setCanvasMode,
    toggleMiniMap,
    switchPlatform,
    runAutoLayout,
    addLoopingNodeQuick,
    selectProject,
    createNewProject,
    renameActiveProject,
    deleteProject,
    importProjectObject,
    setIsLightMode,
    setIsSettingsModalOpen,
    setIsSowModalOpen,
    aiSettings,
  } = useWorkflowStore();

  const [isProjectMenuOpen, setIsProjectMenuOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [exportingGifProjectId, setExportingGifProjectId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const workflowNodeCount = nodes.filter((n) => n.type !== 'resizableGroup').length;
  const totalTimeSavedMins = nodes
    .filter((n) => n.type !== 'resizableGroup')
    .reduce((acc, n) => acc + (Number(n.data.estimatedTimeSavedMins) || 0), 0);

  const storedActiveProject = projects.find((p) => p.id === activeProjectId);
  const activeProjectObject: WorkflowProject = {
    ...(storedActiveProject || {}),
    id: activeProjectId,
    name: projectName,
    description: storedActiveProject?.description || '',
    platform,
    createdAt: storedActiveProject?.createdAt || Date.now(),
    updatedAt: Date.now(),
    nodes,
    edges,
    rawSourceFormat: storedActiveProject?.rawSourceFormat,
    rawTopLevelMeta: storedActiveProject?.rawTopLevelMeta,
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const rawText = await file.text();
      const imported = parseImportedWorkflowJson(rawText, platform);
      importProjectObject(imported);
    } catch (err: any) {
      eventBus.emit('TOAST_NOTIFY', {
        type: 'error',
        message: err?.message || 'Failed to parse JSON workflow file.',
      });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleExportPng = async () => {
    setIsExportMenuOpen(false);
    if (!canvasViewportRef.current) return;
    try {
      await exportCanvasAsPng(canvasViewportRef.current, projectName, isLightMode);
      eventBus.emit('TOAST_NOTIFY', {
        type: 'success',
        message: 'Exported high-resolution PNG blueprint',
      });
    } catch {
      eventBus.emit('TOAST_NOTIFY', {
        type: 'error',
        message: 'Failed to export PNG image',
      });
    }
  };

  const handleExportSvg = async () => {
    setIsExportMenuOpen(false);
    if (!canvasViewportRef.current) return;
    try {
      await exportCanvasAsSvg(canvasViewportRef.current, projectName, isLightMode);
      eventBus.emit('TOAST_NOTIFY', {
        type: 'success',
        message: 'Exported vector SVG blueprint',
      });
    } catch {
      eventBus.emit('TOAST_NOTIFY', {
        type: 'error',
        message: 'Failed to export SVG diagram',
      });
    }
  };

  const handleExportProjectGif = async (targetProject?: WorkflowProject) => {
    const projToExport =
      !targetProject || targetProject.id === activeProjectId
        ? activeProjectObject
        : targetProject;

    const isCurrentActive = projToExport.id === activeProjectId;
    setExportingGifProjectId(projToExport.id);
    setIsExportMenuOpen(false);

    eventBus.emit('TOAST_NOTIFY', {
      type: 'info',
      message: `Rendering animated GIF for "${projToExport.name}"...`,
    });

    try {
      await exportProjectAsGif(projToExport, isLightMode, {
        activeCanvasElement: canvasViewportRef.current,
        isCurrentActiveProject: isCurrentActive,
        canvasMode,
      });
      eventBus.emit('TOAST_NOTIFY', {
        type: 'success',
        message: `Downloaded "${projToExport.name}" as animated GIF (.gif)`,
      });
    } catch {
      eventBus.emit('TOAST_NOTIFY', {
        type: 'error',
        message: 'Failed to encode animated GIF',
      });
    } finally {
      setExportingGifProjectId(null);
    }
  };

  return (
    <div
      className={`shrink-0 border-b transition-colors z-30 ${
        isLightMode
          ? 'bg-white border-slate-200 text-slate-900'
          : 'bg-[#0F172A] border-slate-800/90 text-slate-100'
      }`}
    >
      {/* Row 1: Strict 3-Zone Top Bar Contract */}
      <header className="flex items-center justify-between gap-8 px-5 py-2.5 border-b border-slate-800/50">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#workspace"
          onClick={(e) => e.preventDefault()}
          className="text-base font-bold tracking-tight whitespace-nowrap shrink-0"
        >
          FlowArchitect AI
        </a>

        {/* Zone 2: 4 concise single-line navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-400">
          <button
            type="button"
            onClick={() => runAutoLayout('LR')}
            className="hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Auto-Layout
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Import JSON
          </button>
          <button
            type="button"
            onClick={() => setIsSowModalOpen(true)}
            className="hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Scope of Work
          </button>
          <button
            type="button"
            onClick={() => setIsSettingsModalOpen(true)}
            className="hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            AI Engine
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setIsSowModalOpen(true)}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-violet-600 rounded-lg hover:bg-violet-500 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Generate Client Proposal
          </button>
        </div>
      </header>

      {/* Row 2: Secondary Workspace Toolbar (Project Breadcrumb, Platform Translator, Canvas Controls, Export) */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-2 text-xs">
        {/* Left: Project Switcher & Inline Title Editor */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsProjectMenuOpen((v) => !v)}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                isLightMode
                  ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <FolderKanban className="w-3.5 h-3.5 text-violet-400" />
              <span>Blueprints ({projects.length})</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-70" />
            </button>

            {isProjectMenuOpen && (
              <div
                className={`absolute left-0 mt-1.5 w-80 rounded-xl border shadow-xl p-2 z-50 ${
                  isLightMode
                    ? 'bg-white border-slate-200 text-slate-800'
                    : 'bg-slate-900 border-slate-700 text-slate-100'
                }`}
              >
                <div className="flex items-center justify-between px-2 py-1.5 border-b border-slate-800/50 mb-1">
                  <span className="text-[11px] font-semibold text-slate-400">
                    Local IndexedDB Blueprints
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      createNewProject();
                      setIsProjectMenuOpen(false);
                    }}
                    className="flex items-center gap-1 text-[11px] font-medium text-violet-400 hover:text-violet-300 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> New Blueprint
                  </button>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-1">
                  {projects.map((proj) => {
                    const isRenderingThisGif = exportingGifProjectId === proj.id;
                    return (
                      <div
                        key={proj.id}
                        className={`flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-left transition-colors ${
                          proj.id === activeProjectId
                            ? isLightMode
                              ? 'bg-violet-50 text-violet-900'
                              : 'bg-violet-500/15 text-violet-200'
                            : isLightMode
                            ? 'hover:bg-slate-100'
                            : 'hover:bg-slate-800/70'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            selectProject(proj.id);
                            setIsProjectMenuOpen(false);
                          }}
                          className="flex-1 min-w-0 text-left cursor-pointer"
                        >
                          <div className="text-xs font-medium truncate">
                            {proj.name}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono tabular-nums">
                            {proj.platform.toUpperCase()} · {proj.nodes.length} nodes
                          </div>
                        </button>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            disabled={Boolean(exportingGifProjectId)}
                            title={`Download "${proj.name}" as Animated GIF (.gif)`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleExportProjectGif(proj);
                            }}
                            className={`flex items-center gap-1 px-1.5 py-1 rounded-md text-[10px] font-mono font-semibold border transition-colors cursor-pointer disabled:opacity-50 ${
                              isLightMode
                                ? 'bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100'
                                : 'bg-violet-500/15 border-violet-500/30 text-violet-300 hover:bg-violet-500/25'
                            }`}
                          >
                            {isRenderingThisGif ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Film className="w-3 h-3" />
                            )}
                            <span>GIF</span>
                          </button>

                          {projects.length > 1 && (
                            <button
                              type="button"
                              title="Delete Blueprint"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteProject(proj.id);
                              }}
                              className="p-1 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <input
            type="text"
            value={projectName}
            onChange={(e) => renameActiveProject(e.target.value)}
            aria-label="Active Blueprint Name"
            className={`px-2.5 py-1 rounded-md text-xs font-semibold border border-transparent focus:border-violet-500 focus:outline-none w-56 sm:w-72 truncate ${
              isLightMode
                ? 'bg-transparent text-slate-900 hover:bg-slate-100'
                : 'bg-transparent text-slate-100 hover:bg-slate-800/70'
            }`}
          />

          {/* Quiet unboxed telemetry summary */}
          <div className="hidden xl:flex items-center gap-1.5 text-[11px] text-slate-400 font-mono tabular-nums">
            <span>{workflowNodeCount} steps</span>
            <span aria-hidden="true">·</span>
            <span>{edges.length} edges</span>
            <span aria-hidden="true">·</span>
            <span>~{totalTimeSavedMins}m saved/run</span>
          </div>
        </div>

        {/* Center: View Mode Switcher (Workflow vs Mind Map) + Platform Translator */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Workflow Blueprint vs Mind Map Mode Segmented Switcher */}
          <div
            className={`flex items-center gap-1 p-1 rounded-lg border ${
              isLightMode
                ? 'bg-indigo-50/70 border-indigo-200/80'
                : 'bg-slate-950/80 border-indigo-500/30'
            }`}
          >
            <button
              type="button"
              onClick={() => setCanvasMode('workflow')}
              title="Workflow Blueprint Mode — Pure Icon Medallions & AI Agent Hub"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                canvasMode === 'workflow'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : isLightMode
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Workflow className="w-3.5 h-3.5" />
              <span>Workflow</span>
            </button>
            <button
              type="button"
              onClick={() => setCanvasMode('mindmap')}
              title="Mind Map Mode — Hierarchical Topic Tree & Collapsible Branches"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                canvasMode === 'mindmap'
                  ? 'bg-violet-600 text-white shadow-xs'
                  : isLightMode
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>Mind Map</span>
            </button>
          </div>

          {/* 1-Click Platform Translator Segmented Control */}
          <div
            className={`flex items-center gap-1 p-1 rounded-lg border ${
              isLightMode
                ? 'bg-slate-100 border-slate-200'
                : 'bg-slate-950/80 border-slate-800'
            }`}
          >
            {PLATFORMS.map((p) => {
              const active = platform === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => switchPlatform(p)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? isLightMode
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'bg-slate-800 text-white shadow-xs'
                      : isLightMode
                      ? 'text-slate-600 hover:text-slate-900'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {PLATFORM_META[p].shortLabel}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Undo/Redo, Layout, Theme Mode, GIF Download, Import/Export, Settings */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={undo}
            disabled={past.length === 0}
            title="Undo (Ctrl+Z)"
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed ${
              isLightMode
                ? 'border-slate-200 hover:bg-slate-100 text-slate-700'
                : 'border-slate-800 hover:bg-slate-800 text-slate-300'
            }`}
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={future.length === 0}
            title="Redo (Ctrl+Y)"
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed ${
              isLightMode
                ? 'border-slate-200 hover:bg-slate-100 text-slate-700'
                : 'border-slate-800 hover:bg-slate-800 text-slate-300'
            }`}
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={addLoopingNodeQuick}
            title="Add Looping Node (Split in Batches with 'done' & 'loop' ports)"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
              isLightMode
                ? 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100'
                : 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25'
            }`}
          >
            <Repeat className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden sm:inline">+ Loop Node</span>
          </button>

          <button
            type="button"
            onClick={() => runAutoLayout('LR')}
            title="Tidy Auto-Layout (Horizontal)"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
              isLightMode
                ? 'border-slate-200 hover:bg-slate-100 text-slate-700'
                : 'border-slate-800 hover:bg-slate-800 text-slate-300'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Tidy Graph</span>
          </button>

          {/* MiniMap Visibility Toggle */}
          <button
            type="button"
            onClick={toggleMiniMap}
            title={showMiniMap ? 'Hide MiniMap' : 'Show MiniMap'}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
              showMiniMap
                ? isLightMode
                  ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                  : 'border-indigo-500/40 bg-indigo-500/15 text-indigo-300'
                : isLightMode
                ? 'border-slate-200 hover:bg-slate-100 text-slate-500'
                : 'border-slate-800 hover:bg-slate-800 text-slate-400'
            }`}
          >
            <Map className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{showMiniMap ? 'MiniMap' : 'Map Off'}</span>
          </button>

          {/* Presentation Light / Dark Mode Toggle */}
          <button
            type="button"
            onClick={() => setIsLightMode(!isLightMode)}
            title={
              isLightMode
                ? 'Switch to Dark Blueprint Studio'
                : 'Switch to Presentation Light Mode for Client Exports'
            }
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
              isLightMode
                ? 'border-slate-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
                : 'border-slate-800 hover:bg-slate-800 text-slate-300'
            }`}
          >
            {isLightMode ? (
              <>
                <Moon className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Dark Studio</span>
              </>
            ) : (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden lg:inline">Client Light</span>
              </>
            )}
          </button>

          {/* 1-Click Animated GIF Download Button */}
          <button
            type="button"
            disabled={Boolean(exportingGifProjectId)}
            onClick={() => handleExportProjectGif(activeProjectObject)}
            title="Download Active Workflow Blueprint as Animated GIF (.gif)"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors disabled:opacity-50 ${
              isLightMode
                ? 'border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100'
                : 'border-violet-500/30 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20'
            }`}
          >
            {exportingGifProjectId === activeProjectId ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-400" />
            ) : (
              <Film className="w-3.5 h-3.5 text-violet-400" />
            )}
            <span className="hidden sm:inline">Download GIF</span>
          </button>

          {/* Import n8n / Make / Workspace JSON */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleImportFile}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Import n8n, Make.com, or FlowArchitect JSON file"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
              isLightMode
                ? 'border-slate-200 hover:bg-slate-100 text-slate-700'
                : 'border-slate-800 hover:bg-slate-800 text-slate-300'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Import</span>
          </button>

          {/* Export Suite Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsExportMenuOpen((v) => !v)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                isLightMode
                  ? 'border-slate-200 bg-slate-900 text-white hover:bg-slate-800'
                  : 'border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
              <ChevronDown className="w-3 h-3 opacity-75" />
            </button>

            {isExportMenuOpen && (
              <div
                className={`absolute right-0 mt-1.5 w-72 rounded-xl border shadow-xl p-1.5 z-50 ${
                  isLightMode
                    ? 'bg-white border-slate-200 text-slate-800'
                    : 'bg-slate-900 border-slate-700 text-slate-100'
                }`}
              >
                <button
                  type="button"
                  disabled={Boolean(exportingGifProjectId)}
                  onClick={() => handleExportProjectGif(activeProjectObject)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs hover:bg-violet-500/15 text-left cursor-pointer disabled:opacity-50"
                >
                  <span className="flex items-center gap-1.5 font-semibold text-violet-400">
                    <Film className="w-3.5 h-3.5" />
                    Export Animated GIF (Active)
                  </span>
                  <span className="font-mono text-[10px] text-violet-400">.gif</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportPng}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs hover:bg-violet-500/15 text-left cursor-pointer"
                >
                  <span>Export High-Res PNG</span>
                  <span className="font-mono text-[10px] text-slate-400">2x DPI</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportSvg}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs hover:bg-violet-500/15 text-left cursor-pointer"
                >
                  <span>Export Vector SVG</span>
                  <span className="font-mono text-[10px] text-slate-400">SVG</span>
                </button>

                {projects.length > 1 && (
                  <>
                    <div className="my-1 border-t border-slate-800/60" />
                    <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Download Any Project as GIF
                    </div>
                    <div className="max-h-36 overflow-y-auto space-y-0.5">
                      {projects.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          disabled={Boolean(exportingGifProjectId)}
                          onClick={() => handleExportProjectGif(p)}
                          className="w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg text-[11px] hover:bg-violet-500/15 text-left cursor-pointer disabled:opacity-50"
                        >
                          <span className="truncate">{p.name}</span>
                          <span className="shrink-0 font-mono text-[9px] text-violet-400 uppercase">
                            {p.platform} · .gif
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                )}

                <div className="my-1 border-t border-slate-800/60" />
                <button
                  type="button"
                  onClick={() => {
                    setIsExportMenuOpen(false);
                    exportN8nBlueprint(activeProjectObject);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs hover:bg-violet-500/15 text-left cursor-pointer"
                >
                  <span>Export n8n Starter Blueprint</span>
                  <span className="font-mono text-[10px] text-emerald-400">.json</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsExportMenuOpen(false);
                    exportMakeBlueprint(activeProjectObject);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs hover:bg-violet-500/15 text-left cursor-pointer"
                >
                  <span>Export Make.com Scenario</span>
                  <span className="font-mono text-[10px] text-violet-400">.json</span>
                </button>
                <div className="my-1 border-t border-slate-800/60" />
                <button
                  type="button"
                  onClick={() => {
                    setIsExportMenuOpen(false);
                    exportWorkspaceBackup(activeProjectObject);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs hover:bg-violet-500/15 text-left cursor-pointer"
                >
                  <span>Save Full Workspace Backup</span>
                  <span className="font-mono text-[10px] text-slate-400">.json</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsExportMenuOpen(false);
                    setIsSowModalOpen(true);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs hover:bg-violet-500/15 text-left cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-violet-400" />
                    Client SOW Proposal
                  </span>
                  <span className="font-mono text-[10px] text-violet-400">.md</span>
                </button>
              </div>
            )}
          </div>

          {/* AI Engine Settings */}
          <button
            type="button"
            onClick={() => setIsSettingsModalOpen(true)}
            title={`Configure AI Engine (Active: ${aiSettings.provider} · ${aiSettings.modelId})`}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer ${
              isLightMode
                ? 'border-violet-200 bg-violet-50/70 text-violet-800 hover:bg-violet-100'
                : 'border-violet-500/30 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20'
            }`}
          >
            <Settings className="w-3.5 h-3.5 text-violet-500 shrink-0" />
            <span className="hidden xl:inline text-[11px] font-mono font-medium max-w-[140px] truncate">
              {aiSettings.modelId}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
