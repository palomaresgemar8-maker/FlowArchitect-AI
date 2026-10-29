import type { XYPosition } from '@xyflow/react';
import type {
  FlowEdge,
  FlowNode,
  LibraryNodeTemplate,
  PlatformType,
} from '../types/workflow';

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

function getNodeBoundingBox(node: FlowNode): BoundingBox {
  const width =
    typeof node.style?.width === 'number'
      ? node.style.width
      : typeof node.measured?.width === 'number'
      ? node.measured.width
      : 76;
  const height =
    typeof node.style?.height === 'number'
      ? node.style.height
      : typeof node.measured?.height === 'number'
      ? node.measured.height
      : 76;

  return {
    x: node.position.x,
    y: node.position.y,
    width,
    height,
  };
}

function computeIntersectionRatio(boxA: BoundingBox, boxB: BoundingBox): number {
  const xOverlap = Math.max(
    0,
    Math.min(boxA.x + boxA.width, boxB.x + boxB.width) - Math.max(boxA.x, boxB.x)
  );
  const yOverlap = Math.max(
    0,
    Math.min(boxA.y + boxA.height, boxB.y + boxB.height) - Math.max(boxA.y, boxB.y)
  );
  const intersectionArea = xOverlap * yOverlap;
  const minArea = Math.min(boxA.width * boxA.height, boxB.width * boxB.height);
  if (minArea <= 0) return 0;
  return intersectionArea / minArea;
}

/**
 * Finds the best overlapping workflow node when dragging an existing node on canvas.
 */
export function findIntersectingTargetNode(
  draggedNode: FlowNode,
  allNodes: FlowNode[],
  threshold = 0.32
): FlowNode | null {
  if (draggedNode.type === 'resizableGroup') return null;

  const draggedBox = getNodeBoundingBox(draggedNode);
  let bestTarget: FlowNode | null = null;
  let bestRatio = threshold;

  for (const candidate of allNodes) {
    if (candidate.id === draggedNode.id) continue;
    if (candidate.type === 'resizableGroup') continue;

    const candidateBox = getNodeBoundingBox(candidate);
    const ratio = computeIntersectionRatio(draggedBox, candidateBox);
    if (ratio >= bestRatio) {
      bestRatio = ratio;
      bestTarget = candidate;
    }
  }

  return bestTarget;
}

/**
 * Finds a workflow node under a specific canvas flow coordinate (used when dropping a node from the Sidebar Library).
 */
export function findNodeAtCanvasPoint(
  point: XYPosition,
  allNodes: FlowNode[]
): FlowNode | null {
  for (let i = allNodes.length - 1; i >= 0; i--) {
    const candidate = allNodes[i];
    if (candidate.type === 'resizableGroup') continue;
    const box = getNodeBoundingBox(candidate);
    if (
      point.x >= box.x &&
      point.x <= box.x + box.width &&
      point.y >= box.y &&
      point.y <= box.y + box.height
    ) {
      return candidate;
    }
  }
  return null;
}

/**
 * Swaps two canvas nodes' positions AND re-wires their incoming and outgoing edges
 * so that Node A takes Node B's slot in the workflow pipeline and Node B takes Node A's slot.
 */
export function swapCanvasNodesAndEdges(
  nodes: FlowNode[],
  edges: FlowEdge[],
  draggedNodeId: string,
  targetNodeId: string,
  originalDraggedPos: XYPosition
): { nodes: FlowNode[]; edges: FlowEdge[] } {
  const draggedNode = nodes.find((n) => n.id === draggedNodeId);
  const targetNode = nodes.find((n) => n.id === targetNodeId);

  if (!draggedNode || !targetNode) {
    return { nodes, edges };
  }

  const targetPos = { ...targetNode.position };

  const updatedNodes = nodes.map((node) => {
    if (node.id === draggedNodeId) {
      return {
        ...node,
        position: targetPos,
        data: { ...node.data, isSwapTarget: false },
      };
    }
    if (node.id === targetNodeId) {
      return {
        ...node,
        position: { ...originalDraggedPos },
        data: { ...node.data, isSwapTarget: false },
      };
    }
    if (node.data.isSwapTarget) {
      return {
        ...node,
        data: { ...node.data, isSwapTarget: false },
      };
    }
    return node;
  });

  const updatedEdges = edges.map((edge) => {
    let newSource = edge.source;
    let newTarget = edge.target;

    if (
      (edge.source === draggedNodeId && edge.target === targetNodeId) ||
      (edge.source === targetNodeId && edge.target === draggedNodeId)
    ) {
      newSource = edge.target;
      newTarget = edge.source;
    } else {
      if (edge.source === draggedNodeId) newSource = targetNodeId;
      else if (edge.source === targetNodeId) newSource = draggedNodeId;

      if (edge.target === draggedNodeId) newTarget = targetNodeId;
      else if (edge.target === targetNodeId) newTarget = draggedNodeId;
    }

    return {
      ...edge,
      source: newSource,
      target: newTarget,
    };
  });

  return { nodes: updatedNodes, edges: updatedEdges };
}

/**
 * Replaces an existing canvas node with a new template dragged from the sidebar,
 * keeping its exact position, custom resized dimensions, and 100% of incoming/outgoing edges.
 */
export function replaceNodeFromLibraryTemplate(
  nodes: FlowNode[],
  targetNodeId: string,
  template: LibraryNodeTemplate,
  platform: PlatformType
): FlowNode[] {
  return nodes.map((node) => {
    if (node.id !== targetNodeId) {
      return node.data.isSwapTarget
        ? { ...node, data: { ...node.data, isSwapTarget: false } }
        : node;
    }

    const isAiAgentHub = template.role === 'ai' && !template.aiSubNodeType;
    const isSubNode = Boolean(template.aiSubNodeType);
    const isLoop = Boolean(template.isLoopNode || template.iconName === 'loop');

    return {
      ...node,
      style: isAiAgentHub
        ? { width: 224, height: 86 }
        : isLoop
        ? { width: 196, height: 86 }
        : isSubNode
        ? { width: 68, height: 68 }
        : { width: 76, height: 76 },
      data: {
        ...node.data,
        label: template.defaultLabel[platform] || template.defaultLabel.n8n,
        subtitle: template.subtitle,
        role: template.role,
        aiSubNodeType: template.aiSubNodeType,
        isLoopNode: isLoop,
        loopConfig: isLoop
          ? template.defaultLoopConfig ||
            node.data.loopConfig || {
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
        systemPrompt: template.defaultSystemPrompt || node.data.systemPrompt || '',
        endpointUrl: template.defaultEndpointUrl || node.data.endpointUrl || '',
        payloadSchema: template.defaultPayloadSchema || node.data.payloadSchema || '',
        estimatedTimeSavedMins: template.estimatedTimeSavedMins,
        isSwapTarget: false,
      },
    };
  });
}
