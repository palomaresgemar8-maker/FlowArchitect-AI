import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  ControlButton,
  MiniMap,
  ConnectionMode,
  useReactFlow,
  type XYPosition,
  type Connection,
} from '@xyflow/react';
import { Map } from 'lucide-react';
import { useWorkflowStore } from '../bal/useWorkflowStore';
import { ResizableWorkflowNode } from './nodes/ResizableWorkflowNode';
import { ResizableGroupNode } from './nodes/ResizableGroupNode';
import { DeletableWorkflowEdge } from './edges/DeletableWorkflowEdge';
import { FlexibleConnectionLine } from './edges/FlexibleConnectionLine';
import {
  findIntersectingTargetNode,
  findNodeAtCanvasPoint,
} from '../bal/nodeSwapEngine';
import type { FlowEdge, FlowNode, LibraryNodeTemplate } from '../types/workflow';
import { ROLE_STYLES } from './nodes/nodeIcons';
import { eventBus } from '../bal/eventBus';

const nodeTypes = {
  workflowNode: ResizableWorkflowNode,
  resizableGroup: ResizableGroupNode,
};

const edgeTypes = {
  workflowEdge: DeletableWorkflowEdge,
  default: DeletableWorkflowEdge,
};

interface ToastItem {
  id: number;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

interface WorkflowCanvasProps {
  canvasViewportRef: React.RefObject<HTMLDivElement | null>;
}

export const WorkflowCanvas: React.FC<WorkflowCanvasProps> = ({
  canvasViewportRef,
}) => {
  const {
    nodes,
    edges,
    canvasMode,
    swapTargetNodeId,
    isLightMode,
    showMiniMap,
    setCanvasMode,
    toggleMiniMap,
    runAutoLayout,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onReconnect,
    deleteEdge,
    setSelectedNodeId,
    setSwapTargetNodeId,
    addNodeFromLibrary,
    executeCanvasNodeSwap,
    executeLibraryNodeReplace,
    undo,
    redo,
  } = useWorkflowStore();

  const { screenToFlowPosition, fitView } = useReactFlow();
  const dragStartPositionRef = useRef<Record<string, XYPosition>>({});
  const edgeReconnectSuccessful = useRef(true);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Smoothly fit view whenever switching between Workflow Mode and Mind Map Mode
  useEffect(() => {
    const timer = setTimeout(() => {
      fitView({ padding: 0.22, duration: 320 });
    }, 60);
    return () => clearTimeout(timer);
  }, [canvasMode, fitView]);

  // Subscribe to EventBus notifications
  useEffect(() => {
    const unsub = eventBus.on('TOAST_NOTIFY', (payload) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev.slice(-2), { id, ...payload }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3600);
    });
    return unsub;
  }, []);

  // Keyboard shortcuts for Undo / Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT')
      ) {
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  // Edge Reconnect Handlers: Dragging an edge endpoint to another node reconnects it;
  // dropping it on empty canvas deletes the connection wire!
  const handleReconnectStart = useCallback(() => {
    edgeReconnectSuccessful.current = false;
  }, []);

  const handleReconnect = useCallback(
    (oldEdge: FlowEdge, newConnection: Connection) => {
      edgeReconnectSuccessful.current = true;
      onReconnect(oldEdge, newConnection);
    },
    [onReconnect]
  );

  const handleReconnectEnd = useCallback(
    (_event: MouseEvent | TouchEvent, edge: FlowEdge) => {
      if (!edgeReconnectSuccessful.current) {
        deleteEdge(edge.id);
      }
      edgeReconnectSuccessful.current = true;
    },
    [deleteEdge]
  );

  // Canvas Node Drag Start: record starting coordinates for clean position swap
  const handleNodeDragStart = useCallback(
    (_event: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent, node: FlowNode) => {
      dragStartPositionRef.current[node.id] = { ...node.position };
    },
    []
  );

  // Canvas Node Drag: bounding-box collision check for Drag-to-Swap
  const handleNodeDrag = useCallback(
    (_event: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent, node: FlowNode) => {
      const target = findIntersectingTargetNode(node, nodes);
      setSwapTargetNodeId(target ? target.id : null);
    },
    [nodes, setSwapTargetNodeId]
  );

  // Canvas Node Drag Stop: execute swap if dropped onto a target node
  const handleNodeDragStop = useCallback(
    (_event: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent, node: FlowNode) => {
      const currentTargetId = swapTargetNodeId;
      const originalPos = dragStartPositionRef.current[node.id] || node.position;
      if (currentTargetId && currentTargetId !== node.id) {
        executeCanvasNodeSwap(node.id, currentTargetId, originalPos);
      } else if (currentTargetId) {
        setSwapTargetNodeId(null);
      }
    },
    [swapTargetNodeId, executeCanvasNodeSwap, setSwapTargetNodeId]
  );

  // Sidebar Library Drag Over Canvas: detect if hovering over an existing node for Drag-to-Swap
  const handleDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';

      const flowPoint = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      const hitNode = findNodeAtCanvasPoint(flowPoint, nodes);
      setSwapTargetNodeId(hitNode ? hitNode.id : null);
    },
    [screenToFlowPosition, nodes, setSwapTargetNodeId]
  );

  const handleDragLeave = useCallback(() => {
    setSwapTargetNodeId(null);
  }, [setSwapTargetNodeId]);

  // Sidebar Library Drop: either replace existing node in-place or add new node at drop position
  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const rawData = event.dataTransfer.getData('application/flowarchitect-node');
      if (!rawData) {
        setSwapTargetNodeId(null);
        return;
      }

      try {
        const template: LibraryNodeTemplate = JSON.parse(rawData);
        const flowPoint = screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });
        const hitNode = findNodeAtCanvasPoint(flowPoint, nodes);

        if (hitNode) {
          executeLibraryNodeReplace(hitNode.id, template);
        } else {
          addNodeFromLibrary(template, {
            x: Math.round((flowPoint.x - 130) / 15) * 15,
            y: Math.round((flowPoint.y - 80) / 15) * 15,
          });
        }
      } catch (err) {
        console.error('Failed to drop library node:', err);
      } finally {
        setSwapTargetNodeId(null);
      }
    },
    [
      screenToFlowPosition,
      nodes,
      executeLibraryNodeReplace,
      addNodeFromLibrary,
      setSwapTargetNodeId,
    ]
  );

  return (
    <div
      ref={canvasViewportRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative flex-1 h-full overflow-hidden transition-colors ${
        isLightMode ? 'bg-[#F8FAFC]' : 'bg-[#0B0F19]'
      }`}
    >
      {/* Floating Mind Map Mode Banner */}
      {canvasMode === 'mindmap' && (
        <div
          className={`no-export absolute top-3.5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border shadow-lg backdrop-blur-md text-xs ${
            isLightMode
              ? 'bg-white/95 border-violet-200 text-slate-800'
              : 'bg-slate-900/95 border-violet-500/40 text-slate-100'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
          <span className="font-semibold">Mind Map Mode</span>
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            Click branch counts to collapse/expand · Hover right edge (+) to sprout branches
          </span>
          <button
            type="button"
            onClick={() => runAutoLayout('LR')}
            className="px-2 py-0.5 rounded-md bg-violet-500/15 text-violet-600 dark:text-violet-300 font-semibold hover:bg-violet-500/25 transition-colors cursor-pointer"
          >
            Re-align Tree
          </button>
          <button
            type="button"
            onClick={() => setCanvasMode('workflow')}
            className="px-2 py-0.5 rounded-md bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium hover:bg-indigo-600 hover:text-white transition-colors cursor-pointer"
          >
            Back to Workflow
          </button>
        </div>
      )}

      {/* Toast Notifications */}
      <div className="no-export absolute top-3.5 right-4 z-30 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-3.5 py-2 rounded-xl border text-xs font-medium shadow-lg backdrop-blur-md transition-all ${
              t.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200'
                : t.type === 'error'
                ? 'bg-rose-950/90 border-rose-500/40 text-rose-200'
                : t.type === 'warning'
                ? 'bg-amber-950/90 border-amber-500/40 text-amber-200'
                : 'bg-slate-900/90 border-slate-700 text-slate-200'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        connectionLineComponent={FlexibleConnectionLine}
        connectionRadius={44}
        connectionMode={ConnectionMode.Loose}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onReconnect={handleReconnect}
        onReconnectStart={handleReconnectStart}
        onReconnectEnd={handleReconnectEnd}
        reconnectRadius={32}
        deleteKeyCode={['Backspace', 'Delete']}
        onNodeDragStart={handleNodeDragStart}
        onNodeDrag={handleNodeDrag}
        onNodeDragStop={handleNodeDragStop}
        onPaneClick={() => setSelectedNodeId(null)}
        elevateNodesOnSelect={false}
        snapToGrid
        snapGrid={[15, 15]}
        fitView
        fitViewOptions={{ padding: 0.22 }}
        defaultEdgeOptions={{
          type: 'workflowEdge',
          animated: true,
          style: {
            stroke: isLightMode ? '#64748B' : '#94A3B8',
            strokeWidth: 2,
          },
        }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1.3}
          color={isLightMode ? '#CBD5E1' : '#1E293B'}
        />

        <Controls
          position="bottom-left"
          className={`no-export !mb-20 !ml-4 ${
            isLightMode
              ? '!bg-white !border-slate-200 !text-slate-700'
              : '!bg-[#0F172A] !border-slate-800 !text-slate-200'
          }`}
        >
          <ControlButton
            onClick={toggleMiniMap}
            title={showMiniMap ? 'Hide MiniMap' : 'Show MiniMap'}
            aria-label="Toggle MiniMap"
            className={`${
              showMiniMap
                ? '!text-indigo-600 dark:!text-indigo-400 font-bold'
                : '!text-slate-400 hover:!text-slate-600'
            }`}
          >
            <Map className="w-3.5 h-3.5" />
          </ControlButton>
        </Controls>

        {showMiniMap && (
          <MiniMap
            position="bottom-right"
            pannable
            zoomable
            nodeColor={(node) => {
              const role = (node.data as any)?.role;
              return ROLE_STYLES[role as keyof typeof ROLE_STYLES]?.accentHex || '#64748B';
            }}
            maskColor={
              isLightMode ? 'rgba(241, 245, 249, 0.7)' : 'rgba(11, 15, 25, 0.75)'
            }
            className={`no-export !mb-20 !mr-4 border shadow-xl rounded-xl overflow-hidden ${
              isLightMode
                ? '!bg-white !border-slate-200'
                : '!bg-[#0F172A] !border-slate-800'
            }`}
          />
        )}
      </ReactFlow>

      {/* Floating MiniMap Toggle Pill in Bottom-Right Corner */}
      <div
        className={`no-export absolute right-4 z-20 transition-all duration-200 ${
          showMiniMap ? 'bottom-[228px]' : 'bottom-20'
        }`}
      >
        <button
          type="button"
          onClick={toggleMiniMap}
          title={showMiniMap ? 'Hide MiniMap' : 'Show MiniMap'}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border shadow-md backdrop-blur-md transition-all cursor-pointer ${
            showMiniMap
              ? isLightMode
                ? 'bg-white/95 border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-300'
                : 'bg-[#0F172A]/95 border-slate-700 text-slate-300 hover:text-indigo-400 hover:border-indigo-500'
              : isLightMode
              ? 'bg-indigo-600 text-white border-indigo-500 shadow-indigo-500/20 hover:bg-indigo-700'
              : 'bg-indigo-600 text-white border-indigo-500 shadow-indigo-500/20 hover:bg-indigo-500'
          }`}
        >
          <Map className="w-3.5 h-3.5" />
          <span>{showMiniMap ? 'Hide Map' : 'Show Map'}</span>
        </button>
      </div>
    </div>
  );
};
