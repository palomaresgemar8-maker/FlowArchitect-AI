import Dexie, { type Table } from 'dexie';
import type { WorkflowProject } from '../types/workflow';

export class FlowArchitectDatabase extends Dexie {
  projects!: Table<WorkflowProject, string>;

  constructor() {
    super('FlowArchitectAIDB_v6');
    this.version(1).stores({
      projects: 'id, name, platform, updatedAt, createdAt',
    });
  }
}

export const db = new FlowArchitectDatabase();

export const STARTER_PROJECTS: WorkflowProject[] = [
  {
    id: 'proj_financial_news_recap',
    name: 'Financial News Recap Architecture Blueprint',
    description:
      'Automates the daily email delivery of curated financial news at 7:00 AM using Schedule Trigger, HTTP Request, HTML Parser, Edit Fields, AI Agent (with Gemini LLM, Memory, MCP Tool & Output Parser), and Gmail.',
    platform: 'n8n',
    createdAt: Date.now() - 86400000 * 3,
    updatedAt: Date.now() - 1800000,
    viewport: { x: 20, y: 30, zoom: 0.9 },
    nodes: [
      {
        id: 'sticky_note_1',
        type: 'resizableGroup',
        position: { x: 30, y: 40 },
        zIndex: -10,
        style: { width: 390, height: 420 },
        data: {
          label: 'Financial News Recap Blueprint',
          subtitle:
            'This systems architecture blueprint automates the daily email delivery of curated financial news at 7:00 AM. It extracts relevant financial news articles, structures the content, and dispatches a concise executive summary.\n\nArchitecture Pipeline Steps:\n1. Schedule Trigger — Activates daily at 7:00 AM.\n2. Fetch Financial News — Retrieves news from ft.com via HTTP Request.\n3. Extract News Headlines — Uses CSS selectors to parse headlines & Editor\'s Picks.\n4. Gather the Elements — Aggregates extracted sections into a single dataset.\n5. AI Agent — Connects Gemini 2.5 Chat Model, Window Memory, MCP Client Tool, and Structured JSON Output Parser.\n6. Gmail Dispatch — Sends the formatted HTML summary email.',
          role: 'group',
          platform: 'n8n',
          serviceName: 'Architecture Zone',
          iconName: 'layers',
          groupColor: 'amber',
        },
      },
      {
        id: 'node_fin_1',
        type: 'workflowNode',
        position: { x: 480, y: 150 },
        zIndex: 10,
        style: { width: 76, height: 76 },
        data: {
          label: 'Schedule Trigger',
          subtitle: 'Every day at 07:00 AM',
          role: 'trigger',
          nodeGroup: 'core',
          appPlatform: 'Core',
          operation: 'trigger: cron / interval',
          platform: 'n8n',
          serviceName: 'n8n-nodes-base.scheduleTrigger',
          iconName: 'clock',
          estimatedTimeSavedMins: 3,
        },
      },
      {
        id: 'node_fin_2',
        type: 'workflowNode',
        position: { x: 655, y: 150 },
        zIndex: 10,
        style: { width: 76, height: 76 },
        data: {
          label: 'Get financial news',
          subtitle: 'https://www.ft.com/',
          role: 'action',
          nodeGroup: 'core',
          appPlatform: 'Core',
          operation: 'action: httpRequest (GET)',
          platform: 'n8n',
          serviceName: 'n8n-nodes-base.httpRequest',
          iconName: 'globe',
          endpointUrl: 'https://www.ft.com/',
          httpMethod: 'GET',
          estimatedTimeSavedMins: 5,
        },
      },
      {
        id: 'node_fin_3',
        type: 'workflowNode',
        position: { x: 830, y: 150 },
        zIndex: 10,
        style: { width: 76, height: 76 },
        data: {
          label: 'Extract content',
          subtitle: 'HTML CSS Selectors',
          role: 'action',
          nodeGroup: 'core',
          appPlatform: 'Core',
          operation: 'action: cssSelector / parse',
          platform: 'n8n',
          serviceName: 'n8n-nodes-base.html',
          iconName: 'code',
          estimatedTimeSavedMins: 5,
        },
      },
      {
        id: 'node_fin_4',
        type: 'workflowNode',
        position: { x: 1005, y: 150 },
        zIndex: 10,
        style: { width: 76, height: 76 },
        data: {
          label: 'Gather elements',
          subtitle: 'Edit Fields (Set)',
          role: 'action',
          nodeGroup: 'core',
          appPlatform: 'Core',
          operation: 'action: setFieldsMapping',
          platform: 'n8n',
          serviceName: 'n8n-nodes-base.set',
          iconName: 'set',
          estimatedTimeSavedMins: 4,
        },
      },
      {
        id: 'node_fin_5',
        type: 'workflowNode',
        position: { x: 1180, y: 145 },
        zIndex: 10,
        style: { width: 224, height: 86 },
        data: {
          label: 'AI Agent',
          subtitle: 'Tools Agent',
          role: 'ai',
          nodeGroup: 'core',
          appPlatform: 'Core',
          operation: 'ai: toolsAgent',
          platform: 'n8n',
          serviceName: '@n8n/n8n-nodes-langchain.agent',
          iconName: 'bot',
          systemPrompt:
            'You are a Financial Market Analyst AI. Summarize the extracted headlines into a clean executive HTML briefing.',
          estimatedTimeSavedMins: 14,
        },
      },
      {
        id: 'sub_fin_llm',
        type: 'workflowNode',
        position: { x: 1140, y: 305 },
        zIndex: 10,
        style: { width: 68, height: 68 },
        data: {
          label: 'Gemini 2.5 Chat',
          subtitle: 'llm: gemini-2.5-pro',
          role: 'ai',
          aiSubNodeType: 'llm',
          nodeGroup: 'core',
          appPlatform: 'Core',
          operation: 'llm: gemini-2.5-pro',
          platform: 'n8n',
          serviceName: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
          iconName: 'sparkles',
          estimatedTimeSavedMins: 8,
        },
      },
      {
        id: 'sub_fin_memory',
        type: 'workflowNode',
        position: { x: 1224, y: 305 },
        zIndex: 10,
        style: { width: 68, height: 68 },
        data: {
          label: 'Window Memory',
          subtitle: 'memory: bufferWindow',
          role: 'ai',
          aiSubNodeType: 'memory',
          nodeGroup: 'core',
          appPlatform: 'Core',
          operation: 'memory: bufferWindow (k=10)',
          platform: 'n8n',
          serviceName: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
          iconName: 'database',
          estimatedTimeSavedMins: 5,
        },
      },
      {
        id: 'sub_fin_mcp',
        type: 'workflowNode',
        position: { x: 1308, y: 305 },
        zIndex: 10,
        style: { width: 68, height: 68 },
        data: {
          label: 'MCP Client Tool',
          subtitle: 'tool: mcpClient',
          role: 'ai',
          aiSubNodeType: 'tool',
          nodeGroup: 'core',
          appPlatform: 'Core',
          operation: 'tool: mcpClient (SSE / Stdio)',
          platform: 'n8n',
          serviceName: '@n8n/n8n-nodes-langchain.mcpClientTool',
          iconName: 'terminal',
          estimatedTimeSavedMins: 10,
        },
      },
      {
        id: 'sub_fin_parser',
        type: 'workflowNode',
        position: { x: 1392, y: 305 },
        zIndex: 10,
        style: { width: 68, height: 68 },
        data: {
          label: 'JSON Output Parser',
          subtitle: 'parser: strictJsonSchema',
          role: 'ai',
          aiSubNodeType: 'parser',
          nodeGroup: 'core',
          appPlatform: 'Core',
          operation: 'parser: strictJsonSchema',
          platform: 'n8n',
          serviceName: '@n8n/n8n-nodes-langchain.outputParserStructured',
          iconName: 'json',
          estimatedTimeSavedMins: 6,
        },
      },
      {
        id: 'node_fin_6',
        type: 'workflowNode',
        position: { x: 1495, y: 150 },
        zIndex: 10,
        style: { width: 76, height: 76 },
        data: {
          label: 'Send Gmail Recap',
          subtitle: 'message: send',
          role: 'action',
          nodeGroup: 'app',
          appPlatform: 'Gmail',
          operation: 'action: message.send',
          platform: 'n8n',
          serviceName: 'n8n-nodes-base.gmail',
          iconName: 'mail',
          estimatedTimeSavedMins: 8,
        },
      },
    ],
    edges: [
      {
        id: 'e_fin_1_2',
        source: 'node_fin_1',
        target: 'node_fin_2',
        type: 'workflowEdge',
        animated: true,
      },
      {
        id: 'e_fin_2_3',
        source: 'node_fin_2',
        target: 'node_fin_3',
        type: 'workflowEdge',
        animated: true,
      },
      {
        id: 'e_fin_3_4',
        source: 'node_fin_3',
        target: 'node_fin_4',
        type: 'workflowEdge',
        animated: true,
      },
      {
        id: 'e_fin_4_5',
        source: 'node_fin_4',
        target: 'node_fin_5',
        type: 'workflowEdge',
        animated: true,
      },
      {
        id: 'e_fin_5_6',
        source: 'node_fin_5',
        target: 'node_fin_6',
        type: 'workflowEdge',
        animated: true,
      },
      {
        id: 'e_fin_sub_llm',
        source: 'node_fin_5',
        sourceHandle: 'ai-llm',
        target: 'sub_fin_llm',
        targetHandle: 'sub-top',
        type: 'workflowEdge',
        animated: true,
        data: { isAiSubNode: true, slot: 'llm' },
      },
      {
        id: 'e_fin_sub_mem',
        source: 'node_fin_5',
        sourceHandle: 'ai-memory',
        target: 'sub_fin_memory',
        targetHandle: 'sub-top',
        type: 'workflowEdge',
        animated: true,
        data: { isAiSubNode: true, slot: 'memory' },
      },
      {
        id: 'e_fin_sub_mcp',
        source: 'node_fin_5',
        sourceHandle: 'ai-tool',
        target: 'sub_fin_mcp',
        targetHandle: 'sub-top',
        type: 'workflowEdge',
        animated: true,
        data: { isAiSubNode: true, slot: 'tool' },
      },
      {
        id: 'e_fin_sub_parser',
        source: 'node_fin_5',
        sourceHandle: 'ai-parser',
        target: 'sub_fin_parser',
        targetHandle: 'sub-top',
        type: 'workflowEdge',
        animated: true,
        data: { isAiSubNode: true, slot: 'parser' },
      },
    ],
  },
  {
    id: 'proj_n8n_omnichannel_workspace',
    name: 'Omnichannel Lead Qualification → Sheets, Notion, Gmail & Slack',
    description:
      'Webhook Trigger → AI Agent → Switch Router → Google Sheets, Notion, Gmail & Slack.',
    platform: 'n8n',
    createdAt: Date.now() - 86400000 * 5,
    updatedAt: Date.now() - 3600000 * 4,
    viewport: { x: 20, y: 40, zoom: 0.9 },
    nodes: [
      {
        id: 'sticky_lead_1',
        type: 'resizableGroup',
        position: { x: 30, y: 40 },
        zIndex: -10,
        style: { width: 375, height: 360 },
        data: {
          label: 'Omnichannel Lead Qualification',
          subtitle:
            'Architecture Steps:\n1. Webhook Trigger catches inbound lead JSON.\n2. AI Agent scores ICP fit (0-100) and drafts bespoke outreach.\n3. Switch routes Enterprise (>=80) vs Standard leads.\n4. Logs to Google Sheets, creates Notion Deal Room, and sends Gmail proposal.',
          role: 'group',
          platform: 'n8n',
          serviceName: 'Architecture Zone',
          iconName: 'layers',
          groupColor: 'amber',
        },
      },
      {
        id: 'node_1',
        type: 'workflowNode',
        position: { x: 465, y: 165 },
        zIndex: 10,
        style: { width: 76, height: 76 },
        data: {
          label: 'Webhook Trigger',
          subtitle: 'POST /lead-intake',
          role: 'trigger',
          nodeGroup: 'core',
          appPlatform: 'Core',
          operation: 'trigger: httpWebhook (POST)',
          platform: 'n8n',
          serviceName: 'n8n-nodes-base.webhook',
          iconName: 'webhook',
          estimatedTimeSavedMins: 3,
        },
      },
      {
        id: 'node_2',
        type: 'workflowNode',
        position: { x: 640, y: 165 },
        zIndex: 10,
        style: { width: 76, height: 76 },
        data: {
          label: 'AI Agent',
          subtitle: 'ICP Scoring & Draft',
          role: 'ai',
          nodeGroup: 'core',
          appPlatform: 'Core',
          operation: 'ai: toolsAgent',
          platform: 'n8n',
          serviceName: '@n8n/n8n-nodes-langchain.agent',
          iconName: 'bot',
          estimatedTimeSavedMins: 12,
        },
      },
      {
        id: 'node_3',
        type: 'workflowNode',
        position: { x: 815, y: 165 },
        zIndex: 10,
        style: { width: 76, height: 76 },
        data: {
          label: 'Switch Router',
          subtitle: 'Score >= 80 vs < 80',
          role: 'router',
          nodeGroup: 'core',
          appPlatform: 'Core',
          operation: 'router: switchRules',
          platform: 'n8n',
          serviceName: 'n8n-nodes-base.switch',
          iconName: 'git-branch',
          estimatedTimeSavedMins: 4,
        },
      },
      {
        id: 'node_4',
        type: 'workflowNode',
        position: { x: 1005, y: 90 },
        zIndex: 10,
        style: { width: 76, height: 76 },
        data: {
          label: 'Append Sheet Row',
          subtitle: 'Google Sheets',
          role: 'action',
          nodeGroup: 'app',
          appPlatform: 'Google Sheets',
          operation: 'action: sheet.appendOrUpdate',
          platform: 'n8n',
          serviceName: 'n8n-nodes-base.googleSheets',
          iconName: 'sheet',
          estimatedTimeSavedMins: 6,
        },
      },
      {
        id: 'node_5',
        type: 'workflowNode',
        position: { x: 1005, y: 240 },
        zIndex: 10,
        style: { width: 76, height: 76 },
        data: {
          label: 'Create Notion Page',
          subtitle: 'Notion Database',
          role: 'action',
          nodeGroup: 'app',
          appPlatform: 'Notion',
          operation: 'action: databasePage.create',
          platform: 'n8n',
          serviceName: 'n8n-nodes-base.notion',
          iconName: 'notion',
          estimatedTimeSavedMins: 7,
        },
      },
      {
        id: 'node_6',
        type: 'workflowNode',
        position: { x: 1195, y: 165 },
        zIndex: 10,
        style: { width: 76, height: 76 },
        data: {
          label: 'Send Gmail',
          subtitle: 'Gmail Dispatch',
          role: 'action',
          nodeGroup: 'app',
          appPlatform: 'Gmail',
          operation: 'action: message.send',
          platform: 'n8n',
          serviceName: 'n8n-nodes-base.gmail',
          iconName: 'mail',
          estimatedTimeSavedMins: 8,
        },
      },
    ],
    edges: [
      { id: 'e_1_2', source: 'node_1', target: 'node_2', type: 'workflowEdge', animated: true },
      { id: 'e_2_3', source: 'node_2', target: 'node_3', type: 'workflowEdge', animated: true },
      { id: 'e_3_4', source: 'node_3', target: 'node_4', type: 'workflowEdge', animated: true, label: 'Score >= 80' },
      { id: 'e_3_5', source: 'node_3', target: 'node_5', type: 'workflowEdge', animated: true, label: 'Create Brief' },
      { id: 'e_4_6', source: 'node_4', target: 'node_6', type: 'workflowEdge', animated: true },
      { id: 'e_5_6', source: 'node_5', target: 'node_6', type: 'workflowEdge', animated: true },
    ],
  },
];

export async function initializeAndLoadProjects(): Promise<WorkflowProject[]> {
  try {
    const count = await db.projects.count();
    if (count === 0) {
      await db.projects.bulkPut(STARTER_PROJECTS);
      return STARTER_PROJECTS;
    }
    const existing = await db.projects.orderBy('updatedAt').reverse().toArray();
    return existing.length > 0 ? existing : STARTER_PROJECTS;
  } catch (err) {
    console.warn('IndexedDB fallback to in-memory starter projects:', err);
    return STARTER_PROJECTS;
  }
}

export async function saveProjectToDb(project: WorkflowProject): Promise<void> {
  try {
    await db.projects.put(project);
  } catch (err) {
    console.warn('Failed to persist project to IndexedDB:', err);
  }
}

export async function deleteProjectFromDb(projectId: string): Promise<void> {
  try {
    await db.projects.delete(projectId);
  } catch (err) {
    console.warn('Failed to delete project from IndexedDB:', err);
  }
}
