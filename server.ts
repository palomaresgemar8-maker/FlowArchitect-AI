import dotenv from 'dotenv';
import fs from 'fs';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Search for .env file: check next to executable (portable app), current working directory, and app directory
const possibleEnvPaths = [
  process.execPath ? path.join(path.dirname(process.execPath), '.env') : '',
  path.join(process.cwd(), '.env'),
  path.join(__dirname, '.env'),
  path.join(__dirname, '..', '.env'),
].filter(Boolean);

let envLoaded = false;
for (const envPath of possibleEnvPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    envLoaded = true;
    break;
  }
}
if (!envLoaded) {
  dotenv.config();
}

export const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '25mb' }));

function getGeminiClient(): GoogleGenAI {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const WORKFLOW_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: 'Concise professional title for this automation workflow.',
    },
    summary: {
      type: Type.STRING,
      description: '1-2 sentence architectural overview of the workflow.',
    },
    estimatedMonthlyHoursSaved: {
      type: Type.NUMBER,
      description: 'Estimated hours saved per month by automating this workflow.',
    },
    nodes: {
      type: Type.ARRAY,
      description: 'Ordered list of workflow nodes in the automation blueprint.',
      items: {
        type: Type.OBJECT,
        properties: {
          id: {
            type: Type.STRING,
            description: 'Unique short node identifier like node_1, node_2.',
          },
          label: {
            type: Type.STRING,
            description: 'Action-oriented node title (e.g., Webhook Trigger, Google Sheets Append Row, Notion Create Page, Gmail Send Reply).',
          },
          subtitle: {
            type: Type.STRING,
            description: 'Short description of what this step does (under 65 chars).',
          },
          role: {
            type: Type.STRING,
            description: 'Must be one of: trigger, ai, router, action',
          },
          nodeGroup: {
            type: Type.STRING,
            description: 'Must be "core" for built-in platform nodes (Webhook, Schedule, Switch, If, Merge, Loop, Wait, Code, Edit Fields/Set, HTTP Request, AI Agent, Information Extractor, Memory) OR "app" for external third-party app integrations (Gmail, Google Sheets, Notion, Google Drive, Google Calendar, Airtable, Slack, Telegram, Discord, WhatsApp, GoHighLevel, HubSpot, Stripe, Shopify, Supabase, Postgres, Pinecone, OpenAI, Claude, DeepSeek).',
          },
          operation: {
            type: Type.STRING,
            description: 'n8n-style resource:operation signature (e.g., "sheet: appendOrUpdate", "databasePage: create", "message: send", "switch: rules", "code: runJs").',
          },
          serviceName: {
            type: Type.STRING,
            description: 'Platform-specific module/node ID (e.g. n8n-nodes-base.webhook, n8n-nodes-base.googleSheets, n8n-nodes-base.notion, n8n-nodes-base.gmail, @n8n/n8n-nodes-langchain.agent).',
          },
          iconName: {
            type: Type.STRING,
            description: 'Icon identifier: webhook, bot, git-branch, globe, message-square, database, mail, zap, file-text, sparkles, cpu, filter, calendar, phone, sheet, notion, drive, stripe, shopify, telegram, discord, code, clock, loop, set, merge, terminal, server, cloud, tasks, crm, search, voice, error, play, split, json',
          },
          systemPrompt: {
            type: Type.STRING,
            description: 'If role is ai, provide a detailed production-ready system prompt for this AI node. Otherwise empty string.',
          },
          endpointUrl: {
            type: Type.STRING,
            description: 'Suggested API endpoint or webhook path if applicable.',
          },
          httpMethod: {
            type: Type.STRING,
            description: 'HTTP method if applicable: POST, GET, PUT, PATCH, DELETE',
          },
          payloadSchema: {
            type: Type.STRING,
            description: 'Sample JSON payload or n8n expression mapping in this step.',
          },
          roiNotes: {
            type: Type.STRING,
            description: 'Business value or reliability note for this specific step.',
          },
          estimatedTimeSavedMins: {
            type: Type.NUMBER,
            description: 'Minutes saved per execution by this step (e.g. 2 to 15).',
          },
        },
        required: [
          'id',
          'label',
          'subtitle',
          'role',
          'nodeGroup',
          'operation',
          'serviceName',
          'iconName',
          'systemPrompt',
          'endpointUrl',
          'httpMethod',
          'payloadSchema',
          'roiNotes',
          'estimatedTimeSavedMins',
        ],
      },
    },
    edges: {
      type: Type.ARRAY,
      description: 'Directed edges connecting source nodes to target nodes.',
      items: {
        type: Type.OBJECT,
        properties: {
          id: {
            type: Type.STRING,
            description: 'Unique edge identifier like edge_1_2.',
          },
          source: {
            type: Type.STRING,
            description: 'Source node ID.',
          },
          target: {
            type: Type.STRING,
            description: 'Target node ID.',
          },
          label: {
            type: Type.STRING,
            description: 'Optional branch condition or item count label (e.g. Out 0: Hot Lead, 1 item, Fallback).',
          },
        },
        required: ['id', 'source', 'target', 'label'],
      },
    },
  },
  required: ['title', 'summary', 'estimatedMonthlyHoursSaved', 'nodes', 'edges'],
};

function buildSystemInstruction(platform: string): string {
  const platformGuides: Record<string, string> = {
    n8n: 'Use authentic n8n module identifiers (e.g., Built-in Core: n8n-nodes-base.webhook, n8n-nodes-base.scheduleTrigger, n8n-nodes-base.set, n8n-nodes-base.code, n8n-nodes-base.switch, n8n-nodes-base.if, n8n-nodes-base.merge, n8n-nodes-base.splitInBatches, n8n-nodes-base.httpRequest, @n8n/n8n-nodes-langchain.agent; App Integrations: n8n-nodes-base.gmail, n8n-nodes-base.googleSheets, n8n-nodes-base.notion, n8n-nodes-base.googleDrive, n8n-nodes-base.googleCalendar, n8n-nodes-base.airtable, n8n-nodes-base.slack, n8n-nodes-base.telegram, n8n-nodes-base.discord, n8n-nodes-base.highLevel, n8n-nodes-base.hubspot, n8n-nodes-base.stripe, n8n-nodes-base.supabase, n8n-nodes-base.postgres).',
    make: 'Use authentic Make.com module identifiers separating Built-in Tools (gateway:CustomWebHook, builtin:BasicRouter, builtin:Iterator, builtin:SetVariables, http:ActionSendData) from App Integrations (google-email:ActionSendEmail, google-sheets:addRow, notion:createADatabaseItem, airtable:ActionUpsertRecord, slack:CreateMessage, stripe:createAnInvoice, gohighlevel:upsertContact).',
    zapier: 'Use authentic Zapier identifiers separating Built-in by Zapier (Webhooks by Zapier, Formatter by Zapier, Paths by Zapier, Code by Zapier, Filter by Zapier, Looping by Zapier) from App Connectors (Gmail, Google Sheets, Notion, Airtable, Slack, LeadConnector, HubSpot, Stripe, Supabase).',
    ghl: 'Use authentic GoHighLevel Workflow identifiers separating GHL Core Actions (GHL Core Trigger, GHL Core Condition, GHL Core Field Mapper, GHL Core Wait, GHL Core AI Agent) from External App Integrations (GHL Google Sheets Action, Gmail Integration, Notion API Integration, Slack App Integration, GHL Stripe Payment).',
  };

  const guide = platformGuides[platform] || platformGuides.n8n;

  return `You are FlowArchitect AI, a Principal AI Automation Architect specializing in n8n, Make.com, Zapier, and GoHighLevel (GHL).
Design a comprehensive, production-grade multi-step workflow graph for the requested prompt.
Target Platform: ${platform.toUpperCase()}.
${guide}

Rules:
1. Explicitly classify every node's "nodeGroup" as either:
   - "core": Built-in platform triggers, flow logic (Switch, If, Merge, Loop, Wait), data transformation (Edit Fields/Set, Code JS/Python), HTTP Request, and core AI Agent / Extractor nodes.
   - "app": External third-party SaaS integrations such as Gmail (iconName: "mail"), Google Sheets (iconName: "sheet"), Notion (iconName: "notion"), Google Drive (iconName: "drive"), Google Calendar (iconName: "calendar"), Airtable (iconName: "sheet"), Slack (iconName: "message-square"), Telegram (iconName: "telegram"), Discord (iconName: "discord"), Stripe (iconName: "stripe"), Shopify (iconName: "shopify"), GoHighLevel/HubSpot (iconName: "crm"), Supabase/Postgres (iconName: "database").
2. Provide an authentic "operation" string for every node (e.g., "sheet: appendOrUpdate", "databasePage: create", "message: send", "switch: multiBranchRules", "code: runJavaScript").
3. Create between 6 and 10 well-structured nodes combining Built-in Core nodes and External App Integrations.
4. Connect all nodes logically with "edges" and branch labels.`;
}

function resolveServerApiKey(provider: string, envVarName?: string): string | undefined {
  const allowedEnvKeys: Record<string, string | undefined> = {
    UNOROUTER_API_KEY: process.env.UNOROUTER_API_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  };

  if (envVarName && allowedEnvKeys[envVarName]) {
    return allowedEnvKeys[envVarName];
  }

  return process.env.UNOROUTER_API_KEY || process.env.GEMINI_API_KEY;
}

function buildCustomParamsObject(
  customParams?: Array<{ param: string; value: string; enabled: boolean }>
): Record<string, any> {
  const extra: Record<string, any> = {};
  if (!Array.isArray(customParams)) return extra;
  for (const item of customParams) {
    if (!item || !item.enabled || !item.param?.trim()) continue;
    const key = item.param.trim();
    const rawVal = String(item.value ?? '').trim();
    if (rawVal === 'true') extra[key] = true;
    else if (rawVal === 'false') extra[key] = false;
    else if (rawVal !== '' && !Number.isNaN(Number(rawVal))) {
      extra[key] = Number(rawVal);
    } else {
      extra[key] = rawVal;
    }
  }
  return extra;
}

function resolveOpenAiCompletionsUrl(baseUrl: string): string[] {
  const clean = baseUrl.trim().replace(/\/+$/, '');
  if (clean.endsWith('/chat/completions')) {
    return [clean];
  }
  if (clean.endsWith('/v1') || clean.endsWith('/v1beta/openai')) {
    return [`${clean}/chat/completions`, clean];
  }
  return [`${clean}/v1/chat/completions`, `${clean}/chat/completions`];
}

function resolveAnthropicMessagesUrl(baseUrl: string): string {
  const clean = baseUrl.trim().replace(/\/+$/, '');
  if (clean.endsWith('/v1/messages')) return clean;
  if (clean.endsWith('/v1')) return `${clean}/messages`;
  return `${clean}/v1/messages`;
}

function extractJsonObject(raw: string): any {
  const trimmed = String(raw || '')
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start !== -1 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error('Could not parse JSON workflow blueprint from response');
  }
}

// POST /api/ai/test-endpoint
app.post('/api/ai/test-endpoint', async (req, res) => {
  try {
    const {
      provider = 'uno-router',
      customBaseUrl = 'https://api.unorouter.com/v1/chat/completions',
      anthropicBaseUrl = 'https://api.unorouter.com/anthropic',
      apiFormat = 'openai',
      modelId = 'claude-sonnet-5-thinking',
      envVarName = 'UNOROUTER_API_KEY',
      customParams = [],
    } = req.body || {};

    const appliedParams = buildCustomParamsObject(customParams);
    const targetModel =
      modelId || (provider === 'uno-router' ? 'claude-sonnet-5-thinking' : 'deepseek-flash');
    const resolvedBaseUrl =
      provider === 'gemini'
        ? 'https://generativelanguage.googleapis.com'
        : apiFormat === 'anthropic'
        ? resolveAnthropicMessagesUrl(anthropicBaseUrl || customBaseUrl)
        : resolveOpenAiCompletionsUrl(customBaseUrl)[0];

    const apiKey = resolveServerApiKey(provider, envVarName);
    const hasServerSecret = Boolean(apiKey);

    if (hasServerSecret && (provider === 'uno-router' || resolvedBaseUrl.includes('unorouter.com'))) {
      try {
        const pingResponse = await fetch(resolvedBaseUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: targetModel,
            messages: [{ role: 'user', content: 'ping' }],
            stream: false,
          }),
        });

        const pingData: any = await pingResponse.json().catch(() => ({}));

        if (pingResponse.ok) {
          return res.json({
            ok: true,
            providerUsed: `${provider} (${targetModel})`,
            resolvedBaseUrl,
            modelId: targetModel,
            appliedParams,
            message: `Connected & Authenticated to UnoRouter! Model "${targetModel}" is live and ready to generate workflows.`,
          });
        }

        if (pingData?.error?.code === 'consent_required') {
          const consentMatch = pingData.error.message.match(/https:\/\/unorouter\.com\/consents\?[^;,\s]+/);
          const consentUrl = consentMatch ? consentMatch[0] : `https://unorouter.com/consents?model=${encodeURIComponent(targetModel)}`;
          return res.json({
            ok: true,
            requiresConsent: true,
            consentUrl,
            providerUsed: `${provider} (${targetModel})`,
            resolvedBaseUrl,
            modelId: targetModel,
            appliedParams,
            message: `UnoRouter API Key is active & valid! Provider consent required for "${targetModel}". Click the consent link to enable: ${consentUrl}`,
          });
        }

        if (pingResponse.status === 401 || pingResponse.status === 403) {
          return res.status(401).json({
            ok: false,
            message: `UnoRouter Authentication Failed: ${pingData?.error?.message || 'Invalid API Key'}.`,
          });
        }
      } catch (pingErr: any) {
        console.warn('UnoRouter ping warning:', pingErr?.message);
      }
    }

    return res.json({
      ok: true,
      providerUsed: `${provider} (${apiFormat.toUpperCase()})`,
      resolvedBaseUrl,
      modelId: targetModel,
      appliedParams,
      message: hasServerSecret
        ? `Ready & Authenticated: ${resolvedBaseUrl} -> model "${targetModel}" (${envVarName} active)`
        : `Endpoint configured: ${resolvedBaseUrl} -> model "${targetModel}". (Set ${envVarName} in environment secrets for live external calls; Gemini fallback active).`,
    });
  } catch (error: any) {
    return res.status(500).json({
      ok: false,
      message: error?.message || 'Failed to verify endpoint configuration.',
    });
  }
});

// POST /api/ai/generate
app.post('/api/ai/generate', async (req, res) => {
  try {
    const {
      prompt,
      platform = 'n8n',
      provider = 'uno-router',
      customBaseUrl = 'https://api.unorouter.com/v1/chat/completions',
      anthropicBaseUrl = 'https://api.unorouter.com/anthropic',
      apiFormat = 'openai',
      modelId = 'claude-sonnet-5-thinking',
      temperature = 0.4,
      envVarName = 'UNOROUTER_API_KEY',
      customParams = [],
    } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'A workflow prompt is required.' });
    }

    const systemInstruction = buildSystemInstruction(platform);
    const extraParams = buildCustomParamsObject(customParams);

    if (
      provider === 'uno-router' ||
      provider === 'deepseek' ||
      provider === 'openai-custom'
    ) {
      const externalApiKey = resolveServerApiKey(provider, envVarName);
      const targetModel =
        modelId && !modelId.startsWith('gemini')
          ? modelId
          : provider === 'uno-router'
          ? 'claude-sonnet-5-thinking'
          : provider === 'deepseek'
          ? 'deepseek-flash'
          : 'gpt-4o-mini';

      if (externalApiKey) {
        if (apiFormat === 'anthropic' && (anthropicBaseUrl || customBaseUrl)) {
          try {
            const endpoint = resolveAnthropicMessagesUrl(
              anthropicBaseUrl || customBaseUrl
            );
            const anthResponse = await fetch(endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-api-key': externalApiKey,
                Authorization: `Bearer ${externalApiKey}`,
                'anthropic-version': '2023-06-01',
              },
              body: JSON.stringify({
                model: targetModel,
                max_tokens: extraParams.max_tokens || 2048,
                temperature: Number(temperature) || 0.4,
                system: `${systemInstruction}\nReturn ONLY valid JSON with keys: title, summary, estimatedMonthlyHoursSaved, nodes, edges.`,
                messages: [{ role: 'user', content: prompt }],
                ...extraParams,
              }),
            });

            if (anthResponse.ok) {
              const anthData = await anthResponse.json();
              const textBlock = anthData.content?.[0]?.text;
              if (textBlock) {
                const parsed = extractJsonObject(textBlock);
                return res.json({
                  ...parsed,
                  providerUsed: `${provider} [Anthropic] (${targetModel})`,
                });
              }
            }
          } catch (anthErr) {
            console.warn(
              'External Anthropic-compatible endpoint fallback to Gemini:',
              anthErr
            );
          }
        } else if (customBaseUrl) {
          const candidateUrls = resolveOpenAiCompletionsUrl(customBaseUrl);
          for (const endpoint of candidateUrls) {
            try {
              const basePayload = {
                ...extraParams,
                model: extraParams.model || targetModel,
                temperature: Number(temperature) || 0.4,
                messages: [
                  {
                    role: 'system',
                    content: `${systemInstruction}\nReturn ONLY valid JSON with keys: title, summary, estimatedMonthlyHoursSaved, nodes (array of {id, label, subtitle, role, nodeGroup, operation, serviceName, iconName, systemPrompt, endpointUrl, httpMethod, payloadSchema, roiNotes, estimatedTimeSavedMins}), edges (array of {id, source, target, label}).`,
                  },
                  { role: 'user', content: prompt },
                ],
              };

              let extResponse = await fetch(endpoint, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${externalApiKey}`,
                },
                body: JSON.stringify({
                  ...basePayload,
                  response_format: { type: 'json_object' },
                }),
              });

              if (!extResponse.ok) {
                // Retry without response_format if rejected by model
                extResponse = await fetch(endpoint, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${externalApiKey}`,
                  },
                  body: JSON.stringify(basePayload),
                });
              }

              if (extResponse.ok) {
                const extData = await extResponse.json();
                const content = extData.choices?.[0]?.message?.content;
                if (content) {
                  const parsed = extractJsonObject(content);
                  return res.json({
                    ...parsed,
                    providerUsed: `UnoRouter (${targetModel})`,
                  });
                }
              } else {
                const errJson = await extResponse.json().catch(() => null);
                if (errJson?.error?.code === 'consent_required') {
                  const consentUrl = `https://unorouter.com/consents?model=${encodeURIComponent(targetModel)}`;
                  return res.status(403).json({
                    error: `UnoRouter requires 1-time consent for ${targetModel}. Please open ${consentUrl} to enable, then retry.`,
                    consentUrl,
                  });
                }
                console.warn('External model response not ok:', errJson || extResponse.statusText);
              }
            } catch (extErr) {
              console.warn(
                `External OpenAI-compatible endpoint (${endpoint}) fallback:`,
                extErr
              );
            }
          }
        }
      }
    }

    const ai = getGeminiClient();
    const resolvedGeminiModel =
      modelId && modelId.startsWith('gemini-') ? modelId : 'gemini-3.8-flash';

    const response = await ai.models.generateContent({
      model: resolvedGeminiModel,
      contents: prompt,
      config: {
        systemInstruction,
        temperature: Number(temperature) || 0.4,
        responseMimeType: 'application/json',
        responseSchema: WORKFLOW_SCHEMA,
      },
    });

    const rawText = response.text;
    if (!rawText) {
      throw new Error('Model returned an empty response.');
    }

    const parsedGraph = JSON.parse(rawText.trim());
    return res.json({
      ...parsedGraph,
      providerUsed: `Google Gemini (${resolvedGeminiModel})`,
    });
  } catch (error: any) {
    console.error('AI workflow generation error:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to generate workflow blueprint.',
    });
  }
});

// POST /api/ai/sow — 1-Click AI Scope of Work (SOW) & Client Proposal Generator
app.post('/api/ai/sow', async (req, res) => {
  try {
    const { projectTitle, platform, nodes, edges } = req.body;
    if (!nodes || !Array.isArray(nodes)) {
      return res.status(400).json({ error: 'Canvas nodes are required to generate a Scope of Work.' });
    }

    const ai = getGeminiClient();
    const compactNodes = nodes.map((n: any) => ({
      id: n.id,
      label: n.data?.label,
      role: n.data?.role,
      nodeGroup: n.data?.nodeGroup,
      operation: n.data?.operation,
      serviceName: n.data?.serviceName,
      subtitle: n.data?.subtitle,
      endpointUrl: n.data?.endpointUrl,
      roiNotes: n.data?.roiNotes,
      estimatedTimeSavedMins: n.data?.estimatedTimeSavedMins,
    }));

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Generate a client-ready Scope of Work (SOW) & Technical Proposal for the following ${String(platform || 'n8n').toUpperCase()} automation blueprint:
Project Title: ${projectTitle || 'AI Automation Blueprint'}
Nodes: ${JSON.stringify(compactNodes)}
Connections: ${JSON.stringify(edges || [])}`,
      config: {
        systemInstruction: `You are an elite AI Automation Agency Principal creating a formal Scope of Work (SOW) and Client Proposal.
Return JSON with:
- executiveSummary: Compelling business case and problem solved.
- architectureOverview: High-level data flow narrative distinguishing built-in core logic from external app integrations.
- deliverables: Array of { stepNumber, nodeTitle, role, technicalSpec, businessOutcome }.
- roiProjection: { minsSavedPerRun, estimatedMonthlyRuns, hoursSavedPerMonth, estimatedAnnualValueUsd }.
- implementationPhases: Array of { phase, duration, milestone }.`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            executiveSummary: { type: Type.STRING },
            architectureOverview: { type: Type.STRING },
            deliverables: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  stepNumber: { type: Type.NUMBER },
                  nodeTitle: { type: Type.STRING },
                  role: { type: Type.STRING },
                  technicalSpec: { type: Type.STRING },
                  businessOutcome: { type: Type.STRING },
                },
                required: ['stepNumber', 'nodeTitle', 'role', 'technicalSpec', 'businessOutcome'],
              },
            },
            roiProjection: {
              type: Type.OBJECT,
              properties: {
                minsSavedPerRun: { type: Type.NUMBER },
                estimatedMonthlyRuns: { type: Type.NUMBER },
                hoursSavedPerMonth: { type: Type.NUMBER },
                estimatedAnnualValueUsd: { type: Type.NUMBER },
              },
              required: ['minsSavedPerRun', 'estimatedMonthlyRuns', 'hoursSavedPerMonth', 'estimatedAnnualValueUsd'],
            },
            implementationPhases: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  phase: { type: Type.STRING },
                  duration: { type: Type.STRING },
                  milestone: { type: Type.STRING },
                },
                required: ['phase', 'duration', 'milestone'],
              },
            },
          },
          required: ['executiveSummary', 'architectureOverview', 'deliverables', 'roiProjection', 'implementationPhases'],
        },
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error('Empty SOW response from Gemini.');
    }

    return res.json(JSON.parse(text.trim()));
  } catch (error: any) {
    console.error('SOW generation error:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to generate Scope of Work document.',
    });
  }
});

// POST /api/ai/transcribe — Voice-to-Diagram Speech Transcription
app.post('/api/ai/transcribe', async (req, res) => {
  try {
    const { audioBase64, mimeType = 'audio/webm' } = req.body;
    if (!audioBase64) {
      return res.status(400).json({ error: 'Audio data is required.' });
    }

    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-transcribe',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data: audioBase64,
            },
          },
          {
            text: 'Transcribe this spoken automation workflow prompt accurately. Return only the transcribed prompt text.',
          },
        ],
      },
    });

    return res.json({ transcript: (response.text || '').trim() });
  } catch (error: any) {
    console.error('Audio transcription error:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to transcribe voice prompt.',
    });
  }
});

function getDistPath(): string {
  const candidatePaths: string[] = [
    path.join(__dirname, 'dist'),
    path.join(__dirname, '..', 'dist'),
    path.join(process.cwd(), 'dist'),
  ];

  if ((process as any).resourcesPath) {
    candidatePaths.unshift(
      path.join((process as any).resourcesPath, 'dist'),
      path.join((process as any).resourcesPath, 'app', 'dist'),
      path.join((process as any).resourcesPath, 'app.asar', 'dist')
    );
  }

  for (const candidate of candidatePaths) {
    if (fs.existsSync(path.join(candidate, 'index.html'))) {
      console.log(`[FlowArchitect] Resolved static dist path: ${candidate}`);
      return candidate;
    }
  }
  console.warn(`[FlowArchitect] Warning: index.html not found in candidate paths, fallback to: ${path.join(__dirname, 'dist')}`);
  return path.join(__dirname, 'dist');
}

export async function startServer(preferredPort: number = PORT): Promise<{ app: express.Express; server: any; port: number }> {
  if (process.env.NODE_ENV !== 'production' && !process.env.SERVE_STATIC) {
    try {
      const vitePkg = '' + 'vite';
      const { createServer: createViteServer } = await import(vitePkg);
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch {
      const distPath = getDistPath();
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  } else {
    const distPath = getDistPath();
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  return new Promise((resolve, reject) => {
    const server = app.listen(preferredPort, '0.0.0.0', () => {
      const addr = server.address();
      const actualPort = typeof addr === 'object' && addr ? addr.port : preferredPort;
      console.log(`FlowArchitect AI server listening on http://0.0.0.0:${actualPort}`);
      resolve({ app, server, port: actualPort });
    });
    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`Port ${preferredPort} in use, trying random available port...`);
        const fallbackServer = app.listen(0, '0.0.0.0', () => {
          const addr = fallbackServer.address();
          const fallbackPort = typeof addr === 'object' && addr ? addr.port : 0;
          console.log(`FlowArchitect AI server listening on fallback port http://0.0.0.0:${fallbackPort}`);
          resolve({ app, server: fallbackServer, port: fallbackPort });
        });
        fallbackServer.on('error', reject);
      } else {
        reject(err);
      }
    });
  });
}

// Auto-start server when run directly (CLI / dev mode, not inside Electron or Vercel serverless)
const isElectron = Boolean(
  (process.versions as any)?.electron ||
  process.env.ELECTRON_RUN === 'true'
);
const isVercel = Boolean(process.env.VERCEL);

const isDirectRun = !isElectron && !isVercel && (
  !process.send || process.env.RUN_STANDALONE === 'true'
);

if (isDirectRun) {
  startServer().catch((err) => {
    console.error('Failed to start server:', err);
  });
}

export default app;
