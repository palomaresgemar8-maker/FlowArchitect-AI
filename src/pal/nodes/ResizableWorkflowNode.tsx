import React, { memo, useEffect, useRef, useState } from 'react';
import {
  Handle,
  Position,
  type NodeProps,
} from '@xyflow/react';
import {
  Copy,
  Trash2,
  ArrowLeftRight,
  Settings2,
  Plus,
  Zap,
  Play,
  Sparkles,
  GitBranch,
  Pencil,
  Check,
  X,
  ChevronRight,
  ChevronDown,
  RotateCcw,
} from 'lucide-react';
import type { AiSubNodeType, FlowNode } from '../../types/workflow';
import {
  APP_ACCENT_BADGES,
  renderNodeIcon,
  ROLE_STYLES,
} from './nodeIcons';
import { useWorkflowStore } from '../../bal/useWorkflowStore';
import {
  getAiAgentSubNodesBySlot,
  getPlatformTriggersAndActions,
} from '../../bal/platformTranslator';

const AI_AGENT_SLOTS: Array<{
  slot: AiSubNodeType;
  handleId: string;
  label: string;
  required?: boolean;
  leftPercent: string;
  accentColor: string;
}> = [
  {
    slot: 'llm',
    handleId: 'ai-llm',
    label: 'Chat Model',
    required: true,
    leftPercent: '16%',
    accentColor: '#A855F7',
  },
  {
    slot: 'memory',
    handleId: 'ai-memory',
    label: 'Memory',
    leftPercent: '40%',
    accentColor: '#0EA5E9',
  },
  {
    slot: 'tool',
    handleId: 'ai-tool',
    label: 'MCP / Tool',
    leftPercent: '64%',
    accentColor: '#10B981',
  },
  {
    slot: 'parser',
    handleId: 'ai-parser',
    label: 'Parser',
    leftPercent: '86%',
    accentColor: '#F59E0B',
  },
];

/**
 * FlowArchitect AI — Blueprint Node Renderer
 * Supports:
 * 0. Mind Map Topic Pill Mode (when canvasMode === 'mindmap')
 * 1. AI Agent Hub Node (with 4 bottom diamond sub-node ports: Chat Model*, Memory, MCP / Tool, Output Parser)
 * 2. AI Sub-Node Medallion (LLM, Memory, MCP Tool, Output Parser with Top connector handle)
 * 3. Pure Icon Medallion Node (Trigger, Action, Router with Left/Right connector handles)
 * All nodes support inline renaming directly on the canvas.
 */
export const ResizableWorkflowNode = memo(function ResizableWorkflowNode({
  id,
  data,
  selected,
}: NodeProps<FlowNode>) {
  const isLightMode = useWorkflowStore((s) => s.isLightMode);
  const platform = useWorkflowStore((s) => s.platform);
  const canvasMode = useWorkflowStore((s) => s.canvasMode);
  const nodes = useWorkflowStore((s) => s.nodes);
  const edges = useWorkflowStore((s) => s.edges);
  const deleteNode = useWorkflowStore((s) => s.deleteNode);
  const duplicateNode = useWorkflowStore((s) => s.duplicateNode);
  const setSelectedNodeId = useWorkflowStore((s) => s.setSelectedNodeId);
  const appendConnectedNode = useWorkflowStore((s) => s.appendConnectedNode);
  const appendLoopBodyNode = useWorkflowStore((s) => s.appendLoopBodyNode);
  const appendLoopDoneNode = useWorkflowStore((s) => s.appendLoopDoneNode);
  const connectNodeToLoopReturn = useWorkflowStore(
    (s) => s.connectNodeToLoopReturn
  );
  const attachAiSubNode = useWorkflowStore((s) => s.attachAiSubNode);
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);
  const takeSnapshot = useWorkflowStore((s) => s.takeSnapshot);
  const toggleMindMapBranchCollapse = useWorkflowStore(
    (s) => s.toggleMindMapBranchCollapse
  );
  const executeLibraryNodeReplace = useWorkflowStore(
    (s) => s.executeLibraryNodeReplace
  );

  const [isRenaming, setIsRenaming] = useState(false);
  const [draftLabel, setDraftLabel] = useState(data.label);
  const [draftSubtitle, setDraftSubtitle] = useState(data.subtitle || '');
  const [activeSlotPicker, setActiveSlotPicker] =
    useState<AiSubNodeType | null>(null);
  const labelInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isRenaming) {
      setDraftLabel(data.label);
      setDraftSubtitle(data.subtitle || '');
    }
  }, [data.label, data.subtitle, isRenaming]);

  useEffect(() => {
    if (isRenaming && labelInputRef.current) {
      labelInputRef.current.focus();
      labelInputRef.current.select();
    }
  }, [isRenaming]);

  const startRenaming = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDraftLabel(data.label);
    setDraftSubtitle(data.subtitle || '');
    setIsRenaming(true);
  };

  const commitRename = () => {
    const trimmedLabel = draftLabel.trim();
    const trimmedSub = draftSubtitle.trim();
    if (
      (trimmedLabel && trimmedLabel !== data.label) ||
      trimmedSub !== (data.subtitle || '')
    ) {
      takeSnapshot();
      updateNodeData(id, {
        label: trimmedLabel || data.label,
        subtitle: trimmedSub,
      });
    }
    setIsRenaming(false);
  };

  const cancelRename = () => {
    setDraftLabel(data.label);
    setDraftSubtitle(data.subtitle || '');
    setIsRenaming(false);
  };

  const roleStyle = ROLE_STYLES[data.role] || ROLE_STYLES.action;
  const customBadge = APP_ACCENT_BADGES[data.iconName];
  const isSwapTarget = Boolean(data.isSwapTarget);
  const isTrigger = data.role === 'trigger';
  const isAiAgentHub = data.role === 'ai' && !data.aiSubNodeType;
  const isAiSubNode = Boolean(data.aiSubNodeType);
  const isLoopNode = Boolean(
    !isAiAgentHub &&
      !isAiSubNode &&
      (data.isLoopNode ||
        data.iconName === 'loop' ||
        data.serviceName?.includes('splitInBatches') ||
        data.operation?.startsWith('loop:'))
  );

  const hasAnyLoopNodeOnCanvas = nodes.some(
    (n) =>
      n.id !== id &&
      (n.data.isLoopNode ||
        n.data.iconName === 'loop' ||
        n.data.serviceName?.includes('splitInBatches') ||
        n.data.operation?.startsWith('loop:'))
  );

  const hasLoopReturnFromThisNode = edges.some(
    (e) => e.source === id && e.targetHandle === 'loop-return'
  );

  const { platformTriggers, platformActions } = getPlatformTriggersAndActions(
    data.appPlatform,
    data.nodeGroup
  );

  const handleToggleTriggerOrAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isTrigger) {
      if (platformActions.length > 0) {
        executeLibraryNodeReplace(id, platformActions[0]);
      } else {
        const cleanOp = (data.operation || 'executeAction').replace(
          /^trigger:\s*/i,
          'action: '
        );
        updateNodeData(id, {
          role: 'action',
          aiSubNodeType: undefined,
          operation: cleanOp.startsWith('action:')
            ? cleanOp
            : `action: ${cleanOp}`,
        });
      }
    } else {
      if (platformTriggers.length > 0) {
        executeLibraryNodeReplace(id, platformTriggers[0]);
      } else {
        const cleanOp = (data.operation || 'onEvent').replace(
          /^(action|ai|router):\s*/i,
          'trigger: '
        );
        updateNodeData(id, {
          role: 'trigger',
          aiSubNodeType: undefined,
          operation: cleanOp.startsWith('trigger:')
            ? cleanOp
            : `trigger: ${cleanOp}`,
        });
      }
    }
  };

  const iconColorClasses = customBadge
    ? isLightMode
      ? `${customBadge.bgLight} ${customBadge.textLight}`
      : `${customBadge.bgDark} ${customBadge.textDark}`
    : isLightMode
    ? roleStyle.iconBgLight
    : roleStyle.iconBgDark;

  // ============================================================================
  // 0. MIND MAP TOPIC PILL MODE (When canvasMode === 'mindmap')
  // ============================================================================
  if (canvasMode === 'mindmap') {
    const outgoingEdges = edges.filter((e) => e.source === id);
    const incomingEdges = edges.filter((e) => e.target === id);
    const isRootTopic = isTrigger || incomingEdges.length === 0;
    const isCollapsed = Boolean(data.collapsedInMindMap);

    const subTopicAccent: Record<
      AiSubNodeType,
      { label: string; colorHex: string; badgeClass: string }
    > = {
      llm: {
        label: 'MODEL',
        colorHex: '#A855F7',
        badgeClass: 'bg-purple-500/15 text-purple-500 border-purple-500/30',
      },
      memory: {
        label: 'MEMORY',
        colorHex: '#0EA5E9',
        badgeClass: 'bg-sky-500/15 text-sky-500 border-sky-500/30',
      },
      tool: {
        label: 'MCP/TOOL',
        colorHex: '#10B981',
        badgeClass: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30',
      },
      parser: {
        label: 'PARSER',
        colorHex: '#F59E0B',
        badgeClass: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
      },
    };

    const topicAccentHex = isAiSubNode
      ? subTopicAccent[data.aiSubNodeType || 'tool']?.colorHex || '#8B5CF6'
      : isRootTopic
      ? '#10B981'
      : isLoopNode
      ? '#F59E0B'
      : roleStyle.accentHex;

    const topicBadgeLabel = isAiSubNode
      ? subTopicAccent[data.aiSubNodeType || 'tool']?.label || 'SUB-TOPIC'
      : isRootTopic
      ? 'ROOT TOPIC'
      : isAiAgentHub
      ? 'AI AGENT HUB'
      : isLoopNode
      ? `LOOP · BATCH ${data.loopConfig?.batchSize ?? 10}`
      : data.role === 'router'
      ? 'BRANCH LOGIC'
      : data.appPlatform && data.appPlatform !== 'Core'
      ? data.appPlatform.toUpperCase()
      : 'TOPIC STEP';

    return (
      <div
        onClick={(e) => {
          e.stopPropagation();
          setSelectedNodeId(id);
          setActiveSlotPicker(null);
        }}
        onDoubleClick={startRenaming}
        className={`group relative ${
          isAiSubNode ? 'w-[185px] min-h-[54px]' : 'w-[210px] min-h-[62px]'
        } select-none cursor-pointer`}
      >
        {/* Drag-to-Swap Visual Drop Overlay */}
        {isSwapTarget && (
          <div className="absolute inset-0 z-30 rounded-full bg-emerald-500/25 backdrop-blur-[1px] border-2 border-dashed border-emerald-400 flex items-center justify-center pointer-events-none">
            <div className="w-7 h-7 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shadow-md">
              <ArrowLeftRight className="w-4 h-4" />
            </div>
          </div>
        )}

        {/* Mind Map Topic Hover Quick-Action Bar */}
        <div
          className={`no-export absolute -top-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full border shadow-sm transition-opacity duration-150 ${
            selected || isRenaming
              ? 'opacity-100'
              : 'opacity-0 group-hover:opacity-100'
          } ${
            isLightMode
              ? 'bg-white/95 border-slate-200 text-slate-600'
              : 'bg-slate-900/95 border-slate-700 text-slate-300'
          }`}
        >
          <button
            type="button"
            title="Rename Mind Map Topic"
            onClick={startRenaming}
            className="p-1 hover:text-indigo-500 transition-colors cursor-pointer"
          >
            <Pencil className="w-3 h-3" />
          </button>
          {!isAiSubNode && (
            <button
              type="button"
              title="Add Child Topic Branch (+)"
              onClick={(e) => {
                e.stopPropagation();
                appendConnectedNode(id);
              }}
              className="p-1 hover:text-emerald-500 transition-colors cursor-pointer"
            >
              <Plus className="w-3 h-3" />
            </button>
          )}
          {isAiAgentHub && (
            <button
              type="button"
              title="Attach AI Sub-Branch (Model, Memory, MCP/Tool, Parser)"
              onClick={(e) => {
                e.stopPropagation();
                setActiveSlotPicker((prev) => (prev ? null : 'tool'));
              }}
              className="p-1 text-violet-500 hover:text-violet-400 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3 h-3" />
            </button>
          )}
          <button
            type="button"
            title="Configure Topic Details"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedNodeId(id);
            }}
            className="p-1 hover:text-indigo-500 transition-colors cursor-pointer"
          >
            <Settings2 className="w-3 h-3" />
          </button>
          <button
            type="button"
            title="Duplicate Topic"
            onClick={(e) => {
              e.stopPropagation();
              duplicateNode(id);
            }}
            className="p-1 hover:text-sky-500 transition-colors cursor-pointer"
          >
            <Copy className="w-3 h-3" />
          </button>
          <button
            type="button"
            title="Delete Topic"
            onClick={(e) => {
              e.stopPropagation();
              deleteNode(id);
            }}
            className="p-1 hover:text-rose-500 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>

        {/* Organic Mind Map Topic Pill Card */}
        <div
          style={{
            borderColor: selected ? '#6366F1' : topicAccentHex,
            borderLeftWidth: isRootTopic ? '6px' : '4px',
          }}
          className={`relative w-full h-full rounded-2xl border-2 px-3 py-2 flex items-center gap-2.5 shadow-md transition-all duration-150 ${
            selected ? 'ring-3 ring-indigo-500/35 scale-[1.02]' : ''
          } ${
            isRootTopic
              ? isLightMode
                ? 'bg-emerald-50/70'
                : 'bg-emerald-950/35'
              : isAiAgentHub
              ? isLightMode
                ? 'bg-violet-50/70'
                : 'bg-violet-950/35'
              : isLightMode
              ? 'bg-white'
              : 'bg-[#111827]'
          }`}
        >
          {/* Compact Topic Icon Emblem */}
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconColorClasses}`}
          >
            {renderNodeIcon(data.iconName, 'w-5 h-5')}
          </div>

          {/* Topic Title + Role Pill */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="nodrag nopan min-w-0 flex-1"
          >
            <div className="flex items-center gap-1 mb-0.5">
              <span
                style={{ color: topicAccentHex }}
                className="text-[8.5px] font-mono font-bold uppercase tracking-wider truncate"
              >
                {topicBadgeLabel}
              </span>
            </div>

            {isRenaming ? (
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <input
                    ref={labelInputRef}
                    type="text"
                    value={draftLabel}
                    onChange={(e) => setDraftLabel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        commitRename();
                      } else if (e.key === 'Escape') {
                        e.preventDefault();
                        cancelRename();
                      }
                    }}
                    className={`w-full px-1.5 py-0.5 rounded text-[11px] font-bold border focus:outline-none ${
                      isLightMode
                        ? 'bg-white border-slate-300 text-slate-900'
                        : 'bg-slate-950 border-slate-700 text-slate-100'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={commitRename}
                    className="p-0.5 rounded bg-indigo-600 text-white shrink-0 cursor-pointer"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={startRenaming}
                title="Click to rename topic"
                className="group/label text-left w-full rounded hover:bg-slate-200/50 dark:hover:bg-slate-800/60 transition-colors cursor-text"
              >
                <div className="flex items-center gap-1">
                  <span
                    className={`text-xs font-bold leading-tight truncate ${
                      isLightMode ? 'text-slate-900' : 'text-slate-100'
                    }`}
                  >
                    {data.label}
                  </span>
                  <Pencil className="w-2.5 h-2.5 text-slate-400 opacity-0 group-hover/label:opacity-100 shrink-0" />
                </div>
                {data.subtitle && (
                  <div
                    className={`text-[9.5px] font-mono truncate ${
                      isLightMode ? 'text-slate-500' : 'text-slate-400'
                    }`}
                  >
                    {data.subtitle}
                  </div>
                )}
              </button>
            )}
          </div>

          {/* Collapse / Expand Child Branches Badge */}
          {outgoingEdges.length > 0 && (
            <button
              type="button"
              title={
                isCollapsed
                  ? `Expand ${outgoingEdges.length} child branch(es)`
                  : `Collapse ${outgoingEdges.length} child branch(es)`
              }
              onClick={(e) => {
                e.stopPropagation();
                toggleMindMapBranchCollapse(id);
              }}
              className={`nodrag nopan no-export flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9.5px] font-mono font-bold border transition-colors shrink-0 cursor-pointer ${
                isCollapsed
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-xs'
                  : isLightMode
                  ? 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-indigo-50 hover:border-indigo-400'
                  : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-indigo-950 hover:border-indigo-500'
              }`}
            >
              {isCollapsed ? (
                <ChevronRight className="w-2.5 h-2.5" />
              ) : (
                <ChevronDown className="w-2.5 h-2.5" />
              )}
              <span>{outgoingEdges.length}</span>
            </button>
          )}
        </div>

        {/* Quick '+' Sprout Child Branch Button on Right Edge */}
        {!isAiSubNode && (
          <button
            type="button"
            title="Sprout Child Mind Map Branch (+)"
            onClick={(e) => {
              e.stopPropagation();
              appendConnectedNode(id);
            }}
            className={`nodrag nopan no-export absolute -right-3 top-1/2 -translate-y-1/2 z-20 w-5 h-5 rounded-full border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer shadow-sm ${
              isLightMode
                ? 'bg-white border-indigo-400 text-indigo-600 hover:bg-indigo-600 hover:text-white'
                : 'bg-slate-900 border-indigo-500 text-indigo-300 hover:bg-indigo-600 hover:text-white'
            }`}
          >
            <Plus className="w-3 h-3" />
          </button>
        )}

        {/* AI Sub-Branch Picker Popover in Mind Map Mode (for AI Agent Hub) */}
        {isAiAgentHub && activeSlotPicker && (
          <div
            onClick={(e) => e.stopPropagation()}
            className={`nodrag nopan no-export absolute top-[68px] left-0 w-64 rounded-xl border shadow-2xl p-2 z-50 ${
              isLightMode
                ? 'bg-white border-slate-200 text-slate-800'
                : 'bg-slate-900 border-slate-700 text-slate-100'
            }`}
          >
            <div className="flex items-center justify-between px-2 py-1 border-b border-slate-200 dark:border-slate-800 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-violet-500">
                + Attach AI Sub-Branch
              </span>
              <button
                type="button"
                onClick={() => setActiveSlotPicker(null)}
                className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-1 mb-1.5">
              {AI_AGENT_SLOTS.map((s) => (
                <button
                  key={s.slot}
                  type="button"
                  onClick={() => setActiveSlotPicker(s.slot)}
                  className={`px-1.5 py-1 rounded text-[9px] font-bold uppercase cursor-pointer ${
                    activeSlotPicker === s.slot
                      ? 'bg-violet-600 text-white'
                      : isLightMode
                      ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {s.slot}
                </button>
              ))}
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {getAiAgentSubNodesBySlot(activeSlotPicker).map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => {
                    attachAiSubNode(id, activeSlotPicker, tpl);
                    setActiveSlotPicker(null);
                  }}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                    isLightMode
                      ? 'hover:bg-violet-50 text-slate-800'
                      : 'hover:bg-slate-800 text-slate-100'
                  }`}
                >
                  <div className="w-5 h-5 rounded bg-violet-500/15 text-violet-500 flex items-center justify-center shrink-0">
                    {renderNodeIcon(tpl.iconName, 'w-3 h-3')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-semibold truncate">
                      {tpl.defaultLabel[platform] || tpl.defaultLabel.n8n}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Left Target Handles (Standard + AI Sub-Node 'sub-top' + Loop 'loop-return' mapped to Left for horizontal Mind Map flow) */}
        <Handle
          type="target"
          position={Position.Left}
          isConnectable={true}
          className="!w-2.5 !h-2.5 !-left-1.5 !rounded-full !border-2 !bg-white dark:!bg-slate-900 !border-slate-400"
        />
        <Handle
          type="target"
          position={Position.Left}
          id="sub-top"
          isConnectable={true}
          className="!w-2.5 !h-2.5 !-left-1.5 !rounded-full !border-2 !bg-white dark:!bg-slate-900 !border-violet-400"
        />
        <Handle
          type="target"
          position={Position.Left}
          id="loop-return"
          isConnectable={true}
          className="!w-2.5 !h-2.5 !-left-1.5 !rounded-full !border-2 !bg-white dark:!bg-slate-900 !border-amber-400"
        />

        {/* Right Source Handles (Standard + 4 AI Agent slots + Loop 'loop-done' & 'loop-body' mapped to Right for horizontal Mind Map branches) */}
        <Handle
          type="source"
          position={Position.Right}
          isConnectable={true}
          style={{ borderColor: topicAccentHex }}
          className="!w-2.5 !h-2.5 !-right-1.5 !rounded-full !border-2 !bg-white dark:!bg-slate-900"
        />
        <Handle
          type="source"
          position={Position.Right}
          id="loop-done"
          isConnectable={true}
          style={{ borderColor: '#10B981' }}
          className="!w-2.5 !h-2.5 !-right-1.5 !rounded-full !border-2 !bg-white dark:!bg-slate-900"
        />
        <Handle
          type="source"
          position={Position.Right}
          id="loop-body"
          isConnectable={true}
          style={{ borderColor: '#F59E0B' }}
          className="!w-2.5 !h-2.5 !-right-1.5 !rounded-full !border-2 !bg-white dark:!bg-slate-900"
        />
        {AI_AGENT_SLOTS.map((slotCfg) => (
          <Handle
            key={slotCfg.handleId}
            type="source"
            position={Position.Right}
            id={slotCfg.handleId}
            isConnectable={true}
            style={{ borderColor: slotCfg.accentColor }}
            className="!w-2.5 !h-2.5 !-right-1.5 !rounded-full !border-2 !bg-white dark:!bg-slate-900"
          />
        ))}
      </div>
    );
  }

  // ============================================================================
  // 1. AI AGENT HUB NODE (Matches n8n AI Agent with 4 bottom diamond ports + '+' buttons)
  // ============================================================================
  if (isAiAgentHub) {
    return (
      <div
        onClick={(e) => {
          e.stopPropagation();
          setSelectedNodeId(id);
          setActiveSlotPicker(null);
        }}
        onDoubleClick={startRenaming}
        className="group relative w-[224px] h-[86px] select-none cursor-pointer"
      >
        {/* Drag-to-Swap Visual Drop Overlay */}
        {isSwapTarget && (
          <div className="absolute inset-0 z-30 rounded-2xl bg-emerald-500/25 backdrop-blur-[1px] border-2 border-dashed border-emerald-400 flex items-center justify-center pointer-events-none">
            <div className="w-7 h-7 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center shadow-md">
              <ArrowLeftRight className="w-4 h-4" />
            </div>
          </div>
        )}

        {/* Hover Quick-Action Bar */}
        <div
          className={`no-export absolute -top-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full border shadow-sm transition-opacity duration-150 ${
            selected || isRenaming
              ? 'opacity-100'
              : 'opacity-0 group-hover:opacity-100'
          } ${
            isLightMode
              ? 'bg-white/95 border-slate-200 text-slate-600'
              : 'bg-slate-900/95 border-slate-700 text-slate-300'
          }`}
        >
          <button
            type="button"
            title="Rename AI Agent"
            onClick={startRenaming}
            className="p-1 hover:text-indigo-500 transition-colors cursor-pointer"
          >
            <Pencil className="w-3 h-3" />
          </button>
          <button
            type="button"
            title="Add Next Pipeline Step (+)"
            onClick={(e) => {
              e.stopPropagation();
              appendConnectedNode(id);
            }}
            className="p-1 hover:text-emerald-500 transition-colors cursor-pointer"
          >
            <Plus className="w-3 h-3" />
          </button>
          {hasAnyLoopNodeOnCanvas && (
            <button
              type="button"
              title={
                hasLoopReturnFromThisNode
                  ? 'Disconnect ↻ Loop-Back Wire from Loop Node'
                  : '1-Click Wire ↻ Back to Loop Node (Return Wire)'
              }
              onClick={(e) => {
                e.stopPropagation();
                connectNodeToLoopReturn(id);
              }}
              className={`p-1 rounded-full transition-colors cursor-pointer ${
                hasLoopReturnFromThisNode
                  ? 'bg-amber-500 text-white'
                  : 'text-amber-500 hover:bg-amber-500/15'
              }`}
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
          <button
            type="button"
            title="Configure AI Agent & Sub-Nodes"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedNodeId(id);
            }}
            className="p-1 hover:text-indigo-500 transition-colors cursor-pointer"
          >
            <Settings2 className="w-3 h-3" />
          </button>
          <button
            type="button"
            title="Duplicate AI Agent"
            onClick={(e) => {
              e.stopPropagation();
              duplicateNode(id);
            }}
            className="p-1 hover:text-sky-500 transition-colors cursor-pointer"
          >
            <Copy className="w-3 h-3" />
          </button>
          <button
            type="button"
            title="Delete AI Agent"
            onClick={(e) => {
              e.stopPropagation();
              deleteNode(id);
            }}
            className="p-1 hover:text-rose-500 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>

        {/* Main AI Agent Hub Box */}
        <div
          className={`relative w-full h-full rounded-2xl border-2 px-3.5 flex items-center gap-3 transition-all duration-150 ${
            roleStyle.glowShadow
          } ${
            selected
              ? 'ring-3 ring-violet-500/40 border-violet-500'
              : isLightMode
              ? 'bg-white border-slate-300 hover:border-violet-400'
              : 'bg-[#111827] border-violet-500/70 hover:border-violet-400'
          }`}
        >
          {/* Robot / AI Emblem */}
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${iconColorClasses}`}
          >
            {renderNodeIcon(data.iconName || 'bot', 'w-7 h-7')}
          </div>

          {/* Inline-Editable AI Agent Name & Subtitle */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="nodrag nopan min-w-0 flex-1"
          >
            {isRenaming ? (
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <input
                    ref={labelInputRef}
                    type="text"
                    value={draftLabel}
                    onChange={(e) => setDraftLabel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        commitRename();
                      } else if (e.key === 'Escape') {
                        e.preventDefault();
                        cancelRename();
                      }
                    }}
                    className={`w-full px-1.5 py-0.5 rounded text-xs font-bold border focus:outline-none ${
                      isLightMode
                        ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-violet-500'
                        : 'bg-slate-950 border-slate-700 text-slate-100 focus:border-violet-400'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={commitRename}
                    className="p-1 rounded bg-violet-600 text-white hover:bg-violet-500 shrink-0 cursor-pointer"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                </div>
                <input
                  type="text"
                  value={draftSubtitle}
                  onChange={(e) => setDraftSubtitle(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      commitRename();
                    } else if (e.key === 'Escape') {
                      e.preventDefault();
                      cancelRename();
                    }
                  }}
                  placeholder="Subtitle..."
                  className={`w-full px-1.5 py-0.5 rounded text-[10px] font-mono border focus:outline-none ${
                    isLightMode
                      ? 'bg-slate-50 border-slate-200 text-slate-600'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={startRenaming}
                title="Click to rename AI Agent"
                className="group/label text-left w-full rounded px-1 py-0.5 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors cursor-text"
              >
                <div className="flex items-center gap-1">
                  <span
                    className={`text-sm font-bold tracking-tight truncate ${
                      isLightMode ? 'text-slate-900' : 'text-slate-100'
                    }`}
                  >
                    {data.label}
                  </span>
                  <Pencil className="w-2.5 h-2.5 text-slate-400 opacity-0 group-hover/label:opacity-100 shrink-0" />
                </div>
                <div
                  className={`text-[10px] font-mono truncate ${
                    isLightMode ? 'text-slate-400' : 'text-slate-400'
                  }`}
                >
                  {data.subtitle || 'Tools Agent'}
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Left Main Pipeline Ingress Handle */}
        <Handle
          type="target"
          position={Position.Left}
          isConnectable={true}
          title="Main Pipeline Input"
          className={`!w-4 !h-4 !-left-2 !rounded-full !border-2 transition-transform hover:!scale-150 cursor-crosshair after:content-[''] after:absolute after:-inset-3 ${
            isLightMode
              ? '!bg-white !border-slate-400 hover:!border-violet-600'
              : '!bg-slate-900 !border-slate-400 hover:!border-violet-400'
          }`}
        />

        {/* Right Main Pipeline Egress Handle */}
        <Handle
          type="source"
          position={Position.Right}
          isConnectable={true}
          title="Main Pipeline Output"
          style={{ borderColor: '#8B5CF6' }}
          className={`!w-4 !h-4 !-right-2 !rounded-full !border-2 transition-transform hover:!scale-150 cursor-crosshair after:content-[''] after:absolute after:-inset-3 ${
            isLightMode ? '!bg-white' : '!bg-slate-900'
          }`}
        />

        {/* 4 Bottom Diamond Sub-Node Ports: Chat Model*, Memory, MCP / Tool, Output Parser */}
        {AI_AGENT_SLOTS.map((slotCfg) => {
          const isConnected = edges.some(
            (e) =>
              (e.source === id && e.sourceHandle === slotCfg.handleId) ||
              (e.target === id && e.targetHandle === slotCfg.handleId)
          );

          return (
            <React.Fragment key={slotCfg.handleId}>
              {/* Actual React Flow Bottom Diamond Handle */}
              <Handle
                type="source"
                position={Position.Bottom}
                id={slotCfg.handleId}
                isConnectable={true}
                title={`Connect ${slotCfg.label} sub-node`}
                style={{
                  left: slotCfg.leftPercent,
                  borderColor: slotCfg.accentColor,
                }}
                className={`!w-3 !h-3 !-bottom-1.5 !rounded-[2px] rotate-45 !border-2 transition-transform hover:!scale-125 cursor-crosshair ${
                  isLightMode ? '!bg-white' : '!bg-slate-900'
                }`}
              />

              {/* Label + Vertical Stem + '+' Quick-Attach Button under each Diamond Port */}
              <div
                style={{ left: slotCfg.leftPercent }}
                className="nodrag nopan absolute top-[92px] -translate-x-1/2 flex flex-col items-center z-20"
              >
                <span
                  className={`text-[9px] font-medium whitespace-nowrap leading-none ${
                    isLightMode ? 'text-slate-500' : 'text-slate-400'
                  }`}
                >
                  {slotCfg.label}
                  {slotCfg.required && (
                    <span className="text-rose-500 font-bold ml-0.5">*</span>
                  )}
                </span>

                {/* Show stem + '+' button only when NOT connected to avoid wire collision */}
                {!isConnected && (
                  <div
                    className={`flex flex-col items-center transition-opacity ${
                      selected || activeSlotPicker === slotCfg.slot
                        ? 'opacity-100'
                        : 'opacity-70 group-hover:opacity-100'
                    }`}
                  >
                    <div
                      className={`w-px h-3 mt-0.5 ${
                        isLightMode ? 'bg-slate-300' : 'bg-slate-700'
                      }`}
                    />
                    <button
                      type="button"
                      title={`Add & connect ${slotCfg.label} to AI Agent`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveSlotPicker((prev) =>
                          prev === slotCfg.slot ? null : slotCfg.slot
                        );
                      }}
                      className={`w-5 h-5 rounded-md border flex items-center justify-center text-[11px] font-bold transition-all cursor-pointer shadow-2xs ${
                        activeSlotPicker === slotCfg.slot
                          ? 'bg-violet-600 border-violet-500 text-white scale-110'
                          : isLightMode
                          ? 'bg-slate-100 border-slate-300 text-slate-600 hover:bg-violet-50 hover:border-violet-400 hover:text-violet-600'
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-violet-950 hover:border-violet-500 hover:text-violet-300'
                      }`}
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </React.Fragment>
          );
        })}

        {/* On-Canvas Popover Menu when clicking '+' under Chat Model*, Memory, MCP / Tool, or Parser */}
        {activeSlotPicker && (
          <div
            onClick={(e) => e.stopPropagation()}
            className={`nodrag nopan no-export absolute top-[146px] left-1/2 -translate-x-1/2 w-64 rounded-xl border shadow-2xl p-2 z-50 ${
              isLightMode
                ? 'bg-white border-slate-200 text-slate-800'
                : 'bg-slate-900 border-slate-700 text-slate-100'
            }`}
          >
            <div className="flex items-center justify-between px-2 py-1 border-b border-slate-200 dark:border-slate-800 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-violet-500">
                + Connect{' '}
                {activeSlotPicker === 'llm'
                  ? 'Chat Model (LLM)'
                  : activeSlotPicker === 'memory'
                  ? 'Memory'
                  : activeSlotPicker === 'tool'
                  ? 'MCP / Agent Tool'
                  : 'Output Parser'}
              </span>
              <button
                type="button"
                onClick={() => setActiveSlotPicker(null)}
                className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {getAiAgentSubNodesBySlot(activeSlotPicker).map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => {
                    attachAiSubNode(id, activeSlotPicker, tpl);
                    setActiveSlotPicker(null);
                  }}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                    isLightMode
                      ? 'hover:bg-violet-50 text-slate-800'
                      : 'hover:bg-slate-800 text-slate-100'
                  }`}
                >
                  <div className="w-6 h-6 rounded-md bg-violet-500/15 text-violet-500 flex items-center justify-center shrink-0">
                    {renderNodeIcon(tpl.iconName, 'w-3.5 h-3.5')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-semibold truncate">
                      {tpl.defaultLabel[platform] || tpl.defaultLabel.n8n}
                    </div>
                    <div className="text-[9.5px] font-mono text-slate-400 truncate">
                      {tpl.operation}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ============================================================================
  // 1B. LOOPING HUB NODE (Matches n8n Loop Over Items / Split in Batches with 'done' & 'loop' ports)
  // ============================================================================
  if (isLoopNode) {
    const loopCfg = data.loopConfig || {
      mode: 'batch',
      batchSize: 10,
      arrayField: 'items',
      maxIterations: 100,
    };

    const modeBadgeText =
      loopCfg.mode === 'forEach'
        ? 'FOR EACH (1×1)'
        : loopCfg.mode === 'while'
        ? `WHILE · MAX ${loopCfg.maxIterations || 50}`
        : loopCfg.mode === 'repeat'
        ? `REPEAT ×${loopCfg.maxIterations || 10}`
        : `BATCH SIZE: ${loopCfg.batchSize || 10}`;

    return (
      <div
        onClick={(e) => {
          e.stopPropagation();
          setSelectedNodeId(id);
        }}
        onDoubleClick={startRenaming}
        className="group relative w-[196px] h-[86px] select-none cursor-pointer"
      >
        {/* Drag-to-Swap Visual Drop Overlay */}
        {isSwapTarget && (
          <div className="absolute inset-0 z-30 rounded-2xl bg-emerald-500/25 backdrop-blur-[1px] border-2 border-dashed border-emerald-400 flex items-center justify-center pointer-events-none">
            <div className="w-7 h-7 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center shadow-md">
              <ArrowLeftRight className="w-4 h-4" />
            </div>
          </div>
        )}

        {/* Hover Quick-Action Bar */}
        <div
          className={`no-export absolute -top-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full border shadow-sm transition-opacity duration-150 ${
            selected || isRenaming
              ? 'opacity-100'
              : 'opacity-0 group-hover:opacity-100'
          } ${
            isLightMode
              ? 'bg-white/95 border-slate-200 text-slate-600'
              : 'bg-slate-900/95 border-slate-700 text-slate-300'
          }`}
        >
          <button
            type="button"
            title="Rename Looping Node"
            onClick={startRenaming}
            className="p-1 hover:text-indigo-500 transition-colors cursor-pointer"
          >
            <Pencil className="w-3 h-3" />
          </button>
          <button
            type="button"
            title="Add Loop Body Step + Auto-Wire ↻ Return Loop"
            onClick={(e) => {
              e.stopPropagation();
              appendLoopBodyNode(id);
            }}
            className="px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-300 hover:bg-amber-500 hover:text-white text-[9px] font-mono font-bold transition-colors cursor-pointer"
          >
            +Loop
          </button>
          <button
            type="button"
            title="Add Post-Loop 'Done' Branch Step"
            onClick={(e) => {
              e.stopPropagation();
              appendLoopDoneNode(id);
            }}
            className="px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 hover:bg-emerald-500 hover:text-white text-[9px] font-mono font-bold transition-colors cursor-pointer"
          >
            +Done
          </button>
          <button
            type="button"
            title="Configure Loop Parameters"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedNodeId(id);
            }}
            className="p-1 hover:text-indigo-500 transition-colors cursor-pointer"
          >
            <Settings2 className="w-3 h-3" />
          </button>
          <button
            type="button"
            title="Duplicate Looping Node"
            onClick={(e) => {
              e.stopPropagation();
              duplicateNode(id);
            }}
            className="p-1 hover:text-sky-500 transition-colors cursor-pointer"
          >
            <Copy className="w-3 h-3" />
          </button>
          <button
            type="button"
            title="Delete Looping Node"
            onClick={(e) => {
              e.stopPropagation();
              deleteNode(id);
            }}
            className="p-1 hover:text-rose-500 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>

        {/* Main Looping Hub Card */}
        <div
          className={`relative w-full h-full rounded-2xl border-2 pl-3 pr-9 flex items-center gap-2.5 transition-all duration-150 shadow-[0_4px_20px_-4px_rgba(245,158,11,0.24)] ${
            selected
              ? 'ring-3 ring-amber-500/40 border-amber-500'
              : isLightMode
              ? 'bg-white border-amber-400/90 hover:border-amber-500'
              : 'bg-[#111827] border-amber-500/75 hover:border-amber-400'
          }`}
        >
          {/* Loop Cycle Emblem */}
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
              isLightMode
                ? 'bg-amber-50 text-amber-600 border border-amber-200'
                : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
            }`}
          >
            {renderNodeIcon('loop', 'w-6 h-6')}
          </div>

          {/* Inline-Editable Loop Title & Batch Badge */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="nodrag nopan min-w-0 flex-1"
          >
            <div className="flex items-center gap-1 mb-0.5">
              <span className="px-1.5 py-0.2 rounded text-[8.5px] font-mono font-bold tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30 truncate">
                ↻ {modeBadgeText}
              </span>
            </div>

            {isRenaming ? (
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <input
                    ref={labelInputRef}
                    type="text"
                    value={draftLabel}
                    onChange={(e) => setDraftLabel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        commitRename();
                      } else if (e.key === 'Escape') {
                        e.preventDefault();
                        cancelRename();
                      }
                    }}
                    className={`w-full px-1.5 py-0.5 rounded text-xs font-bold border focus:outline-none ${
                      isLightMode
                        ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500'
                        : 'bg-slate-950 border-slate-700 text-slate-100 focus:border-amber-400'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={commitRename}
                    className="p-1 rounded bg-amber-600 text-white hover:bg-amber-500 shrink-0 cursor-pointer"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={startRenaming}
                title="Click to rename Looping Node"
                className="group/label text-left w-full rounded px-0.5 py-0.5 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors cursor-text"
              >
                <div className="flex items-center gap-1">
                  <span
                    className={`text-xs font-bold tracking-tight truncate ${
                      isLightMode ? 'text-slate-900' : 'text-slate-100'
                    }`}
                  >
                    {data.label}
                  </span>
                  <Pencil className="w-2.5 h-2.5 text-slate-400 opacity-0 group-hover/label:opacity-100 shrink-0" />
                </div>
                <div
                  className={`text-[9.5px] font-mono truncate ${
                    isLightMode ? 'text-slate-400' : 'text-slate-400'
                  }`}
                >
                  {data.subtitle || 'Split in Batches'}
                </div>
              </button>
            )}
          </div>

          {/* Right-side Port Labels inside card ('done' top, 'loop' bottom) */}
          <div className="absolute right-2.5 inset-y-0 flex flex-col justify-between py-2.5 pointer-events-none text-right">
            <span className="text-[9px] font-mono font-bold text-emerald-600 dark:text-emerald-400 leading-none">
              done
            </span>
            <span className="text-[9px] font-mono font-bold text-amber-600 dark:text-amber-400 leading-none">
              loop
            </span>
          </div>
        </div>

        {/* Left Main Pipeline Ingress Handle (Also accepts backward loop-return wires like n8n!) */}
        <Handle
          type="target"
          position={Position.Left}
          isConnectable={true}
          title="Main Input / Loop Return — Drop upstream input or backward loop wire here"
          className={`!w-4 !h-4 !-left-2 !rounded-full !border-2 transition-transform hover:!scale-150 cursor-crosshair after:content-[''] after:absolute after:-inset-3.5 ${
            isLightMode
              ? '!bg-white !border-slate-400 hover:!border-amber-500'
              : '!bg-slate-900 !border-slate-400 hover:!border-amber-400'
          }`}
        />

        {/* Bottom-Left Loop-Return Target Handle (Receives '↻ next batch' feedback wire from loop body) */}
        <Handle
          type="target"
          position={Position.Bottom}
          id="loop-return"
          isConnectable={true}
          title="Loop-Back Return Port — Drag from here to a step, or drop end of loop body here"
          style={{ left: '28%', borderColor: '#F59E0B' }}
          className={`!w-4 !h-4 !-bottom-2 !rounded-full !border-2 transition-transform hover:!scale-150 cursor-crosshair shadow-xs after:content-[''] after:absolute after:-inset-3.5 ${
            isLightMode
              ? '!bg-amber-50 hover:!bg-amber-500'
              : '!bg-slate-900 hover:!bg-amber-500'
          }`}
        />
        <div
          style={{ left: '28%' }}
          className="nodrag nopan pointer-events-none absolute top-[91px] -translate-x-1/2 flex flex-col items-center"
        >
          <span className="px-1.5 py-0.2 rounded-full text-[8.5px] font-mono font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 whitespace-nowrap">
            ↻ loop return
          </span>
        </div>

        {/* Top-Right 'done' Output Handle + Quick '+' Button */}
        <Handle
          type="source"
          position={Position.Right}
          id="loop-done"
          isConnectable={true}
          title="Done Output — Fires after all batches finish looping"
          style={{ top: '27%', borderColor: '#10B981' }}
          className={`!w-4 !h-4 !-right-2 !rounded-full !border-2 transition-transform hover:!scale-150 cursor-crosshair after:content-[''] after:absolute after:-inset-3 ${
            isLightMode ? '!bg-white' : '!bg-slate-900'
          }`}
        />
        <button
          type="button"
          title="Add Post-Loop 'Done' Step (+)"
          onClick={(e) => {
            e.stopPropagation();
            appendLoopDoneNode(id);
          }}
          style={{ top: '27%' }}
          className={`nodrag nopan no-export absolute -right-7 -translate-y-1/2 z-20 w-4 h-4 rounded-full border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer shadow-2xs ${
            isLightMode
              ? 'bg-emerald-50 border-emerald-400 text-emerald-700 hover:bg-emerald-600 hover:text-white'
              : 'bg-slate-900 border-emerald-500 text-emerald-400 hover:bg-emerald-600 hover:text-white'
          }`}
        >
          <Plus className="w-2.5 h-2.5" />
        </button>

        {/* Bottom-Right 'loop' Output Handle + Quick '+' Button (Spawns step & auto-wires return loop!) */}
        <Handle
          type="source"
          position={Position.Right}
          id="loop-body"
          isConnectable={true}
          title="Loop Body Output — Fires for each batch/iteration"
          style={{ top: '73%', borderColor: '#F59E0B' }}
          className={`!w-4 !h-4 !-right-2 !rounded-full !border-2 transition-transform hover:!scale-150 cursor-crosshair after:content-[''] after:absolute after:-inset-3 ${
            isLightMode ? '!bg-white' : '!bg-slate-900'
          }`}
        />
        <button
          type="button"
          title="Add Loop Body Step & Auto-Wire ↻ Return Loop (+)"
          onClick={(e) => {
            e.stopPropagation();
            appendLoopBodyNode(id);
          }}
          style={{ top: '73%' }}
          className={`nodrag nopan no-export absolute -right-7 -translate-y-1/2 z-20 w-4 h-4 rounded-full border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer shadow-2xs ${
            isLightMode
              ? 'bg-amber-50 border-amber-400 text-amber-700 hover:bg-amber-500 hover:text-white'
              : 'bg-slate-900 border-amber-500 text-amber-400 hover:bg-amber-500 hover:text-white'
          }`}
        >
          <Plus className="w-2.5 h-2.5" />
        </button>
      </div>
    );
  }

  // ============================================================================
  // 2. AI SUB-NODE MEDALLION (LLM, Memory, MCP Tool, Output Parser connected to AI Agent)
  // ============================================================================
  if (isAiSubNode) {
    const subSlotBadge: Record<
      AiSubNodeType,
      { label: string; colorHex: string; badgeClass: string }
    > = {
      llm: {
        label: 'MODEL',
        colorHex: '#A855F7',
        badgeClass: 'bg-purple-500 text-white',
      },
      memory: {
        label: 'MEMORY',
        colorHex: '#0EA5E9',
        badgeClass: 'bg-sky-500 text-white',
      },
      tool: {
        label: 'MCP/TOOL',
        colorHex: '#10B981',
        badgeClass: 'bg-emerald-500 text-white',
      },
      parser: {
        label: 'PARSER',
        colorHex: '#F59E0B',
        badgeClass: 'bg-amber-500 text-white',
      },
    };
    const subStyle =
      subSlotBadge[data.aiSubNodeType || 'tool'] || subSlotBadge.tool;

    return (
      <div
        onClick={(e) => {
          e.stopPropagation();
          setSelectedNodeId(id);
        }}
        onDoubleClick={startRenaming}
        className="group relative w-[68px] h-[68px] flex items-center justify-center select-none cursor-pointer"
      >
        {/* Hover Quick-Action Bar */}
        <div
          className={`no-export absolute -top-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full border shadow-sm transition-opacity duration-150 ${
            selected || isRenaming
              ? 'opacity-100'
              : 'opacity-0 group-hover:opacity-100'
          } ${
            isLightMode
              ? 'bg-white/95 border-slate-200 text-slate-600'
              : 'bg-slate-900/95 border-slate-700 text-slate-300'
          }`}
        >
          <button
            type="button"
            title="Rename Sub-Node"
            onClick={startRenaming}
            className="p-1 hover:text-indigo-500 transition-colors cursor-pointer"
          >
            <Pencil className="w-3 h-3" />
          </button>
          <button
            type="button"
            title="Configure Sub-Node"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedNodeId(id);
            }}
            className="p-1 hover:text-indigo-500 transition-colors cursor-pointer"
          >
            <Settings2 className="w-3 h-3" />
          </button>
          <button
            type="button"
            title="Duplicate Sub-Node"
            onClick={(e) => {
              e.stopPropagation();
              duplicateNode(id);
            }}
            className="p-1 hover:text-sky-500 transition-colors cursor-pointer"
          >
            <Copy className="w-3 h-3" />
          </button>
          <button
            type="button"
            title="Delete Sub-Node"
            onClick={(e) => {
              e.stopPropagation();
              deleteNode(id);
            }}
            className="p-1 hover:text-rose-500 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>

        {/* Circular AI Sub-Node Medallion */}
        <div
          style={{ borderColor: subStyle.colorHex }}
          className={`relative w-full h-full rounded-full border-2 flex items-center justify-center shadow-md transition-all duration-150 ${
            selected ? 'ring-3 ring-violet-500/40 scale-105' : ''
          } ${isLightMode ? 'bg-white' : 'bg-[#111827]'}`}
        >
          <div
            className={`w-11 h-11 rounded-full flex items-center justify-center ${iconColorClasses}`}
          >
            {renderNodeIcon(data.iconName, 'w-6 h-6')}
          </div>

          <span
            className={`absolute -bottom-1.5 px-1.5 py-0.2 rounded-full text-[7.5px] font-mono font-bold tracking-wider shadow-xs ${subStyle.badgeClass}`}
          >
            {subStyle.label}
          </span>
        </div>

        {/* Floating Inline-Editable Caption Below Sub-Node */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="nodrag nopan absolute top-[74px] left-1/2 -translate-x-1/2 w-[144px] text-center z-20"
        >
          {isRenaming ? (
            <div
              className={`p-1.5 rounded-xl border shadow-lg space-y-1 ${
                isLightMode
                  ? 'bg-white border-indigo-400 text-slate-900'
                  : 'bg-slate-900 border-indigo-500 text-slate-100'
              }`}
            >
              <div className="flex items-center gap-1">
                <input
                  ref={labelInputRef}
                  type="text"
                  value={draftLabel}
                  onChange={(e) => setDraftLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      commitRename();
                    } else if (e.key === 'Escape') {
                      e.preventDefault();
                      cancelRename();
                    }
                  }}
                  className={`w-full px-1.5 py-0.5 rounded text-[11px] font-semibold text-center border focus:outline-none ${
                    isLightMode
                      ? 'bg-slate-50 border-slate-200 text-slate-900'
                      : 'bg-slate-950 border-slate-700 text-slate-100'
                  }`}
                />
                <button
                  type="button"
                  onClick={commitRename}
                  className="p-1 rounded bg-indigo-600 text-white shrink-0 cursor-pointer"
                >
                  <Check className="w-3 h-3" />
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={startRenaming}
              title="Click to rename sub-node"
              className="group/label w-full px-1 py-0.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800/70 transition-colors cursor-text"
            >
              <div className="flex items-center justify-center gap-1">
                <span
                  className={`text-[11px] font-semibold leading-tight truncate ${
                    isLightMode ? 'text-slate-800' : 'text-slate-100'
                  }`}
                >
                  {data.label}
                </span>
                <Pencil className="w-2.5 h-2.5 text-slate-400 opacity-0 group-hover/label:opacity-100 shrink-0" />
              </div>
            </button>
          )}
        </div>

        {/* Top Diamond Connector Handle (Wires upward into AI Agent's bottom diamond ports) */}
        <Handle
          type="target"
          position={Position.Top}
          id="sub-top"
          isConnectable={true}
          title="Connect to AI Agent bottom port"
          style={{ borderColor: subStyle.colorHex }}
          className={`!w-3 !h-3 !-top-1.5 !rounded-[2px] rotate-45 !border-2 transition-transform hover:!scale-125 cursor-crosshair ${
            isLightMode ? '!bg-white' : '!bg-slate-900'
          }`}
        />
      </div>
    );
  }

  // ============================================================================
  // 3. STANDARD PURE ICON MEDALLION NODE (Triggers, Actions, Routers)
  // ============================================================================
  const borderRingClasses = selected
    ? 'ring-3 ring-indigo-500/40 border-indigo-500 scale-105'
    : isSwapTarget
    ? 'ring-3 ring-emerald-400/50 border-emerald-400 scale-110'
    : isTrigger
    ? isLightMode
      ? 'border-emerald-400/90 hover:border-emerald-500'
      : 'border-emerald-500/70 hover:border-emerald-400'
    : data.role === 'router'
    ? isLightMode
      ? 'border-amber-400/90 hover:border-amber-500'
      : 'border-amber-500/70 hover:border-amber-400'
    : isLightMode
    ? 'border-slate-200/95 hover:border-sky-400'
    : 'border-slate-700/90 hover:border-sky-400';

  const renderCornerRolePip = () => {
    if (isTrigger) {
      return (
        <div
          title="Trigger Step"
          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-sm ring-2 ring-white dark:ring-[#0B0F19]"
        >
          <Zap className="w-2.5 h-2.5 fill-current" />
        </div>
      );
    }
    if (data.role === 'router') {
      return (
        <div
          title="Flow Router Step"
          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-sm ring-2 ring-white dark:ring-[#0B0F19]"
        >
          <GitBranch className="w-2.5 h-2.5" />
        </div>
      );
    }
    return null;
  };

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        setSelectedNodeId(id);
      }}
      onDoubleClick={startRenaming}
      className="group relative w-[76px] h-[76px] flex items-center justify-center select-none cursor-pointer"
    >
      {/* Drag-to-Swap Visual Drop Overlay */}
      {isSwapTarget && (
        <div className="absolute inset-0 z-30 rounded-2xl bg-emerald-500/25 backdrop-blur-[1px] border-2 border-dashed border-emerald-400 flex items-center justify-center pointer-events-none">
          <div className="w-7 h-7 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center shadow-md">
            <ArrowLeftRight className="w-4 h-4" />
          </div>
        </div>
      )}

      {/* Compact Icon-Only Hover Action Pill */}
      <div
        className={`no-export absolute -top-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full border shadow-sm transition-opacity duration-150 ${
          selected || isRenaming
            ? 'opacity-100'
            : 'opacity-0 group-hover:opacity-100'
        } ${
          isLightMode
            ? 'bg-white/95 border-slate-200 text-slate-600'
            : 'bg-slate-900/95 border-slate-700 text-slate-300'
        }`}
      >
        <button
          type="button"
          title="Rename Node (or click label below)"
          onClick={startRenaming}
          className="p-1 hover:text-indigo-500 transition-colors cursor-pointer"
        >
          <Pencil className="w-3 h-3" />
        </button>
        <button
          type="button"
          title={
            isTrigger
              ? 'Switch from Trigger to Action'
              : 'Switch from Action to Trigger'
          }
          onClick={handleToggleTriggerOrAction}
          className={`p-1 rounded-full transition-colors cursor-pointer ${
            isTrigger
              ? 'text-emerald-500 hover:bg-emerald-500/15'
              : 'text-sky-500 hover:bg-sky-500/15'
          }`}
        >
          {isTrigger ? (
            <Play className="w-3 h-3" />
          ) : (
            <Zap className="w-3 h-3" />
          )}
        </button>
        <button
          type="button"
          title="Add Next Step (+)"
          onClick={(e) => {
            e.stopPropagation();
            appendConnectedNode(id);
          }}
          className="p-1 hover:text-emerald-500 transition-colors cursor-pointer"
        >
          <Plus className="w-3 h-3" />
        </button>
        {hasAnyLoopNodeOnCanvas && !isTrigger && (
          <button
            type="button"
            title={
              hasLoopReturnFromThisNode
                ? 'Disconnect ↻ Loop-Back Wire from Loop Node'
                : '1-Click Wire ↻ Back to Loop Node (Return Wire)'
            }
            onClick={(e) => {
              e.stopPropagation();
              connectNodeToLoopReturn(id);
            }}
            className={`p-1 rounded-full transition-colors cursor-pointer ${
              hasLoopReturnFromThisNode
                ? 'bg-amber-500 text-white'
                : 'text-amber-500 hover:bg-amber-500/15'
            }`}
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        )}
        <button
          type="button"
          title="Configure Step"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedNodeId(id);
          }}
          className="p-1 hover:text-indigo-500 transition-colors cursor-pointer"
        >
          <Settings2 className="w-3 h-3" />
        </button>
        <button
          type="button"
          title="Duplicate Step"
          onClick={(e) => {
            e.stopPropagation();
            duplicateNode(id);
          }}
          className="p-1 hover:text-sky-500 transition-colors cursor-pointer"
        >
          <Copy className="w-3 h-3" />
        </button>
        <button
          type="button"
          title="Delete Step"
          onClick={(e) => {
            e.stopPropagation();
            deleteNode(id);
          }}
          className="p-1 hover:text-rose-500 transition-colors cursor-pointer"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      {/* Main 76x76 Pure Icon Medallion */}
      <div
        className={`relative w-full h-full rounded-2xl border-2 flex items-center justify-center transition-all duration-150 ${
          roleStyle.glowShadow
        } ${borderRingClasses} ${
          isLightMode ? 'bg-white' : 'bg-[#111827]'
        }`}
      >
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-150 group-hover:scale-105 ${iconColorClasses}`}
        >
          {renderNodeIcon(data.iconName, 'w-7 h-7')}
        </div>

        {renderCornerRolePip()}
      </div>

      {/* Floating Caption Underneath the Icon (Click to Rename Inline!) */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="nodrag nopan absolute top-[82px] left-1/2 -translate-x-1/2 w-[160px] text-center z-20"
      >
        {isRenaming ? (
          <div
            className={`p-1.5 rounded-xl border shadow-lg space-y-1 ${
              isLightMode
                ? 'bg-white border-indigo-400 text-slate-900'
                : 'bg-slate-900 border-indigo-500 text-slate-100'
            }`}
          >
            <div className="flex items-center gap-1">
              <input
                ref={labelInputRef}
                type="text"
                value={draftLabel}
                onChange={(e) => setDraftLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    commitRename();
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    cancelRename();
                  }
                }}
                placeholder="Node name..."
                className={`w-full px-1.5 py-0.5 rounded text-[11px] font-semibold text-center border focus:outline-none ${
                  isLightMode
                    ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'
                    : 'bg-slate-950 border-slate-700 text-slate-100 focus:border-indigo-400'
                }`}
              />
              <button
                type="button"
                title="Save Node Name (Enter)"
                onClick={commitRename}
                className="p-1 rounded bg-indigo-600 text-white hover:bg-indigo-500 shrink-0 cursor-pointer"
              >
                <Check className="w-3 h-3" />
              </button>
            </div>
            <input
              type="text"
              value={draftSubtitle}
              onChange={(e) => setDraftSubtitle(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  commitRename();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  cancelRename();
                }
              }}
              placeholder="Subtitle / note (optional)..."
              className={`w-full px-1.5 py-0.5 rounded text-[9.5px] font-mono text-center border focus:outline-none ${
                isLightMode
                  ? 'bg-slate-50 border-slate-200 text-slate-600 focus:border-indigo-500'
                  : 'bg-slate-950 border-slate-800 text-slate-400 focus:border-indigo-400'
              }`}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={startRenaming}
            title="Click to rename node"
            className={`group/label w-full px-1.5 py-0.5 rounded-lg transition-colors cursor-text ${
              isLightMode
                ? 'hover:bg-slate-200/60'
                : 'hover:bg-slate-800/70'
            }`}
          >
            <div className="flex items-center justify-center gap-1">
              <span
                className={`text-[11.5px] font-semibold leading-tight truncate ${
                  isLightMode ? 'text-slate-800' : 'text-slate-100'
                }`}
              >
                {data.label}
              </span>
              <Pencil className="w-2.5 h-2.5 text-slate-400 opacity-0 group-hover/label:opacity-100 shrink-0 transition-opacity" />
            </div>
            <div
              className={`text-[9.5px] font-mono truncate mt-0.5 ${
                isLightMode ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              {data.subtitle ||
                (data.appPlatform && data.appPlatform !== 'Core'
                  ? data.appPlatform
                  : roleStyle.shortTag)}
            </div>
          </button>
        )}
      </div>

      {/* Left Ingress Blueprint Connector Port */}
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={true}
        title="Ingress Port — Drop wire here to connect"
        className={`!w-3.5 !h-3.5 !-left-2 !rounded-full !border-2 transition-transform hover:!scale-150 cursor-crosshair after:content-[''] after:absolute after:-inset-3 ${
          isLightMode
            ? '!bg-white !border-slate-400 hover:!border-indigo-600'
            : '!bg-slate-900 !border-slate-400 hover:!border-indigo-400'
        }`}
      />

      {/* Right Egress Blueprint Connector Port */}
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={true}
        title="Egress Port — Drag from here to connect to next step (or backward to a Loop node)"
        style={{ borderColor: roleStyle.accentHex }}
        className={`!w-3.5 !h-3.5 !-right-2 !rounded-full !border-2 transition-transform hover:!scale-150 cursor-crosshair after:content-[''] after:absolute after:-inset-3 ${
          isLightMode ? '!bg-white' : '!bg-slate-900'
        }`}
      />
    </div>
  );
});
