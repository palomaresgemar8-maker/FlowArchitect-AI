import React, { useState } from 'react';
import {
  ArrowLeft,
  Trash2,
  Copy,
  Cpu,
  Blocks,
  Link2,
  Unlink,
  Zap,
  Play,
  Sparkles,
  GitBranch,
  Repeat,
  Plus,
  RotateCcw,
} from 'lucide-react';
import { useWorkflowStore } from '../../bal/useWorkflowStore';
import { ICON_MAP, renderNodeIcon, ROLE_STYLES } from '../nodes/nodeIcons';
import {
  getAiAgentSubNodesBySlot,
  getPlatformTriggersAndActions,
  NODE_LIBRARY_TEMPLATES,
  PLATFORM_META,
} from '../../bal/platformTranslator';
import type {
  AiSubNodeType,
  LoopModeType,
  NodeGroupType,
  NodeRole,
} from '../../types/workflow';

const HTTP_METHODS = ['POST', 'GET', 'PUT', 'PATCH', 'DELETE'] as const;

export const NodeInspectorDrawer: React.FC = () => {
  const {
    nodes,
    edges,
    selectedNodeId,
    platform,
    isLightMode,
    setSelectedNodeId,
    updateNodeData,
    deleteNode,
    duplicateNode,
    executeLibraryNodeReplace,
    appendLoopBodyNode,
    appendLoopDoneNode,
    connectNodeToLoopReturn,
    attachAiSubNode,
    deleteEdge,
    updateEdgeLabel,
    connectNodesById,
  } = useWorkflowStore();

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const [activeSwitcherTab, setActiveSwitcherTab] = useState<'trigger' | 'action'>(
    selectedNode?.data.role === 'trigger' ? 'trigger' : 'action'
  );

  if (!selectedNode || selectedNode.type === 'resizableGroup') return null;

  const { data } = selectedNode;
  const roleStyle = ROLE_STYLES[data.role] || ROLE_STYLES.action;
  const isLoopNode = Boolean(
    data.isLoopNode ||
      data.iconName === 'loop' ||
      data.serviceName?.includes('splitInBatches') ||
      data.operation?.startsWith('loop:')
  );

  const {
    platformTriggers,
    platformActions,
    allTriggers,
    allActions,
  } = getPlatformTriggersAndActions(data.appPlatform, data.nodeGroup);

  const coreTemplates = NODE_LIBRARY_TEMPLATES.filter(
    (t) => t.nodeGroup === 'core'
  );
  const appTemplates = NODE_LIBRARY_TEMPLATES.filter(
    (t) => t.nodeGroup === 'app'
  );

  // Incoming & Outgoing Connections for this node
  const incomingEdges = edges.filter((e) => e.target === selectedNode.id);
  const outgoingEdges = edges.filter((e) => e.source === selectedNode.id);
  const otherWorkflowNodes = nodes.filter(
    (n) => n.id !== selectedNode.id && n.type !== 'resizableGroup'
  );

  const getNodeLabel = (id: string) =>
    nodes.find((n) => n.id === id)?.data.label || id;

  const handleSwitchMode = (targetRole: NodeRole | 'loop') => {
    if (targetRole === 'loop') {
      const loopTpl = NODE_LIBRARY_TEMPLATES.find(
        (t) => t.id === 'core_loop_batches'
      );
      if (loopTpl) {
        executeLibraryNodeReplace(selectedNode.id, loopTpl);
      } else {
        updateNodeData(selectedNode.id, {
          role: 'router',
          iconName: 'loop',
          isLoopNode: true,
          operation: 'loop: splitInBatches',
          loopConfig: data.loopConfig || {
            mode: 'batch',
            batchSize: 10,
            arrayField: 'items',
            maxIterations: 100,
            pauseMs: 0,
          },
        });
      }
      return;
    }

    if (targetRole === 'trigger') {
      setActiveSwitcherTab('trigger');
      if (platformTriggers.length > 0 && data.role !== 'trigger') {
        executeLibraryNodeReplace(selectedNode.id, platformTriggers[0]);
        return;
      }
      const cleanOp = (data.operation || 'onEvent').replace(
        /^(action|ai|router|loop):\s*/i,
        'trigger: '
      );
      updateNodeData(selectedNode.id, {
        role: 'trigger',
        isLoopNode: false,
        operation: cleanOp.startsWith('trigger:')
          ? cleanOp
          : `trigger: ${cleanOp}`,
      });
    } else if (targetRole === 'action') {
      setActiveSwitcherTab('action');
      if (platformActions.length > 0 && data.role === 'trigger') {
        executeLibraryNodeReplace(selectedNode.id, platformActions[0]);
        return;
      }
      const cleanOp = (data.operation || 'executeAction').replace(
        /^(trigger|loop):\s*/i,
        'action: '
      );
      updateNodeData(selectedNode.id, {
        role: 'action',
        isLoopNode: false,
        operation: cleanOp.startsWith('action:')
          ? cleanOp
          : `action: ${cleanOp}`,
      });
    } else {
      setActiveSwitcherTab('action');
      updateNodeData(selectedNode.id, {
        role: targetRole,
        isLoopNode: false,
        iconName:
          targetRole === 'router' && data.iconName === 'loop'
            ? 'git-branch'
            : data.iconName,
      });
    }
  };

  return (
    <aside
      className={`no-export shrink-0 w-[360px] border-l flex flex-col h-full z-20 transition-colors ${
        isLightMode
          ? 'bg-white border-slate-200 text-slate-900'
          : 'bg-[#0F172A] border-slate-800/90 text-slate-100'
      }`}
    >
      {/* Inspector Header with Back Button & Instant Inline Node Rename Input */}
      <div className="px-4 py-3 border-b border-slate-200/70 dark:border-slate-800/60 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <button
              type="button"
              onClick={() => setSelectedNodeId(null)}
              title="Back to Blueprint Node Library"
              className={`p-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
                isLightMode
                  ? 'hover:bg-slate-100 text-slate-600'
                  : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                isLightMode ? roleStyle.iconBgLight : roleStyle.iconBgDark
              }`}
            >
              {renderNodeIcon(data.iconName, 'w-4 h-4')}
            </div>
            <div className="min-w-0 flex-1">
              <input
                type="text"
                value={data.label}
                onChange={(e) =>
                  updateNodeData(selectedNode.id, { label: e.target.value })
                }
                aria-label="Rename Node"
                placeholder="Enter node name..."
                className={`w-full px-2 py-1 rounded-md text-sm font-bold border transition-colors focus:outline-none focus:border-indigo-500 ${
                  isLightMode
                    ? 'bg-slate-50 border-slate-200/90 text-slate-900 hover:border-slate-300'
                    : 'bg-slate-900 border-slate-800 text-slate-100 hover:border-slate-700'
                }`}
              />
            </div>
          </div>
        </div>
        <div className="pl-11">
          <input
            type="text"
            value={data.subtitle || ''}
            onChange={(e) =>
              updateNodeData(selectedNode.id, { subtitle: e.target.value })
            }
            aria-label="Node Subtitle"
            placeholder="Add short subtitle or operation note..."
            className={`w-full px-2 py-1 rounded-md text-[11px] font-mono border transition-colors focus:outline-none focus:border-indigo-500 ${
              isLightMode
                ? 'bg-slate-50/70 border-slate-200/70 text-slate-600'
                : 'bg-slate-900/70 border-slate-800/80 text-slate-400'
            }`}
          />
        </div>
      </div>

      {/* Scrollable Inspector Form */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* 1. Organized Blueprint Step Role: Trigger vs Action vs AI vs Logic vs Loop Switcher */}
        <div
          className={`p-3 rounded-xl border space-y-2.5 ${
            isLightMode
              ? 'bg-slate-50 border-slate-200'
              : 'bg-slate-900/95 border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-semibold text-indigo-600 dark:text-indigo-400">
              Blueprint Step Role
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              {data.appPlatform || (data.nodeGroup === 'core' ? 'Core' : 'App')}
            </span>
          </div>

          {/* 5-Button Blueprint Role Selector (Trigger | Action | AI | Logic | Loop) */}
          <div className="grid grid-cols-5 gap-1">
            <button
              type="button"
              onClick={() => handleSwitchMode('trigger')}
              className={`flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-lg border text-[10.5px] font-semibold transition-all cursor-pointer ${
                data.role === 'trigger'
                  ? 'border-emerald-500 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                  : isLightMode
                  ? 'border-slate-200 text-slate-600 hover:bg-slate-100'
                  : 'border-slate-800 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <Zap className="w-3 h-3 shrink-0" />
              <span>Trigger</span>
            </button>
            <button
              type="button"
              onClick={() => handleSwitchMode('action')}
              className={`flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-lg border text-[10.5px] font-semibold transition-all cursor-pointer ${
                data.role === 'action' && !isLoopNode
                  ? 'border-sky-500 bg-sky-500/20 text-sky-700 dark:text-sky-300'
                  : isLightMode
                  ? 'border-slate-200 text-slate-600 hover:bg-slate-100'
                  : 'border-slate-800 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <Play className="w-3 h-3 shrink-0" />
              <span>Action</span>
            </button>
            <button
              type="button"
              onClick={() => handleSwitchMode('ai')}
              className={`flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-lg border text-[10.5px] font-semibold transition-all cursor-pointer ${
                data.role === 'ai'
                  ? 'border-violet-500 bg-violet-500/20 text-violet-700 dark:text-violet-300'
                  : isLightMode
                  ? 'border-slate-200 text-slate-600 hover:bg-slate-100'
                  : 'border-slate-800 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <Sparkles className="w-3 h-3 shrink-0" />
              <span>AI</span>
            </button>
            <button
              type="button"
              onClick={() => handleSwitchMode('router')}
              className={`flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-lg border text-[10.5px] font-semibold transition-all cursor-pointer ${
                data.role === 'router' && !isLoopNode
                  ? 'border-amber-500 bg-amber-500/20 text-amber-700 dark:text-amber-300'
                  : isLightMode
                  ? 'border-slate-200 text-slate-600 hover:bg-slate-100'
                  : 'border-slate-800 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <GitBranch className="w-3 h-3 shrink-0" />
              <span>Logic</span>
            </button>
            <button
              type="button"
              onClick={() => handleSwitchMode('loop')}
              className={`flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-lg border text-[10.5px] font-semibold transition-all cursor-pointer ${
                isLoopNode
                  ? 'border-amber-500 bg-amber-500/25 text-amber-700 dark:text-amber-300'
                  : isLightMode
                  ? 'border-slate-200 text-slate-600 hover:bg-slate-100'
                  : 'border-slate-800 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <Repeat className="w-3 h-3 shrink-0" />
              <span>Loop</span>
            </button>
          </div>

          {/* Organized 2-Tab List for Current Platform: Triggers vs Actions */}
          {(platformTriggers.length > 0 || platformActions.length > 0) && (
            <div className="space-y-2 pt-1">
              <div className="grid grid-cols-2 gap-1 p-0.5 rounded-lg bg-slate-200/70 dark:bg-slate-950">
                <button
                  type="button"
                  onClick={() => setActiveSwitcherTab('trigger')}
                  className={`py-1 px-2 rounded-md text-[10px] font-semibold transition-colors cursor-pointer ${
                    activeSwitcherTab === 'trigger'
                      ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-2xs'
                      : 'text-slate-500'
                  }`}
                >
                  ⚡ {data.appPlatform || 'Core'} Triggers ({platformTriggers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSwitcherTab('action')}
                  className={`py-1 px-2 rounded-md text-[10px] font-semibold transition-colors cursor-pointer ${
                    activeSwitcherTab === 'action'
                      ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                      : 'text-slate-500'
                  }`}
                >
                  ▶ {data.appPlatform || 'Core'} Actions ({platformActions.length})
                </button>
              </div>

              <div className="max-h-36 overflow-y-auto space-y-1 pr-0.5">
                {activeSwitcherTab === 'trigger' ? (
                  platformTriggers.length === 0 ? (
                    <p className="text-[11px] text-slate-400 py-2 text-center">
                      No pre-built triggers for this platform. Use the universal selector below.
                    </p>
                  ) : (
                    platformTriggers.map((tpl) => {
                      const isCurrent =
                        data.operation === tpl.operation &&
                        data.role === 'trigger';
                      return (
                        <button
                          key={tpl.id}
                          type="button"
                          onClick={() =>
                            executeLibraryNodeReplace(selectedNode.id, tpl)
                          }
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg border flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                            isCurrent
                              ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-700 dark:text-emerald-200'
                              : isLightMode
                              ? 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700'
                              : 'border-slate-800 bg-slate-950/70 hover:bg-slate-800/80 text-slate-300'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="text-[11px] font-semibold truncate">
                              ⚡ {tpl.defaultLabel[platform]}
                            </div>
                            <div className="text-[10px] font-mono text-slate-400 truncate">
                              {tpl.operation}
                            </div>
                          </div>
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 shrink-0">
                            TRIGGER
                          </span>
                        </button>
                      );
                    })
                  )
                ) : platformActions.length === 0 ? (
                  <p className="text-[11px] text-slate-400 py-2 text-center">
                    No pre-built actions for this platform. Use the universal selector below.
                  </p>
                ) : (
                  platformActions.map((tpl) => {
                    const isCurrent =
                      data.operation === tpl.operation &&
                      data.role !== 'trigger';
                    return (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() =>
                          executeLibraryNodeReplace(selectedNode.id, tpl)
                        }
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg border flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                          isCurrent
                            ? 'border-indigo-500/60 bg-indigo-500/15 text-indigo-700 dark:text-indigo-200'
                            : isLightMode
                            ? 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700'
                            : 'border-slate-800 bg-slate-950/70 hover:bg-slate-800/80 text-slate-300'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="text-[11px] font-semibold truncate">
                            ▶ {tpl.defaultLabel[platform]}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400 truncate">
                            {tpl.operation}
                          </div>
                        </div>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 shrink-0">
                          {tpl.role.toUpperCase()}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Universal Dropdown to Change into ANY Trigger Type or ANY Action across all Platforms */}
          <div className="pt-1">
            <label className="block text-[10px] font-medium text-slate-400 mb-1">
              Or replace step with any Trigger or Action in catalog:
            </label>
            <select
              defaultValue=""
              onChange={(e) => {
                const tpl = NODE_LIBRARY_TEMPLATES.find(
                  (t) => t.id === e.target.value
                );
                if (tpl) {
                  executeLibraryNodeReplace(selectedNode.id, tpl);
                  e.target.value = '';
                }
              }}
              className={`w-full px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none focus:border-indigo-500 cursor-pointer ${
                isLightMode
                  ? 'bg-white border-slate-200 text-slate-800'
                  : 'bg-slate-950 border-slate-700 text-slate-200'
              }`}
            >
              <option value="" disabled>
                Choose from {allTriggers.length} Triggers or {allActions.length} Actions...
              </option>
              <optgroup label="── ⚡ 1. BUILT-IN CORE TRIGGERS (13) ──">
                {allTriggers
                  .filter((t) => t.nodeGroup === 'core')
                  .map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      ⚡ [Core Trigger] {tpl.defaultLabel[platform]}
                    </option>
                  ))}
              </optgroup>
              <optgroup label="── ⚡ 2. APP EVENT TRIGGERS (By Platform) ──">
                {allTriggers
                  .filter((t) => t.nodeGroup === 'app')
                  .map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      ⚡ [{tpl.appPlatform} Trigger] {tpl.defaultLabel[platform]}
                    </option>
                  ))}
              </optgroup>
              <optgroup label={`── ▶ 3. ${PLATFORM_META[platform].coreTabLabel} ACTIONS & LOGIC ──`}>
                {coreTemplates
                  .filter((t) => t.role !== 'trigger')
                  .map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      ▶ [Core · {tpl.category}] {tpl.defaultLabel[platform]}
                    </option>
                  ))}
              </optgroup>
              <optgroup label={`── ▶ 4. ${PLATFORM_META[platform].appTabLabel} ACTIONS (By Platform) ──`}>
                {appTemplates
                  .filter((t) => t.role !== 'trigger')
                  .map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      ▶ [{tpl.appPlatform} Action] {tpl.defaultLabel[platform]}
                    </option>
                  ))}
              </optgroup>
            </select>
          </div>
        </div>

        {/* 1B. AI Agent Sub-Node Ports (LLM, Memory, MCP/Tool, Output Parser) */}
        {data.role === 'ai' && !data.aiSubNodeType && (
          <div
            className={`p-3 rounded-xl border space-y-2.5 ${
              isLightMode
                ? 'bg-violet-50/50 border-violet-200'
                : 'bg-violet-950/20 border-violet-500/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-violet-600 dark:text-violet-300">
                AI Agent Sub-Nodes (LLM, Memory, MCP & Parser)
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {(
                [
                  {
                    slot: 'llm' as AiSubNodeType,
                    label: '✦ Chat Model* (LLM)',
                  },
                  {
                    slot: 'memory' as AiSubNodeType,
                    label: '🧠 Memory Sub-Node',
                  },
                  {
                    slot: 'tool' as AiSubNodeType,
                    label: '🛠️ MCP / Agent Tool',
                  },
                  {
                    slot: 'parser' as AiSubNodeType,
                    label: '📋 Output Parser',
                  },
                ] as const
              ).map(({ slot, label }) => (
                <div key={slot} className="flex items-center gap-2">
                  <span className="w-32 text-[11px] font-medium text-slate-500 shrink-0">
                    {label}
                  </span>
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      const tpl = NODE_LIBRARY_TEMPLATES.find(
                        (t) => t.id === e.target.value
                      );
                      if (tpl) {
                        attachAiSubNode(selectedNode.id, slot, tpl);
                        e.target.value = '';
                      }
                    }}
                    className={`flex-1 px-2 py-1 rounded-lg border text-[11px] focus:outline-none focus:border-violet-500 cursor-pointer ${
                      isLightMode
                        ? 'bg-white border-slate-200 text-slate-800'
                        : 'bg-slate-950 border-slate-700 text-slate-200'
                    }`}
                  >
                    <option value="" disabled>
                      + Connect {slot.toUpperCase()}...
                    </option>
                    {getAiAgentSubNodesBySlot(slot).map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>
                        + {tpl.defaultLabel[platform] || tpl.defaultLabel.n8n}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 1C. Looping & Batch Iteration Configuration (Split in Batches / For Each / While) */}
        {isLoopNode && (
          <div
            className={`p-3 rounded-xl border space-y-2.5 ${
              isLightMode
                ? 'bg-amber-50/60 border-amber-200'
                : 'bg-amber-950/20 border-amber-500/35'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-semibold text-amber-600 dark:text-amber-400">
                <Repeat className="w-3.5 h-3.5" />
                <span>Looping & Batch Iteration Config</span>
              </span>
              <span className="text-[10px] font-mono text-amber-500">
                done + loop ports
              </span>
            </div>

            {/* Loop Mode Selector */}
            <div>
              <label className="block text-[10px] font-medium text-slate-400 mb-1">
                Looping Strategy
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {(
                  [
                    { mode: 'batch' as LoopModeType, label: 'Split in Batches' },
                    { mode: 'forEach' as LoopModeType, label: 'For Each Item (1×1)' },
                    { mode: 'while' as LoopModeType, label: 'While Condition' },
                    { mode: 'repeat' as LoopModeType, label: 'Repeat N Times' },
                  ] as const
                ).map((item) => {
                  const currentMode = data.loopConfig?.mode || 'batch';
                  const active = currentMode === item.mode;
                  return (
                    <button
                      key={item.mode}
                      type="button"
                      onClick={() =>
                        updateNodeData(selectedNode.id, {
                          isLoopNode: true,
                          operation: `loop: ${item.mode}`,
                          loopConfig: {
                            ...(data.loopConfig || {
                              batchSize: 10,
                              arrayField: 'items',
                              maxIterations: 100,
                              pauseMs: 0,
                            }),
                            mode: item.mode,
                            batchSize:
                              item.mode === 'forEach'
                                ? 1
                                : data.loopConfig?.batchSize || 10,
                          },
                        })
                      }
                      className={`py-1.5 px-2 rounded-lg border text-[10.5px] font-semibold transition-colors cursor-pointer ${
                        active
                          ? 'bg-amber-500 text-white border-amber-500 shadow-2xs'
                          : isLightMode
                          ? 'bg-white border-slate-200 text-slate-700 hover:bg-amber-50'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Batch Size & Max Iterations */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] font-medium text-slate-400 mb-1">
                  Batch Size
                </label>
                <input
                  type="number"
                  min={1}
                  max={10000}
                  value={data.loopConfig?.batchSize ?? 10}
                  onChange={(e) =>
                    updateNodeData(selectedNode.id, {
                      isLoopNode: true,
                      loopConfig: {
                        ...(data.loopConfig || {
                          mode: 'batch',
                          batchSize: 10,
                        }),
                        batchSize: Math.max(1, Number(e.target.value) || 1),
                      },
                    })
                  }
                  className={`w-full px-2 py-1 rounded-lg border font-mono text-[11px] focus:outline-none focus:border-amber-500 ${
                    isLightMode
                      ? 'bg-white border-slate-200 text-slate-900'
                      : 'bg-slate-950 border-slate-700 text-slate-100'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[10px] font-medium text-slate-400 mb-1">
                  Max Loops
                </label>
                <input
                  type="number"
                  min={1}
                  max={100000}
                  value={data.loopConfig?.maxIterations ?? 100}
                  onChange={(e) =>
                    updateNodeData(selectedNode.id, {
                      isLoopNode: true,
                      loopConfig: {
                        ...(data.loopConfig || {
                          mode: 'batch',
                          batchSize: 10,
                        }),
                        maxIterations: Math.max(1, Number(e.target.value) || 1),
                      },
                    })
                  }
                  className={`w-full px-2 py-1 rounded-lg border font-mono text-[11px] focus:outline-none focus:border-amber-500 ${
                    isLightMode
                      ? 'bg-white border-slate-200 text-slate-900'
                      : 'bg-slate-950 border-slate-700 text-slate-100'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[10px] font-medium text-slate-400 mb-1">
                  Delay (ms)
                </label>
                <input
                  type="number"
                  min={0}
                  step={100}
                  value={data.loopConfig?.pauseMs ?? 0}
                  onChange={(e) =>
                    updateNodeData(selectedNode.id, {
                      isLoopNode: true,
                      loopConfig: {
                        ...(data.loopConfig || {
                          mode: 'batch',
                          batchSize: 10,
                        }),
                        pauseMs: Math.max(0, Number(e.target.value) || 0),
                      },
                    })
                  }
                  className={`w-full px-2 py-1 rounded-lg border font-mono text-[11px] focus:outline-none focus:border-amber-500 ${
                    isLightMode
                      ? 'bg-white border-slate-200 text-slate-900'
                      : 'bg-slate-950 border-slate-700 text-slate-100'
                  }`}
                />
              </div>
            </div>

            {/* Array Field or Condition Expression */}
            {data.loopConfig?.mode === 'while' ? (
              <div>
                <label className="block text-[10px] font-medium text-slate-400 mb-1">
                  Continue Loop While Expression
                </label>
                <input
                  type="text"
                  value={
                    data.loopConfig?.conditionExpression ||
                    '{{ $json.hasNextPage === true }}'
                  }
                  onChange={(e) =>
                    updateNodeData(selectedNode.id, {
                      isLoopNode: true,
                      loopConfig: {
                        ...(data.loopConfig || {
                          mode: 'while',
                          batchSize: 1,
                        }),
                        conditionExpression: e.target.value,
                      },
                    })
                  }
                  placeholder="{{ $json.hasNextPage === true }}"
                  className={`w-full px-2.5 py-1.5 rounded-lg border font-mono text-[11px] focus:outline-none focus:border-amber-500 ${
                    isLightMode
                      ? 'bg-white border-slate-200 text-slate-900'
                      : 'bg-slate-950 border-slate-700 text-slate-100'
                  }`}
                />
              </div>
            ) : (
              <div>
                <label className="block text-[10px] font-medium text-slate-400 mb-1">
                  Input Array / List Field Path
                </label>
                <input
                  type="text"
                  value={data.loopConfig?.arrayField || 'items'}
                  onChange={(e) =>
                    updateNodeData(selectedNode.id, {
                      isLoopNode: true,
                      loopConfig: {
                        ...(data.loopConfig || {
                          mode: 'batch',
                          batchSize: 10,
                        }),
                        arrayField: e.target.value,
                      },
                    })
                  }
                  placeholder="items or data.records"
                  className={`w-full px-2.5 py-1.5 rounded-lg border font-mono text-[11px] focus:outline-none focus:border-amber-500 ${
                    isLightMode
                      ? 'bg-white border-slate-200 text-slate-900'
                      : 'bg-slate-950 border-slate-700 text-slate-100'
                  }`}
                />
              </div>
            )}

            {/* 1-Click Quick-Wire Buttons for Loop Body & Done Branch */}
            <div className="grid grid-cols-2 gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => appendLoopBodyNode(selectedNode.id)}
                className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold text-[11px] transition-colors cursor-pointer shadow-2xs"
              >
                <Plus className="w-3 h-3" />
                <span>+ Loop Body Step</span>
              </button>
              <button
                type="button"
                onClick={() => appendLoopDoneNode(selectedNode.id)}
                className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] transition-colors cursor-pointer shadow-2xs"
              >
                <Plus className="w-3 h-3" />
                <span>+ Done Branch Step</span>
              </button>
            </div>

            {/* Quick Dropdown to Wire Any Existing Step Back into This Loop's Return Port */}
            <div className="pt-1">
              <label className="block text-[10px] font-medium text-amber-600 dark:text-amber-400 mb-1">
                ↻ Wire Existing Step Back to Loop Return
              </label>
              <select
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) {
                    connectNodeToLoopReturn(e.target.value, selectedNode.id);
                    e.target.value = '';
                  }
                }}
                className={`w-full px-2.5 py-1.5 rounded-lg border text-[11px] focus:outline-none focus:border-amber-500 cursor-pointer ${
                  isLightMode
                    ? 'bg-white border-amber-300 text-slate-800'
                    : 'bg-slate-950 border-amber-500/40 text-slate-200'
                }`}
              >
                <option value="" disabled>
                  Select step to loop back here (↻ next batch)...
                </option>
                {otherWorkflowNodes
                  .filter((n) => n.data.role !== 'trigger')
                  .map((n) => (
                    <option key={n.id} value={n.id}>
                      ↻ Wire "{n.data.label}" back into this Loop
                    </option>
                  ))}
              </select>
            </div>
          </div>
        )}

        {/* 2. Blueprint Wire Connections Manager */}
        <div
          className={`p-3 rounded-xl border space-y-2.5 ${
            isLightMode
              ? 'bg-slate-50 border-slate-200'
              : 'bg-slate-900/90 border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-semibold text-sky-600 dark:text-sky-400">
              <Link2 className="w-3.5 h-3.5" />
              <span>Blueprint Connections ({incomingEdges.length + outgoingEdges.length})</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <select
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) {
                  connectNodesById(selectedNode.id, e.target.value);
                  e.target.value = '';
                }
              }}
              className={`flex-1 px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none focus:border-sky-500 cursor-pointer ${
                isLightMode
                  ? 'bg-white border-slate-200 text-slate-800'
                  : 'bg-slate-950 border-slate-700 text-slate-200'
              }`}
            >
              <option value="" disabled>
                + Connect output wire to another step...
              </option>
              {otherWorkflowNodes.map((n) => (
                <option key={n.id} value={n.id}>
                  → {n.data.label} ({n.data.nodeGroup === 'core' ? 'Core' : n.data.appPlatform || 'App'})
                </option>
              ))}
            </select>
          </div>

          {/* 1-Click Wire Back to Loop Button for Downstream Steps */}
          {!isLoopNode &&
            data.role !== 'trigger' &&
            otherWorkflowNodes.some(
              (n) =>
                n.data.isLoopNode ||
                n.data.iconName === 'loop' ||
                n.data.serviceName?.includes('splitInBatches') ||
                n.data.operation?.startsWith('loop:')
            ) && (
              <button
                type="button"
                onClick={() => connectNodeToLoopReturn(selectedNode.id)}
                className={`w-full flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg border text-[11px] font-semibold transition-colors cursor-pointer ${
                  edges.some(
                    (e) =>
                      e.source === selectedNode.id &&
                      e.targetHandle === 'loop-return'
                  )
                    ? 'bg-amber-500 text-white border-amber-500'
                    : isLightMode
                    ? 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-500 hover:text-white'
                    : 'bg-amber-950/40 border-amber-500/40 text-amber-300 hover:bg-amber-500 hover:text-slate-950'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>
                  {edges.some(
                    (e) =>
                      e.source === selectedNode.id &&
                      e.targetHandle === 'loop-return'
                  )
                    ? 'Disconnect ↻ Loop-Back Wire from Loop Node'
                    : '↻ Wire This Step Back to Loop Node (Next Batch)'}
                </span>
              </button>
            )}

          {(incomingEdges.length > 0 || outgoingEdges.length > 0) && (
            <div className="space-y-1.5 pt-1">
              {incomingEdges.map((edge) => (
                <div
                  key={edge.id}
                  className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border ${
                    isLightMode
                      ? 'bg-white border-slate-200'
                      : 'bg-slate-950/80 border-slate-800'
                  }`}
                >
                  <div className="min-w-0 flex-1 text-[10px] text-slate-500 truncate">
                    From: <strong className={isLightMode ? 'text-slate-800' : 'text-slate-200'}>{getNodeLabel(edge.source)}</strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteEdge(edge.id)}
                    className="flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/15 text-rose-500 hover:bg-rose-500/25 text-[10px] font-medium cursor-pointer shrink-0"
                  >
                    <Unlink className="w-3 h-3" />
                    <span>Disconnect</span>
                  </button>
                </div>
              ))}

              {outgoingEdges.map((edge) => (
                <div
                  key={edge.id}
                  className={`flex flex-col gap-1.5 px-2.5 py-2 rounded-lg border ${
                    isLightMode
                      ? 'bg-white border-slate-200'
                      : 'bg-slate-950/80 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1 text-[10px] text-slate-500 truncate">
                      To: <strong className="text-emerald-600 dark:text-emerald-400">{getNodeLabel(edge.target)}</strong>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteEdge(edge.id)}
                      className="flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/15 text-rose-500 hover:bg-rose-500/25 text-[10px] font-medium cursor-pointer shrink-0"
                    >
                      <Unlink className="w-3 h-3" />
                      <span>Disconnect</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={String(edge.label || '')}
                    onChange={(e) => updateEdgeLabel(edge.id, e.target.value)}
                    placeholder="Branch condition label (e.g. True, Score >= 80)..."
                    className={`w-full px-2 py-1 rounded border text-[10px] font-mono focus:outline-none focus:border-indigo-500 ${
                      isLightMode
                        ? 'bg-slate-50 border-slate-200 text-slate-800'
                        : 'bg-slate-900 border-slate-800 text-slate-300'
                    }`}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 3. Node Classification: Built-in Core vs External App */}
        <div>
          <label className="block font-medium text-slate-400 mb-1.5">
            Platform Classification
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() =>
                updateNodeData(selectedNode.id, {
                  nodeGroup: 'core' as NodeGroupType,
                  appPlatform: 'Core',
                })
              }
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg border font-medium transition-colors cursor-pointer ${
                data.nodeGroup === 'core'
                  ? 'border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                  : isLightMode
                  ? 'border-slate-200 text-slate-600 hover:bg-slate-100'
                  : 'border-slate-800 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Core (Built-in)</span>
            </button>
            <button
              type="button"
              onClick={() =>
                updateNodeData(selectedNode.id, {
                  nodeGroup: 'app' as NodeGroupType,
                  appPlatform:
                    data.appPlatform && data.appPlatform !== 'Core'
                      ? data.appPlatform
                      : 'Custom App',
                })
              }
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg border font-medium transition-colors cursor-pointer ${
                data.nodeGroup !== 'core'
                  ? 'border-indigo-500 bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                  : isLightMode
                  ? 'border-slate-200 text-slate-600 hover:bg-slate-100'
                  : 'border-slate-800 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <Blocks className="w-3.5 h-3.5" />
              <span>App Integration</span>
            </button>
          </div>
        </div>

        {/* 4. Blueprint Step Details */}
        <div className="space-y-3">
          <div>
            <label className="block font-medium text-slate-400 mb-1">
              Blueprint Step Title
            </label>
            <input
              type="text"
              value={data.label}
              onChange={(e) =>
                updateNodeData(selectedNode.id, { label: e.target.value })
              }
              className={`w-full px-3 py-1.5 rounded-lg border focus:outline-none focus:border-indigo-500 ${
                isLightMode
                  ? 'bg-slate-50 border-slate-200 text-slate-900'
                  : 'bg-slate-900 border-slate-800 text-slate-100'
              }`}
            />
          </div>

          <div>
            <label className="block font-medium text-slate-400 mb-1">
              Subtitle / Blueprint Operation Note
            </label>
            <input
              type="text"
              value={data.subtitle || ''}
              onChange={(e) =>
                updateNodeData(selectedNode.id, { subtitle: e.target.value })
              }
              className={`w-full px-3 py-1.5 rounded-lg border focus:outline-none focus:border-indigo-500 ${
                isLightMode
                  ? 'bg-slate-50 border-slate-200 text-slate-900'
                  : 'bg-slate-900 border-slate-800 text-slate-100'
              }`}
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block font-medium text-slate-400 mb-1">
                Trigger / Action Spec
              </label>
              <input
                type="text"
                value={data.operation || ''}
                onChange={(e) =>
                  updateNodeData(selectedNode.id, { operation: e.target.value })
                }
                className={`w-full px-2.5 py-1.5 rounded-lg border font-mono text-[11px] focus:outline-none focus:border-indigo-500 ${
                  isLightMode
                    ? 'bg-slate-50 border-slate-200 text-slate-900'
                    : 'bg-slate-900 border-slate-800 text-slate-100'
                }`}
              />
            </div>

            <div>
              <label className="block font-medium text-slate-400 mb-1">
                Platform Module ID
              </label>
              <input
                type="text"
                value={data.serviceName}
                onChange={(e) =>
                  updateNodeData(selectedNode.id, {
                    serviceName: e.target.value,
                  })
                }
                className={`w-full px-2.5 py-1.5 rounded-lg border font-mono text-[11px] focus:outline-none focus:border-indigo-500 ${
                  isLightMode
                    ? 'bg-slate-50 border-slate-200 text-slate-900'
                    : 'bg-slate-900 border-slate-800 text-slate-100'
                }`}
              />
            </div>
          </div>

          {/* Icon Selector */}
          <div>
            <label className="block font-medium text-slate-400 mb-1.5">
              Blueprint Step Icon
            </label>
            <div className="flex flex-wrap gap-1.5">
              {Object.keys(ICON_MAP)
                .filter((k) => k !== 'layers')
                .map((iconKey) => (
                  <button
                    key={iconKey}
                    type="button"
                    title={iconKey}
                    onClick={() =>
                      updateNodeData(selectedNode.id, { iconName: iconKey })
                    }
                    className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                      data.iconName === iconKey
                        ? 'border-indigo-500 bg-indigo-500/20 text-indigo-600 dark:text-indigo-300'
                        : isLightMode
                        ? 'border-slate-200 text-slate-600 hover:bg-slate-100'
                        : 'border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    {renderNodeIcon(iconKey, 'w-3.5 h-3.5')}
                  </button>
                ))}
            </div>
          </div>
        </div>

        {/* AI System Prompt / Blueprint Spec */}
        <div>
          <label className="block font-medium text-slate-400 mb-1">
            AI Prompt / Blueprint Logic Notes
          </label>
          <textarea
            rows={3}
            value={data.systemPrompt || ''}
            onChange={(e) =>
              updateNodeData(selectedNode.id, { systemPrompt: e.target.value })
            }
            placeholder="Document prompt instructions, field mappings, or architecture notes for this step..."
            className={`w-full p-2.5 rounded-lg border font-mono text-[11px] leading-relaxed focus:outline-none focus:border-indigo-500 ${
              isLightMode
                ? 'bg-slate-50 border-slate-200 text-slate-900'
                : 'bg-slate-950 border-slate-800 text-slate-200'
            }`}
          />
        </div>

        {/* Node Notes (Imported / Exported JSON Node Notes) */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block font-medium text-slate-400">
              Node Notes (JSON Import / Export)
            </label>
            <label className="flex items-center gap-1.5 text-[10px] text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={data.notesInFlow ?? Boolean(data.nodeNotes || data.roiNotes)}
                onChange={(e) =>
                  updateNodeData(selectedNode.id, {
                    notesInFlow: e.target.checked,
                  })
                }
                className="rounded border-slate-600 text-indigo-500 focus:ring-indigo-500"
              />
              <span>Display note in flow</span>
            </label>
          </div>
          <textarea
            rows={3}
            value={data.nodeNotes ?? data.roiNotes ?? ''}
            onChange={(e) =>
              updateNodeData(selectedNode.id, {
                nodeNotes: e.target.value,
                roiNotes: e.target.value,
              })
            }
            placeholder="Node-level notes preserved on JSON import & export..."
            className={`w-full p-2.5 rounded-lg border font-mono text-[11px] leading-relaxed focus:outline-none focus:border-indigo-500 ${
              isLightMode
                ? 'bg-slate-50 border-slate-200 text-slate-900'
                : 'bg-slate-950 border-slate-800 text-slate-200'
            }`}
          />
        </div>

        {/* Endpoint & HTTP Method */}
        <div className="space-y-2">
          <label className="block font-medium text-slate-400">
            Endpoint / URL Specification
          </label>
          <div className="flex items-center gap-2">
            <select
              value={data.httpMethod || 'POST'}
              onChange={(e) =>
                updateNodeData(selectedNode.id, {
                  httpMethod: e.target.value as any,
                })
              }
              className={`px-2 py-1.5 rounded-lg border font-mono text-[11px] focus:outline-none focus:border-indigo-500 ${
                isLightMode
                  ? 'bg-slate-50 border-slate-200 text-slate-900'
                  : 'bg-slate-900 border-slate-800 text-slate-200'
              }`}
            >
              {HTTP_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={data.endpointUrl || ''}
              onChange={(e) =>
                updateNodeData(selectedNode.id, { endpointUrl: e.target.value })
              }
              placeholder="https://api.service.com/v1/..."
              className={`flex-1 px-2.5 py-1.5 rounded-lg border font-mono text-[11px] focus:outline-none focus:border-indigo-500 ${
                isLightMode
                  ? 'bg-slate-50 border-slate-200 text-slate-900'
                  : 'bg-slate-900 border-slate-800 text-slate-200'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-3.5 border-t border-slate-200/70 dark:border-slate-800/60 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => duplicateNode(selectedNode.id)}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
            isLightMode
              ? 'border-slate-200 text-slate-700 hover:bg-slate-100'
              : 'border-slate-700 text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Copy className="w-3.5 h-3.5" />
          <span>Duplicate Step</span>
        </button>
        <button
          type="button"
          onClick={() => deleteNode(selectedNode.id)}
          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 text-xs font-medium transition-colors cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Delete</span>
        </button>
      </div>
    </aside>
  );
};
