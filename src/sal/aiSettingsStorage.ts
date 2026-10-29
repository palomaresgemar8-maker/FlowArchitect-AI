import type { AiEngineSettings } from '../types/workflow';

const STORAGE_KEY = 'flowarchitect_ai_engine_settings_v2';

export const DEFAULT_AI_SETTINGS: AiEngineSettings = {
  provider: 'uno-router',
  customBaseUrl: 'https://api.unorouter.com/v1/chat/completions',
  anthropicBaseUrl: 'https://api.unorouter.com/anthropic',
  apiFormat: 'openai',
  modelId: 'deepseek-flash',
  temperature: 0.35,
  envVarName: 'UNOROUTER_API_KEY',
  customParams: [
    {
      id: 'param_top_p',
      param: 'top_p',
      value: '1',
      enabled: true,
    },
    {
      id: 'param_max_tokens',
      param: 'max_tokens',
      value: '4096',
      enabled: false,
    },
  ],
  layoutDirection: 'LR',
  autoLayoutOnGenerate: true,
};

export function loadAiSettings(): AiEngineSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_AI_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_AI_SETTINGS,
      ...parsed,
      customParams: Array.isArray(parsed.customParams)
        ? parsed.customParams
        : DEFAULT_AI_SETTINGS.customParams,
    };
  } catch {
    return DEFAULT_AI_SETTINGS;
  }
}

export function saveAiSettings(settings: AiEngineSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save AI settings to localStorage:', err);
  }
}
