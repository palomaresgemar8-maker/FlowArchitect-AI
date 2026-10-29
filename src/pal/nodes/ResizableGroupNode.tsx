import React, { memo } from 'react';
import { NodeResizer, type NodeProps } from '@xyflow/react';
import {
  Trash2,
  ArrowDownToLine,
  ArrowUpToLine,
  Layers,
} from 'lucide-react';
import type { FlowNode } from '../../types/workflow';
import { useWorkflowStore } from '../../bal/useWorkflowStore';

/**
 * Architectural Subsystem Zone & Blueprint Callout Note
 * Supports 1-click "Send to Back" (zIndex: -10) so it frames workflow nodes cleanly from behind.
 */
export const ResizableGroupNode = memo(function ResizableGroupNode({
  id,
  data,
  selected,
  zIndex,
}: NodeProps<FlowNode>) {
  const isLightMode = useWorkflowStore((s) => s.isLightMode);
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);
  const deleteNode = useWorkflowStore((s) => s.deleteNode);
  const sendNoteToBack = useWorkflowStore((s) => s.sendNoteToBack);
  const bringNoteToFront = useWorkflowStore((s) => s.bringNoteToFront);

  const colorKey = data.groupColor || 'sky';
  const isBehindNodes = typeof zIndex !== 'number' || zIndex <= 0;

  const colorMap: Record<
    string,
    {
      border: string;
      bgDark: string;
      bgLight: string;
      badgeBg: string;
      titleLight: string;
      titleDark: string;
      bodyLight: string;
      bodyDark: string;
      dot: string;
    }
  > = {
    sky: {
      border: isLightMode ? 'border-sky-300/90' : 'border-sky-500/35',
      bgLight: 'bg-sky-50/55',
      bgDark: 'bg-sky-950/15',
      badgeBg: 'text-sky-600 dark:text-sky-400',
      titleLight: 'text-slate-900',
      titleDark: 'text-slate-100',
      bodyLight: 'text-slate-600',
      bodyDark: 'text-slate-400',
      dot: 'bg-sky-400',
    },
    amber: {
      border: isLightMode ? 'border-amber-300/90' : 'border-amber-500/35',
      bgLight: 'bg-amber-50/70',
      bgDark: 'bg-amber-950/20',
      badgeBg: 'text-amber-600 dark:text-amber-400',
      titleLight: 'text-slate-900',
      titleDark: 'text-amber-100',
      bodyLight: 'text-slate-700',
      bodyDark: 'text-amber-100/80',
      dot: 'bg-amber-400',
    },
    emerald: {
      border: isLightMode ? 'border-emerald-300/90' : 'border-emerald-500/35',
      bgLight: 'bg-emerald-50/55',
      bgDark: 'bg-emerald-950/15',
      badgeBg: 'text-emerald-600 dark:text-emerald-400',
      titleLight: 'text-slate-900',
      titleDark: 'text-emerald-100',
      bodyLight: 'text-slate-600',
      bodyDark: 'text-emerald-200/80',
      dot: 'bg-emerald-400',
    },
    violet: {
      border: isLightMode ? 'border-violet-300/90' : 'border-violet-500/35',
      bgLight: 'bg-violet-50/55',
      bgDark: 'bg-violet-950/15',
      badgeBg: 'text-violet-600 dark:text-violet-400',
      titleLight: 'text-slate-900',
      titleDark: 'text-violet-100',
      bodyLight: 'text-slate-600',
      bodyDark: 'text-violet-200/80',
      dot: 'bg-violet-400',
    },
    rose: {
      border: isLightMode ? 'border-rose-300/90' : 'border-rose-500/35',
      bgLight: 'bg-rose-50/55',
      bgDark: 'bg-rose-950/15',
      badgeBg: 'text-rose-600 dark:text-rose-400',
      titleLight: 'text-slate-900',
      titleDark: 'text-rose-100',
      bodyLight: 'text-slate-600',
      bodyDark: 'text-rose-200/80',
      dot: 'bg-rose-400',
    },
    slate: {
      border: isLightMode ? 'border-slate-300/90' : 'border-slate-500/35',
      bgLight: 'bg-slate-100/65',
      bgDark: 'bg-slate-900/30',
      badgeBg: 'text-slate-600 dark:text-slate-400',
      titleLight: 'text-slate-900',
      titleDark: 'text-slate-100',
      bodyLight: 'text-slate-600',
      bodyDark: 'text-slate-300',
      dot: 'bg-slate-400',
    },
  };

  const colorToStickyNumber: Record<string, number> = {
    amber: 1,
    rose: 3,
    emerald: 4,
    sky: 5,
    violet: 6,
    slate: 7,
  };

  const theme = colorMap[colorKey] || colorMap.sky;

  return (
    <div
      className={`group relative w-full h-full rounded-2xl border-2 border-dashed flex flex-col p-4 transition-colors backdrop-blur-[1px] ${
        theme.border
      } ${isLightMode ? theme.bgLight : theme.bgDark}`}
    >
      <NodeResizer
        minWidth={180}
        minHeight={110}
        isVisible={selected}
        lineClassName="!border-indigo-500/60"
        handleClassName="!w-2.5 !h-2.5 !bg-indigo-500 !border-white !rounded-xs"
      />

      {/* Top Architectural Zone Header */}
      <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-dashed border-slate-300/60 dark:border-slate-700/50">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Layers className={`w-3.5 h-3.5 shrink-0 ${theme.badgeBg}`} />
          <input
            type="text"
            value={data.label}
            onChange={(e) =>
              updateNodeData(id, {
                label: e.target.value,
                rawStickyContent: undefined,
              })
            }
            placeholder="Sticky Note / Zone Title..."
            aria-label="Blueprint Zone or Note Title"
            className={`nodrag flex-1 min-w-0 bg-transparent text-sm font-bold tracking-tight focus:outline-none ${
              isLightMode ? theme.titleLight : theme.titleDark
            }`}
          />
        </div>

        {/* Layer Controls (Send to Back / Bring to Front) & Theme Dots */}
        <div
          className={`no-export flex items-center gap-1 shrink-0 transition-opacity ${
            selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          <button
            type="button"
            title="Send Note / Zone to Back (behind workflow nodes)"
            onClick={(e) => {
              e.stopPropagation();
              sendNoteToBack(id);
            }}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold border transition-colors cursor-pointer ${
              isBehindNodes
                ? isLightMode
                  ? 'bg-slate-200/80 border-slate-300 text-slate-700'
                  : 'bg-slate-800 border-slate-700 text-slate-300'
                : 'bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-500'
            }`}
          >
            <ArrowDownToLine className="w-3 h-3" />
            <span>{isBehindNodes ? 'Behind Nodes' : 'Send to Back'}</span>
          </button>

          {isBehindNodes && (
            <button
              type="button"
              title="Bring Note to Front"
              onClick={(e) => {
                e.stopPropagation();
                bringNoteToFront(id);
              }}
              className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-slate-500 dark:text-slate-300 transition-colors cursor-pointer"
            >
              <ArrowUpToLine className="w-3 h-3" />
            </button>
          )}

          {(['sky', 'amber', 'emerald', 'violet', 'rose', 'slate'] as const).map((c) => (
            <button
              key={c}
              type="button"
              title={`Zone theme: ${c}`}
              onClick={(e) => {
                e.stopPropagation();
                updateNodeData(id, {
                  groupColor: c,
                  stickyColor: colorToStickyNumber[c] || 5,
                });
              }}
              className={`w-3 h-3 rounded-full border border-black/20 cursor-pointer ${
                colorMap[c].dot
              } ${colorKey === c ? 'ring-2 ring-indigo-500' : ''}`}
            />
          ))}

          <button
            type="button"
            title="Remove Blueprint Note / Zone"
            onClick={(e) => {
              e.stopPropagation();
              deleteNode(id);
            }}
            className="p-1 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Editable Blueprint Documentation / Architecture Steps */}
      <textarea
        value={data.subtitle ?? ''}
        onChange={(e) =>
          updateNodeData(id, {
            subtitle: e.target.value,
            rawStickyContent: undefined,
          })
        }
        placeholder={
          'Architecture Notes:\n1. Entry Trigger\n2. Data Enrichment & Transform\n3. AI Agent Reasoning\n4. Multi-App Dispatch'
        }
        aria-label="Blueprint Documentation Body"
        className={`nodrag flex-1 w-full bg-transparent text-xs leading-relaxed resize-none focus:outline-none ${
          isLightMode ? theme.bodyLight : theme.bodyDark
        }`}
      />
    </div>
  );
});
