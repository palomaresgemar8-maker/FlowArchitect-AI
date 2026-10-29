import React from 'react';
import {
  getBezierPath,
  Position,
  type ConnectionLineComponentProps,
} from '@xyflow/react';
import { useWorkflowStore } from '../../bal/useWorkflowStore';

/**
 * Builds an n8n-style smooth rounded loop-back SVG path when wiring backward
 * (from a downstream step back to a Loop Over Items node or upstream step).
 */
export function buildN8nLoopBackPath(params: {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  targetPosition?: Position;
  loopOffset?: number;
}): { path: string; labelX: number; labelY: number } {
  const {
    sourceX,
    sourceY,
    targetX,
    targetY,
    targetPosition = Position.Bottom,
    loopOffset = 96,
  } = params;

  const rightMargin = 42;
  const leftMargin = targetPosition === Position.Bottom ? 0 : 40;
  const rightX = Math.max(sourceX, targetX) + rightMargin;
  const leftX = targetX - leftMargin;
  const bottomY = Math.max(sourceY, targetY) + Math.max(44, loopOffset);
  const r = 18; // Smooth corner radius

  if (targetPosition === Position.Bottom) {
    // Route out right -> down to bottomY -> left to targetX -> up into bottom port
    const spanX = Math.max(1, rightX - targetX);
    const cornerR = Math.min(r, spanX / 2, Math.abs(bottomY - sourceY) / 2, Math.abs(bottomY - targetY) / 2);

    const path = [
      `M ${sourceX} ${sourceY}`,
      `L ${rightX - cornerR} ${sourceY}`,
      `Q ${rightX} ${sourceY} ${rightX} ${sourceY + cornerR}`,
      `L ${rightX} ${bottomY - cornerR}`,
      `Q ${rightX} ${bottomY} ${rightX - cornerR} ${bottomY}`,
      `L ${targetX + cornerR} ${bottomY}`,
      `Q ${targetX} ${bottomY} ${targetX} ${bottomY - cornerR}`,
      `L ${targetX} ${targetY}`,
    ].join(' ');

    return {
      path,
      labelX: (rightX + targetX) / 2,
      labelY: bottomY,
    };
  }

  // Route out right -> down to bottomY -> left to leftX -> up to targetY -> right into left port
  const spanX = Math.max(1, rightX - leftX);
  const cornerR = Math.min(
    r,
    spanX / 2,
    Math.abs(bottomY - sourceY) / 2,
    Math.abs(bottomY - targetY) / 2
  );

  const path = [
    `M ${sourceX} ${sourceY}`,
    `L ${rightX - cornerR} ${sourceY}`,
    `Q ${rightX} ${sourceY} ${rightX} ${sourceY + cornerR}`,
    `L ${rightX} ${bottomY - cornerR}`,
    `Q ${rightX} ${bottomY} ${rightX - cornerR} ${bottomY}`,
    `L ${leftX + cornerR} ${bottomY}`,
    `Q ${leftX} ${bottomY} ${leftX} ${bottomY - cornerR}`,
    `L ${leftX} ${targetY + cornerR}`,
    `Q ${leftX} ${targetY} ${leftX + cornerR} ${targetY}`,
    `L ${targetX} ${targetY}`,
  ].join(' ');

  return {
    path,
    labelX: (rightX + leftX) / 2,
    labelY: bottomY,
  };
}

export const FlexibleConnectionLine: React.FC<ConnectionLineComponentProps> = ({
  fromX,
  fromY,
  toX,
  toY,
  fromPosition,
  toPosition,
  fromHandle,
}) => {
  const isLightMode = useWorkflowStore((s) => s.isLightMode);
  const canvasMode = useWorkflowStore((s) => s.canvasMode);

  const handleId = fromHandle?.id || '';
  const isReverseFromLoopReturn = handleId === 'loop-return';
  const isBackwardDrag =
    canvasMode !== 'mindmap' &&
    (isReverseFromLoopReturn || toX < fromX - 24);

  let dPath = '';
  let badgeX = (fromX + toX) / 2;
  let badgeY = (fromY + toY) / 2;

  if (isBackwardDrag) {
    // If dragging from loop-return forward to a node, or from a downstream node backward to loop node
    const sx = isReverseFromLoopReturn ? toX : fromX;
    const sy = isReverseFromLoopReturn ? toY : fromY;
    const tx = isReverseFromLoopReturn ? fromX : toX;
    const ty = isReverseFromLoopReturn ? fromY : toY;

    const { path, labelX, labelY } = buildN8nLoopBackPath({
      sourceX: sx,
      sourceY: sy,
      targetX: tx,
      targetY: ty,
      targetPosition: isReverseFromLoopReturn ? Position.Bottom : toPosition || Position.Bottom,
      loopOffset: 96,
    });
    dPath = path;
    badgeX = labelX;
    badgeY = labelY;
  } else {
    const [bzPath, lx, ly] = getBezierPath({
      sourceX: fromX,
      sourceY: fromY,
      sourcePosition: fromPosition,
      targetX: toX,
      targetY: toY,
      targetPosition: toPosition,
      curvature: 0.28,
    });
    dPath = bzPath;
    badgeX = lx;
    badgeY = ly;
  }

  const strokeColor = isBackwardDrag
    ? '#F59E0B'
    : handleId === 'loop-done'
    ? '#10B981'
    : '#6366F1';

  return (
    <g>
      {/* Subtle outer glow for easy visibility while wiring */}
      <path
        fill="none"
        stroke={strokeColor}
        strokeWidth={6}
        strokeOpacity={0.18}
        d={dPath}
      />
      <path
        fill="none"
        stroke={strokeColor}
        strokeWidth={2.5}
        strokeDasharray={isBackwardDrag ? '6 4' : '5 3'}
        className="animated"
        d={dPath}
      />
      {/* Magnetic target snap ring at cursor */}
      <circle
        cx={toX}
        cy={toY}
        r={6}
        fill={isLightMode ? '#FFFFFF' : '#0F172A'}
        stroke={strokeColor}
        strokeWidth={2.5}
      />
      {isBackwardDrag && (
        <foreignObject
          x={badgeX - 95}
          y={badgeY - 14}
          width={190}
          height={28}
          className="overflow-visible pointer-events-none"
        >
          <div className="flex items-center justify-center">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500 text-slate-950 shadow-md whitespace-nowrap">
              ↻ Loop-Back Wire (Drop on Node)
            </span>
          </div>
        </foreignObject>
      )}
    </g>
  );
};
