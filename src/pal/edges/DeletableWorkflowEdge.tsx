import React, { useCallback } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  Position,
  useReactFlow,
  type EdgeProps,
} from '@xyflow/react';
import { X, MoveVertical, Plus } from 'lucide-react';
import { useWorkflowStore } from '../../bal/useWorkflowStore';
import { buildN8nLoopBackPath } from './FlexibleConnectionLine';

export const DeletableWorkflowEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  sourceHandleId,
  targetHandleId,
  style = {},
  markerEnd,
  label,
  selected,
  data,
}) => {
  const deleteEdge = useWorkflowStore((s) => s.deleteEdge);
  const insertNodeOnEdge = useWorkflowStore((s) => s.insertNodeOnEdge);
  const updateEdgeLoopOffset = useWorkflowStore((s) => s.updateEdgeLoopOffset);
  const isLightMode = useWorkflowStore((s) => s.isLightMode);
  const canvasMode = useWorkflowStore((s) => s.canvasMode);
  const { getZoom } = useReactFlow();

  // Detect whether this edge connects an AI Agent to a sub-node (Model, Memory, Tool, Parser)
  const isAiSubNodeEdge = Boolean(
    sourceHandleId?.startsWith('ai-') ||
    targetHandleId === 'sub-top' ||
    (data as any)?.isAiSubNode ||
    (data as any)?.slot
  );

  const labelStr = String(label || '').toLowerCase();
  const isExplicitLoopReturn =
    !isAiSubNodeEdge &&
    (targetHandleId === 'loop-return' ||
      Boolean((data as any)?.isLoopReturn) ||
      (labelStr.includes('next batch') && !labelStr.includes('sub')));

  // Standard horizontal backward step wire (right-to-left) returning to an upstream step
  const isHorizontalBackwardFlow =
    !isAiSubNodeEdge &&
    sourcePosition === Position.Right &&
    targetPosition === Position.Left &&
    targetX < sourceX - 40;

  const isLoopReturnEdge =
    canvasMode !== 'mindmap' &&
    !isAiSubNodeEdge &&
    (isExplicitLoopReturn || isHorizontalBackwardFlow);

  const customLoopOffset =
    typeof (data as any)?.loopOffset === 'number'
      ? (data as any).loopOffset
      : 96;

  let edgePath: string;
  let labelX: number;
  let labelY: number;

  if (isAiSubNodeEdge) {
    // Elegant, smooth vertical Bezier flowing from agent's bottom port to sub-node's top port
    const [bzPath, bzX, bzY] = getBezierPath({
      sourceX,
      sourceY,
      sourcePosition: Position.Bottom,
      targetX,
      targetY,
      targetPosition: Position.Top,
      curvature: 0.35,
    });
    edgePath = bzPath;
    labelX = bzX;
    labelY = bzY;
  } else if (isLoopReturnEdge) {
    const effectiveTargetPosition =
      targetHandleId === 'loop-return' ? Position.Bottom : targetPosition;
    const { path, labelX: lx, labelY: ly } = buildN8nLoopBackPath({
      sourceX,
      sourceY,
      targetX,
      targetY,
      targetPosition: effectiveTargetPosition,
      loopOffset: customLoopOffset,
    });
    edgePath = path;
    labelX = lx;
    labelY = ly;
  } else {
    const [bzPath, bzX, bzY] = getBezierPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
      curvature: canvasMode === 'mindmap' ? 0.38 : 0.25,
    });
    edgePath = bzPath;
    labelX = bzX;
    labelY = bzY;
  }

  // Allow dragging the loop-back pill vertically to bend/adjust the loop clearance
  const handleLoopOffsetDragStart = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const startClientY = e.clientY;
      const startOffset = customLoopOffset;
      const zoom = Math.max(0.25, getZoom());

      const handleMouseMove = (moveEvt: MouseEvent) => {
        const deltaY = (moveEvt.clientY - startClientY) / zoom;
        const nextOffset = Math.max(44, Math.min(420, Math.round(startOffset + deltaY)));
        updateEdgeLoopOffset(id, nextOffset);
      };

      const handleMouseUp = () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [customLoopOffset, getZoom, id, updateEdgeLoopOffset]
  );

  const getEdgeStroke = () => {
    if (isAiSubNodeEdge) {
      if (sourceHandleId === 'ai-llm' || (data as any)?.slot === 'llm') return '#A855F7';
      if (sourceHandleId === 'ai-memory' || (data as any)?.slot === 'memory') return '#0EA5E9';
      if (sourceHandleId === 'ai-tool' || (data as any)?.slot === 'tool') return '#10B981';
      if (sourceHandleId === 'ai-parser' || (data as any)?.slot === 'parser') return '#F59E0B';
      return '#A855F7';
    }
    if (canvasMode === 'mindmap') {
      if (selected) return '#6366F1';
      if (sourceHandleId === 'loop-done') return '#10B981';
      if (sourceHandleId === 'loop-body') return '#F59E0B';
      return isLightMode ? '#6366F1' : '#818CF8';
    }
    if (selected) return '#8B5CF6';
    if (isLoopReturnEdge || sourceHandleId === 'loop-body') return '#F59E0B';
    if (sourceHandleId === 'loop-done') return '#10B981';
    return isLightMode ? '#64748B' : '#94A3B8';
  };

  const displayLabel = isAiSubNodeEdge
    ? undefined
    : label || (isLoopReturnEdge ? '↻ next batch' : undefined);

  return (
    <>
      <BaseEdge
        path={edgePath}
        interactionWidth={24}
        markerEnd={canvasMode === 'mindmap' || isAiSubNodeEdge ? undefined : markerEnd}
        style={{
          ...style,
          strokeDasharray: isAiSubNodeEdge
            ? '4 4'
            : canvasMode === 'mindmap'
            ? 'none'
            : isLoopReturnEdge
            ? '6 4'
            : style.strokeDasharray,
          strokeWidth: isAiSubNodeEdge
            ? selected
              ? 2.8
              : 2
            : canvasMode === 'mindmap'
            ? selected
              ? 3.5
              : 2.5
            : selected
            ? 3
            : isLoopReturnEdge
            ? 2.4
            : 2,
          stroke: getEdgeStroke(),
        }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan group flex items-center gap-1 z-20"
        >
          {displayLabel && (
            <span
              onMouseDown={isLoopReturnEdge ? handleLoopOffsetDragStart : undefined}
              title={
                isLoopReturnEdge
                  ? 'Drag up/down to adjust loop wire height'
                  : undefined
              }
              className={`px-2 py-0.5 rounded-md text-[10px] font-mono border transition-colors flex items-center gap-1 select-none ${
                isLoopReturnEdge ? 'cursor-ns-resize' : ''
              } ${
                selected
                  ? 'bg-violet-950 border-violet-500 text-violet-200'
                  : isLoopReturnEdge || sourceHandleId === 'loop-body'
                  ? isLightMode
                    ? 'bg-amber-50 border-amber-300 text-amber-800 font-semibold shadow-2xs hover:border-amber-500'
                    : 'bg-amber-950/95 border-amber-500/50 text-amber-300 font-semibold shadow-xs hover:border-amber-400'
                  : sourceHandleId === 'loop-done'
                  ? isLightMode
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold shadow-2xs'
                    : 'bg-emerald-950/95 border-emerald-500/50 text-emerald-300 font-semibold shadow-xs'
                  : isLightMode
                  ? 'bg-white/95 border-slate-200 text-slate-700 shadow-2xs'
                  : 'bg-[#0F172A]/95 border-slate-700/90 text-slate-300 shadow-xs'
              }`}
            >
              <span>{String(displayLabel)}</span>
              {isLoopReturnEdge && (
                <MoveVertical className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100" />
              )}
            </span>
          )}

          {/* Delete Wire (X) button */}
          <button
            type="button"
            title={isAiSubNodeEdge ? 'Disconnect sub-node' : 'Delete this connection wire'}
            onClick={(e) => {
              e.stopPropagation();
              deleteEdge(id);
            }}
            className={`no-export w-5 h-5 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
              selected
                ? 'opacity-100 scale-105 bg-rose-600 border-rose-400 text-white shadow-md'
                : isAiSubNodeEdge || canvasMode === 'mindmap'
                ? 'opacity-0 group-hover:opacity-100 hover:scale-110 bg-slate-900/95 border-slate-600 text-slate-300 hover:bg-rose-600 hover:border-rose-400 hover:text-white'
                : 'opacity-85 hover:opacity-100 hover:scale-110 bg-slate-900/95 border-slate-600 text-slate-300 hover:bg-rose-600 hover:border-rose-400 hover:text-white'
            }`}
          >
            <X className="w-3 h-3" />
          </button>

          {/* Insert Step (+) button: ONLY on standard workflow pipeline wires, NOT on AI Sub-Node sockets! */}
          {!isAiSubNodeEdge && (
            <button
              type="button"
              title="Insert a step on this wire (+)"
              onClick={(e) => {
                e.stopPropagation();
                insertNodeOnEdge(id);
              }}
              className={`no-export w-5 h-5 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
                selected
                  ? 'opacity-100 scale-105 bg-indigo-600 border-indigo-400 text-white shadow-md'
                  : canvasMode === 'mindmap'
                  ? 'opacity-0 group-hover:opacity-100 hover:scale-110 bg-slate-900/95 border-slate-600 text-slate-300 hover:bg-indigo-600 hover:border-indigo-400 hover:text-white'
                  : 'opacity-85 hover:opacity-100 hover:scale-110 bg-slate-900/95 border-slate-600 text-slate-300 hover:bg-indigo-600 hover:border-indigo-400 hover:text-white'
              }`}
            >
              <Plus className="w-3 h-3" />
            </button>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
};
