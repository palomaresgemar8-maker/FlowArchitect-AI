import dagre from 'dagre';
import type { FlowEdge, FlowNode } from '../types/workflow';

export function computeAutoLayout(
  nodes: FlowNode[],
  edges: FlowEdge[],
  direction: 'LR' | 'TB' = 'LR'
): FlowNode[] {
  const groupNodes = nodes.filter((n) => n.type === 'resizableGroup');
  const subNodes = nodes.filter(
    (n) => n.type !== 'resizableGroup' && Boolean(n.data.aiSubNodeType)
  );
  const workflowNodes = nodes.filter(
    (n) => n.type !== 'resizableGroup' && !n.data.aiSubNodeType
  );

  if (workflowNodes.length === 0) return nodes;

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: direction,
    nodesep: direction === 'LR' ? 75 : 75,
    ranksep: direction === 'LR' ? 105 : 105,
    marginx: 460,
    marginy: 130,
  });

  workflowNodes.forEach((node) => {
    const isAiHub = node.data.role === 'ai' && !node.data.aiSubNodeType;
    const isLoop = Boolean(
      node.data.isLoopNode ||
        node.data.iconName === 'loop' ||
        node.data.serviceName?.includes('splitInBatches')
    );
    const width = isAiHub ? 224 : isLoop ? 196 : 76;
    const height = isAiHub || isLoop ? 86 : 76;

    g.setNode(node.id, { width, height });
  });

  edges.forEach((edge) => {
    const isLoopBack =
      edge.targetHandle === 'loop-return' ||
      String(edge.label || '')
        .toLowerCase()
        .includes('next batch') ||
      String(edge.label || '')
        .toLowerCase()
        .includes('loop back');
    if (isLoopBack) return;

    if (g.hasNode(edge.source) && g.hasNode(edge.target)) {
      g.setEdge(edge.source, edge.target);
    }
  });

  dagre.layout(g);

  const layoutedWorkflowNodes = workflowNodes.map((node) => {
    const nodeWithPos = g.node(node.id);
    if (!nodeWithPos) return node;

    const isAiHub = node.data.role === 'ai' && !node.data.aiSubNodeType;
    const isLoop = Boolean(
      node.data.isLoopNode ||
        node.data.iconName === 'loop' ||
        node.data.serviceName?.includes('splitInBatches')
    );
    const width = nodeWithPos.width || (isAiHub ? 224 : isLoop ? 196 : 76);
    const height = nodeWithPos.height || (isAiHub || isLoop ? 86 : 76);

    return {
      ...node,
      position: {
        x: Math.round((nodeWithPos.x - width / 2) / 15) * 15,
        y: Math.round((nodeWithPos.y - height / 2) / 15) * 15,
      },
    };
  });

  // Position AI Sub-Nodes neatly below their connected AI Agent Hub
  const layoutedMap = new Map(layoutedWorkflowNodes.map((n) => [n.id, n]));
  const agentChildCounter = new Map<string, number>();

  const layoutedSubNodes = subNodes.map((sub) => {
    const parentEdge = edges.find(
      (e) =>
        (e.target === sub.id && layoutedMap.has(e.source)) ||
        (e.source === sub.id && layoutedMap.has(e.target))
    );
    const parentId = parentEdge
      ? layoutedMap.has(parentEdge.source)
        ? parentEdge.source
        : parentEdge.target
      : null;
    const parentNode = parentId ? layoutedMap.get(parentId) : null;

    if (!parentNode) return sub;

    const idx = agentChildCounter.get(parentNode.id) || 0;
    agentChildCounter.set(parentNode.id, idx + 1);

    return {
      ...sub,
      position: {
        x: parentNode.position.x - 55 + idx * 85,
        y: parentNode.position.y + 165,
      },
    };
  });

  return [...groupNodes, ...layoutedWorkflowNodes, ...layoutedSubNodes];
}

/**
 * Computes a spacious, hierarchical Mind Map tree layout where all nodes
 * (including AI Agent sub-nodes) are arranged as organic left-to-right mind map branches.
 */
export function computeMindMapLayout(
  nodes: FlowNode[],
  edges: FlowEdge[]
): FlowNode[] {
  const groupNodes = nodes.filter((n) => n.type === 'resizableGroup');
  const mindMapNodes = nodes.filter((n) => n.type !== 'resizableGroup');

  if (mindMapNodes.length === 0) return nodes;

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: 'LR',
    nodesep: 42,
    ranksep: 95,
    marginx: 460,
    marginy: 90,
  });

  mindMapNodes.forEach((node) => {
    const isSub = Boolean(node.data.aiSubNodeType);
    const width = isSub ? 185 : 210;
    const height = isSub ? 54 : 64;
    g.setNode(node.id, { width, height });
  });

  edges.forEach((edge) => {
    const isLoopBack =
      edge.targetHandle === 'loop-return' ||
      String(edge.label || '')
        .toLowerCase()
        .includes('next batch') ||
      String(edge.label || '')
        .toLowerCase()
        .includes('loop back');
    if (isLoopBack) return;

    if (g.hasNode(edge.source) && g.hasNode(edge.target)) {
      g.setEdge(edge.source, edge.target);
    }
  });

  dagre.layout(g);

  const layoutedMindMapNodes = mindMapNodes.map((node) => {
    const nodeWithPos = g.node(node.id);
    if (!nodeWithPos) return node;

    const isSub = Boolean(node.data.aiSubNodeType);
    const width = isSub ? 185 : 210;
    const height = isSub ? 54 : 64;

    return {
      ...node,
      style: { width, height },
      position: {
        x: Math.round((nodeWithPos.x - width / 2) / 15) * 15,
        y: Math.round((nodeWithPos.y - height / 2) / 15) * 15,
      },
    };
  });

  return [...groupNodes, ...layoutedMindMapNodes];
}
