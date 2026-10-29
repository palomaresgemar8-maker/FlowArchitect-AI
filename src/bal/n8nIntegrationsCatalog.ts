import type {
  AppSubCategory,
  BuiltInSubCategory,
  LibraryNodeTemplate,
  NodeGroupType,
  NodeRole,
} from '../types/workflow';

function makeCore(
  id: string,
  category: BuiltInSubCategory,
  role: NodeRole,
  iconName: string,
  name: string,
  n8nId: string,
  makeId: string,
  zapierId: string,
  ghlId: string,
  operation: string,
  subtitle: string,
  mins = 4,
  extra?: Partial<LibraryNodeTemplate>
): LibraryNodeTemplate {
  return {
    id,
    nodeGroup: 'core',
    appPlatform: 'Core',
    category,
    role,
    iconName,
    operation,
    defaultLabel: {
      n8n: name,
      make: `${name} (${makeId.split(':').pop()})`,
      zapier: `${name} (${zapierId})`,
      ghl: `${name} (${ghlId})`,
    },
    defaultService: {
      n8n: n8nId,
      make: makeId,
      zapier: zapierId,
      ghl: ghlId,
    },
    subtitle,
    estimatedTimeSavedMins: mins,
    ...extra,
  };
}

function makeApp(
  id: string,
  appPlatform: string,
  category: AppSubCategory,
  role: NodeRole,
  iconName: string,
  nodeTitle: string,
  n8nNodeName: string,
  operation: string,
  subtitle: string,
  mins = 6,
  extra?: Partial<LibraryNodeTemplate>
): LibraryNodeTemplate {
  const slug = n8nNodeName.replace(/^n8n-nodes-base\.|^@n8n\/n8n-nodes-langchain\./, '');
  return {
    id,
    nodeGroup: 'app',
    appPlatform,
    category,
    role,
    iconName,
    operation,
    defaultLabel: {
      n8n: nodeTitle,
      make: `${nodeTitle} (Make)`,
      zapier: `${nodeTitle} (Zapier)`,
      ghl: `${nodeTitle} (GHL)`,
    },
    defaultService: {
      n8n: n8nNodeName,
      make: `${slug}:${operation.split(':')[1]?.trim() || 'Action'}`,
      zapier: appPlatform,
      ghl: `GHL ${appPlatform}`,
    },
    subtitle,
    estimatedTimeSavedMins: mins,
    ...extra,
  };
}

export const FEATURED_APP_PLATFORMS = [
  'Core',
  'Gmail',
  'Google Sheets',
  'Notion',
  'GoHighLevel',
  'Slack',
  'Airtable',
  'HubSpot',
  'Stripe',
  'Supabase',
  'Google Drive',
  'Google Calendar',
  'Google Docs',
  'Telegram',
  'Discord',
  'WhatsApp',
  'OpenAI',
  'DeepSeek',
  'Anthropic Claude',
  'Linear',
  'Shopify',
  'Postgres',
  'Typeform & Calendly',
  'GitHub & DevOps',
] as const;

export const N8N_FULL_INTEGRATIONS_CATALOG: LibraryNodeTemplate[] = [
  // ============================================================================
  // 1. PLATFORM: 'Core' — ALL POSSIBLE BUILT-IN CORE TRIGGERS & CORE NODES
  // ============================================================================

  // Core Triggers (All 13 Built-in Trigger Types)
  makeCore('core_webhook', 'Core Triggers', 'trigger', 'webhook', 'Webhook Trigger (HTTP POST/GET)', 'n8n-nodes-base.webhook', 'gateway:CustomWebHook', 'Webhooks by Zapier', 'GHL Inbound Webhook', 'trigger: httpWebhook (POST/GET/PUT)', 'Starts workflow immediately when an HTTP webhook payload is received', 3, {
    defaultEndpointUrl: 'https://n8n.workspace.io/webhook/inbound',
  }),
  makeCore('core_schedule', 'Core Triggers', 'trigger', 'clock', 'Schedule / Cron Trigger', 'n8n-nodes-base.scheduleTrigger', 'builtin:Schedule', 'Schedule by Zapier', 'GHL Recurring Timer Trigger', 'trigger: cron / interval', 'Triggers workflow on a recurring interval (minutes, hourly, daily, or custom cron)', 4),
  makeCore('core_manual_trigger', 'Core Triggers', 'trigger', 'play', 'Trigger Manually (On Click)', 'n8n-nodes-base.manualTrigger', 'builtin:ManualTrigger', 'Push by Zapier', 'GHL Manual Start', 'trigger: manualClick', 'Runs workflow on demand when clicking Execute Workflow on the canvas', 2),
  makeCore('core_chat_trigger', 'Core Triggers', 'trigger', 'message-square', 'On Chat Message (AI Chat Trigger)', '@n8n/n8n-nodes-langchain.chatTrigger', 'builtin:ChatWebhook', 'Chatbots by Zapier', 'GHL Live Chat Trigger', 'trigger: onChatMessage', 'Starts workflow when a user sends a message in a hosted or embedded chat widget', 5),
  makeCore('core_form_trigger', 'Core Triggers', 'trigger', 'file-text', 'On Form Submission (n8n Form)', 'n8n-nodes-base.formTrigger', 'builtin:FormTrigger', 'Interfaces Form Trigger', 'GHL Form Submitted Trigger', 'trigger: onFormSubmit', 'Generates a hosted web form and starts the workflow when a user submits it', 5),
  makeCore('core_subworkflow_trigger', 'Core Triggers', 'trigger', 'play', 'When Executed by Another Workflow', 'n8n-nodes-base.executeWorkflowTrigger', 'builtin:SubScenario', 'Sub-Zap by Zapier', 'GHL Chained Workflow Trigger', 'trigger: onCalledByParentWorkflow', 'Starts when called as a reusable modular sub-workflow by another workflow', 5),
  makeCore('core_error_trigger', 'Core Triggers', 'trigger', 'error', 'On Workflow Error (Error Trigger)', 'n8n-nodes-base.errorTrigger', 'builtin:BreakError', 'Zapier Manager Error', 'GHL Error Handler Trigger', 'trigger: onWorkflowError', 'Triggers automatically when any linked production workflow fails or throws an error', 6),
  makeCore('core_imap_email_trigger', 'Core Triggers', 'trigger', 'mail', 'On Email Received (IMAP Trigger)', 'n8n-nodes-base.emailReadImap', 'email:WatchEmails', 'Email by Zapier Trigger', 'GHL Inbound Email Trigger', 'trigger: onImapEmailReceived', 'Listens to any standard IMAP mailbox for new incoming emails and attachments', 4),
  makeCore('core_rss_trigger', 'Core Triggers', 'trigger', 'globe', 'On RSS Feed Update Trigger', 'n8n-nodes-base.rssFeedReadTrigger', 'rss:WatchFeedItems', 'RSS New Item Trigger', 'GHL RSS Poll Trigger', 'trigger: onNewRssItem', 'Polls an RSS or Atom feed URL and triggers when new articles are published', 4),
  makeCore('core_sse_trigger', 'Core Triggers', 'trigger', 'globe', 'On Server-Sent Events (SSE Trigger)', 'n8n-nodes-base.sseTrigger', 'http:WatchSSE', 'SSE Stream Trigger', 'GHL Real-time Stream Trigger', 'trigger: onSseEvent', 'Listens to a real-time Server-Sent Events (SSE) stream URL and triggers on events', 4),
  makeCore('core_local_file_trigger', 'Core Triggers', 'trigger', 'drive', 'On Local File / Folder Change Trigger', 'n8n-nodes-base.localFileTrigger', 'builtin:WatchFolder', 'Folder Watcher Trigger', 'GHL File Drop Trigger', 'trigger: onFileCreatedOrModified', 'Watches a local or mounted directory for file creation, modification, or deletion', 4),
  makeCore('core_queue_mqtt_trigger', 'Core Triggers', 'trigger', 'server', 'On Queue / MQTT / Kafka Event Trigger', 'n8n-nodes-base.mqttTrigger', 'mqtt:WatchTopic', 'Queue Message Trigger', 'GHL Event Bus Trigger', 'trigger: onQueueTopicMessage', 'Triggers in real time when a message is published to an MQTT, RabbitMQ, or Kafka topic', 5),
  makeCore('core_workflow_lifecycle_trigger', 'Core Triggers', 'trigger', 'zap', 'On Workflow Activated / Instance Start', 'n8n-nodes-base.n8nTrigger', 'builtin:OnScenarioActivated', 'Zap Activated Trigger', 'GHL Campaign Activated', 'trigger: onInstanceOrWorkflowStart', 'Triggers when the workflow is activated or when the automation server starts up', 3),
  makeCore('core_calendar_trigger', 'Core Triggers', 'trigger', 'calendar', 'On Calendar Event (Trigger)', 'n8n-nodes-base.calendarTrigger', 'builtin:CalendarTrigger', 'Event Start by Zapier', 'GHL Calendar Event Trigger', 'trigger: onEventStartOrEnd', 'Triggers workflow when a scheduled calendar event starts, ends, or is updated', 4),

  // Core Flow Control & Logic
  makeCore('core_switch', 'Flow Control & Logic', 'router', 'git-branch', 'Switch (Multi-Branch Router)', 'n8n-nodes-base.switch', 'builtin:BasicRouter', 'Paths by Zapier', 'GHL Multi-Branch Condition', 'router: switchRules', 'Routes items across multiple output branches based on rule conditions', 4),
  makeCore('core_if', 'Flow Control & Logic', 'router', 'split', 'If / Else Condition', 'n8n-nodes-base.if', 'builtin:Filter', 'Filter by Zapier', 'GHL If / Else Condition', 'router: ifTrueOrFalse', 'Splits workflow items into True or False conditional branches', 3),
  makeCore('core_merge', 'Flow Control & Logic', 'router', 'merge', 'Merge Branches', 'n8n-nodes-base.merge', 'builtin:Aggregator', 'Digest by Zapier', 'GHL Goal Convergence', 'router: append / combineBySql', 'Combines data from multiple parallel branches by key, position, or SQL', 4),
  makeCore('core_loop_batches', 'Flow Control & Logic', 'router', 'loop', 'Loop Over Items (Split in Batches)', 'n8n-nodes-base.splitInBatches', 'builtin:Iterator', 'Looping by Zapier', 'GHL Drip Batch Loop', 'loop: splitInBatches', 'Iterates over items in controlled batches with dual outputs (done & loop body)', 6, {
    isLoopNode: true,
    defaultLoopConfig: {
      mode: 'batch',
      batchSize: 10,
      arrayField: 'items',
      maxIterations: 100,
      pauseMs: 0,
      resetOnEachRun: false,
    },
  }),
  makeCore('core_loop_foreach', 'Flow Control & Logic', 'router', 'loop', 'For Each Item (Array Iterator)', 'n8n-nodes-base.splitInBatches', 'builtin:Iterator', 'Looping by Zapier (For Each)', 'GHL For-Each Contact Loop', 'loop: forEachItem', 'Loops 1 item at a time through the loop branch and returns to next item', 6, {
    isLoopNode: true,
    defaultLoopConfig: {
      mode: 'forEach',
      batchSize: 1,
      arrayField: 'data.records',
      maxIterations: 250,
      pauseMs: 0,
      resetOnEachRun: false,
    },
  }),
  makeCore('core_loop_while', 'Flow Control & Logic', 'router', 'loop', 'While / Pagination Loop (Condition)', 'n8n-nodes-base.splitInBatches', 'builtin:Repeater', 'Loop Until Condition', 'GHL Conditional Repeat Loop', 'loop: whileCondition', 'Repeats the loop branch while a condition or next_page cursor remains true', 7, {
    isLoopNode: true,
    defaultLoopConfig: {
      mode: 'while',
      batchSize: 1,
      conditionExpression: '{{ $json.hasNextPage === true }}',
      maxIterations: 50,
      pauseMs: 500,
      resetOnEachRun: true,
    },
  }),
  makeCore('core_loop_repeater', 'Flow Control & Logic', 'router', 'loop', 'Rate-Limited Drip Repeater (N Times)', 'n8n-nodes-base.splitInBatches', 'builtin:Repeater', 'Loop Counter by Zapier', 'GHL Drip Sequence Loop', 'loop: repeatCount', 'Executes the loop branch a fixed number of times with optional rate-limit delay', 5, {
    isLoopNode: true,
    defaultLoopConfig: {
      mode: 'repeat',
      batchSize: 5,
      maxIterations: 10,
      pauseMs: 1000,
      resetOnEachRun: false,
    },
  }),
  makeCore('core_wait', 'Flow Control & Logic', 'router', 'clock', 'Wait / Delay / Approval Pause', 'n8n-nodes-base.wait', 'builtin:Sleep', 'Delay by Zapier', 'GHL Wait Step', 'router: waitTimerOrWebhook', 'Pauses execution for a duration or until a webhook approval arrives', 3),
  makeCore('core_filter', 'Flow Control & Logic', 'router', 'filter', 'Filter Items', 'n8n-nodes-base.filter', 'builtin:FilterGate', 'Filter by Zapier', 'GHL Filter Check', 'router: keepMatchingItems', 'Removes items that do not match specified condition rules', 3),
  makeCore('core_execute_subworkflow', 'Flow Control & Logic', 'action', 'play', 'Execute Sub-Workflow (Action)', 'n8n-nodes-base.executeWorkflow', 'builtin:CallSubScenario', 'Call a Sub-Zap', 'GHL Add to Workflow', 'action: callSubWorkflow', 'Calls another reusable sub-workflow and awaits its output items', 5),
  makeCore('core_compare_datasets', 'Flow Control & Logic', 'router', 'split', 'Compare Datasets (Diff)', 'n8n-nodes-base.compareDatasets', 'builtin:CompareArrays', 'Formatter Compare', 'GHL Diff Check', 'router: compareAandB', 'Compares two input streams and outputs New, Updated, Same, or Removed items', 6),
  makeCore('core_stop_and_error', 'Flow Control & Logic', 'router', 'error', 'Stop and Error', 'n8n-nodes-base.stopAndError', 'builtin:ThrowError', 'Halt Zap', 'GHL Stop Workflow', 'router: throwCustomError', 'Intentionally halts execution and throws a custom error message', 2),

  // Core Data & Code Transform
  makeCore('core_code', 'Data & Code Transform', 'action', 'code', 'Code (JavaScript / Python)', 'n8n-nodes-base.code', 'builtin:CustomJS', 'Code by Zapier', 'GHL Custom Code', 'action: runJsOrPython', 'Write custom JavaScript or Python with full access to workflow items', 8),
  makeCore('core_set_edit_fields', 'Data & Code Transform', 'action', 'set', 'Edit Fields (Set)', 'n8n-nodes-base.set', 'builtin:SetVariables', 'Formatter by Zapier', 'GHL Set Custom Field', 'action: setFieldsMapping', 'Add, edit, rename, or keep only selected JSON fields on items', 4),
  makeCore('core_split_out', 'Data & Code Transform', 'action', 'json', 'Split Out Array', 'n8n-nodes-base.splitOut', 'builtin:Iterator', 'Formatter Line-Itemizer', 'GHL Split Array', 'action: nestedArrayToItems', 'Turns a nested array inside a single item into multiple separate items', 4),
  makeCore('core_aggregate', 'Data & Code Transform', 'action', 'json', 'Aggregate Items', 'n8n-nodes-base.aggregate', 'builtin:ArrayAggregator', 'Digest Append', 'GHL Aggregate List', 'action: itemsToSingleList', 'Groups separate items together into a single item array', 4),
  makeCore('core_summarize', 'Data & Code Transform', 'action', 'sheet', 'Summarize (Pivot Table)', 'n8n-nodes-base.summarize', 'builtin:NumericAggregator', 'Formatter Numbers', 'GHL Math Operation', 'action: sum / count / avg', 'Aggregates and pivots data like an Excel pivot table (Sum, Count, Min, Max)', 5),
  makeCore('core_remove_duplicates', 'Data & Code Transform', 'action', 'filter', 'Remove Duplicates', 'n8n-nodes-base.removeDuplicates', 'builtin:Deduplicate', 'Filter Deduplicate', 'GHL Deduplicate Contact', 'action: dedupeByField', 'Removes duplicate items within the current run or across previous executions', 4),
  makeCore('core_sort_limit', 'Data & Code Transform', 'action', 'set', 'Sort & Limit Items', 'n8n-nodes-base.sort', 'builtin:SortArray', 'Formatter Sort', 'GHL Sort List', 'action: sortAndLimit', 'Sorts items by key and slices top N results', 3),
  makeCore('core_datetime', 'Data & Code Transform', 'action', 'calendar', 'Date & Time Formatter', 'n8n-nodes-base.dateTime', 'builtin:DateTime', 'Formatter Date/Time', 'GHL Date Formatter', 'action: formatOrAddDate', 'Formats timestamps, converts timezones, and calculates date offsets', 3),
  makeCore('core_calendar', 'Data & Code Transform', 'action', 'calendar', 'Calendar & Event Scheduler', 'n8n-nodes-base.calendar', 'builtin:Calendar', 'Calendar by Zapier', 'GHL Calendar Action', 'action: createOrUpdateEvent', 'Creates calendar events, checks availability slots, and calculates schedule intervals', 5),
  makeCore('core_crypto', 'Data & Code Transform', 'action', 'terminal', 'Crypto (Hash / HMAC / Sign)', 'n8n-nodes-base.crypto', 'builtin:Encryptor', 'Formatter Crypto', 'GHL HMAC Generator', 'action: sha256 / hmac / uuid', 'Generates SHA/MD5 hashes, HMAC signatures, and cryptographic tokens', 4),
  makeCore('core_html_markdown_xml', 'Data & Code Transform', 'action', 'file-text', 'HTML / Markdown / XML Parser', 'n8n-nodes-base.html', 'builtin:TextParser', 'Formatter HTML/Markdown', 'GHL Text Parser', 'action: cssSelector / toMarkdown', 'Extracts DOM elements via CSS selectors or converts HTML <-> Markdown/XML', 5),
  makeCore('core_extract_convert_file', 'Data & Code Transform', 'action', 'drive', 'Extract From / Convert to File', 'n8n-nodes-base.extractFromFile', 'builtin:CSVParser', 'CSV Utilities', 'GHL File Parser', 'action: csv / xlsx / pdf / json', 'Reads binary CSV, XLSX, PDF, or JSON files into structured items or vice versa', 6),

  // Core HTTP & Network
  makeCore('core_http_request', 'HTTP & Core Network', 'action', 'globe', 'HTTP Request (REST API)', 'n8n-nodes-base.httpRequest', 'http:ActionSendData', 'Webhooks Custom Request', 'GHL Custom Webhook POST', 'action: httpRequest (GET/POST/PUT)', 'Universal REST/HTTP client with cURL import, pagination, and auth', 7),
  makeCore('core_respond_webhook', 'HTTP & Core Network', 'action', 'terminal', 'Respond to Webhook', 'n8n-nodes-base.respondToWebhook', 'gateway:WebhookResponse', 'Webhooks Response', 'GHL Webhook Response', 'action: respondToWebhook (JSON)', 'Returns custom status codes, headers, or JSON to the webhook caller', 3),
  makeCore('core_graphql', 'HTTP & Core Network', 'action', 'code', 'GraphQL Request', 'n8n-nodes-base.graphql', 'graphql:Query', 'GraphQL Request', 'GHL GraphQL Webhook', 'action: graphqlQueryOrMutation', 'Executes typed GraphQL queries and mutations with variables', 5),
  makeCore('core_ssh_ftp_command', 'HTTP & Core Network', 'action', 'terminal', 'SSH / SFTP / Execute Command', 'n8n-nodes-base.ssh', 'ssh:ExecuteCommand', 'SSH Runner', 'GHL Remote Script', 'action: execCommand / sftpUpload', 'Runs remote shell commands over SSH or transfers files via FTP/SFTP', 6),
  makeCore('core_rss_read', 'HTTP & Core Network', 'action', 'globe', 'RSS Read (Fetch Feed)', 'n8n-nodes-base.rssFeedRead', 'rss:ReadFeed', 'RSS by Zapier', 'GHL RSS Feed Read', 'action: fetchFeedItems', 'Fetches and parses syndication items from any RSS or Atom feed', 3),

  // Core AI & LangChain (Main AI Agents + Sub-Nodes for LLM, Memory, MCP/Tools, and Output Parsers)
  makeCore('core_ai_agent', 'Core AI & LangChain', 'ai', 'bot', 'AI Agent', '@n8n/n8n-nodes-langchain.agent', 'ai:AgentModule', 'AI Agent by Zapier', 'GHL Conversation AI Agent', 'ai: toolsAgent', 'Autonomous AI Agent connecting Chat Model (LLM), Memory, MCP / Tools, and Output Parser', 14),
  makeCore('core_llm_chain', 'Core AI & LangChain', 'ai', 'sparkles', 'Basic LLM / Q&A Chain', '@n8n/n8n-nodes-langchain.chainLlm', 'ai:PromptChain', 'AI Prompt Chain', 'GHL Prompt Action', 'ai: llmPromptChain', 'Executes a prompt template with connected Chat Model and Output Parser', 9),
  makeCore('core_info_extractor', 'Core AI & LangChain', 'ai', 'sparkles', 'Information Extractor (JSON)', '@n8n/n8n-nodes-langchain.informationExtractor', 'ai:StructuredOutput', 'Extract Structured Data', 'GHL AI Field Extractor', 'ai: strictJsonSchema', 'Extracts structured JSON fields from unstructured text, emails, or PDFs', 10),
  makeCore('core_text_classifier', 'Core AI & LangChain', 'ai', 'cpu', 'Text Classifier & Sentiment', '@n8n/n8n-nodes-langchain.textClassifier', 'ai:Classifier', 'AI Text Classifier', 'GHL AI Intent Classifier', 'ai: multiCategoryClassifier', 'Classifies incoming text into defined categories and analyzes sentiment', 8),

  // AI Agent Sub-Nodes: 1. Chat Models (LLM)
  makeCore('ai_llm_gemini', 'Core AI & LangChain', 'ai', 'sparkles', 'Gemini 2.5 Chat Model', '@n8n/n8n-nodes-langchain.lmChatGoogleGemini', 'google-ai:GeminiChat', 'Google Gemini LLM', 'GHL Gemini Model', 'llm: gemini-2.5-pro', 'Google Gemini 2.5 Pro / Flash Chat Model connected to AI Agent', 8, {
    aiSubNodeType: 'llm',
  }),
  makeCore('ai_llm_ollama', 'Core AI & LangChain', 'ai', 'cpu', 'Ollama / Local LLM Model', '@n8n/n8n-nodes-langchain.lmChatOllama', 'ollama:LocalChat', 'Local LLM Webhook', 'GHL Custom LLM', 'llm: llama-3.3 / qwen', 'Self-hosted local LLM connected to AI Agent', 8, {
    aiSubNodeType: 'llm',
  }),

  // AI Agent Sub-Nodes: 2. Memory
  makeCore('core_memory_buffer', 'Core AI & LangChain', 'ai', 'database', 'Window Buffer Memory', '@n8n/n8n-nodes-langchain.memoryBufferWindow', 'ai:ThreadMemory', 'AI Conversation Memory', 'GHL Contact Thread Memory', 'memory: bufferWindow (k=10)', 'Stores sliding window multi-turn conversation history for AI Agent', 5, {
    aiSubNodeType: 'memory',
  }),
  makeCore('ai_memory_postgres', 'Core AI & LangChain', 'ai', 'server', 'Postgres Chat Memory', '@n8n/n8n-nodes-langchain.memoryPostgresChat', 'postgres:ChatMemory', 'Postgres Thread Memory', 'GHL SQL Thread Memory', 'memory: postgresChatHistory', 'Persists long-term AI Agent conversation sessions in PostgreSQL', 6, {
    aiSubNodeType: 'memory',
  }),
  makeCore('ai_memory_redis', 'Core AI & LangChain', 'ai', 'database', 'Redis / Upstash Memory', '@n8n/n8n-nodes-langchain.memoryRedisChat', 'redis:ChatMemory', 'Redis Session Memory', 'GHL Fast Cache Memory', 'memory: redisSessionStore', 'Low-latency in-memory Redis chat history for AI Agent', 6, {
    aiSubNodeType: 'memory',
  }),

  // AI Agent Sub-Nodes: 3. MCP & Agent Tools
  makeCore('ai_tool_mcp_client', 'Core AI & LangChain', 'ai', 'terminal', 'MCP Client Tool', '@n8n/n8n-nodes-langchain.mcpClientTool', 'mcp:ClientTool', 'MCP Server Tool', 'GHL MCP Tool Connector', 'tool: mcpClient (SSE / Stdio)', 'Connects external Model Context Protocol (MCP) servers & tools to AI Agent', 10, {
    aiSubNodeType: 'tool',
  }),
  makeCore('ai_tool_mcp_server', 'Core AI & LangChain', 'ai', 'server', 'MCP Tool Bridge', '@n8n/n8n-nodes-langchain.mcpTrigger', 'mcp:ServerBridge', 'MCP Tool Bridge', 'GHL MCP Endpoint', 'tool: mcpToolServer', 'Exposes or bridges MCP tools (Filesystem, GitHub, Brave, Slack, DB) to AI Agent', 9, {
    aiSubNodeType: 'tool',
  }),
  makeCore('core_vector_retriever', 'Core AI & LangChain', 'ai', 'search', 'Vector Store RAG Tool', '@n8n/n8n-nodes-langchain.toolVectorStore', 'ai:VectorRetriever', 'Vector Lookup Tool', 'GHL Knowledge Base Lookup', 'tool: semanticTopKRetriever', 'Retrieves relevant document chunks from a vector database for AI Agent RAG', 7, {
    aiSubNodeType: 'tool',
  }),
  makeCore('ai_tool_http', 'Core AI & LangChain', 'ai', 'globe', 'HTTP Request Tool', '@n8n/n8n-nodes-langchain.toolHttpRequest', 'http:AgentTool', 'API Request Tool', 'GHL Custom Webhook Tool', 'tool: httpApiCall', 'Allows the AI Agent to autonomously call external REST APIs', 7, {
    aiSubNodeType: 'tool',
  }),
  makeCore('ai_tool_code', 'Core AI & LangChain', 'ai', 'code', 'Custom Code Tool', '@n8n/n8n-nodes-langchain.toolCode', 'code:AgentTool', 'Code Interpreter Tool', 'GHL Custom Script Tool', 'tool: executeJsOrPython', 'Lets the AI Agent execute custom JavaScript or Python functions as a tool', 8, {
    aiSubNodeType: 'tool',
  }),
  makeCore('ai_tool_web_search', 'Core AI & LangChain', 'ai', 'search', 'Web Search Tool', '@n8n/n8n-nodes-langchain.toolSerpApi', 'search:WebSearchTool', 'Web Search Tool', 'GHL Live Web Search', 'tool: liveWebSearch', 'Gives the AI Agent live Google / Perplexity / Tavily web search capabilities', 6, {
    aiSubNodeType: 'tool',
  }),
  makeCore('ai_tool_subworkflow', 'Core AI & LangChain', 'ai', 'play', 'Call Workflow Tool', '@n8n/n8n-nodes-langchain.toolWorkflow', 'builtin:SubScenarioTool', 'Sub-Zap Tool', 'GHL Sub-Workflow Tool', 'tool: callSubWorkflow', 'Allows the AI Agent to trigger another workflow as a callable tool', 7, {
    aiSubNodeType: 'tool',
  }),

  // AI Agent Sub-Nodes: 4. Output Parsers
  makeCore('ai_parser_structured_json', 'Core AI & LangChain', 'ai', 'json', 'Structured JSON Parser', '@n8n/n8n-nodes-langchain.outputParserStructured', 'ai:JsonSchemaParser', 'Structured JSON Parser', 'GHL JSON Output Parser', 'parser: strictJsonSchema', 'Enforces a strict JSON Schema on the AI Agent output response', 6, {
    aiSubNodeType: 'parser',
  }),
  makeCore('ai_parser_autofix', 'Core AI & LangChain', 'ai', 'sparkles', 'Auto-Fixing Output Parser', '@n8n/n8n-nodes-langchain.outputParserAutofixing', 'ai:AutoFixParser', 'Auto-Retry Parser', 'GHL Auto-Fix JSON Parser', 'parser: autoFixMalformedJson', 'Automatically re-prompts LLM if output fails schema validation', 6, {
    aiSubNodeType: 'parser',
  }),
  makeCore('ai_parser_item_list', 'Core AI & LangChain', 'ai', 'set', 'Item List Output Parser', '@n8n/n8n-nodes-langchain.outputParserItemList', 'ai:ListParser', 'Array List Parser', 'GHL List Output Parser', 'parser: arrayItemList', 'Parses AI Agent response into a clean array of separate workflow items', 5, {
    aiSubNodeType: 'parser',
  }),

  // ============================================================================
  // 2. EXTERNAL APP INTEGRATIONS — CATEGORIZED BY APP PLATFORM (Triggers + Actions)
  // ============================================================================

  // --- Platform: 'Gmail' (3 Triggers + 5 Actions) ---
  makeApp('gmail_trigger_received', 'Gmail', 'Google Workspace', 'trigger', 'mail', 'Gmail: On Message Received', 'n8n-nodes-base.gmailTrigger', 'trigger: onMessageReceived', 'Triggers workflow when a new email arrives matching Gmail search filters', 5),
  makeApp('gmail_trigger_labeled', 'Gmail', 'Google Workspace', 'trigger', 'mail', 'Gmail: On Label Added to Thread', 'n8n-nodes-base.gmailTrigger', 'trigger: onLabelAdded', 'Triggers when a specific Gmail label (e.g. VIP, AI-Reply) is applied to an email', 4),
  makeApp('gmail_trigger_attachment', 'Gmail', 'Google Workspace', 'trigger', 'mail', 'Gmail: On New Attachment Received', 'n8n-nodes-base.gmailTrigger', 'trigger: onAttachmentReceived', 'Triggers when an email with PDF, CSV, or invoice attachments lands in Gmail', 5),
  makeApp('gmail_send_email', 'Gmail', 'Google Workspace', 'action', 'mail', 'Gmail: Send a Message', 'n8n-nodes-base.gmail', 'action: message.send', 'Sends a new HTML or plain-text email with attachments via Gmail', 8),
  makeApp('gmail_reply_email', 'Gmail', 'Google Workspace', 'action', 'mail', 'Gmail: Reply to Thread', 'n8n-nodes-base.gmail', 'action: message.reply', 'Replies inline to an existing Gmail thread preserving Message-ID headers', 7),
  makeApp('gmail_create_draft', 'Gmail', 'Google Workspace', 'action', 'mail', 'Gmail: Create a Draft', 'n8n-nodes-base.gmail', 'action: draft.create', 'Creates an AI-drafted reply inside Gmail Drafts for human review', 6),
  makeApp('gmail_get_many', 'Gmail', 'Google Workspace', 'action', 'mail', 'Gmail: Get Many Messages', 'n8n-nodes-base.gmail', 'action: message.getAll', 'Searches and retrieves Gmail messages by query (e.g. is:unread label:VIP)', 5),
  makeApp('gmail_add_label', 'Gmail', 'Google Workspace', 'action', 'mail', 'Gmail: Add / Remove Thread Label', 'n8n-nodes-base.gmail', 'action: thread.addLabels', 'Organizes inbox threads automatically by applying or removing Gmail labels', 3),

  // --- Platform: 'Google Sheets' (3 Triggers + 4 Actions) ---
  makeApp('sheets_trigger_row_added', 'Google Sheets', 'Google Workspace', 'trigger', 'sheet', 'Sheets: On New Row Added', 'n8n-nodes-base.googleSheetsTrigger', 'trigger: onRowAdded', 'Triggers whenever a new row is appended to the bottom of a Google Sheet', 4),
  makeApp('sheets_trigger_row_updated', 'Google Sheets', 'Google Workspace', 'trigger', 'sheet', 'Sheets: On Existing Row Updated', 'n8n-nodes-base.googleSheetsTrigger', 'trigger: onRowUpdated', 'Triggers when any cell or status column in an existing Google Sheet row changes', 4),
  makeApp('sheets_trigger_row', 'Google Sheets', 'Google Workspace', 'trigger', 'sheet', 'Sheets: On Row Added or Updated', 'n8n-nodes-base.googleSheetsTrigger', 'trigger: onRowAddedOrUpdated', 'Watches a Google Sheet for both newly added rows and in-place cell edits', 4),
  makeApp('sheets_append_update', 'Google Sheets', 'Google Workspace', 'action', 'sheet', 'Sheets: Append or Update Row', 'n8n-nodes-base.googleSheets', 'action: sheet.appendOrUpdate', 'Appends a new row or updates an existing row by matching key column', 6),
  makeApp('sheets_get_rows', 'Google Sheets', 'Google Workspace', 'action', 'sheet', 'Sheets: Get Rows (Lookup)', 'n8n-nodes-base.googleSheets', 'action: sheet.readRows', 'Reads and filters rows from a Google Sheet range into workflow items', 5),
  makeApp('sheets_update_row', 'Google Sheets', 'Google Workspace', 'action', 'sheet', 'Sheets: Update Specific Row', 'n8n-nodes-base.googleSheets', 'action: sheet.updateRow', 'Updates cells in an existing spreadsheet row by row number or ID', 5),
  makeApp('sheets_create_clear', 'Google Sheets', 'Google Workspace', 'action', 'sheet', 'Sheets: Create / Clear Sheet Tab', 'n8n-nodes-base.googleSheets', 'action: spreadsheet.createOrClear', 'Creates a new worksheet tab or clears an existing range', 4),

  // --- Platform: 'Notion' (2 Triggers + 4 Actions) ---
  makeApp('notion_trigger_page', 'Notion', 'Notion & Productivity', 'trigger', 'notion', 'Notion: On Page Added to Database', 'n8n-nodes-base.notionTrigger', 'trigger: onDatabasePageCreated', 'Triggers when a new page item is created inside a Notion database', 4),
  makeApp('notion_trigger_updated', 'Notion', 'Notion & Productivity', 'trigger', 'notion', 'Notion: On Database Page Updated', 'n8n-nodes-base.notionTrigger', 'trigger: onDatabasePageUpdated', 'Triggers when properties or status change on a page in a Notion database', 4),
  makeApp('notion_create_page', 'Notion', 'Notion & Productivity', 'action', 'notion', 'Notion: Create Database Page', 'n8n-nodes-base.notion', 'action: databasePage.create', 'Creates a new item in a Notion database with typed properties', 7),
  makeApp('notion_query_db', 'Notion', 'Notion & Productivity', 'action', 'notion', 'Notion: Get Many Database Pages', 'n8n-nodes-base.notion', 'action: databasePage.getAll', 'Queries a Notion database with compound filters and sorting rules', 6),
  makeApp('notion_update_page', 'Notion', 'Notion & Productivity', 'action', 'notion', 'Notion: Update Database Page', 'n8n-nodes-base.notion', 'action: databasePage.update', 'Updates status, tags, relations, or custom properties on a Notion page', 5),
  makeApp('notion_append_blocks', 'Notion', 'Notion & Productivity', 'action', 'notion', 'Notion: Append Block Content', 'n8n-nodes-base.notion', 'action: block.append', 'Appends headings, callouts, to-do lists, or code blocks to a Notion page', 6),

  // --- Platform: 'GoHighLevel' (4 Triggers + 4 Actions) ---
  makeApp('ghl_trigger_webhook', 'GoHighLevel', 'CRM, Sales & Support', 'trigger', 'crm', 'GoHighLevel: On Contact Created / Updated', 'n8n-nodes-base.highLevel', 'trigger: onContactChanged', 'Triggers when a contact is created, tagged, or updated in GoHighLevel CRM', 5),
  makeApp('ghl_trigger_opportunity', 'GoHighLevel', 'CRM, Sales & Support', 'trigger', 'crm', 'GoHighLevel: On Pipeline Stage Changed', 'n8n-nodes-base.highLevel', 'trigger: onOpportunityStageChanged', 'Triggers when a deal moves stages or changes status in a GHL pipeline', 5),
  makeApp('ghl_trigger_appointment', 'GoHighLevel', 'CRM, Sales & Support', 'trigger', 'calendar', 'GoHighLevel: On Appointment Booked', 'n8n-nodes-base.highLevel', 'trigger: onAppointmentBooked', 'Triggers when a lead books, reschedules, or cancels a GHL calendar appointment', 5),
  makeApp('ghl_trigger_form', 'GoHighLevel', 'CRM, Sales & Support', 'trigger', 'file-text', 'GoHighLevel: On Funnel Form / Survey Submitted', 'n8n-nodes-base.highLevel', 'trigger: onFormOrSurveySubmitted', 'Triggers immediately when a prospect submits a GoHighLevel funnel form or survey', 5),
  makeApp('ghl_upsert_contact', 'GoHighLevel', 'CRM, Sales & Support', 'action', 'crm', 'GoHighLevel: Create or Update Contact', 'n8n-nodes-base.highLevel', 'action: contact.upsert', 'Upserts contact record, custom fields, and tags in GoHighLevel CRM', 7),
  makeApp('ghl_update_opportunity', 'GoHighLevel', 'CRM, Sales & Support', 'action', 'crm', 'GoHighLevel: Update Pipeline Opportunity', 'n8n-nodes-base.highLevel', 'action: opportunity.updateStage', 'Moves deal stage, updates monetary value, and assigns owner in GHL pipeline', 6),
  makeApp('ghl_book_appointment', 'GoHighLevel', 'CRM, Sales & Support', 'action', 'calendar', 'GoHighLevel: Book Calendar Appointment', 'n8n-nodes-base.highLevel', 'action: calendar.createAppointment', 'Books a confirmed slot on a GoHighLevel calendar for the prospect', 7),
  makeApp('ghl_add_note_task', 'GoHighLevel', 'CRM, Sales & Support', 'action', 'tasks', 'GoHighLevel: Add AI Call Note & Task', 'n8n-nodes-base.highLevel', 'action: task.createWithNote', 'Logs AI qualification summary notes and creates follow-up tasks in GHL', 5),

  // --- Platform: 'Slack' (2 Triggers + 3 Actions) ---
  makeApp('slack_trigger_event', 'Slack', 'Messaging, Social & Voice', 'trigger', 'message-square', 'Slack: On New Message in Channel', 'n8n-nodes-base.slackTrigger', 'trigger: onChannelMessage', 'Triggers when a message is posted in a public or private Slack channel', 4),
  makeApp('slack_trigger_reaction', 'Slack', 'Messaging, Social & Voice', 'trigger', 'message-square', 'Slack: On Reaction / Slash Command', 'n8n-nodes-base.slackTrigger', 'trigger: onReactionOrCommand', 'Triggers when a user reacts with an emoji or invokes a Slack slash command', 4),
  makeApp('slack_send_channel', 'Slack', 'Messaging, Social & Voice', 'action', 'message-square', 'Slack: Send Channel Block Message', 'n8n-nodes-base.slack', 'action: message.postMessage', 'Posts rich Block Kit notifications and interactive buttons to a Slack channel', 5),
  makeApp('slack_send_dm', 'Slack', 'Messaging, Social & Voice', 'action', 'message-square', 'Slack: Send Direct Message', 'n8n-nodes-base.slack', 'action: message.postDirectMessage', 'Sends a private direct message alert to a specific Slack user', 4),
  makeApp('slack_upload_file', 'Slack', 'Messaging, Social & Voice', 'action', 'drive', 'Slack: Upload File / Report', 'n8n-nodes-base.slack', 'action: file.upload', 'Uploads generated CSVs, PDFs, or screenshots into a Slack thread', 4),

  // --- Platform: 'Airtable' (1 Trigger + 2 Actions) ---
  makeApp('airtable_trigger', 'Airtable', 'Notion & Productivity', 'trigger', 'sheet', 'Airtable: On New or Updated Record', 'n8n-nodes-base.airtableTrigger', 'trigger: onRecordChanged', 'Triggers when a record is created or modified inside an Airtable base', 4),
  makeApp('airtable_upsert', 'Airtable', 'Notion & Productivity', 'action', 'sheet', 'Airtable: Upsert Record', 'n8n-nodes-base.airtable', 'action: record.upsert', 'Creates a new Airtable record or updates matching record fields', 6),
  makeApp('airtable_search', 'Airtable', 'Notion & Productivity', 'action', 'search', 'Airtable: Search Records by Formula', 'n8n-nodes-base.airtable', 'action: record.listWithFormula', 'Queries Airtable records using filterByFormula expressions', 5),

  // --- Platform: 'HubSpot' (1 Trigger + 2 Actions) ---
  makeApp('hubspot_trigger', 'HubSpot', 'CRM, Sales & Support', 'trigger', 'crm', 'HubSpot: On Contact or Deal Updated', 'n8n-nodes-base.hubspotTrigger', 'trigger: onCrmObjectChanged', 'Triggers on HubSpot contact creation, deal stage movement, or form submit', 5),
  makeApp('hubspot_upsert_contact', 'HubSpot', 'CRM, Sales & Support', 'action', 'crm', 'HubSpot: Create or Update Contact', 'n8n-nodes-base.hubspot', 'action: contact.upsert', 'Creates or updates a HubSpot contact with enriched properties', 6),
  makeApp('hubspot_create_deal', 'HubSpot', 'CRM, Sales & Support', 'action', 'crm', 'HubSpot: Create / Update Deal', 'n8n-nodes-base.hubspot', 'action: deal.createOrUpdate', 'Creates or advances a revenue deal in HubSpot pipelines', 7),

  // --- Platform: 'Stripe' (1 Trigger + 2 Actions) ---
  makeApp('stripe_trigger', 'Stripe', 'Finance & E-Commerce', 'trigger', 'stripe', 'Stripe: On Payment or Subscription Event', 'n8n-nodes-base.stripeTrigger', 'trigger: invoicePaid / checkoutCompleted', 'Triggers on checkout.session.completed, invoice.paid, or failed charges', 5),
  makeApp('stripe_create_invoice', 'Stripe', 'Finance & E-Commerce', 'action', 'stripe', 'Stripe: Create Invoice & Payment Link', 'n8n-nodes-base.stripe', 'action: invoice.createAndSend', 'Generates a Stripe customer, invoice line items, and hosted payment URL', 8),
  makeApp('stripe_customer_sync', 'Stripe', 'Finance & E-Commerce', 'action', 'stripe', 'Stripe: Create / Update Customer', 'n8n-nodes-base.stripe', 'action: customer.upsert', 'Syncs billing metadata and subscription status on Stripe Customer objects', 5),

  // --- Platform: 'Supabase' (1 Trigger + 3 Actions) ---
  makeApp('supabase_trigger_row', 'Supabase', 'Databases, Vectors & Cloud', 'trigger', 'database', 'Supabase: On Table Row Inserted / Updated', 'n8n-nodes-base.supabase', 'trigger: onRealtimeRowChange', 'Triggers via Supabase Database Webhook when a row is inserted or updated', 5),
  makeApp('supabase_insert_row', 'Supabase', 'Databases, Vectors & Cloud', 'action', 'database', 'Supabase: Insert / Upsert Row', 'n8n-nodes-base.supabase', 'action: row.createOrUpdate', 'Inserts or upserts structured rows into a Supabase Postgres table', 6),
  makeApp('supabase_get_rows', 'Supabase', 'Databases, Vectors & Cloud', 'action', 'database', 'Supabase: Get Many Rows (Filter)', 'n8n-nodes-base.supabase', 'action: row.getAll', 'Queries rows from Supabase using PostgREST filter operators', 5),
  makeApp('supabase_vector_store', 'Supabase', 'Databases, Vectors & Cloud', 'ai', 'cloud', 'Supabase: pgvector Similarity Search', '@n8n/n8n-nodes-langchain.vectorStoreSupabase', 'ai: vector.matchDocuments', 'Stores and queries OpenAI/Gemini vector embeddings inside Supabase pgvector', 8, {
    aiSubNodeType: 'tool',
  }),

  // --- Platform: 'Google Drive', 'Google Calendar', 'Google Docs' ---
  makeApp('drive_trigger', 'Google Drive', 'Google Workspace', 'trigger', 'drive', 'Google Drive: On File Created or Updated', 'n8n-nodes-base.googleDriveTrigger', 'trigger: onFileCreatedOrUpdated', 'Triggers when a new file or PDF is uploaded or modified in a watched Drive folder', 4),
  makeApp('drive_upload', 'Google Drive', 'Google Workspace', 'action', 'drive', 'Google Drive: Upload / Create Folder', 'n8n-nodes-base.googleDrive', 'action: file.upload / createFolder', 'Creates client folders, uploads files, and sets Drive sharing permissions', 5),
  makeApp('gcal_trigger', 'Google Calendar', 'Google Workspace', 'trigger', 'calendar', 'Google Calendar: On Event Created / Starting', 'n8n-nodes-base.googleCalendarTrigger', 'trigger: onEventCreatedOrStarting', 'Triggers when a new meeting is scheduled or X minutes before it starts', 4),
  makeApp('gcal_create_event', 'Google Calendar', 'Google Workspace', 'action', 'calendar', 'Google Calendar: Create Event + Meet', 'n8n-nodes-base.googleCalendar', 'action: event.createWithMeet', 'Checks availability and schedules a calendar event with Google Meet', 5),
  makeApp('gdocs_create', 'Google Docs', 'Google Workspace', 'action', 'file-text', 'Google Docs: Create Doc from Template', 'n8n-nodes-base.googleDocs', 'action: document.createFromTemplate', 'Generates contracts, SOWs, and briefs by replacing Google Docs variables', 8),

  // --- Platform: 'Telegram', 'Discord', 'WhatsApp' ---
  makeApp('telegram_trigger', 'Telegram', 'Messaging, Social & Voice', 'trigger', 'telegram', 'Telegram: On Bot Message / Callback', 'n8n-nodes-base.telegramTrigger', 'trigger: onMessageOrCallback', 'Triggers when a user messages your Telegram bot or clicks an inline button', 4),
  makeApp('telegram_send', 'Telegram', 'Messaging, Social & Voice', 'action', 'telegram', 'Telegram: Send Message / Photo / Audio', 'n8n-nodes-base.telegram', 'action: message.sendMessage', 'Sends messages, inline keyboards, images, or voice notes via Telegram Bot', 5),
  makeApp('discord_trigger', 'Discord', 'Messaging, Social & Voice', 'trigger', 'discord', 'Discord: On Channel Message / Member Join', 'n8n-nodes-base.discord', 'trigger: onMessageOrMemberJoin', 'Triggers when a message is posted in Discord or a new member joins the server', 4),
  makeApp('discord_send', 'Discord', 'Messaging, Social & Voice', 'action', 'discord', 'Discord: Send Rich Embed / Manage Role', 'n8n-nodes-base.discord', 'action: message.sendEmbed', 'Posts rich embed alerts to Discord channels or assigns member roles', 4),
  makeApp('whatsapp_trigger', 'WhatsApp', 'Messaging, Social & Voice', 'trigger', 'phone', 'WhatsApp: On Inbound Customer Message', 'n8n-nodes-base.whatsAppTrigger', 'trigger: onMessageReceived', 'Triggers when a customer sends a text, voice note, or button reply on WhatsApp', 5),
  makeApp('whatsapp_send', 'WhatsApp', 'Messaging, Social & Voice', 'action', 'phone', 'WhatsApp: Send Template / Media Message', 'n8n-nodes-base.whatsApp', 'action: message.sendTemplate', 'Sends official Meta WhatsApp Business templates and interactive messages', 6),

  // --- Platform: 'OpenAI', 'DeepSeek', 'Anthropic Claude' ---
  makeApp('openai_chat', 'OpenAI', 'AI Models, Search & Scraping', 'ai', 'sparkles', 'OpenAI Chat Model (GPT-4o)', '@n8n/n8n-nodes-langchain.lmChatOpenAi', 'llm: gpt-4o', 'OpenAI GPT-4o Chat Model connected to AI Agent', 10, {
    aiSubNodeType: 'llm',
  }),
  makeApp('openai_whisper', 'OpenAI', 'AI Models, Search & Scraping', 'action', 'voice', 'OpenAI: Transcribe Audio (Whisper)', '@n8n/n8n-nodes-langchain.openAi', 'action: audio.transcribeWhisper', 'Transcribes voice notes, meetings, and call recordings into text via Whisper', 9),
  makeApp('deepseek_chat', 'DeepSeek', 'AI Models, Search & Scraping', 'ai', 'cpu', 'DeepSeek R1 / V3 Chat Model', '@n8n/n8n-nodes-langchain.lmChatDeepSeek', 'llm: deepseek-reasoner', 'DeepSeek V3 / R1 Reasoner Chat Model connected to AI Agent', 12, {
    aiSubNodeType: 'llm',
  }),
  makeApp('claude_chat', 'Anthropic Claude', 'AI Models, Search & Scraping', 'ai', 'bot', 'Claude 3.7 Sonnet Chat Model', '@n8n/n8n-nodes-langchain.lmChatAnthropic', 'llm: claude-3-7-sonnet', 'Anthropic Claude Sonnet Chat Model connected to AI Agent', 11, {
    aiSubNodeType: 'llm',
  }),

  // --- Platform: 'Linear', 'Shopify', 'Postgres', 'Typeform & Calendly', 'GitHub & DevOps' ---
  makeApp('linear_trigger', 'Linear', 'Project Mgmt & DevOps', 'trigger', 'tasks', 'Linear: On Issue Created or Updated', 'n8n-nodes-base.linearTrigger', 'trigger: onIssueChanged', 'Triggers when an engineering issue or bug changes status in Linear', 4),
  makeApp('linear_issue', 'Linear', 'Project Mgmt & DevOps', 'action', 'tasks', 'Linear: Create / Update Issue', 'n8n-nodes-base.linear', 'action: issue.createOrUpdate', 'Creates engineering issues, assigns cycles, and syncs bug states in Linear', 5),
  makeApp('shopify_trigger', 'Shopify', 'Finance & E-Commerce', 'trigger', 'shopify', 'Shopify: On Order Created / Paid / Cancelled', 'n8n-nodes-base.shopifyTrigger', 'trigger: onOrderEvent', 'Triggers when a customer places an order, completes checkout, or abandons cart', 5),
  makeApp('shopify_order', 'Shopify', 'Finance & E-Commerce', 'action', 'shopify', 'Shopify: Update Order & Fulfillment', 'n8n-nodes-base.shopify', 'action: order.updateFulfillment', 'Processes Shopify orders, updates customer tags, and syncs inventory', 7),
  makeApp('postgres_trigger', 'Postgres', 'Databases, Vectors & Cloud', 'trigger', 'server', 'Postgres: On Row Insert / LISTEN Notify', 'n8n-nodes-base.postgresTrigger', 'trigger: onPgNotifyOrInsert', 'Triggers when a PostgreSQL table fires a LISTEN/NOTIFY or row insert event', 5),
  makeApp('postgres_sql', 'Postgres', 'Databases, Vectors & Cloud', 'action', 'server', 'Postgres: Execute SQL / Upsert', 'n8n-nodes-base.postgres', 'action: query.executeSql', 'Executes parameterized SQL queries and batch upserts in PostgreSQL', 6),
  makeApp('typeform_calendly_trigger', 'Typeform & Calendly', 'Marketing & Outreach', 'trigger', 'calendar', 'Typeform / Tally / Calendly: On Submission', 'n8n-nodes-base.typeformTrigger', 'trigger: onFormOrBookingSubmit', 'Triggers when a lead submits a Typeform/Tally form or books a Calendly meeting', 5),
  makeApp('github_trigger', 'GitHub & DevOps', 'Project Mgmt & DevOps', 'trigger', 'code', 'GitHub / GitLab: On Push, PR, or Issue', 'n8n-nodes-base.githubTrigger', 'trigger: onRepoEvent', 'Triggers on repository push, pull request review, release, or issue creation', 4),
  makeApp('github_repo', 'GitHub & DevOps', 'Project Mgmt & DevOps', 'action', 'code', 'GitHub / GitLab: Create Issue / Dispatch', 'n8n-nodes-base.github', 'action: issue.createOrDispatch', 'Creates repository issues, PR comments, and triggers CI/CD workflows', 6),
];

export function getAiAgentSubNodesBySlot(
  slot: 'llm' | 'memory' | 'tool' | 'parser'
): LibraryNodeTemplate[] {
  return N8N_FULL_INTEGRATIONS_CATALOG.filter(
    (t) => t.aiSubNodeType === slot
  );
}

/**
 * Returns all Trigger and Action templates available for a given platform (e.g. 'Gmail', 'Google Sheets', 'Notion', 'GoHighLevel', 'Core')
 * so the user can convert any node between a Trigger and an Action or switch its exact operation.
 */
export function getPlatformTriggersAndActions(
  appPlatform?: string,
  nodeGroup?: NodeGroupType
): {
  platformTriggers: LibraryNodeTemplate[];
  platformActions: LibraryNodeTemplate[];
  allTriggers: LibraryNodeTemplate[];
  allActions: LibraryNodeTemplate[];
} {
  const allTriggers = N8N_FULL_INTEGRATIONS_CATALOG.filter(
    (t) => t.role === 'trigger'
  );
  const allActions = N8N_FULL_INTEGRATIONS_CATALOG.filter(
    (t) => t.role !== 'trigger'
  );

  const normalizedPlatform =
    nodeGroup === 'core' ? 'Core' : appPlatform || 'Core';

  const platformTriggers = N8N_FULL_INTEGRATIONS_CATALOG.filter(
    (t) => t.appPlatform === normalizedPlatform && t.role === 'trigger'
  );
  const platformActions = N8N_FULL_INTEGRATIONS_CATALOG.filter(
    (t) => t.appPlatform === normalizedPlatform && t.role !== 'trigger'
  );

  return {
    platformTriggers,
    platformActions,
    allTriggers,
    allActions,
  };
}
