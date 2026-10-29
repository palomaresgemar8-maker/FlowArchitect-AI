import type { Node, Edge, Viewport } from '@xyflow/react';

export type PlatformType = 'n8n' | 'make' | 'zapier' | 'ghl';

export type CanvasViewMode = 'workflow' | 'mindmap';

export type NodeRole = 'trigger' | 'ai' | 'router' | 'action' | 'group';

export type AiSubNodeType = 'llm' | 'memory' | 'tool' | 'parser';

export type LoopModeType = 'batch' | 'forEach' | 'while' | 'repeat';

export interface LoopNodeConfig {
  mode: LoopModeType;
  batchSize: number;
  arrayField?: string;
  conditionExpression?: string;
  maxIterations?: number;
  pauseMs?: number;
  resetOnEachRun?: boolean;
}

export type NodeGroupType = 'core' | 'app';

export interface FlowNodeData extends Record<string, unknown> {
  label: string;
  subtitle: string;
  role: NodeRole;
  aiSubNodeType?: AiSubNodeType;
  isLoopNode?: boolean;
  loopConfig?: LoopNodeConfig;
  collapsedInMindMap?: boolean;
  nodeGroup?: NodeGroupType;
  appPlatform?: string;
  operation?: string;
  platform: PlatformType;
  serviceName: string;
  iconName: string;
  systemPrompt?: string;
  endpointUrl?: string;
  httpMethod?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  payloadSchema?: string;
  roiNotes?: string;
  nodeNotes?: string;
  notesInFlow?: boolean;
  estimatedTimeSavedMins?: number;
  isSwapTarget?: boolean;
  groupColor?: string;
  stickyColor?: number;
  rawStickyContent?: string;
  rawN8nNode?: Record<string, any>;
  rawMakeModule?: Record<string, any>;
  llmBaseUrl?: string;
  llmParams?: LlmParamItem[];
}

export type FlowNode = Node<FlowNodeData>;
export type FlowEdge = Edge;

export interface WorkflowProject {
  id: string;
  name: string;
  description: string;
  platform: PlatformType;
  createdAt: number;
  updatedAt: number;
  nodes: FlowNode[];
  edges: FlowEdge[];
  viewport?: Viewport;
  rawSourceFormat?: 'n8n' | 'make' | 'flowarchitect';
  rawTopLevelMeta?: Record<string, any>;
}

export type AiProviderType =
  | 'gemini'
  | 'uno-router'
  | 'deepseek'
  | 'openai-custom';

export interface LlmParamItem {
  id: string;
  param: string;
  value: string;
  enabled: boolean;
}

export interface AiEngineSettings {
  provider: AiProviderType;
  customBaseUrl: string;
  anthropicBaseUrl?: string;
  apiFormat?: 'openai' | 'anthropic';
  modelId: string;
  temperature: number;
  envVarName?: string;
  customParams?: LlmParamItem[];
  layoutDirection: 'LR' | 'TB';
  autoLayoutOnGenerate: boolean;
}

export type BuiltInSubCategory =
  | 'Core Triggers'
  | 'Flow Control & Logic'
  | 'Data & Code Transform'
  | 'HTTP & Core Network'
  | 'Core AI & LangChain';

export type AppSubCategory =
  | 'Google Workspace'
  | 'Notion & Productivity'
  | 'Project Mgmt & DevOps'
  | 'CRM, Sales & Support'
  | 'Marketing & Outreach'
  | 'Messaging, Social & Voice'
  | 'Finance & E-Commerce'
  | 'Databases, Vectors & Cloud'
  | 'AI Models, Search & Scraping';

export interface LibraryNodeTemplate {
  id: string;
  nodeGroup: NodeGroupType;
  appPlatform: string; // e.g., 'Core', 'GoHighLevel', 'Gmail', 'Google Sheets', 'Notion', etc.
  category: BuiltInSubCategory | AppSubCategory | string;
  role: NodeRole;
  originPlatform?: PlatformType | 'all';
  aiSubNodeType?: AiSubNodeType;
  isLoopNode?: boolean;
  defaultLoopConfig?: LoopNodeConfig;
  iconName: string;
  operation: string;
  defaultLabel: Record<PlatformType, string>;
  defaultService: Record<PlatformType, string>;
  subtitle: string;
  defaultSystemPrompt?: string;
  defaultEndpointUrl?: string;
  defaultPayloadSchema?: string;
  estimatedTimeSavedMins: number;
}

export interface SowDocument {
  executiveSummary: string;
  architectureOverview: string;
  deliverables: Array<{
    stepNumber: number;
    nodeTitle: string;
    role: string;
    technicalSpec: string;
    businessOutcome: string;
  }>;
  roiProjection: {
    minsSavedPerRun: number;
    estimatedMonthlyRuns: number;
    hoursSavedPerMonth: number;
    estimatedAnnualValueUsd: number;
  };
  implementationPhases: Array<{
    phase: string;
    duration: string;
    milestone: string;
  }>;
}
