import { create } from 'zustand';
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  reconnectEdge,
  type NodeChange,
  type EdgeChange,
  type Connection,
  type XYPosition,
} from '@xyflow/react';
import type {
  AiEngineSettings,
  AiSubNodeType,
  CanvasViewMode,
  FlowEdge,
  FlowNode,
  FlowNodeData,
  LibraryNodeTemplate,
  PlatformType,
  WorkflowProject,
} from '../types/workflow';
import {
  deleteProjectFromDb,
  initializeAndLoadProjects,
  saveProjectToDb,
  STARTER_PROJECTS,
} from '../sal/db';
import {
  loadAiSettings,
  saveAiSettings,
} from '../sal/aiSettingsStorage';
import { computeAutoLayout, computeMindMapLayout } from './autoLayoutEngine';
import {
  NODE_LIBRARY_TEMPLATES,
  translateNodesToPlatform,
} from './platformTranslator';
import {
  replaceNodeFromLibraryTemplate,
  swapCanvasNodesAndEdges,
} from './nodeSwapEngine';
import { eventBus } from './eventBus';

interface HistorySnapshot {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

interface WorkflowState {
  projects: WorkflowProject[];
  activeProjectId: string;
  projectName: string;
  projectDescription: string;
  platform: PlatformType;
  canvasMode: CanvasViewMode;
  savedWorkflowPositions: Record<string, XYPosition>;
  nodes: FlowNode[];
  edges: FlowEdge[];
  selectedNodeId: string | null;
  swapTargetNodeId: string | null;
  isLightMode: boolean;
  showMiniMap: boolean;
  aiSettings: AiEngineSettings;
  isGeneratingAi: boolean;
  isSettingsModalOpen: boolean;
  isSowModalOpen: boolean;

  // Undo / Redo stacks
  past: HistorySnapshot[];
  future: HistorySnapshot[];

  // Actions
  initWorkspace: () => Promise<void>;
  takeSnapshot: () => void;
  undo: () => void;
  redo: () => void;

  setCanvasMode: (mode: CanvasViewMode) => void;
  toggleMindMapBranchCollapse: (nodeId: string) => void;
  toggleMiniMap: () => void;
  setShowMiniMap: (val: boolean) => void;

  onNodesChange: (changes: NodeChange<FlowNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<FlowEdge>[]) => void;
  onConnect: (connection: Connection) => void;
  onReconnect: (oldEdge: FlowEdge, newConnection: Connection) => void;
  deleteEdge: (edgeId: string) => void;
  updateEdgeLabel: (edgeId: string, label: string) => void;
  updateEdgeLoopOffset: (edgeId: string, loopOffset: number) => void;
  insertNodeOnEdge: (edgeId: string, template?: LibraryNodeTemplate) => void;
  connectNodesById: (sourceId: string, targetId: string, label?: string) => void;
  connectNodeToLoopReturn: (sourceNodeId: string, loopNodeId?: string) => void;

  setSelectedNodeId: (id: string | null) => void;
  setSwapTargetNodeId: (id: string | null) => void;

  updateNodeData: (id: string, partial: Partial<FlowNodeData>) => void;
  deleteNode: (id: string) => void;
  duplicateNode: (id: string) => void;
  addNodeFromLibrary: (template: LibraryNodeTemplate, position?: XYPosition) => void;
  appendConnectedNode: (sourceNodeId: string, template?: LibraryNodeTemplate) => void;
  appendLoopBodyNode: (loopNodeId: string, template?: LibraryNodeTemplate) => void;
  appendLoopDoneNode: (loopNodeId: string, template?: LibraryNodeTemplate) => void;
  addLoopingNodeQuick: () => void;
  attachAiSubNode: (
    agentNodeId: string,
    slot: AiSubNodeType,
    template: LibraryNodeTemplate
  ) => void;
  addGroupFrame: (position?: XYPosition) => void;
  sendNoteToBack: (id: string) => void;
  bringNoteToFront: (id: string) => void;

  executeCanvasNodeSwap: (
    draggedNodeId: string,
    targetNodeId: string,
    originalDraggedPos: XYPosition
  ) => void;
  executeLibraryNodeReplace: (
    targetNodeId: string,
    template: LibraryNodeTemplate
  ) => void;

  switchPlatform: (platform: PlatformType) => void;
  runAutoLayout: (direction?: 'LR' | 'TB') => void;
  applyGeneratedBlueprint: (
    title: string,
    summary: string,
    newNodes: FlowNode[],
    newEdges: FlowEdge[],
    appendMode: boolean
  ) => void;

  selectProject: (projectId: string) => void;
  createNewProject: (name?: string, platform?: PlatformType) => void;
  renameActiveProject: (name: string) => void;
  deleteProject: (projectId: string) => Promise<void>;
  importProjectObject: (project: WorkflowProject) => void;

  setIsLightMode: (val: boolean) => void;
  updateAiSettings: (partial: Partial<AiEngineSettings>) => void;
  setIsGeneratingAi: (val: boolean) => void;
  setIsSettingsModalOpen: (val: boolean) => void;
  setIsSowModalOpen: (val: boolean) => void;
  persistCurrentProject: () => void;
}

function normalizeNodeLayerOrder(nodes: FlowNode[]): FlowNode[] {
  const stickyNotes = nodes
    .filter((n) => n.type === 'resizableGroup')
    .map((n) => ({
      ...n,
      zIndex: typeof n.zIndex === 'number' ? n.zIndex : -10,
    }));
  const workflowNodes = nodes
    .filter((n) => n.type !== 'resizableGroup')
    .map((n) => ({
      ...n,
      zIndex: 10,
    }));
  return [...stickyNotes, ...workflowNodes];
}

function getStandardWorkflowNodeStyle(node: FlowNode) {
  if (node.type === 'resizableGroup') {
    return node.style || { width: 360, height: 340 };
  }
  const isAiAgentHub = node.data.role === 'ai' && !node.data.aiSubNodeType;
  const isLoop = Boolean(
    node.data.isLoopNode ||
      node.data.iconName === 'loop' ||
      node.data.serviceName?.includes('splitInBatches')
  );
  const isSubNode = Boolean(node.data.aiSubNodeType);
  if (isAiAgentHub) return { width: 224, height: 86 };
  if (isLoop) return { width: 196, height: 86 };
  if (isSubNode) return { width: 68, height: 68 };
  return { width: 76, height: 76 };
}

function applyMindMapVisibility(
  nodes: FlowNode[],
  edges: FlowEdge[]
): { nodes: FlowNode[]; edges: FlowEdge[] } {
  const collapsedIds = new Set(
    nodes
      .filter((n) => n.data.collapsedInMindMap)
      .map((n) => n.id)
  );

  if (collapsedIds.size === 0) {
    return {
      nodes: nodes.map((n) => (n.hidden ? { ...n, hidden: false } : n)),
      edges: edges.map((e) => (e.hidden ? { ...e, hidden: false } : e)),
    };
  }

  const hiddenNodeIds = new Set<string>();
  const queue = Array.from(collapsedIds);

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    edges.forEach((edge) => {
      if (edge.source === currentId && !hiddenNodeIds.has(edge.target)) {
        hiddenNodeIds.add(edge.target);
        queue.push(edge.target);
      }
    });
  }

  return {
    nodes: nodes.map((n) => ({
      ...n,
      hidden: hiddenNodeIds.has(n.id),
    })),
    edges: edges.map((e) => ({
      ...e,
      hidden: hiddenNodeIds.has(e.source) || hiddenNodeIds.has(e.target),
    })),
  };
}

function sanitizeProjectEdges(edges: FlowEdge[]): FlowEdge[] {
  return edges.map((e) => {
    const isAiSub = Boolean(
      e.sourceHandle?.startsWith('ai-') ||
      e.targetHandle === 'sub-top' ||
      (e.data as any)?.isAiSubNode ||
      (e.data as any)?.slot
    );
    if (isAiSub) {
      const dataClean = { ...(e.data || {}) };
      delete (dataClean as any).isLoopReturn;
      delete (dataClean as any).loopOffset;
      dataClean.isAiSubNode = true;
      return {
        ...e,
        label: undefined,
        data: dataClean,
      };
    }
    return e;
  });
}

const initialProject = STARTER_PROJECTS[0];

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  projects: STARTER_PROJECTS,
  activeProjectId: initialProject.id,
  projectName: initialProject.name,
  projectDescription: initialProject.description,
  platform: initialProject.platform,
  canvasMode: 'workflow',
  savedWorkflowPositions: {},
  nodes: normalizeNodeLayerOrder(initialProject.nodes),
  edges: sanitizeProjectEdges(initialProject.edges),
  selectedNodeId: null,
  swapTargetNodeId: null,
  isLightMode: true,
  showMiniMap: true,
  aiSettings: loadAiSettings(),
  isGeneratingAi: false,
  isSettingsModalOpen: false,
  isSowModalOpen: false,
  past: [],
  future: [],

  initWorkspace: async () => {
    const loaded = await initializeAndLoadProjects();
    if (loaded.length > 0) {
      const sanitizedLoaded = loaded.map((p) => ({
        ...p,
        edges: sanitizeProjectEdges(p.edges),
      }));
      const first = sanitizedLoaded[0];
      set({
        projects: sanitizedLoaded,
        activeProjectId: first.id,
        projectName: first.name,
        projectDescription: first.description,
        platform: first.platform,
        canvasMode: 'workflow',
        savedWorkflowPositions: {},
        nodes: normalizeNodeLayerOrder(first.nodes),
        edges: sanitizeProjectEdges(first.edges),
        past: [],
        future: [],
      });
    }
  },

  takeSnapshot: () => {
    const { nodes, edges, past } = get();
    const snapshot: HistorySnapshot = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    };
    set({
      past: [...past.slice(-29), snapshot],
      future: [],
    });
  },

  undo: () => {
    const { past, future, nodes, edges } = get();
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    const currentSnapshot: HistorySnapshot = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    };
    set({
      nodes: previous.nodes,
      edges: previous.edges,
      past: past.slice(0, -1),
      future: [currentSnapshot, ...future.slice(0, 29)],
    });
    get().persistCurrentProject();
  },

  redo: () => {
    const { past, future, nodes, edges } = get();
    if (future.length === 0) return;
    const next = future[0];
    const currentSnapshot: HistorySnapshot = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    };
    set({
      nodes: next.nodes,
      edges: next.edges,
      past: [...past, currentSnapshot],
      future: future.slice(1),
    });
    get().persistCurrentProject();
  },

  setCanvasMode: (mode) => {
    const { canvasMode, nodes, edges, savedWorkflowPositions } = get();
    if (canvasMode === mode) return;

    if (mode === 'mindmap') {
      // Save current workflow positions so switching back restores them accurately
      const posMap: Record<string, XYPosition> = { ...savedWorkflowPositions };
      nodes.forEach((n) => {
        posMap[n.id] = { ...n.position };
      });

      const unhiddenNodes = nodes.map((n) => ({
        ...n,
        hidden: false,
        data: { ...n.data, collapsedInMindMap: false },
      }));
      const unhiddenEdges = edges.map((e) => ({ ...e, hidden: false }));

      const mindMapNodes = computeMindMapLayout(unhiddenNodes, unhiddenEdges);

      set({
        canvasMode: 'mindmap',
        savedWorkflowPositions: posMap,
        nodes: mindMapNodes,
        edges: unhiddenEdges,
      });

      eventBus.emit('TOAST_NOTIFY', {
        type: 'info',
        message: 'Switched to Mind Map Mode — hierarchical topic tree view',
      });
    } else {
      // Restore back to Workflow Blueprint Mode
      const unhiddenEdges = edges.map((e) => ({ ...e, hidden: false }));
      const restoredNodes = nodes.map((n) => {
        const savedPos = savedWorkflowPositions[n.id];
        return {
          ...n,
          hidden: false,
          position: savedPos ? { ...savedPos } : n.position,
          style: getStandardWorkflowNodeStyle(n),
          data: {
            ...n.data,
            collapsedInMindMap: false,
          },
        };
      });

      // If any nodes were added while in Mind Map mode without a saved workflow position, tidy layout if needed
      const hasNewUnsavedNode = nodes.some(
        (n) => n.type !== 'resizableGroup' && !savedWorkflowPositions[n.id]
      );
      const finalWorkflowNodes = hasNewUnsavedNode
        ? computeAutoLayout(restoredNodes, unhiddenEdges, 'LR')
        : normalizeNodeLayerOrder(restoredNodes);

      set({
        canvasMode: 'workflow',
        nodes: finalWorkflowNodes,
        edges: unhiddenEdges,
      });

      eventBus.emit('TOAST_NOTIFY', {
        type: 'info',
        message: 'Switched to Workflow Blueprint Mode',
      });
    }
  },

  toggleMindMapBranchCollapse: (nodeId) => {
    const { nodes, edges } = get();
    const toggledNodes = nodes.map((n) =>
      n.id === nodeId
        ? {
            ...n,
            data: {
              ...n.data,
              collapsedInMindMap: !n.data.collapsedInMindMap,
            },
          }
        : n
    );

    const visibility = applyMindMapVisibility(toggledNodes, edges);
    set({
      nodes: visibility.nodes,
      edges: visibility.edges,
    });
  },

  toggleMiniMap: () => {
    const nextVal = !get().showMiniMap;
    set({ showMiniMap: nextVal });
    eventBus.emit('TOAST_NOTIFY', {
      type: 'info',
      message: nextVal ? 'MiniMap enabled' : 'MiniMap hidden',
    });
  },

  setShowMiniMap: (val: boolean) => set({ showMiniMap: val }),

  onNodesChange: (changes) => {
    const nextNodes = applyNodeChanges(changes, get().nodes);
    set({ nodes: nextNodes });
    const shouldSave = changes.some(
      (c) =>
        (c.type === 'position' && !c.dragging) ||
        (c.type === 'dimensions' && !c.resizing) ||
        c.type === 'remove'
    );
    if (shouldSave) {
      get().persistCurrentProject();
    }
  },

  onEdgesChange: (changes) => {
    if (changes.some((c) => c.type === 'remove')) {
      get().takeSnapshot();
    }
    const nextEdges = applyEdgeChanges(changes, get().edges);
    set({ edges: nextEdges });
    get().persistCurrentProject();
  },

  onConnect: (connection) => {
    if (!connection.source || !connection.target) return;
    if (connection.source === connection.target) return;

    const { nodes, edges } = get();
    let finalSource = connection.source;
    let finalTarget = connection.target;
    let finalSourceHandle = connection.sourceHandle || null;
    let finalTargetHandle = connection.targetHandle || null;

    // 1. If user dragged FROM the Loop node's 'loop-return' target handle TO a downstream step,
    // automatically flip direction so the downstream step outputs back into 'loop-return'!
    if (finalSourceHandle === 'loop-return') {
      finalSource = connection.target;
      finalTarget = connection.source;
      finalSourceHandle = null;
      finalTargetHandle = 'loop-return';
    } else if (
      finalTargetHandle === 'loop-body' ||
      finalTargetHandle === 'loop-done'
    ) {
      // If user dragged backward from a step's input onto the Loop node's 'loop' or 'done' output port
      finalSource = connection.target;
      finalTarget = connection.source;
      finalSourceHandle = connection.targetHandle;
      finalTargetHandle = null;
    }

    const sourceNode = nodes.find((n) => n.id === finalSource);
    const targetNode = nodes.find((n) => n.id === finalTarget);

    const isAiSubConnection = Boolean(
      finalSourceHandle?.startsWith('ai-') ||
      finalTargetHandle === 'sub-top' ||
      sourceNode?.data.aiSubNodeType ||
      targetNode?.data.aiSubNodeType
    );

    const isTargetLoopNode = Boolean(
      targetNode &&
        (targetNode.data.isLoopNode ||
          targetNode.data.iconName === 'loop' ||
          targetNode.data.serviceName?.includes('splitInBatches') ||
          targetNode.data.operation?.startsWith('loop:'))
    );

    // If wiring ANY downstream node back to a Loop node, treat it as loop-return feedback wire
    const isBackwardToLoop =
      !isAiSubConnection &&
      isTargetLoopNode &&
      (finalTargetHandle === 'loop-return' ||
        Boolean(
          sourceNode &&
            targetNode &&
            sourceNode.position.x > targetNode.position.x - 20
        ));

    if (isBackwardToLoop) {
      finalTargetHandle = 'loop-return';
    }

    const edgeLabel = isAiSubConnection
      ? undefined
      : isBackwardToLoop
      ? '↻ next batch'
      : finalSourceHandle === 'loop-body'
      ? 'loop'
      : finalSourceHandle === 'loop-done'
      ? 'done'
      : undefined;

    get().takeSnapshot();

    // If wiring a new loop-return into a Loop node, replace any duplicate identical edge
    const cleanedEdges = edges.filter(
      (e) =>
        !(
          e.source === finalSource &&
          e.target === finalTarget &&
          (e.targetHandle || null) === (finalTargetHandle || null)
        )
    );

    const nextEdges = addEdge(
      {
        source: finalSource,
        target: finalTarget,
        sourceHandle: finalSourceHandle,
        targetHandle: finalTargetHandle,
        id: `e_${finalSource}_${finalTarget}_${Date.now().toString(36).slice(-4)}`,
        type: 'workflowEdge',
        animated: true,
        label: edgeLabel,
        data: isAiSubConnection
          ? {
              isAiSubNode: true,
              slot: targetNode?.data.aiSubNodeType || finalSourceHandle?.replace('ai-', ''),
            }
          : isBackwardToLoop
          ? { isLoopReturn: true, loopOffset: 96 }
          : undefined,
      },
      cleanedEdges
    );
    set({ edges: nextEdges });
    get().persistCurrentProject();
    eventBus.emit('TOAST_NOTIFY', {
      type: 'success',
      message: isAiSubConnection
        ? `Connected ${targetNode?.data.label || 'sub-node'} to AI Agent`
        : isBackwardToLoop
        ? 'Wired ↻ loop-back connection (drag pill up/down to adjust curve)'
        : 'Connected workflow nodes',
    });
  },

  onReconnect: (oldEdge, newConnection) => {
    if (!newConnection.source || !newConnection.target) return;
    const { nodes, edges } = get();

    let finalSource = newConnection.source;
    let finalTarget = newConnection.target;
    let finalSourceHandle = newConnection.sourceHandle || null;
    let finalTargetHandle = newConnection.targetHandle || null;

    if (finalSourceHandle === 'loop-return') {
      finalSource = newConnection.target;
      finalTarget = newConnection.source;
      finalSourceHandle = null;
      finalTargetHandle = 'loop-return';
    }

    const sourceNode = nodes.find((n) => n.id === finalSource);
    const targetNode = nodes.find((n) => n.id === finalTarget);
    const isTargetLoopNode = Boolean(
      targetNode &&
        (targetNode.data.isLoopNode ||
          targetNode.data.iconName === 'loop' ||
          targetNode.data.serviceName?.includes('splitInBatches') ||
          targetNode.data.operation?.startsWith('loop:'))
    );

    if (
      isTargetLoopNode &&
      sourceNode &&
      targetNode &&
      sourceNode.position.x > targetNode.position.x - 20
    ) {
      finalTargetHandle = 'loop-return';
    }

    get().takeSnapshot();
    const nextEdges = reconnectEdge(
      oldEdge,
      {
        source: finalSource,
        target: finalTarget,
        sourceHandle: finalSourceHandle,
        targetHandle: finalTargetHandle,
      },
      edges
    ).map((e) =>
      e.id === oldEdge.id && finalTargetHandle === 'loop-return'
        ? {
            ...e,
            targetHandle: 'loop-return',
            label: e.label || '↻ next batch',
            data: { ...(e.data || {}), isLoopReturn: true },
          }
        : e
    );

    set({ edges: nextEdges });
    get().persistCurrentProject();
    eventBus.emit('TOAST_NOTIFY', {
      type: 'success',
      message: 'Re-routed connection wire to new node',
    });
  },

  deleteEdge: (edgeId) => {
    get().takeSnapshot();
    set((state) => ({
      edges: state.edges.filter((e) => e.id !== edgeId),
    }));
    get().persistCurrentProject();
    eventBus.emit('TOAST_NOTIFY', {
      type: 'info',
      message: 'Deleted connection wire',
    });
  },

  updateEdgeLabel: (edgeId, label) => {
    set((state) => ({
      edges: state.edges.map((e) =>
        e.id === edgeId ? { ...e, label: label || undefined } : e
      ),
    }));
    get().persistCurrentProject();
  },

  updateEdgeLoopOffset: (edgeId, loopOffset) => {
    set((state) => ({
      edges: state.edges.map((e) =>
        e.id === edgeId
          ? {
              ...e,
              data: {
                ...(e.data || {}),
                loopOffset,
              },
            }
          : e
      ),
    }));
    get().persistCurrentProject();
  },

  insertNodeOnEdge: (edgeId, template) => {
    const { nodes, edges, platform } = get();
    const targetEdge = edges.find((e) => e.id === edgeId);
    if (!targetEdge) return;

    const sourceNode = nodes.find((n) => n.id === targetEdge.source);
    const targetNode = nodes.find((n) => n.id === targetEdge.target);
    if (!sourceNode || !targetNode) return;

    get().takeSnapshot();

    const tpl =
      template ||
      NODE_LIBRARY_TEMPLATES.find((t) => t.id === 'core_set_edit_fields') ||
      NODE_LIBRARY_TEMPLATES[0];

    const newId = `node_${Date.now().toString(36)}`;
    const isAiAgentHub = tpl.role === 'ai' && !tpl.aiSubNodeType;
    const isLoop = Boolean(tpl.isLoopNode || tpl.iconName === 'loop');
    const isSubNode = Boolean(tpl.aiSubNodeType);

    // Compute midpoint between source and target
    const midX = Math.round((sourceNode.position.x + targetNode.position.x) / 2);
    const midY = Math.round((sourceNode.position.y + targetNode.position.y) / 2);

    let newNodeX = midX;
    let newNodeY = midY;
    let nextNodes = [...nodes];

    // If target is to the right of source but spacing is narrow, adjust downstream nodes
    if (targetNode.position.x > sourceNode.position.x && targetNode.position.x - sourceNode.position.x < 240) {
      newNodeX = sourceNode.position.x + 160;
      nextNodes = nextNodes.map((n) => {
        if (n.position.x >= targetNode.position.x && n.id !== sourceNode.id && n.type !== 'resizableGroup') {
          return {
            ...n,
            position: { ...n.position, x: n.position.x + 160 },
          };
        }
        return n;
      });
    }

    const newNode: FlowNode = {
      id: newId,
      type: 'workflowNode',
      position: { x: newNodeX, y: newNodeY },
      zIndex: 10,
      style: isAiAgentHub
        ? { width: 224, height: 86 }
        : isLoop
        ? { width: 196, height: 86 }
        : isSubNode
        ? { width: 68, height: 68 }
        : { width: 76, height: 76 },
      data: {
        label: tpl.defaultLabel[platform] || tpl.defaultLabel.n8n,
        subtitle: tpl.operation || tpl.subtitle,
        role: tpl.role,
        aiSubNodeType: tpl.aiSubNodeType,
        isLoopNode: isLoop,
        loopConfig: isLoop
          ? tpl.defaultLoopConfig || {
              mode: 'batch',
              batchSize: 10,
              arrayField: 'items',
              maxIterations: 100,
              pauseMs: 0,
            }
          : undefined,
        nodeGroup: tpl.nodeGroup,
        appPlatform: tpl.appPlatform,
        operation: tpl.operation,
        platform,
        serviceName: tpl.defaultService[platform] || tpl.defaultService.n8n,
        iconName: tpl.iconName,
        systemPrompt: tpl.defaultSystemPrompt || '',
        endpointUrl: tpl.defaultEndpointUrl || '',
        httpMethod: 'POST',
        payloadSchema: tpl.defaultPayloadSchema || '',
        estimatedTimeSavedMins: tpl.estimatedTimeSavedMins,
      },
    };

    // Edge 1: source -> new node
    const edge1: FlowEdge = {
      id: `e_${sourceNode.id}_${newId}_${Date.now().toString(36).slice(-4)}`,
      source: sourceNode.id,
      sourceHandle: targetEdge.sourceHandle,
      target: newId,
      type: 'workflowEdge',
      animated: true,
    };

    // Edge 2: new node -> target
    const edge2: FlowEdge = {
      id: `e_${newId}_${targetNode.id}_${Date.now().toString(36).slice(-4)}`,
      source: newId,
      target: targetNode.id,
      targetHandle: targetEdge.targetHandle,
      type: 'workflowEdge',
      animated: true,
      label: targetEdge.label,
      data: targetEdge.data,
    };

    const nextEdges = edges
      .filter((e) => e.id !== edgeId)
      .concat([edge1, edge2]);

    set({
      nodes: [...nextNodes, newNode],
      edges: nextEdges,
      selectedNodeId: newId,
    });
    get().persistCurrentProject();
    eventBus.emit('TOAST_NOTIFY', {
      type: 'success',
      message: `Inserted "${newNode.data.label}" into connection`,
    });
  },

  connectNodesById: (sourceId, targetId, label) => {
    if (!sourceId || !targetId || sourceId === sourceId && sourceId === targetId) return;
    const { nodes, edges } = get();
    const sourceNode = nodes.find((n) => n.id === sourceId);
    const targetNode = nodes.find((n) => n.id === targetId);

    const isTargetLoopNode = Boolean(
      targetNode &&
        (targetNode.data.isLoopNode ||
          targetNode.data.iconName === 'loop' ||
          targetNode.data.serviceName?.includes('splitInBatches') ||
          targetNode.data.operation?.startsWith('loop:'))
    );
    const isBackwardToLoop = Boolean(
      isTargetLoopNode &&
        sourceNode &&
        targetNode &&
        sourceNode.position.x > targetNode.position.x - 20
    );

    const exists = edges.some(
      (e) =>
        e.source === sourceId &&
        e.target === targetId &&
        (isBackwardToLoop ? e.targetHandle === 'loop-return' : true)
    );
    if (exists) {
      eventBus.emit('TOAST_NOTIFY', {
        type: 'warning',
        message: 'These two nodes are already connected',
      });
      return;
    }

    get().takeSnapshot();
    const newEdge: FlowEdge = {
      id: `e_${sourceId}_${targetId}_${Date.now().toString(36).slice(-4)}`,
      source: sourceId,
      target: targetId,
      targetHandle: isBackwardToLoop ? 'loop-return' : undefined,
      type: 'workflowEdge',
      animated: true,
      label: label || (isBackwardToLoop ? '↻ next batch' : undefined),
      data: isBackwardToLoop ? { isLoopReturn: true, loopOffset: 96 } : undefined,
    };
    set((state) => ({
      edges: [...state.edges, newEdge],
    }));
    get().persistCurrentProject();
    eventBus.emit('TOAST_NOTIFY', {
      type: 'success',
      message: isBackwardToLoop
        ? 'Wired step back into Loop Node (↻ next batch)'
        : 'Added connection wire between nodes',
    });
  },

  connectNodeToLoopReturn: (sourceNodeId, explicitLoopNodeId) => {
    const { nodes, edges } = get();
    const sourceNode = nodes.find((n) => n.id === sourceNodeId);
    if (!sourceNode) return;

    // Find target Loop node (either explicit, or closest Loop node to the left, or any Loop node)
    const loopNodes = nodes.filter(
      (n) =>
        n.id !== sourceNodeId &&
        (n.data.isLoopNode ||
          n.data.iconName === 'loop' ||
          n.data.serviceName?.includes('splitInBatches') ||
          n.data.operation?.startsWith('loop:'))
    );

    const targetLoopNode = explicitLoopNodeId
      ? loopNodes.find((n) => n.id === explicitLoopNodeId)
      : loopNodes
          .slice()
          .sort((a, b) => {
            const aLeft = a.position.x <= sourceNode.position.x ? 0 : 1;
            const bLeft = b.position.x <= sourceNode.position.x ? 0 : 1;
            if (aLeft !== bLeft) return aLeft - bLeft;
            return (
              Math.abs(sourceNode.position.x - a.position.x) -
              Math.abs(sourceNode.position.x - b.position.x)
            );
          })[0];

    if (!targetLoopNode) {
      eventBus.emit('TOAST_NOTIFY', {
        type: 'warning',
        message: 'Add a Loop Over Items node first to wire a loop return',
      });
      return;
    }

    get().takeSnapshot();

    // Remove existing loop-return edge from this same source if toggling, or replace old return wire on this loop node
    const alreadyConnectedFromThisSource = edges.find(
      (e) =>
        e.source === sourceNodeId &&
        e.target === targetLoopNode.id &&
        e.targetHandle === 'loop-return'
    );

    if (alreadyConnectedFromThisSource) {
      set({
        edges: edges.filter((e) => e.id !== alreadyConnectedFromThisSource.id),
      });
      get().persistCurrentProject();
      eventBus.emit('TOAST_NOTIFY', {
        type: 'info',
        message: `Disconnected ↻ loop-back wire from "${sourceNode.data.label}"`,
      });
      return;
    }

    // Ensure if the Loop node has no 'loop-body' outgoing wire yet, we also wire 'loop-body' to the start of the chain if appropriate
    const hasLoopBodyStart = edges.some(
      (e) => e.source === targetLoopNode.id && e.sourceHandle === 'loop-body'
    );
    const extraForwardEdges: FlowEdge[] = [];
    if (
      !hasLoopBodyStart &&
      !edges.some((e) => e.target === sourceNodeId)
    ) {
      extraForwardEdges.push({
        id: `e_${targetLoopNode.id}_loop_${sourceNodeId}`,
        source: targetLoopNode.id,
        sourceHandle: 'loop-body',
        target: sourceNodeId,
        type: 'workflowEdge',
        animated: true,
        label: 'loop',
      });
    }

    // Replace previous loop-return wire on this Loop node so the new tail node becomes the loop return
    const filteredEdges = edges.filter(
      (e) =>
        !(e.target === targetLoopNode.id && e.targetHandle === 'loop-return')
    );

    const returnEdge: FlowEdge = {
      id: `e_${sourceNodeId}_return_${targetLoopNode.id}_${Date.now().toString(36).slice(-4)}`,
      source: sourceNodeId,
      target: targetLoopNode.id,
      targetHandle: 'loop-return',
      type: 'workflowEdge',
      animated: true,
      label: '↻ next batch',
      data: { isLoopReturn: true, loopOffset: 96 },
    };

    set({
      edges: [...filteredEdges, ...extraForwardEdges, returnEdge],
    });
    get().persistCurrentProject();
    eventBus.emit('TOAST_NOTIFY', {
      type: 'success',
      message: `Wired "${sourceNode.data.label}" ↻ back to "${targetLoopNode.data.label}"`,
    });
  },

  setSelectedNodeId: (id) => set({ selectedNodeId: id }),

  setSwapTargetNodeId: (targetId) => {
    const currentTarget = get().swapTargetNodeId;
    if (currentTarget === targetId) return;

    set((state) => ({
      swapTargetNodeId: targetId,
      nodes: state.nodes.map((node) => {
        const shouldHighlight = node.id === targetId;
        if (Boolean(node.data.isSwapTarget) === shouldHighlight) return node;
        return {
          ...node,
          data: {
            ...node.data,
            isSwapTarget: shouldHighlight,
          },
        };
      }),
    }));
  },

  updateNodeData: (id, partial) => {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...partial } } : n
      ),
    }));
    get().persistCurrentProject();
  },

  deleteNode: (id) => {
    get().takeSnapshot();
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== id),
      edges: state.edges.filter((e) => e.source !== id && e.target !== id),
      selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
    }));
    get().persistCurrentProject();
  },

  duplicateNode: (id) => {
    const sourceNode = get().nodes.find((n) => n.id === id);
    if (!sourceNode) return;
    get().takeSnapshot();
    const newId = `node_${Date.now().toString(36)}`;
    const clonedNode: FlowNode = {
      ...JSON.parse(JSON.stringify(sourceNode)),
      id: newId,
      selected: false,
      position: {
        x: sourceNode.position.x + 40,
        y: sourceNode.position.y + 40,
      },
      data: {
        ...sourceNode.data,
        label: `${sourceNode.data.label} (Copy)`,
        isSwapTarget: false,
      },
    };
    set((state) => ({
      nodes: [...state.nodes, clonedNode],
      selectedNodeId: newId,
    }));
    get().persistCurrentProject();
  },

  addNodeFromLibrary: (template, position) => {
    const { platform, nodes, selectedNodeId, edges } = get();

    // If the user clicked an AI sub-node (LLM, Memory, MCP/Tool, Parser) in the library
    // while an AI Agent node is selected on canvas, automatically wire it to that AI Agent's bottom slot!
    const selectedNode = selectedNodeId
      ? nodes.find((n) => n.id === selectedNodeId && n.type !== 'resizableGroup')
      : null;

    if (
      !position &&
      template.aiSubNodeType &&
      selectedNode &&
      selectedNode.data.role === 'ai' &&
      !selectedNode.data.aiSubNodeType
    ) {
      get().attachAiSubNode(selectedNode.id, template.aiSubNodeType, template);
      return;
    }

    get().takeSnapshot();
    const newId = `node_${Date.now().toString(36)}`;
    const isAiAgentHub = template.role === 'ai' && !template.aiSubNodeType;
    const isLoop = Boolean(template.isLoopNode || template.iconName === 'loop');
    const isSubNode = Boolean(template.aiSubNodeType);

    const pos =
      position ||
      (selectedNode
        ? {
            x:
              selectedNode.position.x +
              (selectedNode.data.role === 'ai' && !selectedNode.data.aiSubNodeType
                ? 290
                : selectedNode.data.isLoopNode || selectedNode.data.iconName === 'loop'
                ? 260
                : 175),
            y: selectedNode.position.y,
          }
        : {
            x: 480 + (nodes.filter((n) => n.type !== 'resizableGroup').length % 6) * 185,
            y: 150 + Math.floor(nodes.filter((n) => n.type !== 'resizableGroup').length / 6) * 160,
          });

    const newNode: FlowNode = {
      id: newId,
      type: 'workflowNode',
      position: pos,
      zIndex: 10,
      style: isAiAgentHub
        ? { width: 224, height: 86 }
        : isLoop
        ? { width: 196, height: 86 }
        : isSubNode
        ? { width: 68, height: 68 }
        : { width: 76, height: 76 },
      data: {
        label: template.defaultLabel[platform] || template.defaultLabel.n8n,
        subtitle: template.operation || template.subtitle,
        role: template.role,
        aiSubNodeType: template.aiSubNodeType,
        isLoopNode: isLoop,
        loopConfig: isLoop
          ? template.defaultLoopConfig || {
              mode: 'batch',
              batchSize: 10,
              arrayField: 'items',
              maxIterations: 100,
              pauseMs: 0,
            }
          : undefined,
        nodeGroup: template.nodeGroup,
        appPlatform: template.appPlatform,
        operation: template.operation,
        platform,
        serviceName: template.defaultService[platform] || template.defaultService.n8n,
        iconName: template.iconName,
        systemPrompt: template.defaultSystemPrompt || '',
        endpointUrl: template.defaultEndpointUrl || '',
        httpMethod: 'POST',
        payloadSchema: template.defaultPayloadSchema || '',
        roiNotes: '',
        estimatedTimeSavedMins: template.estimatedTimeSavedMins,
      },
    };

    const nextEdges =
      !position && selectedNode && !isSubNode
        ? [
            ...edges,
            {
              id: `e_${selectedNode.id}_${newId}`,
              source: selectedNode.id,
              target: newId,
              type: 'workflowEdge',
              animated: true,
            },
          ]
        : edges;

    set((state) => ({
      nodes: [...state.nodes, newNode],
      edges: nextEdges,
      selectedNodeId: null,
    }));
    get().persistCurrentProject();
  },

  appendConnectedNode: (sourceNodeId, template) => {
    const { nodes, edges, platform } = get();
    const sourceNode = nodes.find((n) => n.id === sourceNodeId);
    if (!sourceNode) return;

    const isSourceLoop = Boolean(
      sourceNode.data.isLoopNode ||
        sourceNode.data.iconName === 'loop' ||
        sourceNode.data.serviceName?.includes('splitInBatches')
    );
    if (isSourceLoop && !template) {
      get().appendLoopBodyNode(sourceNodeId);
      return;
    }

    get().takeSnapshot();
    const tpl =
      template ||
      NODE_LIBRARY_TEMPLATES.find((t) => t.id === 'core_http_request') ||
      NODE_LIBRARY_TEMPLATES[0];

    const newId = `node_${Date.now().toString(36)}`;
    const existingOutgoingCount = edges.filter(
      (e) => e.source === sourceNodeId && !e.sourceHandle
    ).length;
    const isSourceAiHub =
      sourceNode.data.role === 'ai' && !sourceNode.data.aiSubNodeType;
    const isTargetAiHub = tpl.role === 'ai' && !tpl.aiSubNodeType;
    const isTargetLoop = Boolean(tpl.isLoopNode || tpl.iconName === 'loop');

    const newNode: FlowNode = {
      id: newId,
      type: 'workflowNode',
      position: {
        x: sourceNode.position.x + (isSourceAiHub ? 290 : isSourceLoop ? 260 : 175),
        y: sourceNode.position.y + existingOutgoingCount * 140,
      },
      zIndex: 10,
      style: isTargetAiHub
        ? { width: 224, height: 86 }
        : isTargetLoop
        ? { width: 196, height: 86 }
        : { width: 76, height: 76 },
      data: {
        label: tpl.defaultLabel[platform] || tpl.defaultLabel.n8n,
        subtitle: tpl.operation || tpl.subtitle,
        role: tpl.role,
        aiSubNodeType: tpl.aiSubNodeType,
        isLoopNode: isTargetLoop,
        loopConfig: isTargetLoop
          ? tpl.defaultLoopConfig || {
              mode: 'batch',
              batchSize: 10,
              arrayField: 'items',
              maxIterations: 100,
              pauseMs: 0,
            }
          : undefined,
        nodeGroup: tpl.nodeGroup,
        appPlatform: tpl.appPlatform,
        operation: tpl.operation,
        platform,
        serviceName: tpl.defaultService[platform] || tpl.defaultService.n8n,
        iconName: tpl.iconName,
        systemPrompt: tpl.defaultSystemPrompt || '',
        endpointUrl: tpl.defaultEndpointUrl || '',
        httpMethod: 'POST',
        payloadSchema: tpl.defaultPayloadSchema || '',
        estimatedTimeSavedMins: tpl.estimatedTimeSavedMins,
      },
    };

    const newEdge: FlowEdge = {
      id: `e_${sourceNodeId}_${newId}`,
      source: sourceNodeId,
      target: newId,
      type: 'workflowEdge',
      animated: true,
    };

    const nextNodes = [...get().nodes, newNode];
    const nextEdges = [...get().edges, newEdge];

    set({
      nodes:
        get().canvasMode === 'mindmap'
          ? computeMindMapLayout(nextNodes, nextEdges)
          : nextNodes,
      edges: nextEdges,
      selectedNodeId: null,
    });
    get().persistCurrentProject();
  },

  appendLoopBodyNode: (loopNodeId, template) => {
    const { nodes, edges, platform } = get();
    const loopNode = nodes.find((n) => n.id === loopNodeId);
    if (!loopNode) return;

    get().takeSnapshot();
    const tpl =
      template ||
      NODE_LIBRARY_TEMPLATES.find((t) => t.id === 'core_http_request') ||
      NODE_LIBRARY_TEMPLATES[0];

    const newId = `loop_step_${Date.now().toString(36).slice(-4)}`;

    // Check if there is already a loop-return wire coming back into this Loop Node
    const existingReturnEdge = edges.find(
      (e) => e.target === loopNodeId && e.targetHandle === 'loop-return'
    );
    const previousTailNode = existingReturnEdge
      ? nodes.find((n) => n.id === existingReturnEdge.source)
      : null;

    const pos: XYPosition = previousTailNode
      ? {
          x: previousTailNode.position.x + 170,
          y: previousTailNode.position.y,
        }
      : {
          x: loopNode.position.x + 255,
          y: loopNode.position.y + 60,
        };

    const newNode: FlowNode = {
      id: newId,
      type: 'workflowNode',
      position: pos,
      zIndex: 10,
      style: { width: 76, height: 76 },
      data: {
        label: tpl.defaultLabel[platform] || tpl.defaultLabel.n8n,
        subtitle: tpl.operation || tpl.subtitle,
        role: tpl.role,
        nodeGroup: tpl.nodeGroup,
        appPlatform: tpl.appPlatform,
        operation: tpl.operation,
        platform,
        serviceName: tpl.defaultService[platform] || tpl.defaultService.n8n,
        iconName: tpl.iconName,
        systemPrompt: tpl.defaultSystemPrompt || '',
        endpointUrl: tpl.defaultEndpointUrl || '',
        httpMethod: 'POST',
        payloadSchema: tpl.defaultPayloadSchema || '',
        estimatedTimeSavedMins: tpl.estimatedTimeSavedMins,
      },
    };

    const filteredEdges = existingReturnEdge
      ? edges.filter((e) => e.id !== existingReturnEdge.id)
      : edges;

    const forwardEdge: FlowEdge = previousTailNode
      ? {
          id: `e_${previousTailNode.id}_${newId}`,
          source: previousTailNode.id,
          target: newId,
          type: 'workflowEdge',
          animated: true,
        }
      : {
          id: `e_${loopNodeId}_loop_${newId}`,
          source: loopNodeId,
          sourceHandle: 'loop-body',
          target: newId,
          type: 'workflowEdge',
          animated: true,
          label: 'loop',
        };

    const returnLoopEdge: FlowEdge = {
      id: `e_${newId}_return_${loopNodeId}`,
      source: newId,
      target: loopNodeId,
      targetHandle: 'loop-return',
      type: 'workflowEdge',
      animated: true,
      label: '↻ next batch',
    };

    const nextNodes = [...nodes, newNode];
    const nextEdges = [...filteredEdges, forwardEdge, returnLoopEdge];

    set({
      nodes:
        get().canvasMode === 'mindmap'
          ? computeMindMapLayout(nextNodes, nextEdges)
          : nextNodes,
      edges: nextEdges,
    });
    get().persistCurrentProject();
    eventBus.emit('TOAST_NOTIFY', {
      type: 'success',
      message: `Added "${newNode.data.label}" to loop body with ↻ return loop wire`,
    });
  },

  appendLoopDoneNode: (loopNodeId, template) => {
    const { nodes, edges, platform } = get();
    const loopNode = nodes.find((n) => n.id === loopNodeId);
    if (!loopNode) return;

    get().takeSnapshot();
    const tpl =
      template ||
      NODE_LIBRARY_TEMPLATES.find((t) => t.id === 'core_set_edit_fields') ||
      NODE_LIBRARY_TEMPLATES[0];

    const newId = `done_step_${Date.now().toString(36).slice(-4)}`;
    const existingDoneCount = edges.filter(
      (e) => e.source === loopNodeId && e.sourceHandle === 'loop-done'
    ).length;

    const newNode: FlowNode = {
      id: newId,
      type: 'workflowNode',
      position: {
        x: loopNode.position.x + 255,
        y: loopNode.position.y - 65 - existingDoneCount * 110,
      },
      zIndex: 10,
      style: { width: 76, height: 76 },
      data: {
        label: tpl.defaultLabel[platform] || tpl.defaultLabel.n8n,
        subtitle: tpl.operation || tpl.subtitle,
        role: tpl.role,
        nodeGroup: tpl.nodeGroup,
        appPlatform: tpl.appPlatform,
        operation: tpl.operation,
        platform,
        serviceName: tpl.defaultService[platform] || tpl.defaultService.n8n,
        iconName: tpl.iconName,
        systemPrompt: tpl.defaultSystemPrompt || '',
        endpointUrl: tpl.defaultEndpointUrl || '',
        httpMethod: 'POST',
        payloadSchema: tpl.defaultPayloadSchema || '',
        estimatedTimeSavedMins: tpl.estimatedTimeSavedMins,
      },
    };

    const doneEdge: FlowEdge = {
      id: `e_${loopNodeId}_done_${newId}`,
      source: loopNodeId,
      sourceHandle: 'loop-done',
      target: newId,
      type: 'workflowEdge',
      animated: true,
      label: 'done',
    };

    const nextNodes = [...nodes, newNode];
    const nextEdges = [...edges, doneEdge];

    set({
      nodes:
        get().canvasMode === 'mindmap'
          ? computeMindMapLayout(nextNodes, nextEdges)
          : nextNodes,
      edges: nextEdges,
    });
    get().persistCurrentProject();
    eventBus.emit('TOAST_NOTIFY', {
      type: 'success',
      message: `Added "${newNode.data.label}" to Loop Done branch`,
    });
  },

  addLoopingNodeQuick: () => {
    const loopTpl = NODE_LIBRARY_TEMPLATES.find(
      (t) => t.id === 'core_loop_batches'
    );
    if (loopTpl) {
      get().addNodeFromLibrary(loopTpl);
      eventBus.emit('TOAST_NOTIFY', {
        type: 'success',
        message: 'Added Loop Over Items (Split in Batches) node — click + on loop or done ports to wire steps',
      });
    }
  },

  attachAiSubNode: (agentNodeId, slot, template) => {
    const { nodes, edges, platform } = get();
    const agentNode = nodes.find((n) => n.id === agentNodeId);
    if (!agentNode) return;

    get().takeSnapshot();
    const handleId = `ai-${slot}`;
    const existingOnSlot = edges.filter(
      (e) => e.source === agentNodeId && e.sourceHandle === handleId
    ).length;

    const slotOffsetMap: Record<AiSubNodeType, number> = {
      llm: -40,
      memory: 44,
      tool: 128,
      parser: 212,
    };

    const baseOffset = slotOffsetMap[slot] ?? 0;
    const xPos =
      agentNode.position.x + baseOffset + existingOnSlot * 84;
    const yPos = agentNode.position.y + 160;

    const newId = `sub_${slot}_${Date.now().toString(36).slice(-4)}`;
    const newSubNode: FlowNode = {
      id: newId,
      type: 'workflowNode',
      position: { x: xPos, y: yPos },
      zIndex: 10,
      style: { width: 68, height: 68 },
      data: {
        label: template.defaultLabel[platform] || template.defaultLabel.n8n,
        subtitle: template.operation || template.subtitle,
        role: 'ai',
        aiSubNodeType: slot,
        nodeGroup: template.nodeGroup,
        appPlatform: template.appPlatform,
        operation: template.operation,
        platform,
        serviceName: template.defaultService[platform] || template.defaultService.n8n,
        iconName: template.iconName,
        systemPrompt: template.defaultSystemPrompt || '',
        endpointUrl: template.defaultEndpointUrl || '',
        httpMethod: 'POST',
        payloadSchema: template.defaultPayloadSchema || '',
        estimatedTimeSavedMins: template.estimatedTimeSavedMins,
      },
    };

    const newEdge: FlowEdge = {
      id: `e_${agentNodeId}_${handleId}_${newId}`,
      source: agentNodeId,
      sourceHandle: handleId,
      target: newId,
      targetHandle: 'sub-top',
      type: 'workflowEdge',
      animated: true,
      data: { isAiSubNode: true, slot },
    };

    const nextNodes = [...get().nodes, newSubNode];
    const nextEdges = [...get().edges, newEdge];

    set({
      nodes:
        get().canvasMode === 'mindmap'
          ? computeMindMapLayout(nextNodes, nextEdges)
          : nextNodes,
      edges: nextEdges,
    });
    get().persistCurrentProject();
    eventBus.emit('TOAST_NOTIFY', {
      type: 'success',
      message: `Connected "${newSubNode.data.label}" to AI Agent (${slot.toUpperCase()})`,
    });
  },

  addGroupFrame: (position) => {
    get().takeSnapshot();
    const { platform } = get();
    const newId = `sticky_${Date.now().toString(36)}`;
    const newGroup: FlowNode = {
      id: newId,
      type: 'resizableGroup',
      position: position || { x: 40, y: 50 },
      zIndex: -10,
      style: { width: 360, height: 340 },
      data: {
        label: 'Workflow Documentation Note',
        subtitle:
          'This workflow automates multi-step processing.\n\nWorkflow Steps:\n1. Trigger — Starts the workflow.\n2. Fetch / Enrich — Pulls external data.\n3. AI Agent — Summarizes & routes items.\n4. App Dispatch — Sends notifications & updates records.',
        role: 'group',
        platform,
        serviceName: 'Sticky Note',
        iconName: 'layers',
        groupColor: 'amber',
      },
    };
    set((state) => ({
      nodes: normalizeNodeLayerOrder([newGroup, ...state.nodes]),
    }));
    get().persistCurrentProject();
  },

  sendNoteToBack: (id) => {
    get().takeSnapshot();
    set((state) => {
      const target = state.nodes.find((n) => n.id === id);
      if (!target) return state;
      const updatedTarget: FlowNode = {
        ...target,
        zIndex: -10,
        selected: false,
      };
      const others = state.nodes.filter((n) => n.id !== id);
      return {
        nodes: normalizeNodeLayerOrder([updatedTarget, ...others]),
        selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
      };
    });
    get().persistCurrentProject();
    eventBus.emit('TOAST_NOTIFY', {
      type: 'info',
      message: 'Sent Sticky Note to back (behind workflow nodes)',
    });
  },

  bringNoteToFront: (id) => {
    get().takeSnapshot();
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === id ? { ...n, zIndex: 25 } : n
      ),
    }));
    get().persistCurrentProject();
    eventBus.emit('TOAST_NOTIFY', {
      type: 'info',
      message: 'Brought Sticky Note to front',
    });
  },

  executeCanvasNodeSwap: (draggedNodeId, targetNodeId, originalDraggedPos) => {
    const { nodes, edges } = get();
    const draggedNode = nodes.find((n) => n.id === draggedNodeId);
    const targetNode = nodes.find((n) => n.id === targetNodeId);
    if (!draggedNode || !targetNode) return;

    get().takeSnapshot();
    const result = swapCanvasNodesAndEdges(
      nodes,
      edges,
      draggedNodeId,
      targetNodeId,
      originalDraggedPos
    );
    set({
      nodes: result.nodes,
      edges: result.edges,
      swapTargetNodeId: null,
    });
    get().persistCurrentProject();

    eventBus.emit('NODE_SWAPPED', {
      sourceLabel: draggedNode.data.label,
      targetLabel: targetNode.data.label,
    });
    eventBus.emit('TOAST_NOTIFY', {
      type: 'success',
      message: `Swapped "${draggedNode.data.label}" ↔ "${targetNode.data.label}" & re-wired connections`,
    });
  },

  executeLibraryNodeReplace: (targetNodeId, template) => {
    const { nodes, platform } = get();
    const targetNode = nodes.find((n) => n.id === targetNodeId);
    if (!targetNode) return;

    get().takeSnapshot();
    const oldLabel = targetNode.data.label;
    const newLabel = template.defaultLabel[platform] || template.defaultLabel.n8n;
    const updatedNodes = replaceNodeFromLibraryTemplate(
      nodes,
      targetNodeId,
      template,
      platform
    );

    set({
      nodes: updatedNodes,
      swapTargetNodeId: null,
      selectedNodeId: targetNodeId,
    });
    get().persistCurrentProject();

    eventBus.emit('NODE_REPLACED_FROM_LIBRARY', { oldLabel, newLabel });
    eventBus.emit('TOAST_NOTIFY', {
      type: 'success',
      message: `Replaced "${oldLabel}" with "${newLabel}" (all edges preserved)`,
    });
  },

  switchPlatform: (targetPlatform) => {
    const prevPlatform = get().platform;
    if (prevPlatform === targetPlatform) return;

    get().takeSnapshot();
    const translatedNodes = translateNodesToPlatform(get().nodes, targetPlatform);
    set({
      platform: targetPlatform,
      nodes: translatedNodes,
    });
    get().persistCurrentProject();

    eventBus.emit('PLATFORM_TRANSLATED', {
      from: prevPlatform,
      to: targetPlatform,
      count: translatedNodes.filter((n) => n.type !== 'resizableGroup').length,
    });
    eventBus.emit('TOAST_NOTIFY', {
      type: 'info',
      message: `Translated Core & App modules to ${targetPlatform.toUpperCase()}`,
    });
  },

  runAutoLayout: (direction) => {
    get().takeSnapshot();
    if (get().canvasMode === 'mindmap') {
      const mindMapNodes = computeMindMapLayout(get().nodes, get().edges);
      set({ nodes: mindMapNodes });
      get().persistCurrentProject();
      eventBus.emit('TOAST_NOTIFY', {
        type: 'info',
        message: 'Re-aligned Mind Map topic tree layout',
      });
      return;
    }

    const dir = direction || get().aiSettings.layoutDirection || 'LR';
    const layoutedNodes = computeAutoLayout(get().nodes, get().edges, dir);
    set({ nodes: layoutedNodes });
    get().persistCurrentProject();
    eventBus.emit('TOAST_NOTIFY', {
      type: 'info',
      message: `Applied ${dir === 'LR' ? 'Horizontal (Left → Right)' : 'Vertical (Top → Bottom)'} auto-layout`,
    });
  },

  applyGeneratedBlueprint: (title, summary, newNodes, newEdges, appendMode) => {
    get().takeSnapshot();
    const { nodes, edges, aiSettings, canvasMode } = get();

    let combinedNodes: FlowNode[] = newNodes;
    let combinedEdges: FlowEdge[] = newEdges.map((e) => ({
      ...e,
      type: 'workflowEdge',
    }));

    if (appendMode && nodes.length > 0) {
      const suffix = `_${Date.now().toString(36).slice(-4)}`;
      const remappedNodes = newNodes.map((n) => ({
        ...n,
        id: `${n.id}${suffix}`,
        position: { x: n.position.x + 80, y: n.position.y + 340 },
      }));
      const remappedEdges = newEdges.map((e) => ({
        ...e,
        id: `${e.id}${suffix}`,
        source: `${e.source}${suffix}`,
        target: `${e.target}${suffix}`,
        type: 'workflowEdge',
      }));
      combinedNodes = [...nodes, ...remappedNodes];
      combinedEdges = [...edges, ...remappedEdges];
    }

    const finalNodes =
      canvasMode === 'mindmap'
        ? computeMindMapLayout(combinedNodes, combinedEdges)
        : aiSettings.autoLayoutOnGenerate
        ? computeAutoLayout(combinedNodes, combinedEdges, aiSettings.layoutDirection)
        : combinedNodes;

    set({
      projectName: appendMode ? get().projectName : title,
      projectDescription: summary || get().projectDescription,
      nodes: finalNodes,
      edges: combinedEdges,
      selectedNodeId: null,
    });
    get().persistCurrentProject();
  },

  selectProject: (projectId) => {
    const target = get().projects.find((p) => p.id === projectId);
    if (!target) return;
    const isMindMap = get().canvasMode === 'mindmap';
    const posMap: Record<string, XYPosition> = {};
    target.nodes.forEach((n) => {
      posMap[n.id] = { ...n.position };
    });

    set({
      activeProjectId: target.id,
      projectName: target.name,
      projectDescription: target.description,
      platform: target.platform,
      savedWorkflowPositions: posMap,
      nodes: isMindMap
        ? computeMindMapLayout(target.nodes, target.edges)
        : target.nodes,
      edges: sanitizeProjectEdges(target.edges),
      selectedNodeId: null,
      past: [],
      future: [],
    });
  },

  createNewProject: (name, platform) => {
    const targetPlatform = platform || get().platform || 'n8n';
    const newProj: WorkflowProject = {
      id: `proj_${Date.now().toString(36)}`,
      name: name || 'Untitled AI Automation Blueprint',
      description: 'Custom multi-step AI workflow blueprint',
      platform: targetPlatform,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      nodes: [
        {
          id: 'node_start_1',
          type: 'workflowNode',
          position: { x: 180, y: 165 },
          zIndex: 10,
          style: { width: 76, height: 76 },
          data: {
            label: 'Webhook Trigger',
            subtitle: 'POST /start',
            role: 'trigger',
            nodeGroup: 'core',
            operation: 'webhook: POST',
            platform: targetPlatform,
            serviceName: 'n8n-nodes-base.webhook',
            iconName: 'webhook',
            endpointUrl: 'https://hooks.agency.io/webhook/start',
            httpMethod: 'POST',
            estimatedTimeSavedMins: 3,
          },
        },
        {
          id: 'node_start_2',
          type: 'workflowNode',
          position: { x: 360, y: 165 },
          zIndex: 10,
          style: { width: 76, height: 76 },
          data: {
            label: 'AI Agent',
            subtitle: 'LangChain Agent',
            role: 'ai',
            nodeGroup: 'core',
            operation: 'agent: toolsAgent',
            platform: targetPlatform,
            serviceName: '@n8n/n8n-nodes-langchain.agent',
            iconName: 'bot',
            systemPrompt: 'Analyze the incoming webhook data and return structured routing JSON.',
            estimatedTimeSavedMins: 10,
          },
        },
      ],
      edges: [
        {
          id: 'edge_start_1_2',
          source: 'node_start_1',
          target: 'node_start_2',
          type: 'workflowEdge',
          animated: true,
          label: '1 item',
        },
      ],
    };

    set((state) => ({
      projects: [newProj, ...state.projects],
      activeProjectId: newProj.id,
      projectName: newProj.name,
      projectDescription: newProj.description,
      platform: newProj.platform,
      nodes: newProj.nodes,
      edges: sanitizeProjectEdges(newProj.edges),
      selectedNodeId: null,
      past: [],
      future: [],
    }));
    saveProjectToDb(newProj);
  },

  renameActiveProject: (name) => {
    set({ projectName: name });
    get().persistCurrentProject();
  },

  deleteProject: async (projectId) => {
    const { projects, activeProjectId } = get();
    if (projects.length <= 1) return;
    await deleteProjectFromDb(projectId);
    const remaining = projects.filter((p) => p.id !== projectId);
    if (activeProjectId === projectId) {
      const next = remaining[0];
      set({
        projects: remaining,
        activeProjectId: next.id,
        projectName: next.name,
        projectDescription: next.description,
        platform: next.platform,
        nodes: next.nodes,
        edges: sanitizeProjectEdges(next.edges),
        selectedNodeId: null,
      });
    } else {
      set({ projects: remaining });
    }
  },

  importProjectObject: (project) => {
    const posMap: Record<string, XYPosition> = {};
    project.nodes.forEach((n) => {
      posMap[n.id] = { ...n.position };
    });
    const stickyCount = project.nodes.filter((n) => n.type === 'resizableGroup').length;
    const stepCount = project.nodes.filter((n) => n.type !== 'resizableGroup').length;

    const sanitizedEdges = sanitizeProjectEdges(project.edges);

    set((state) => ({
      projects: [{ ...project, edges: sanitizedEdges }, ...state.projects],
      activeProjectId: project.id,
      projectName: project.name,
      projectDescription: project.description,
      platform: project.platform,
      canvasMode: 'workflow',
      savedWorkflowPositions: posMap,
      nodes: project.nodes,
      edges: sanitizedEdges,
      selectedNodeId: null,
      past: [],
      future: [],
    }));
    saveProjectToDb({ ...project, edges: sanitizedEdges });
    eventBus.emit('TOAST_NOTIFY', {
      type: 'success',
      message: `Imported "${project.name}" (${stepCount} steps${
        stickyCount > 0 ? `, ${stickyCount} sticky note${stickyCount === 1 ? '' : 's'}` : ''
      })`,
    });
  },

  setIsLightMode: (val) => set({ isLightMode: val }),

  updateAiSettings: (partial) => {
    const updated = { ...get().aiSettings, ...partial };
    set({ aiSettings: updated });
    saveAiSettings(updated);
  },

  setIsGeneratingAi: (val) => set({ isGeneratingAi: val }),
  setIsSettingsModalOpen: (val) => set({ isSettingsModalOpen: val }),
  setIsSowModalOpen: (val) => set({ isSowModalOpen: val }),

  persistCurrentProject: () => {
    const {
      activeProjectId,
      projectName,
      projectDescription,
      platform,
      nodes,
      edges,
      projects,
    } = get();

    const existing = projects.find((p) => p.id === activeProjectId);
    const updatedProject: WorkflowProject = {
      ...(existing || {}),
      id: activeProjectId,
      name: projectName,
      description: projectDescription,
      platform,
      createdAt: existing?.createdAt || Date.now(),
      updatedAt: Date.now(),
      nodes,
      edges,
      rawSourceFormat: existing?.rawSourceFormat,
      rawTopLevelMeta: existing?.rawTopLevelMeta,
    };

    const nextProjects = projects.some((p) => p.id === activeProjectId)
      ? projects.map((p) => (p.id === activeProjectId ? updatedProject : p))
      : [updatedProject, ...projects];

    set({ projects: nextProjects });
    saveProjectToDb(updatedProject);
  },
}));
