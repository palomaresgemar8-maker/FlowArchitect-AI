import type {
  AppSubCategory,
  BuiltInSubCategory,
  FlowNode,
  LibraryNodeTemplate,
  NodeGroupType,
  NodeRole,
  PlatformType,
} from '../types/workflow';
import {
  FEATURED_APP_PLATFORMS,
  getAiAgentSubNodesBySlot,
  getPlatformTriggersAndActions,
  N8N_FULL_INTEGRATIONS_CATALOG,
} from './n8nIntegrationsCatalog';
import {
  GHL_ACTION_CATEGORIES,
  GHL_BUILTIN_ACTIONS,
  GHL_BUILTIN_TRIGGERS,
  GHL_FULL_INTEGRATIONS_CATALOG,
  GHL_TRIGGER_CATEGORIES,
} from './ghlWorkflowCatalog';

export {
  FEATURED_APP_PLATFORMS,
  getAiAgentSubNodesBySlot,
  getPlatformTriggersAndActions,
  N8N_FULL_INTEGRATIONS_CATALOG,
  GHL_ACTION_CATEGORIES,
  GHL_BUILTIN_ACTIONS,
  GHL_BUILTIN_TRIGGERS,
  GHL_FULL_INTEGRATIONS_CATALOG,
  GHL_TRIGGER_CATEGORIES,
};

export const PLATFORM_META: Record<
  PlatformType,
  {
    name: string;
    shortLabel: string;
    coreTabLabel: string;
    appTabLabel: string;
    accentHex: string;
    description: string;
  }
> = {
  n8n: {
    name: 'n8n Workflow',
    shortLabel: 'n8n',
    coreTabLabel: 'Core (Built-in)',
    appTabLabel: 'App Integrations',
    accentHex: '#FF6D5A',
    description: 'Fair-code node graph with separated n8n Core nodes, LangChain AI, and App Connectors',
  },
  make: {
    name: 'Make.com Scenario',
    shortLabel: 'Make',
    coreTabLabel: 'Core (Built-in)',
    appTabLabel: 'App Modules',
    accentHex: '#9333EA',
    description: 'Visual scenario modules with Built-in Flow Control/Tools & App Modules',
  },
  zapier: {
    name: 'Zapier Zap',
    shortLabel: 'Zapier',
    coreTabLabel: 'Core (Built-in)',
    appTabLabel: 'App Connectors',
    accentHex: '#FF4F00',
    description: 'Built-in by Zapier utilities (Formatter, Paths, Webhooks, Code) + 7,000+ Apps',
  },
  ghl: {
    name: 'GoHighLevel Workflow',
    shortLabel: 'GoHighLevel',
    coreTabLabel: 'Core (Built-in)',
    appTabLabel: 'External Apps',
    accentHex: '#10B981',
    description: 'Native GHL Workflow triggers/logic separated from external SaaS app integrations',
  },
};

export const ALL_INTEGRATIONS_CATALOG: LibraryNodeTemplate[] = [
  ...N8N_FULL_INTEGRATIONS_CATALOG,
  ...GHL_FULL_INTEGRATIONS_CATALOG,
];

export const NODE_LIBRARY_TEMPLATES: LibraryNodeTemplate[] = ALL_INTEGRATIONS_CATALOG;

/**
 * Returns the node library catalog for the requested platform.
 * Keeps n8n and GHL native catalogs strictly separated.
 */
export function getPlatformNodeCatalog(platform: PlatformType): LibraryNodeTemplate[] {
  if (platform === 'ghl') {
    return GHL_FULL_INTEGRATIONS_CATALOG;
  }
  // For n8n, make, zapier - return fair-code n8n integrations catalog
  return N8N_FULL_INTEGRATIONS_CATALOG;
}

/**
 * Dynamically builds a valid LibraryNodeTemplate for ANY custom app or community node
 * so the user is never limited and can integrate any app from https://n8n.io/integrations/
 */
export function buildCustomIntegrationTemplate(
  appName: string,
  nodeGroup: NodeGroupType = 'app',
  role: NodeRole = 'action',
  category: BuiltInSubCategory | AppSubCategory = 'CRM, Sales & Support',
  operation = 'resource: executeAction',
  appPlatformOverride?: string
): LibraryNodeTemplate {
  const cleanName = appName.trim() || 'Custom App';
  const slug = cleanName
    .toLowerCase()
    .replace(/[^a-z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
    .replace(/[^a-zA-Z0-9]/g, '');

  const appPlatform =
    nodeGroup === 'core' ? 'Core' : appPlatformOverride || cleanName;

  return {
    id: `custom_${slug}_${Date.now().toString(36)}`,
    nodeGroup,
    appPlatform,
    category,
    role,
    iconName:
      role === 'trigger'
        ? 'webhook'
        : role === 'ai'
        ? 'sparkles'
        : role === 'router'
        ? 'git-branch'
        : 'zap',
    operation,
    defaultLabel: {
      n8n: cleanName,
      make: `${cleanName} Module`,
      zapier: `${cleanName} Action`,
      ghl: `${cleanName} Connector`,
    },
    defaultService: {
      n8n:
        nodeGroup === 'core'
          ? `n8n-nodes-base.${slug || 'coreNode'}`
          : `n8n-nodes-base.${slug || 'customApp'}`,
      make: `${slug || 'app'}:Action`,
      zapier: cleanName,
      ghl: `GHL ${cleanName}`,
    },
    subtitle: `${cleanName} integration node (${nodeGroup === 'core' ? 'Built-in Core' : `${appPlatform} App`})`,
    defaultEndpointUrl: `https://api.${slug.toLowerCase() || 'service'}.com/v1`,
    estimatedTimeSavedMins: 6,
  };
}

/**
 * Translates all nodes on the canvas to the target automation platform's native module terminology,
 * looking up matching templates from the unified integrations catalog first.
 */
export function translateNodesToPlatform(
  nodes: FlowNode[],
  targetPlatform: PlatformType
): FlowNode[] {
  return nodes.map((node) => {
    if (node.type === 'resizableGroup') {
      return {
        ...node,
        data: {
          ...node.data,
          platform: targetPlatform,
        },
      };
    }

    // 1. Check if node matches any template in ALL_INTEGRATIONS_CATALOG
    const currentService = String(node.data.serviceName || '').toLowerCase();
    const currentLabel = String(node.data.label || '').toLowerCase();

    const matchedTemplate = ALL_INTEGRATIONS_CATALOG.find((tpl) => {
      const services = Object.values(tpl.defaultService).map((s) => s.toLowerCase());
      const labels = Object.values(tpl.defaultLabel).map((l) => l.toLowerCase());
      return (
        services.includes(currentService) ||
        labels.some((l) => currentLabel.includes(l) || l.includes(currentLabel))
      );
    });

    if (matchedTemplate) {
      return {
        ...node,
        data: {
          ...node.data,
          platform: targetPlatform,
          serviceName: matchedTemplate.defaultService[targetPlatform],
          nodeGroup: matchedTemplate.nodeGroup,
          appPlatform: matchedTemplate.appPlatform,
        },
      };
    }

    // 2. Fallback generic translation preserving nodeGroup ('core' vs 'app')
    const isCore = node.data.nodeGroup === 'core';
    const baseName = node.data.label.replace(/\s*\(.*?\)\s*/g, '').trim();
    const slug = baseName.toLowerCase().replace(/[^a-z0-9]/g, '');

    const fallbackServiceMap: Record<PlatformType, string> = {
      n8n: `n8n-nodes-base.${slug || 'node'}`,
      make: isCore ? `builtin:${slug || 'Tool'}` : `${slug || 'app'}:Action`,
      zapier: isCore ? `${baseName} by Zapier` : baseName,
      ghl: isCore ? `GHL Core ${baseName}` : `GHL ${baseName}`,
    };

    return {
      ...node,
      data: {
        ...node.data,
        platform: targetPlatform,
        serviceName: fallbackServiceMap[targetPlatform],
      },
    };
  });
}
