import React, { useState } from 'react';
import {
  X,
  Cpu,
  Sliders,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Terminal,
} from 'lucide-react';
import { useWorkflowStore } from '../../bal/useWorkflowStore';
import type { AiProviderType, LlmParamItem } from '../../types/workflow';
import { eventBus } from '../../bal/eventBus';
import { testCustomLlmEndpoint } from '../../sal/unifiedAiClient';

const BASE_URL_PRESETS = [
  {
    label: 'Uno Router',
    openaiUrl: 'https://api.unorouter.com/v1/chat/completions',
    anthropicUrl: 'https://api.unorouter.com/anthropic',
    model: 'deepseek-flash',
    envVar: 'UNOROUTER_API_KEY',
  },
  {
    label: 'DeepSeek',
    openaiUrl: 'https://api.deepseek.com',
    anthropicUrl: 'https://api.deepseek.com/anthropic',
    model: 'deepseek-v4-pro',
    envVar: 'DEEPSEEK_API_KEY',
  },
  {
    label: 'OpenRouter',
    openaiUrl: 'https://openrouter.ai/api/v1',
    anthropicUrl: 'https://openrouter.ai/api/v1',
    model: 'deepseek/deepseek-chat',
    envVar: 'OPENROUTER_API_KEY',
  },
  {
    label: 'OpenAI',
    openaiUrl: 'https://api.openai.com/v1',
    anthropicUrl: 'https://api.anthropic.com/v1',
    model: 'gpt-4o',
    envVar: 'OPENAI_API_KEY',
  },
  {
    label: 'Groq',
    openaiUrl: 'https://api.groq.com/openai/v1',
    anthropicUrl: 'https://api.groq.com/openai/v1',
    model: 'llama-3.3-70b-versatile',
    envVar: 'GROQ_API_KEY',
  },
  {
    label: 'Ollama Local',
    openaiUrl: 'http://localhost:11434/v1',
    anthropicUrl: 'http://localhost:11434/v1',
    model: 'qwen2.5-coder:14b',
    envVar: 'CUSTOM_LLM_API_KEY',
  },
] as const;

const MODEL_CHIPS = [
  { id: 'deepseek-flash', badge: '(1)' },
  { id: 'deepseek-v4-pro', badge: '' },
  { id: 'deepseek-chat', badge: '' },
  { id: 'deepseek-reasoner', badge: '' },
  { id: 'gpt-4o', badge: '' },
  { id: 'claude-3-7-sonnet', badge: '' },
  { id: 'gemini-3.8-flash', badge: '' },
] as const;

const SERVER_ENV_VARS = [
  'UNOROUTER_API_KEY',
  'DEEPSEEK_API_KEY',
  'CUSTOM_LLM_API_KEY',
  'OPENAI_API_KEY',
  'OPENROUTER_API_KEY',
  'GROQ_API_KEY',
  'GEMINI_API_KEY',
] as const;

export const AiSettingsModal: React.FC = () => {
  const {
    aiSettings,
    isSettingsModalOpen,
    isLightMode,
    updateAiSettings,
    setIsSettingsModalOpen,
  } = useWorkflowStore();

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  if (!isSettingsModalOpen) return null;

  const customParams: LlmParamItem[] = aiSettings.customParams || [];
  const activeFormat = aiSettings.apiFormat || 'openai';

  const handleProviderChange = (provider: AiProviderType) => {
    setTestResult(null);
    if (provider === 'gemini') {
      updateAiSettings({
        provider,
        modelId: 'gemini-3.8-flash',
        envVarName: 'GEMINI_API_KEY',
      });
    } else if (provider === 'uno-router') {
      updateAiSettings({
        provider,
        customBaseUrl: 'https://api.unorouter.com/v1/chat/completions',
        anthropicBaseUrl: 'https://api.unorouter.com/anthropic',
        apiFormat: 'openai',
        modelId: 'deepseek-flash',
        envVarName: 'UNOROUTER_API_KEY',
      });
    } else if (provider === 'deepseek') {
      updateAiSettings({
        provider,
        customBaseUrl: 'https://api.deepseek.com',
        anthropicBaseUrl: 'https://api.deepseek.com/anthropic',
        apiFormat: 'openai',
        modelId: 'deepseek-v4-pro',
        envVarName: 'DEEPSEEK_API_KEY',
      });
    } else {
      updateAiSettings({
        provider,
        customBaseUrl:
          aiSettings.customBaseUrl || 'https://openrouter.ai/api/v1',
        anthropicBaseUrl:
          aiSettings.anthropicBaseUrl || 'https://api.anthropic.com/v1',
        apiFormat: 'openai',
        modelId: 'gpt-4o',
        envVarName: 'OPENAI_API_KEY',
      });
    }
  };

  const handleAddParamRow = () => {
    const nextRow: LlmParamItem = {
      id: `param_${Date.now().toString(36)}`,
      param: 'reasoning_effort',
      value: 'high',
      enabled: true,
    };
    updateAiSettings({
      customParams: [...customParams, nextRow],
    });
  };

  const handleUpdateParamRow = (
    id: string,
    patch: Partial<LlmParamItem>
  ) => {
    updateAiSettings({
      customParams: customParams.map((row) =>
        row.id === id ? { ...row, ...patch } : row
      ),
    });
  };

  const handleRemoveParamRow = (id: string) => {
    updateAiSettings({
      customParams: customParams.filter((row) => row.id !== id),
    });
  };

  const handleTestEndpoint = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testCustomLlmEndpoint(aiSettings);
      setTestResult({
        ok: res.ok,
        message: res.message,
      });
    } catch (err: any) {
      setTestResult({
        ok: false,
        message: err?.message || 'Endpoint verification failed.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div
        className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
          isLightMode
            ? 'bg-white border-slate-200 text-slate-900'
            : 'bg-[#0F172A] border-slate-700/90 text-slate-100'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-5 py-4 border-b shrink-0 ${
            isLightMode ? 'border-slate-200' : 'border-slate-800/60'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                isLightMode
                  ? 'bg-violet-100 text-violet-700'
                  : 'bg-violet-500/15 text-violet-400'
              }`}
            >
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">
                AI Architect Engine & Endpoint Settings
              </h2>
              <p
                className={`text-xs ${
                  isLightMode ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                Configure Uno Router, DeepSeek, OpenAI, Anthropic or any custom LLM via PARAM / VALUE
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsSettingsModalOpen(false)}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isLightMode
                ? 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 space-y-4 text-xs overflow-y-auto">
          {/* Provider Selector */}
          <div>
            <label
              className={`block font-semibold mb-2 ${
                isLightMode ? 'text-slate-700' : 'text-slate-300'
              }`}
            >
              AI Reasoning Provider
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(
                [
                  {
                    id: 'gemini',
                    title: 'Google Gemini',
                    sub: 'Native Structured Schema',
                  },
                  {
                    id: 'uno-router',
                    title: 'Uno Router / Any LLM',
                    sub: 'PARAM / VALUE Router',
                  },
                  {
                    id: 'deepseek',
                    title: 'DeepSeek API',
                    sub: 'deepseek-flash / v4-pro',
                  },
                  {
                    id: 'openai-custom',
                    title: 'OpenAI / Custom',
                    sub: 'OpenRouter / Ollama / v1',
                  },
                ] as const
              ).map((item) => {
                const active = aiSettings.provider === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleProviderChange(item.id)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      active
                        ? isLightMode
                          ? 'border-violet-600 bg-violet-50/90 text-violet-950 shadow-xs'
                          : 'border-violet-500 bg-violet-500/15 text-violet-100'
                        : isLightMode
                        ? 'border-slate-200 bg-slate-50/70 text-slate-700 hover:bg-slate-100'
                        : 'border-slate-800 bg-slate-900/80 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div
                      className={`font-semibold ${
                        active
                          ? isLightMode
                            ? 'text-violet-900'
                            : 'text-violet-200'
                          : ''
                      }`}
                    >
                      {item.title}
                    </div>
                    <div
                      className={`text-[11px] mt-0.5 ${
                        active
                          ? isLightMode
                            ? 'text-violet-700/80'
                            : 'text-violet-300/80'
                          : isLightMode
                          ? 'text-slate-500'
                          : 'text-slate-400'
                      }`}
                    >
                      {item.sub}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Endpoint Presets */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className={`text-[11px] font-semibold ${
                  isLightMode ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                Quick Router Presets:
              </span>
              {BASE_URL_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setTestResult(null);
                    updateAiSettings({
                      provider:
                        preset.label === 'DeepSeek'
                          ? 'deepseek'
                          : preset.label === 'Uno Router'
                          ? 'uno-router'
                          : 'openai-custom',
                      customBaseUrl: preset.openaiUrl,
                      anthropicBaseUrl: preset.anthropicUrl,
                      modelId: preset.model,
                      envVarName: preset.envVar,
                    });
                  }}
                  className={`px-2 py-0.5 rounded-md border text-[11px] font-medium transition-colors cursor-pointer ${
                    isLightMode
                      ? 'border-slate-200 bg-slate-100 hover:bg-violet-50 hover:border-violet-300 text-slate-700'
                      : 'border-slate-800 bg-slate-900 hover:border-violet-500/50 text-slate-300'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleAddParamRow}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-colors cursor-pointer ${
                isLightMode
                  ? 'border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100'
                  : 'border-violet-500/30 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20'
              }`}
            >
              <Plus className="w-3 h-3" />
              <span>Add PARAM / VALUE</span>
            </button>
          </div>

          {/* Exact PARAM | VALUE Specification Table (Uno Router / DeepSeek / OpenAI / Anthropic style) */}
          <div
            className={`rounded-xl border overflow-hidden ${
              isLightMode ? 'border-slate-200 bg-white' : 'border-slate-800 bg-slate-950/60'
            }`}
          >
            <table className="w-full border-collapse text-left">
              <thead>
                <tr
                  className={`border-b text-[11px] font-semibold uppercase tracking-wider ${
                    isLightMode
                      ? 'bg-slate-50 border-slate-200 text-slate-500'
                      : 'bg-slate-900/90 border-slate-800 text-slate-400'
                  }`}
                >
                  <th
                    className={`py-2.5 px-3.5 w-[34%] border-r ${
                      isLightMode ? 'border-slate-200' : 'border-slate-800'
                    }`}
                  >
                    PARAM
                  </th>
                  <th className="py-2.5 px-3.5">VALUE</th>
                </tr>
              </thead>
              <tbody
                className={`divide-y ${
                  isLightMode ? 'divide-slate-200' : 'divide-slate-800/80'
                }`}
              >
                {/* Row 1: base_url (OpenAI) */}
                <tr>
                  <td
                    className={`py-3 px-3.5 align-middle font-medium border-r ${
                      isLightMode
                        ? 'border-slate-200 text-slate-800'
                        : 'border-slate-800 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="font-mono text-xs">base_url (OpenAI)</span>
                      <button
                        type="button"
                        onClick={() => updateAiSettings({ apiFormat: 'openai' })}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase cursor-pointer ${
                          activeFormat === 'openai'
                            ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/40'
                            : isLightMode
                            ? 'bg-slate-100 text-slate-500'
                            : 'bg-slate-900 text-slate-500'
                        }`}
                      >
                        {activeFormat === 'openai' ? 'Active' : 'Use'}
                      </button>
                    </div>
                  </td>
                  <td className="py-2.5 px-3.5 align-middle">
                    <input
                      type="url"
                      value={aiSettings.customBaseUrl}
                      onChange={(e) =>
                        updateAiSettings({
                          customBaseUrl: e.target.value,
                          provider:
                            aiSettings.provider === 'gemini'
                              ? 'uno-router'
                              : aiSettings.provider,
                        })
                      }
                      placeholder="https://api.deepseek.com"
                      className={`w-full px-2.5 py-1.5 rounded-md font-mono text-xs border focus:outline-none focus:border-violet-500 ${
                        isLightMode
                          ? 'bg-slate-100/90 border-slate-200 text-slate-900'
                          : 'bg-slate-900 border-slate-800 text-slate-100'
                      }`}
                    />
                  </td>
                </tr>

                {/* Row 2: base_url (Anthropic) */}
                <tr>
                  <td
                    className={`py-3 px-3.5 align-middle font-medium border-r ${
                      isLightMode
                        ? 'border-slate-200 text-slate-800'
                        : 'border-slate-800 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="font-mono text-xs">base_url (Anthropic)</span>
                      <button
                        type="button"
                        onClick={() => updateAiSettings({ apiFormat: 'anthropic' })}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase cursor-pointer ${
                          activeFormat === 'anthropic'
                            ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/40'
                            : isLightMode
                            ? 'bg-slate-100 text-slate-500'
                            : 'bg-slate-900 text-slate-500'
                        }`}
                      >
                        {activeFormat === 'anthropic' ? 'Active' : 'Use'}
                      </button>
                    </div>
                  </td>
                  <td className="py-2.5 px-3.5 align-middle">
                    <input
                      type="url"
                      value={
                        aiSettings.anthropicBaseUrl ||
                        'https://api.deepseek.com/anthropic'
                      }
                      onChange={(e) =>
                        updateAiSettings({
                          anthropicBaseUrl: e.target.value,
                          provider:
                            aiSettings.provider === 'gemini'
                              ? 'uno-router'
                              : aiSettings.provider,
                        })
                      }
                      placeholder="https://api.deepseek.com/anthropic"
                      className={`w-full px-2.5 py-1.5 rounded-md font-mono text-xs border focus:outline-none focus:border-violet-500 ${
                        isLightMode
                          ? 'bg-slate-100/90 border-slate-200 text-slate-900'
                          : 'bg-slate-900 border-slate-800 text-slate-100'
                      }`}
                    />
                  </td>
                </tr>

                {/* Row 3: server_secret_env (Server-Side Credential Binding) */}
                <tr>
                  <td
                    className={`py-3 px-3.5 align-middle font-medium border-r ${
                      isLightMode
                        ? 'border-slate-200 text-slate-800'
                        : 'border-slate-800 text-slate-200'
                    }`}
                  >
                    <span className="font-mono text-xs">server_secret_env</span>
                  </td>
                  <td className="py-2.5 px-3.5 align-middle">
                    <div className="flex items-center gap-2 flex-wrap">
                      <select
                        value={aiSettings.envVarName || 'DEEPSEEK_API_KEY'}
                        onChange={(e) =>
                          updateAiSettings({ envVarName: e.target.value })
                        }
                        className={`px-2.5 py-1.5 rounded-md font-mono text-xs border focus:outline-none focus:border-violet-500 cursor-pointer ${
                          isLightMode
                            ? 'bg-slate-100/90 border-slate-200 text-slate-900'
                            : 'bg-slate-900 border-slate-800 text-slate-100'
                        }`}
                      >
                        {SERVER_ENV_VARS.map((envKey) => (
                          <option key={envKey} value={envKey}>
                            process.env.{envKey}
                          </option>
                        ))}
                      </select>
                      <span
                        className={`text-[11px] ${
                          isLightMode ? 'text-slate-500' : 'text-slate-400'
                        }`}
                      >
                        Resolved securely on <code className="font-mono">/api/ai/*</code>
                      </span>
                    </div>
                  </td>
                </tr>

                {/* Row 4: model */}
                <tr>
                  <td
                    className={`py-3 px-3.5 align-top font-medium border-r ${
                      isLightMode
                        ? 'border-slate-200 text-slate-800'
                        : 'border-slate-800 text-slate-200'
                    }`}
                  >
                    <span className="font-mono text-xs">model</span>
                  </td>
                  <td className="py-2.5 px-3.5 align-middle space-y-2">
                    <input
                      type="text"
                      value={aiSettings.modelId}
                      onChange={(e) =>
                        updateAiSettings({ modelId: e.target.value })
                      }
                      placeholder="deepseek-flash"
                      className={`w-full px-2.5 py-1.5 rounded-md font-mono text-xs border focus:outline-none focus:border-violet-500 ${
                        isLightMode
                          ? 'bg-slate-100/90 border-slate-200 text-slate-900'
                          : 'bg-slate-900 border-slate-800 text-slate-100'
                      }`}
                    />
                    <div className="flex flex-wrap items-center gap-1.5">
                      {MODEL_CHIPS.map((chip) => {
                        const isSelected = aiSettings.modelId === chip.id;
                        return (
                          <button
                            key={chip.id}
                            type="button"
                            onClick={() =>
                              updateAiSettings({
                                modelId: chip.id,
                                provider:
                                  chip.id.startsWith('gemini')
                                    ? 'gemini'
                                    : aiSettings.provider === 'gemini'
                                    ? 'uno-router'
                                    : aiSettings.provider,
                              })
                            }
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono text-[11px] border transition-colors cursor-pointer ${
                              isSelected
                                ? isLightMode
                                  ? 'bg-violet-100 border-violet-500 text-violet-900 font-semibold'
                                  : 'bg-violet-500/25 border-violet-400 text-violet-100 font-semibold'
                                : isLightMode
                                ? 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200/70'
                                : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                            }`}
                          >
                            <span>{chip.id}</span>
                            {chip.badge && (
                              <sup className="text-[9px] text-slate-500 font-sans">
                                {chip.badge}
                              </sup>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                </tr>

                {/* Dynamic Custom PARAM | VALUE Rows */}
                {customParams.map((row) => (
                  <tr key={row.id}>
                    <td
                      className={`py-2 px-3.5 align-middle border-r ${
                        isLightMode ? 'border-slate-200' : 'border-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={row.enabled}
                          onChange={(e) =>
                            handleUpdateParamRow(row.id, {
                              enabled: e.target.checked,
                            })
                          }
                          className="accent-violet-600 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={row.param}
                          onChange={(e) =>
                            handleUpdateParamRow(row.id, {
                              param: e.target.value,
                            })
                          }
                          placeholder="param_name"
                          className={`w-full px-2 py-1 rounded font-mono text-xs border focus:outline-none focus:border-violet-500 ${
                            isLightMode
                              ? 'bg-slate-50 border-slate-200 text-slate-800'
                              : 'bg-slate-900 border-slate-800 text-slate-200'
                          }`}
                        />
                      </div>
                    </td>
                    <td className="py-2 px-3.5 align-middle">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={row.value}
                          onChange={(e) =>
                            handleUpdateParamRow(row.id, {
                              value: e.target.value,
                            })
                          }
                          placeholder="value"
                          className={`flex-1 px-2.5 py-1 rounded font-mono text-xs border focus:outline-none focus:border-violet-500 ${
                            isLightMode
                              ? 'bg-slate-100/90 border-slate-200 text-slate-900'
                              : 'bg-slate-900 border-slate-800 text-slate-100'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveParamRow(row.id)}
                          title="Remove parameter"
                          className="p-1 rounded text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Temperature & Auto-Layout Preferences */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div
              className={`p-3 rounded-xl border ${
                isLightMode
                  ? 'bg-slate-50 border-slate-200'
                  : 'bg-slate-900/60 border-slate-800'
              }`}
            >
              <label className="flex items-center justify-between font-semibold mb-1.5">
                <span className={isLightMode ? 'text-slate-700' : 'text-slate-300'}>
                  Temperature
                </span>
                <span className="font-mono tabular-nums text-violet-600 dark:text-violet-400">
                  {aiSettings.temperature.toFixed(2)}
                </span>
              </label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={aiSettings.temperature}
                onChange={(e) =>
                  updateAiSettings({ temperature: Number(e.target.value) })
                }
                className="w-full accent-violet-600 cursor-pointer"
              />
            </div>

            <div
              className={`p-3 rounded-xl border flex items-center justify-between gap-2 ${
                isLightMode
                  ? 'bg-slate-50 border-slate-200'
                  : 'bg-slate-900/60 border-slate-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <div>
                  <div className="font-semibold">Auto-Layout Flow</div>
                  <div
                    className={`text-[10px] ${
                      isLightMode ? 'text-slate-500' : 'text-slate-400'
                    }`}
                  >
                    Dagre graph direction
                  </div>
                </div>
              </div>
              <div
                className={`flex items-center gap-1 p-1 rounded-lg border ${
                  isLightMode
                    ? 'bg-white border-slate-200'
                    : 'bg-slate-950 border-slate-800'
                }`}
              >
                <button
                  type="button"
                  onClick={() => updateAiSettings({ layoutDirection: 'LR' })}
                  className={`px-2 py-1 rounded-md text-[11px] font-medium cursor-pointer ${
                    aiSettings.layoutDirection === 'LR'
                      ? 'bg-violet-600 text-white'
                      : isLightMode
                      ? 'text-slate-600 hover:text-slate-900'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Left → Right
                </button>
                <button
                  type="button"
                  onClick={() => updateAiSettings({ layoutDirection: 'TB' })}
                  className={`px-2 py-1 rounded-md text-[11px] font-medium cursor-pointer ${
                    aiSettings.layoutDirection === 'TB'
                      ? 'bg-violet-600 text-white'
                      : isLightMode
                      ? 'text-slate-600 hover:text-slate-900'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Top → Bottom
                </button>
              </div>
            </div>
          </div>

          {/* Endpoint Verification Result Banner */}
          {testResult && (
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs ${
                testResult.ok
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                  : 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300'
              }`}
            >
              {testResult.ok ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span className="font-mono text-[11px]">{testResult.message}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className={`px-5 py-3.5 border-t flex items-center justify-between gap-2 shrink-0 ${
            isLightMode ? 'border-slate-200 bg-slate-50/50' : 'border-slate-800/60'
          }`}
        >
          <button
            type="button"
            disabled={isTesting}
            onClick={handleTestEndpoint}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
              isLightMode
                ? 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                : 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800'
            }`}
          >
            {isTesting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-500" />
            ) : (
              <Terminal className="w-3.5 h-3.5 text-violet-500" />
            )}
            <span>Verify Endpoint</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsSettingsModalOpen(false);
              eventBus.emit('TOAST_NOTIFY', {
                type: 'success',
                message: `Saved AI Engine (${aiSettings.provider} · ${aiSettings.modelId})`,
              });
            }}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 transition-colors cursor-pointer"
          >
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
};
