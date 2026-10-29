/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import {
  Plus,
  StickyNote,
  LayoutGrid,
  Settings2,
  FileText,
} from 'lucide-react';
import { useWorkflowStore } from './bal/useWorkflowStore';
import { TopBar } from './pal/components/TopBar';
import { NodeLibrarySidebar } from './pal/components/NodeLibrarySidebar';
import { WorkflowCanvas } from './pal/WorkflowCanvas';
import { AiPromptBar } from './pal/components/AiPromptBar';
import { NodeInspectorDrawer } from './pal/components/NodeInspectorDrawer';
import { AiSettingsModal } from './pal/components/AiSettingsModal';
import { SowGeneratorModal } from './pal/components/SowGeneratorModal';

export default function App() {
  const initWorkspace = useWorkflowStore((s) => s.initWorkspace);
  const isLightMode = useWorkflowStore((s) => s.isLightMode);
  const selectedNodeId = useWorkflowStore((s) => s.selectedNodeId);
  const setSelectedNodeId = useWorkflowStore((s) => s.setSelectedNodeId);
  const addGroupFrame = useWorkflowStore((s) => s.addGroupFrame);
  const runAutoLayout = useWorkflowStore((s) => s.runAutoLayout);
  const setIsSettingsModalOpen = useWorkflowStore(
    (s) => s.setIsSettingsModalOpen
  );
  const setIsSowModalOpen = useWorkflowStore((s) => s.setIsSowModalOpen);

  const canvasViewportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    initWorkspace();
  }, [initWorkspace]);

  return (
    <ReactFlowProvider>
      <div
        id="workspace"
        className={`w-screen h-screen flex flex-col overflow-hidden select-none ${
          isLightMode
            ? 'bg-[#F8FAFC] text-slate-900'
            : 'bg-[#0B0F19] text-slate-100'
        }`}
      >
        {/* Top Navigation Bar */}
        <TopBar canvasViewportRef={canvasViewportRef} />

        {/* Main Uncluttered n8n Studio Workspace */}
        <div className="relative flex-1 flex min-h-0 overflow-hidden">
          {/* Left Slim n8n Icon Rail (Matches left rail in screenshot) */}
          <nav
            aria-label="Quick Canvas Tools"
            className={`no-export shrink-0 w-12 border-r flex flex-col items-center justify-between py-3 z-20 ${
              isLightMode
                ? 'bg-white border-slate-200 text-slate-600'
                : 'bg-[#0F172A] border-slate-800/90 text-slate-400'
            }`}
          >
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedNodeId(null)}
                title="Open 'What happens next?' Node Panel"
                className={`p-2 rounded-lg transition-colors cursor-pointer ${
                  !selectedNodeId
                    ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Plus className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => addGroupFrame()}
                title="Add Yellow Workflow Sticky Note"
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <StickyNote className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => runAutoLayout('LR')}
                title="Tidy Horizontal Layout"
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setIsSowModalOpen(true)}
                title="Generate Client SOW Proposal"
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <FileText className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => setIsSettingsModalOpen(true)}
                title="AI Engine & Endpoint Settings"
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <Settings2 className="w-4 h-4" />
              </button>
            </div>
          </nav>

          {/* Center Infinite Dotted Canvas + Compact Bottom Execute/AI Bar */}
          <div className="relative flex-1 flex flex-col min-w-0 h-full">
            <WorkflowCanvas canvasViewportRef={canvasViewportRef} />
            <AiPromptBar />
          </div>

          {/* Right Panel: Shows "What happens next?" (NodeLibrarySidebar) or NodeInspectorDrawer when a node is clicked */}
          {selectedNodeId ? <NodeInspectorDrawer /> : <NodeLibrarySidebar />}
        </div>

        {/* Modals */}
        <AiSettingsModal />
        <SowGeneratorModal />
      </div>
    </ReactFlowProvider>
  );
}
