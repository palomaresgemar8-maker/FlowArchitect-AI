import type {
  AiEngineSettings,
  FlowEdge,
  FlowNode,
  NodeGroupType,
  NodeRole,
  PlatformType,
  SowDocument,
} from '../types/workflow';

export interface GeneratedBlueprintResponse {
  title: string;
  summary: string;
  estimatedMonthlyHoursSaved: number;
  providerUsed?: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export interface LlmEndpointTestResult {
  ok: boolean;
  providerUsed: string;
  resolvedBaseUrl: string;
  modelId: string;
  appliedParams: Record<string, unknown>;
  message: string;
  consentUrl?: string;
  requiresConsent?: boolean;
}

export async function testCustomLlmEndpoint(
  settings: AiEngineSettings
): Promise<LlmEndpointTestResult> {
  const response = await fetch('/api/ai/test-endpoint', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider: settings.provider,
      customBaseUrl: settings.customBaseUrl,
      anthropicBaseUrl: settings.anthropicBaseUrl,
      apiFormat: settings.apiFormat || 'openai',
      modelId: settings.modelId,
      temperature: settings.temperature,
      envVarName: settings.envVarName,
      customParams: settings.customParams || [],
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Endpoint verification failed.');
  }
  return data as LlmEndpointTestResult;
}

export async function generateWorkflowFromPrompt(
  prompt: string,
  platform: PlatformType,
  settings: AiEngineSettings
): Promise<GeneratedBlueprintResponse> {
  const response = await fetch('/api/ai/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      platform,
      provider: settings.provider,
      customBaseUrl: settings.customBaseUrl,
      anthropicBaseUrl: settings.anthropicBaseUrl,
      apiFormat: settings.apiFormat || 'openai',
      modelId: settings.modelId,
      temperature: settings.temperature,
      envVarName: settings.envVarName,
      customParams: settings.customParams || [],
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to generate AI workflow diagram.');
  }

  const validRoles: NodeRole[] = ['trigger', 'ai', 'router', 'action'];
  const rawNodes = Array.isArray(data.nodes) ? data.nodes : [];
  const rawEdges = Array.isArray(data.edges) ? data.edges : [];

  const nodes: FlowNode[] = rawNodes.map((n: any, idx: number) => {
    const role: NodeRole = validRoles.includes(n.role)
      ? n.role
      : idx === 0
      ? 'trigger'
      : 'action';
    const nodeGroup: NodeGroupType =
      n.nodeGroup === 'app' || n.nodeGroup === 'core'
        ? n.nodeGroup
        : role === 'trigger' || role === 'router'
        ? 'core'
        : 'app';

    return {
      id: String(n.id || `node_${idx + 1}`),
      type: 'workflowNode',
      position: { x: idx * 175 + 480, y: 165 },
      zIndex: 10,
      style: { width: 76, height: 76 },
      data: {
        label: n.label || `Step ${idx + 1}`,
        subtitle: n.subtitle || '',
        role,
        nodeGroup,
        operation: n.operation || `${role}: execute`,
        platform,
        serviceName: n.serviceName || 'Automation Step',
        iconName:
          n.iconName ||
          (role === 'trigger'
            ? 'webhook'
            : role === 'ai'
            ? 'bot'
            : role === 'router'
            ? 'git-branch'
            : 'globe'),
        systemPrompt: n.systemPrompt || '',
        endpointUrl: n.endpointUrl || '',
        httpMethod: n.httpMethod || 'POST',
        payloadSchema: n.payloadSchema || '',
        roiNotes: n.roiNotes || '',
        estimatedTimeSavedMins: Number(n.estimatedTimeSavedMins) || 5,
      },
    };
  });

  const nodeIds = new Set(nodes.map((n) => n.id));
  const edges: FlowEdge[] = rawEdges
    .filter(
      (e: any) =>
        nodeIds.has(String(e.source)) && nodeIds.has(String(e.target))
    )
    .map((e: any, idx: number) => ({
      id: String(e.id || `edge_${idx + 1}`),
      source: String(e.source),
      target: String(e.target),
      animated: true,
      label: e.label || undefined,
    }));

  if (edges.length === 0 && nodes.length > 1) {
    for (let i = 0; i < nodes.length - 1; i++) {
      edges.push({
        id: `edge_auto_${i}`,
        source: nodes[i].id,
        target: nodes[i + 1].id,
        animated: true,
      });
    }
  }

  return {
    title: data.title || 'AI Generated Workflow',
    summary: data.summary || '',
    estimatedMonthlyHoursSaved: Number(data.estimatedMonthlyHoursSaved) || 24,
    providerUsed: data.providerUsed,
    nodes,
    edges,
  };
}

export async function generateSowFromCanvas(
  projectTitle: string,
  platform: PlatformType,
  nodes: FlowNode[],
  edges: FlowEdge[]
): Promise<SowDocument> {
  const workflowNodes = nodes.filter((n) => n.type !== 'resizableGroup');
  const response = await fetch('/api/ai/sow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectTitle,
      platform,
      nodes: workflowNodes,
      edges,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to generate Scope of Work.');
  }
  return data as SowDocument;
}

export async function transcribeVoicePrompt(
  audioBase64: string,
  mimeType: string
): Promise<string> {
  const response = await fetch('/api/ai/transcribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ audioBase64, mimeType }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Voice transcription failed.');
  }
  return data.transcript || '';
}
