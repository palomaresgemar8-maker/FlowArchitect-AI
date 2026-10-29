import React, { useRef, useState } from 'react';
import {
  Sparkles,
  Mic,
  Square,
  Loader2,
  Send,
  Layers,
  Replace,
  LayoutGrid,
  StickyNote,
  ChevronDown,
} from 'lucide-react';
import { useWorkflowStore } from '../../bal/useWorkflowStore';
import {
  generateWorkflowFromPrompt,
  transcribeVoicePrompt,
} from '../../sal/unifiedAiClient';
import { PLATFORM_META } from '../../bal/platformTranslator';
import type { PlatformType } from '../../types/workflow';
import { eventBus } from '../../bal/eventBus';

const QUICK_PROMPTS = [
  {
    label: 'Gmail + Sheets + Notion + Slack Blueprint',
    prompt:
      'Build an n8n blueprint with a Webhook Trigger, Edit Fields (Set), and AI Agent that qualifies leads, then branches with a Switch node to log rows in Google Sheets, create a deal page in Notion, send a reply via Gmail, and alert #deals in Slack.',
  },
  {
    label: 'Financial News Recap → AI + Gmail',
    prompt:
      'Create a daily Schedule Trigger blueprint that fetches financial news via HTTP Request, extracts headlines with HTML Parser, aggregates items, summarizes market insights with DeepSeek/Gemini AI Agent, and sends an HTML digest via Gmail.',
  },
  {
    label: 'Stripe → GoHighLevel + WhatsApp',
    prompt:
      'Design a workflow blueprint triggered by a Stripe payment event, formats data with Code, upserts the contact in GoHighLevel CRM and Airtable, and sends a WhatsApp confirmation message.',
  },
];

export const AiPromptBar: React.FC = () => {
  const {
    platform,
    aiSettings,
    isGeneratingAi,
    isLightMode,
    switchPlatform,
    setIsGeneratingAi,
    applyGeneratedBlueprint,
    runAutoLayout,
    addGroupFrame,
  } = useWorkflowStore();

  const [isExpanded, setIsExpanded] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [appendMode, setAppendMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const handleGenerate = async (customPrompt?: string) => {
    const targetPrompt = (customPrompt ?? prompt).trim();
    if (!targetPrompt || isGeneratingAi) return;

    setIsGeneratingAi(true);
    eventBus.emit('AI_GENERATION_STARTED', {
      prompt: targetPrompt,
      platform,
    });

    try {
      const result = await generateWorkflowFromPrompt(
        targetPrompt,
        platform,
        aiSettings
      );

      applyGeneratedBlueprint(
        result.title,
        result.summary,
        result.nodes,
        result.edges,
        appendMode
      );

      if (!customPrompt) setPrompt('');
      setIsExpanded(false);

      eventBus.emit('AI_GENERATION_COMPLETED', {
        title: result.title,
        nodeCount: result.nodes.length,
        providerUsed: result.providerUsed,
      });
      eventBus.emit('TOAST_NOTIFY', {
        type: 'success',
        message: `Architected "${result.title}" blueprint (${result.nodes.length} steps)`,
      });
    } catch (err: any) {
      eventBus.emit('TOAST_NOTIFY', {
        type: 'error',
        message: err?.message || 'AI blueprint generation failed.',
      });
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const toggleVoiceRecording = async () => {
    if (isRecording && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const audioBlob = new Blob(chunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64DataUrl = String(reader.result || '');
          const base64 = base64DataUrl.split(',')[1];
          if (!base64) return;
          setIsTranscribing(true);
          try {
            const transcript = await transcribeVoicePrompt(
              base64,
              audioBlob.type || 'audio/webm'
            );
            if (transcript) {
              setPrompt((prev) =>
                prev ? `${prev} ${transcript}` : transcript
              );
            }
          } catch (err: any) {
            eventBus.emit('TOAST_NOTIFY', {
              type: 'error',
              message: err?.message || 'Could not transcribe voice input.',
            });
          } finally {
            setIsTranscribing(false);
          }
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch {
      eventBus.emit('TOAST_NOTIFY', {
        type: 'warning',
        message: 'Microphone permission is required for Voice-to-Diagram.',
      });
    }
  };

  // Compact Blueprint Architect Bar at Bottom Center (No Execute button — focused 100% on Blueprint Design)
  if (!isExpanded) {
    return (
      <div className="no-export absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 pointer-events-auto">
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md transition-all cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          <span>AI Blueprint Prompt</span>
        </button>

        <button
          type="button"
          onClick={() => runAutoLayout('LR')}
          className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border font-semibold text-xs shadow-sm transition-all cursor-pointer ${
            isLightMode
              ? 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
              : 'bg-[#0F172A] border-slate-700 text-slate-200 hover:border-slate-600'
          }`}
        >
          <LayoutGrid className="w-3.5 h-3.5 text-indigo-500" />
          <span>Auto-Align Blueprint</span>
        </button>

        <button
          type="button"
          onClick={() => addGroupFrame()}
          className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border font-semibold text-xs shadow-sm transition-all cursor-pointer ${
            isLightMode
              ? 'bg-[#FEF9C3] border-amber-300 text-slate-800 hover:bg-[#FEF08A]'
              : 'bg-amber-950/60 border-amber-500/40 text-amber-200 hover:bg-amber-950'
          }`}
        >
          <StickyNote className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          <span>+ Sticky Note</span>
        </button>
      </div>
    );
  }

  return (
    <div className="no-export absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-[92%] max-w-2xl pointer-events-auto">
      <div
        className={`rounded-2xl border p-3 shadow-2xl transition-colors ${
          isLightMode
            ? 'bg-white/95 border-slate-200 text-slate-900 backdrop-blur-md'
            : 'bg-[#0F172A]/95 border-slate-700/80 text-slate-100 backdrop-blur-md'
        }`}
      >
        {/* Top Row: Quick Starter Prompts + Collapse Button */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-200/70 dark:border-slate-800/60 px-1">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <span className="text-[11px] font-medium text-slate-400 shrink-0">
              Blueprint Presets:
            </span>
            {QUICK_PROMPTS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                disabled={isGeneratingAi}
                onClick={() => {
                  setPrompt(preset.prompt);
                  handleGenerate(preset.prompt);
                }}
                className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isLightMode
                    ? 'bg-slate-100 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-indigo-500/20 hover:text-indigo-200'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setAppendMode((v) => !v)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                appendMode
                  ? 'bg-emerald-500/15 text-emerald-500'
                  : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {appendMode ? (
                <>
                  <Layers className="w-3 h-3" /> Append
                </>
              ) : (
                <>
                  <Replace className="w-3 h-3" /> Replace
                </>
              )}
            </button>

            <select
              value={platform}
              aria-label="Target Automation Platform"
              onChange={(e) => switchPlatform(e.target.value as PlatformType)}
              className={`text-[11px] font-semibold rounded-md px-2 py-0.5 border focus:outline-none cursor-pointer ${
                isLightMode
                  ? 'bg-slate-50 border-slate-200 text-slate-800'
                  : 'bg-slate-900 border-slate-700 text-slate-200'
              }`}
            >
              {(['n8n', 'make', 'zapier', 'ghl'] as PlatformType[]).map((p) => (
                <option key={p} value={p}>
                  {PLATFORM_META[p].shortLabel}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              title="Minimize AI Blueprint Bar"
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Prompt Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleGenerate();
          }}
          className="flex items-center gap-2"
        >
          <div className="pl-2 text-indigo-500 shrink-0">
            {isGeneratingAi ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
          </div>

          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isGeneratingAi}
            placeholder="Describe the workflow blueprint to map out (Triggers, AI Agents, Routers, Apps)..."
            className="flex-1 bg-transparent text-xs sm:text-sm focus:outline-none placeholder:text-slate-400"
          />

          <button
            type="button"
            onClick={toggleVoiceRecording}
            disabled={isGeneratingAi || isTranscribing}
            title="Voice-to-Blueprint"
            className={`p-2 rounded-xl border transition-colors cursor-pointer shrink-0 ${
              isRecording
                ? 'bg-rose-500/20 border-rose-500 text-rose-500'
                : isLightMode
                ? 'border-slate-200 text-slate-600 hover:bg-slate-100'
                : 'border-slate-800 text-slate-400 hover:bg-slate-800'
            }`}
          >
            {isTranscribing ? (
              <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
            ) : isRecording ? (
              <Square className="w-4 h-4 fill-current" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
          </button>

          <button
            type="submit"
            disabled={!prompt.trim() || isGeneratingAi}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 cursor-pointer"
          >
            <span>{isGeneratingAi ? 'Architecting...' : 'Generate Blueprint'}</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
