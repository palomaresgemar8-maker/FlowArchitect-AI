import React, { useEffect, useState } from 'react';
import {
  X,
  FileText,
  Loader2,
  Copy,
  Download,
  Check,
  Sparkles,
} from 'lucide-react';
import { useWorkflowStore } from '../../bal/useWorkflowStore';
import { generateSowFromCanvas } from '../../sal/unifiedAiClient';
import type { SowDocument } from '../../types/workflow';
import { eventBus } from '../../bal/eventBus';

export const SowGeneratorModal: React.FC = () => {
  const {
    isSowModalOpen,
    projectName,
    platform,
    nodes,
    edges,
    isLightMode,
    setIsSowModalOpen,
  } = useWorkflowStore();

  const [sow, setSow] = useState<SowDocument | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isSowModalOpen) return;
    let cancelled = false;

    async function runSow() {
      setIsLoading(true);
      setError(null);
      try {
        const doc = await generateSowFromCanvas(
          projectName,
          platform,
          nodes,
          edges
        );
        if (!cancelled) setSow(doc);
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || 'Failed to generate Scope of Work.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    runSow();
    return () => {
      cancelled = true;
    };
  }, [isSowModalOpen, projectName, platform, nodes, edges]);

  if (!isSowModalOpen) return null;

  const formatMarkdown = (doc: SowDocument): string => {
    const deliverablesMd = doc.deliverables
      .map(
        (d) =>
          `### Step ${d.stepNumber}: ${d.nodeTitle} (${d.role.toUpperCase()})\n- **Technical Specification:** ${d.technicalSpec}\n- **Business Outcome:** ${d.businessOutcome}`
      )
      .join('\n\n');

    const phasesMd = doc.implementationPhases
      .map((p) => `- **${p.phase} (${p.duration}):** ${p.milestone}`)
      .join('\n');

    return `# Scope of Work (SOW): ${projectName}
**Target Platform:** ${platform.toUpperCase()}

## 1. Executive Summary
${doc.executiveSummary}

## 2. Architecture Overview
${doc.architectureOverview}

## 3. Projected ROI & Efficiency Gains
- **Time Saved per Execution:** ${doc.roiProjection.minsSavedPerRun} mins
- **Estimated Monthly Volume:** ${doc.roiProjection.estimatedMonthlyRuns.toLocaleString()} runs/mo
- **Monthly Hours Reclaimed:** ${doc.roiProjection.hoursSavedPerMonth} hours/mo
- **Estimated Annual Operational Value:** $${doc.roiProjection.estimatedAnnualValueUsd.toLocaleString()}/yr

## 4. Node-by-Node Technical Deliverables
${deliverablesMd}

## 5. Implementation Roadmap
${phasesMd}
`;
  };

  const handleCopyMarkdown = async () => {
    if (!sow) return;
    await navigator.clipboard.writeText(formatMarkdown(sow));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    eventBus.emit('TOAST_NOTIFY', {
      type: 'success',
      message: 'Copied Scope of Work Markdown to clipboard',
    });
  };

  const handleDownloadMarkdown = () => {
    if (!sow) return;
    const md = formatMarkdown(sow);
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-sow.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div
        className={`w-full max-w-3xl max-h-[88vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden ${
          isLightMode
            ? 'bg-white border-slate-200 text-slate-900'
            : 'bg-[#0F172A] border-slate-700/90 text-slate-100'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-500/15 text-violet-400 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">
                AI Scope of Work (SOW) & Client Proposal
              </h2>
              <p className="text-xs text-slate-400">
                Generated from active {platform.toUpperCase()} canvas ({nodes.filter((n) => n.type !== 'resizableGroup').length} steps)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsSowModalOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs leading-relaxed">
          {isLoading && (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-center">
              <Loader2 className="w-7 h-7 text-violet-400 animate-spin" />
              <div className="text-sm font-semibold">
                Synthesizing Client Scope of Work & ROI Model...
              </div>
              <p className="text-xs text-slate-400 max-w-md">
                Analyzing node connections, webhook schemas, and AI prompts for "{projectName}"
              </p>
            </div>
          )}

          {error && !isLoading && (
            <div className="p-4 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-300">
              {error}
            </div>
          )}

          {sow && !isLoading && (
            <>
              {/* ROI Projection Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div
                  className={`p-3.5 rounded-xl border ${
                    isLightMode
                      ? 'bg-slate-50 border-slate-200'
                      : 'bg-slate-900/90 border-slate-800'
                  }`}
                >
                  <div className="text-[11px] text-slate-400">Time Saved / Run</div>
                  <div className="text-lg font-bold font-mono tabular-nums text-emerald-400 mt-0.5">
                    {sow.roiProjection.minsSavedPerRun} mins
                  </div>
                </div>
                <div
                  className={`p-3.5 rounded-xl border ${
                    isLightMode
                      ? 'bg-slate-50 border-slate-200'
                      : 'bg-slate-900/90 border-slate-800'
                  }`}
                >
                  <div className="text-[11px] text-slate-400">Est. Monthly Runs</div>
                  <div className="text-lg font-bold font-mono tabular-nums mt-0.5">
                    {sow.roiProjection.estimatedMonthlyRuns.toLocaleString()}
                  </div>
                </div>
                <div
                  className={`p-3.5 rounded-xl border ${
                    isLightMode
                      ? 'bg-slate-50 border-slate-200'
                      : 'bg-slate-900/90 border-slate-800'
                  }`}
                >
                  <div className="text-[11px] text-slate-400">Hours Reclaimed / Mo</div>
                  <div className="text-lg font-bold font-mono tabular-nums text-violet-400 mt-0.5">
                    {sow.roiProjection.hoursSavedPerMonth} hrs
                  </div>
                </div>
                <div
                  className={`p-3.5 rounded-xl border ${
                    isLightMode
                      ? 'bg-slate-50 border-slate-200'
                      : 'bg-slate-900/90 border-slate-800'
                  }`}
                >
                  <div className="text-[11px] text-slate-400">Annual Client Value</div>
                  <div className="text-lg font-bold font-mono tabular-nums text-sky-400 mt-0.5">
                    ${sow.roiProjection.estimatedAnnualValueUsd.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Executive Summary & Architecture */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">01. Executive Summary</h3>
                <p className="text-slate-300 leading-relaxed">
                  {sow.executiveSummary}
                </p>

                <h3 className="text-sm font-semibold pt-2">
                  02. Technical Architecture Narrative
                </h3>
                <p className="text-slate-300 leading-relaxed">
                  {sow.architectureOverview}
                </p>
              </div>

              {/* Deliverables Table */}
              <div className="space-y-2.5">
                <h3 className="text-sm font-semibold">
                  03. Step-by-Step Scope Deliverables
                </h3>
                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900/80 text-[11px] text-slate-400">
                        <th className="py-2.5 px-3 font-mono tabular-nums">#</th>
                        <th className="py-2.5 px-3">Module</th>
                        <th className="py-2.5 px-3">Technical Specification</th>
                        <th className="py-2.5 px-3">Business Outcome</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70">
                      {sow.deliverables.map((item) => (
                        <tr key={item.stepNumber} className="hover:bg-slate-800/30">
                          <td className="py-2.5 px-3 font-mono tabular-nums text-slate-400">
                            0{item.stepNumber}
                          </td>
                          <td className="py-2.5 px-3 font-semibold whitespace-nowrap">
                            {item.nodeTitle}
                          </td>
                          <td className="py-2.5 px-3 text-slate-300">
                            {item.technicalSpec}
                          </td>
                          <td className="py-2.5 px-3 text-emerald-400">
                            {item.businessOutcome}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Implementation Milestones */}
              <div className="space-y-2.5">
                <h3 className="text-sm font-semibold">04. Delivery Milestones</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {sow.implementationPhases.map((phase, idx) => (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-xl border ${
                        isLightMode
                          ? 'bg-slate-50 border-slate-200'
                          : 'bg-slate-900/70 border-slate-800'
                      }`}
                    >
                      <div className="font-semibold text-violet-400">
                        {phase.phase} · {phase.duration}
                      </div>
                      <p className="text-slate-300 mt-1">{phase.milestone}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800/60 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
            Ready to paste into Notion, Google Docs, or client SOW contracts
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!sow}
              onClick={handleCopyMarkdown}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-700 hover:bg-slate-800 text-xs font-medium transition-colors cursor-pointer disabled:opacity-40"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copied Markdown</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Markdown</span>
                </>
              )}
            </button>
            <button
              type="button"
              disabled={!sow}
              onClick={handleDownloadMarkdown}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-40"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download SOW (.md)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
