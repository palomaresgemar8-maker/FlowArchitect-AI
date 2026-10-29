import { toPng, toSvg } from 'html-to-image';
import type { CanvasViewMode, FlowEdge, FlowNode, NodeRole, PlatformType, WorkflowProject } from '../types/workflow';
import { encodeAnimatedGif } from './gifEncoder';

function triggerDownload(dataUrlOrBlobUrl: string, filename: string) {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrlOrBlobUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  triggerDownload(url, filename);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function downloadJsonObject(obj: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], {
    type: 'application/json',
  });
  downloadBlob(blob, filename);
}

export async function exportCanvasAsPng(
  element: HTMLElement,
  projectName: string,
  isLightMode: boolean
): Promise<void> {
  const bgColor = isLightMode ? '#F8FAFC' : '#0B0F19';
  const dataUrl = await toPng(element, {
    backgroundColor: bgColor,
    pixelRatio: 2,
    filter: (node) => {
      if (node instanceof HTMLElement) {
        return !node.classList.contains('no-export');
      }
      return true;
    },
  });
  const safeName = projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  triggerDownload(dataUrl, `${safeName}-blueprint.png`);
}

export async function exportCanvasAsSvg(
  element: HTMLElement,
  projectName: string,
  isLightMode: boolean
): Promise<void> {
  const bgColor = isLightMode ? '#F8FAFC' : '#0B0F19';
  const dataUrl = await toSvg(element, {
    backgroundColor: bgColor,
    filter: (node) => {
      if (node instanceof HTMLElement) {
        return !node.classList.contains('no-export');
      }
      return true;
    },
  });
  const safeName = projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  triggerDownload(dataUrl, `${safeName}-blueprint.svg`);
}

interface SampledEdgeTrack {
  points: Array<{ x: number; y: number }>;
  color: string;
  glowColor: string;
}

function getRolePalette(role: string, aiSubNodeType?: string) {
  if (aiSubNodeType) {
    return {
      stroke: '#A855F7',
      fill: '#9333EA',
      glow: 'rgba(168, 85, 247, 0.45)',
      badge: 'AI SUB-NODE',
    };
  }
  switch (role) {
    case 'trigger':
      return {
        stroke: '#10B981',
        fill: '#059669',
        glow: 'rgba(16, 185, 129, 0.45)',
        badge: 'TRIGGER',
      };
    case 'ai':
      return {
        stroke: '#8B5CF6',
        fill: '#7C3AED',
        glow: 'rgba(139, 92, 246, 0.45)',
        badge: 'AI AGENT',
      };
    case 'router':
      return {
        stroke: '#F59E0B',
        fill: '#D97706',
        glow: 'rgba(245, 158, 11, 0.45)',
        badge: 'ROUTER',
      };
    default:
      return {
        stroke: '#3B82F6',
        fill: '#2563EB',
        glow: 'rgba(59, 130, 246, 0.45)',
        badge: 'ACTION',
      };
  }
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/**
 * Extracts screen-space edge tracks from the live React Flow DOM so animated packets
 * follow the exact rendered SVG curves in Workflow or Mind Map mode.
 */
function sampleLiveDomEdgeTracks(
  containerEl: HTMLElement,
  scaleX: number,
  scaleY: number,
  isMindMap: boolean
): SampledEdgeTrack[] {
  const viewportEl = containerEl.querySelector('.react-flow__viewport') as HTMLElement | null;
  if (!viewportEl) return [];

  const transformStr = viewportEl.style.transform || '';
  const translateMatch = transformStr.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/);
  const translate3dMatch = transformStr.match(/translate3d\(([-\d.]+)px,\s*([-\d.]+)px/);
  const scaleMatch = transformStr.match(/scale\(([-\d.]+)\)/);

  const tx = translateMatch
    ? parseFloat(translateMatch[1])
    : translate3dMatch
    ? parseFloat(translate3dMatch[1])
    : 0;
  const ty = translateMatch
    ? parseFloat(translateMatch[2])
    : translate3dMatch
    ? parseFloat(translate3dMatch[2])
    : 0;
  const s = scaleMatch ? parseFloat(scaleMatch[1]) : 1;

  const pathElements = Array.from(
    containerEl.querySelectorAll('path.react-flow__edge-path')
  ) as SVGPathElement[];

  const tracks: SampledEdgeTrack[] = [];
  const samples = 48;

  for (const pathEl of pathElements) {
    try {
      const totalLen = pathEl.getTotalLength();
      if (!totalLen || totalLen < 8) continue;

      const strokeAttr = (pathEl.style.stroke || pathEl.getAttribute('stroke') || '').toLowerCase();
      const isAiLink = strokeAttr.includes('a855f7') || strokeAttr.includes('168, 85, 247');

      const points: Array<{ x: number; y: number }> = [];
      for (let i = 0; i <= samples; i++) {
        const pt = pathEl.getPointAtLength((i / samples) * totalLen);
        points.push({
          x: (pt.x * s + tx) * scaleX,
          y: (pt.y * s + ty) * scaleY,
        });
      }

      tracks.push({
        points,
        color: isAiLink ? '#C084FC' : isMindMap ? '#818CF8' : '#34D399',
        glowColor: isAiLink
          ? 'rgba(192, 132, 252, 0.45)'
          : isMindMap
          ? 'rgba(129, 140, 248, 0.45)'
          : 'rgba(52, 211, 153, 0.45)',
      });
    } catch {
      // Ignore invalid SVG paths
    }
  }

  return tracks;
}

/**
 * Renders any WorkflowProject onto an offscreen canvas across N animation frames.
 * Used when downloading a background project from the Projects list or as a fallback.
 */
function renderStandaloneProjectGifFrames(
  project: WorkflowProject,
  isLightMode: boolean,
  canvasMode: CanvasViewMode = 'workflow',
  frameCount = 14
): { frames: ImageData[]; width: number; height: number } {
  const stickyNodes = project.nodes.filter((n) => n.type === 'resizableGroup');
  const workflowNodes = project.nodes.filter((n) => n.type !== 'resizableGroup');
  const allNodes = project.nodes;

  const isMindMap = canvasMode === 'mindmap';

  // Compute bounding box of all nodes
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  if (allNodes.length === 0) {
    minX = 0;
    minY = 0;
    maxX = 800;
    maxY = 450;
  } else {
    for (const node of allNodes) {
      const isSticky = node.type === 'resizableGroup';
      const w = Number(node.style?.width) || (isSticky ? 340 : isMindMap ? 210 : 96);
      const h = Number(node.style?.height) || (isSticky ? 240 : isMindMap ? 68 : 115);
      minX = Math.min(minX, node.position.x - 30);
      minY = Math.min(minY, node.position.y - 25);
      maxX = Math.max(maxX, node.position.x + w + 60);
      maxY = Math.max(maxY, node.position.y + h + 50);
    }
  }

  const paddingX = 64;
  const headerHeight = 64;
  const paddingBottom = 48;

  const contentW = Math.max(640, maxX - minX + paddingX * 2);
  const contentH = Math.max(380, maxY - minY + headerHeight + paddingBottom + 40);

  // Cap canvas dimensions for crisp & fast GIF encoding (max 960px wide)
  const targetWidth = Math.min(960, Math.max(720, Math.round(contentW)));
  const scale = targetWidth / contentW;
  const targetHeight = Math.min(720, Math.max(420, Math.round(contentH * scale)));

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d')!;

  const nodeMap = new Map<string, FlowNode>();
  allNodes.forEach((n) => nodeMap.set(n.id, n));

  const offsetX = paddingX - minX;
  const offsetY = headerHeight + 24 - minY;

  // Precompute cubic Bezier points for each edge
  const edgeTracks: Array<{
    points: Array<{ x: number; y: number }>;
    isAiSubEdge: boolean;
    label?: string;
  }> = [];

  for (const edge of project.edges) {
    const src = nodeMap.get(edge.source);
    const tgt = nodeMap.get(edge.target);
    if (!src || !tgt) continue;

    const isAiSubEdge =
      Boolean(src.data.aiSubNodeType) ||
      Boolean(tgt.data.aiSubNodeType) ||
      String(edge.targetHandle || '').startsWith('ai-');

    const srcW = isMindMap ? 185 : src.data.role === 'ai' ? 148 : 76;
    const srcH = isMindMap ? 56 : src.data.role === 'ai' ? 80 : 76;
    const tgtW = isMindMap ? 185 : tgt.data.role === 'ai' ? 148 : 76;
    const tgtH = isMindMap ? 56 : tgt.data.role === 'ai' ? 80 : 76;

    let x0 = (src.position.x + srcW + offsetX) * scale;
    let y0 = (src.position.y + srcH / 2 + offsetY) * scale;
    let x3 = (tgt.position.x + offsetX) * scale;
    let y3 = (tgt.position.y + tgtH / 2 + offsetY) * scale;

    if (isAiSubEdge && !isMindMap) {
      x0 = (src.position.x + srcW / 2 + offsetX) * scale;
      y0 = (src.position.y + offsetY) * scale;
      x3 = (tgt.position.x + tgtW / 2 + offsetX) * scale;
      y3 = (tgt.position.y + tgtH + offsetY) * scale;
    }

    const dx = Math.abs(x3 - x0) * 0.48;
    const dy = Math.abs(y3 - y0) * 0.45;

    const cx1 = isAiSubEdge && !isMindMap ? x0 : x0 + Math.max(36 * scale, dx);
    const cy1 = isAiSubEdge && !isMindMap ? y0 - Math.max(30 * scale, dy) : y0;
    const cx2 = isAiSubEdge && !isMindMap ? x3 : x3 - Math.max(36 * scale, dx);
    const cy2 = isAiSubEdge && !isMindMap ? y3 + Math.max(30 * scale, dy) : y3;

    const pts: Array<{ x: number; y: number }> = [];
    const steps = 44;
    for (let sIdx = 0; sIdx <= steps; sIdx++) {
      const t = sIdx / steps;
      const mt = 1 - t;
      const x =
        mt * mt * mt * x0 +
        3 * mt * mt * t * cx1 +
        3 * mt * t * t * cx2 +
        t * t * t * x3;
      const y =
        mt * mt * mt * y0 +
        3 * mt * mt * t * cy1 +
        3 * mt * t * t * cy2 +
        t * t * t * y3;
      pts.push({ x, y });
    }

    edgeTracks.push({
      points: pts,
      isAiSubEdge,
      label: typeof edge.label === 'string' ? edge.label : undefined,
    });
  }

  const totalMinsSaved = workflowNodes.reduce(
    (sum, n) => sum + (Number(n.data.estimatedTimeSavedMins) || 0),
    0
  );

  const frames: ImageData[] = [];

  for (let frameIdx = 0; frameIdx < frameCount; frameIdx++) {
    const phase = frameIdx / frameCount; // 0 .. 1

    // 1. Background
    ctx.fillStyle = isLightMode ? '#F8FAFC' : '#0B0F19';
    ctx.fillRect(0, 0, targetWidth, targetHeight);

    // Subtle dot grid
    ctx.fillStyle = isLightMode ? '#CBD5E1' : '#1E293B';
    const gridStep = Math.max(16, Math.round(22 * scale));
    for (let gx = gridStep; gx < targetWidth; gx += gridStep) {
      for (let gy = headerHeight; gy < targetHeight; gy += gridStep) {
        ctx.fillRect(gx, gy, 1.5, 1.5);
      }
    }

    // 2. Sticky Notes (Back Layer)
    for (const sticky of stickyNodes) {
      const sx = (sticky.position.x + offsetX) * scale;
      const sy = (sticky.position.y + offsetY) * scale;
      const sw = (Number(sticky.style?.width) || 340) * scale;
      const sh = (Number(sticky.style?.height) || 230) * scale;

      drawRoundedRect(ctx, sx, sy, sw, sh, 12 * scale);
      ctx.fillStyle = isLightMode ? '#FEFCE8' : 'rgba(45, 38, 20, 0.85)';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = isLightMode ? '#FDE047' : 'rgba(234, 179, 8, 0.45)';
      ctx.stroke();

      // Sticky Note Title
      ctx.fillStyle = isLightMode ? '#713F12' : '#FEF08A';
      ctx.font = `bold ${Math.max(10, Math.round(13 * scale))}px Inter, system-ui, sans-serif`;
      ctx.fillText(
        String(sticky.data.label || 'Architecture Notes').slice(0, 42),
        sx + 14 * scale,
        sy + 24 * scale
      );

      // Sticky Note Body Lines
      ctx.fillStyle = isLightMode ? '#854D0E' : '#FDE68A';
      ctx.font = `${Math.max(9, Math.round(10.5 * scale))}px Inter, system-ui, sans-serif`;
      const rawLines = String(sticky.data.subtitle || '')
        .split('\n')
        .slice(0, 7);
      rawLines.forEach((line, lIdx) => {
        ctx.fillText(
          line.slice(0, 56),
          sx + 14 * scale,
          sy + (44 + lIdx * 15) * scale
        );
      });
    }

    // 3. Edges + Marching Ants + Glowing Data Flow Pulses
    for (const track of edgeTracks) {
      if (track.points.length < 2) continue;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(track.points[0].x, track.points[0].y);
      for (let i = 1; i < track.points.length; i++) {
        ctx.lineTo(track.points[i].x, track.points[i].y);
      }

      if (track.isAiSubEdge) {
        ctx.strokeStyle = '#A855F7';
        ctx.lineWidth = 2 * scale;
        ctx.setLineDash([5 * scale, 5 * scale]);
        ctx.lineDashOffset = -phase * 20 * scale;
      } else if (isMindMap) {
        ctx.strokeStyle = isLightMode ? '#6366F1' : '#818CF8';
        ctx.lineWidth = 2.5 * scale;
        ctx.setLineDash([]);
      } else {
        ctx.strokeStyle = isLightMode ? '#64748B' : '#94A3B8';
        ctx.lineWidth = 2.2 * scale;
        ctx.setLineDash([7 * scale, 5 * scale]);
        ctx.lineDashOffset = -phase * 24 * scale;
      }
      ctx.stroke();
      ctx.restore();

      // Draw 2 glowing data packets traveling along each edge
      for (let pOffset = 0; pOffset < 2; pOffset++) {
        const t = (phase + pOffset * 0.5) % 1;
        const ptIdx = Math.min(
          track.points.length - 1,
          Math.floor(t * (track.points.length - 1))
        );
        const pt = track.points[ptIdx];

        // Outer glow
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 6.5 * scale, 0, Math.PI * 2);
        ctx.fillStyle = track.isAiSubEdge
          ? 'rgba(168, 85, 247, 0.35)'
          : isMindMap
          ? 'rgba(99, 102, 241, 0.35)'
          : 'rgba(16, 185, 129, 0.35)';
        ctx.fill();

        // Inner bright core
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 3.2 * scale, 0, Math.PI * 2);
        ctx.fillStyle = track.isAiSubEdge
          ? '#E9D5FF'
          : isMindMap
          ? '#C7D2FE'
          : '#6EE7B7';
        ctx.fill();
      }
    }

    // 4. Workflow Nodes
    for (const node of workflowNodes) {
      const roleInfo = getRolePalette(node.data.role, node.data.aiSubNodeType);
      const isAiHub = node.data.role === 'ai' && !node.data.aiSubNodeType;
      const isSubNode = Boolean(node.data.aiSubNodeType);

      const nw =
        (isMindMap ? 185 : isAiHub ? 148 : isSubNode ? 62 : 76) * scale;
      const nh =
        (isMindMap ? 56 : isAiHub ? 80 : isSubNode ? 62 : 76) * scale;
      const nx = (node.position.x + offsetX) * scale;
      const ny = (node.position.y + offsetY) * scale;

      // Subtle animated pulse halo on Trigger & AI Agent nodes
      if (node.data.role === 'trigger' || isAiHub) {
        const pulseScale = 1 + Math.sin(phase * Math.PI * 2) * 0.08;
        const pw = nw * pulseScale;
        const ph = nh * pulseScale;
        drawRoundedRect(
          ctx,
          nx - (pw - nw) / 2,
          ny - (ph - nh) / 2,
          pw,
          ph,
          (isSubNode ? 31 : 20) * scale
        );
        ctx.strokeStyle = roleInfo.glow;
        ctx.lineWidth = 2.5 * scale;
        ctx.stroke();
      }

      // Node Card / Medallion Body
      drawRoundedRect(ctx, nx, ny, nw, nh, (isSubNode ? 31 : 18) * scale);
      ctx.fillStyle = isLightMode ? '#FFFFFF' : '#0F172A';
      ctx.fill();
      ctx.lineWidth = 2 * scale;
      ctx.strokeStyle = roleInfo.stroke;
      ctx.stroke();

      // Role Accent Pill or Center Badge
      if (isMindMap) {
        ctx.fillStyle = roleInfo.stroke;
        ctx.font = `bold ${Math.max(8, Math.round(9 * scale))}px Inter, system-ui, sans-serif`;
        ctx.fillText(roleInfo.badge, nx + 12 * scale, ny + 18 * scale);

        ctx.fillStyle = isLightMode ? '#0F172A' : '#F8FAFC';
        ctx.font = `bold ${Math.max(10, Math.round(11.5 * scale))}px Inter, system-ui, sans-serif`;
        ctx.fillText(
          String(node.data.label || 'Step').slice(0, 22),
          nx + 12 * scale,
          ny + 35 * scale
        );

        ctx.fillStyle = isLightMode ? '#64748B' : '#94A3B8';
        ctx.font = `${Math.max(8, Math.round(9 * scale))}px monospace`;
        ctx.fillText(
          String(node.data.serviceName || '').slice(0, 24),
          nx + 12 * scale,
          ny + 48 * scale
        );
      } else if (isAiHub) {
        // AI Agent Wide Hub
        ctx.beginPath();
        ctx.arc(nx + 28 * scale, ny + nh / 2, 16 * scale, 0, Math.PI * 2);
        ctx.fillStyle = roleInfo.fill;
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = `bold ${Math.max(9, Math.round(10 * scale))}px Inter, system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('AI', nx + 28 * scale, ny + nh / 2 + 3.5 * scale);
        ctx.textAlign = 'left';

        ctx.fillStyle = isLightMode ? '#0F172A' : '#F8FAFC';
        ctx.font = `bold ${Math.max(10, Math.round(11.5 * scale))}px Inter, system-ui, sans-serif`;
        ctx.fillText(
          String(node.data.label || 'AI Agent').slice(0, 14),
          nx + 52 * scale,
          ny + nh / 2 - 2 * scale
        );

        ctx.fillStyle = '#A855F7';
        ctx.font = `bold ${Math.max(8, Math.round(8.5 * scale))}px monospace`;
        ctx.fillText('AGENT HUB', nx + 52 * scale, ny + nh / 2 + 12 * scale);
      } else {
        // Pure Icon Medallion + Below Label
        ctx.beginPath();
        ctx.arc(nx + nw / 2, ny + nh / 2, (isSubNode ? 15 : 18) * scale, 0, Math.PI * 2);
        ctx.fillStyle = roleInfo.fill;
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = `bold ${Math.max(9, Math.round(10 * scale))}px Inter, system-ui, sans-serif`;
        ctx.textAlign = 'center';
        const shortCode = String(node.data.appPlatform || node.data.label || 'STEP')
          .slice(0, 3)
          .toUpperCase();
        ctx.fillText(shortCode, nx + nw / 2, ny + nh / 2 + 3.5 * scale);

        // Label below medallion
        ctx.fillStyle = isLightMode ? '#0F172A' : '#F1F5F9';
        ctx.font = `bold ${Math.max(9, Math.round(11 * scale))}px Inter, system-ui, sans-serif`;
        ctx.fillText(
          String(node.data.label || 'Step').slice(0, 20),
          nx + nw / 2,
          ny + nh + 15 * scale
        );

        ctx.fillStyle = isLightMode ? '#64748B' : '#94A3B8';
        ctx.font = `${Math.max(8, Math.round(9 * scale))}px monospace`;
        ctx.fillText(
          String(node.data.operation || node.data.serviceName || '').slice(0, 22),
          nx + nw / 2,
          ny + nh + 28 * scale
        );
        ctx.textAlign = 'left';
      }
    }

    // 5. Top Architecture Header Bar
    ctx.fillStyle = isLightMode ? '#FFFFFF' : '#0F172A';
    ctx.fillRect(0, 0, targetWidth, 46);
    ctx.fillStyle = isLightMode ? '#E2E8F0' : '#1E293B';
    ctx.fillRect(0, 45, targetWidth, 1);

    // Live pulsing dot in header
    ctx.beginPath();
    ctx.arc(20, 23, 5, 0, Math.PI * 2);
    ctx.fillStyle = frameIdx % 2 === 0 ? '#10B981' : '#34D399';
    ctx.fill();

    ctx.fillStyle = isLightMode ? '#0F172A' : '#F8FAFC';
    ctx.font = 'bold 14px Inter, system-ui, sans-serif';
    ctx.fillText(project.name, 34, 28);

    const metaText = `${project.platform.toUpperCase()}  ·  ${
      isMindMap ? 'MIND MAP' : 'BLUEPRINT'
    }  ·  ${workflowNodes.length} STEPS  ·  ~${totalMinsSaved}M SAVED/RUN`;
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = isLightMode ? '#475569' : '#94A3B8';
    ctx.textAlign = 'right';
    ctx.fillText(metaText, targetWidth - 18, 27);
    ctx.textAlign = 'left';

    frames.push(ctx.getImageData(0, 0, targetWidth, targetHeight));
  }

  return { frames, width: targetWidth, height: targetHeight };
}

/**
 * Exports any WorkflowProject as an animated GIF (.gif).
 * - If exporting the currently active canvas and `activeCanvasElement` is available, captures the exact
 *   live DOM diagram and animates glowing data pulses along every rendered SVG connection wire.
 * - If exporting any other saved project from the Projects list, renders the complete workflow project
 *   offscreen across 14 animated frames.
 */
export async function exportProjectAsGif(
  project: WorkflowProject,
  isLightMode: boolean,
  options?: {
    activeCanvasElement?: HTMLElement | null;
    isCurrentActiveProject?: boolean;
    canvasMode?: CanvasViewMode;
  }
): Promise<void> {
  const safeName =
    project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') ||
    'workflow';
  const modeSuffix = options?.canvasMode === 'mindmap' ? 'mindmap' : 'workflow';
  const frameCount = 14;

  // Path A: Live Active Canvas Snapshot + Animated SVG Edge Flow Packets
  if (options?.isCurrentActiveProject && options?.activeCanvasElement) {
    try {
      const el = options.activeCanvasElement;
      const rect = el.getBoundingClientRect();
      const bgColor = isLightMode ? '#F8FAFC' : '#0B0F19';

      const baseDataUrl = await toPng(el, {
        backgroundColor: bgColor,
        pixelRatio: 1,
        filter: (node) => {
          if (node instanceof HTMLElement) {
            return !node.classList.contains('no-export');
          }
          return true;
        },
      });

      const baseImg = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = baseDataUrl;
      });

      const maxWidth = 920;
      const scale = Math.min(1, maxWidth / Math.max(1, baseImg.width));
      const width = Math.max(480, Math.round(baseImg.width * scale));
      const height = Math.max(320, Math.round(baseImg.height * scale));

      const scaleX = width / Math.max(1, rect.width);
      const scaleY = height / Math.max(1, rect.height);

      const tracks = sampleLiveDomEdgeTracks(
        el,
        scaleX,
        scaleY,
        options.canvasMode === 'mindmap'
      );

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;

      const workflowNodeCount = project.nodes.filter(
        (n) => n.type !== 'resizableGroup'
      ).length;

      const frames: ImageData[] = [];

      for (let f = 0; f < frameCount; f++) {
        const phase = f / frameCount;
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(baseImg, 0, 0, width, height);

        // Animate glowing data packets along every sampled live SVG path
        for (const track of tracks) {
          if (track.points.length < 2) continue;

          for (let pOffset = 0; pOffset < 2; pOffset++) {
            const t = (phase + pOffset * 0.5) % 1;
            const idx = Math.min(
              track.points.length - 1,
              Math.floor(t * (track.points.length - 1))
            );
            const pt = track.points[idx];

            // Outer glow
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 7, 0, Math.PI * 2);
            ctx.fillStyle = track.glowColor;
            ctx.fill();

            // Inner core
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 3.5, 0, Math.PI * 2);
            ctx.fillStyle = track.color;
            ctx.fill();
          }
        }

        // Crisp top-left watermark pill showing project name & live flow status
        const badgeText = `${project.name}  ·  ${project.platform.toUpperCase()} (${workflowNodeCount} steps)`;
        ctx.font = 'bold 11px Inter, system-ui, sans-serif';
        const textW = ctx.measureText(badgeText).width;
        const pillW = textW + 36;
        const pillH = 26;

        drawRoundedRect(ctx, 14, 14, pillW, pillH, 8);
        ctx.fillStyle = isLightMode
          ? 'rgba(255, 255, 255, 0.92)'
          : 'rgba(15, 23, 42, 0.92)';
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = isLightMode ? '#CBD5E1' : '#334155';
        ctx.stroke();

        // Pulsing status dot
        ctx.beginPath();
        ctx.arc(26, 27, 4, 0, Math.PI * 2);
        ctx.fillStyle = f % 2 === 0 ? '#10B981' : '#34D399';
        ctx.fill();

        ctx.fillStyle = isLightMode ? '#0F172A' : '#F8FAFC';
        ctx.fillText(badgeText, 36, 31);

        frames.push(ctx.getImageData(0, 0, width, height));
      }

      const gifBlob = encodeAnimatedGif(frames, width, height, 80);
      downloadBlob(gifBlob, `${safeName}-${modeSuffix}.gif`);
      return;
    } catch {
      // Fall through to standalone project renderer if DOM snapshot fails
    }
  }

  // Path B: Standalone Project Animated GIF Renderer (works for ANY saved project)
  const { frames, width, height } = renderStandaloneProjectGifFrames(
    project,
    isLightMode,
    options?.canvasMode || 'workflow',
    frameCount
  );
  const gifBlob = encodeAnimatedGif(frames, width, height, 80);
  downloadBlob(gifBlob, `${safeName}-${modeSuffix}.gif`);
}


export function exportWorkspaceBackup(project: WorkflowProject): void {
  const safeName = project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  downloadJsonObject(
    {
      schemaVersion: 'flowarchitect-1.0',
      exportedAt: new Date().toISOString(),
      project,
    },
    `${safeName}-workspace.json`
  );
}

// ─── Helper: Sticky Note Color Mapping (n8n 1..7 <-> FlowArchitect groupColor) ───

function mapN8nColorToGroupColor(colorNum?: number): string {
  switch (colorNum) {
    case 1:
    case 2:
      return 'amber';
    case 3:
      return 'rose';
    case 4:
      return 'emerald';
    case 5:
      return 'sky';
    case 6:
      return 'violet';
    case 7:
      return 'slate';
    default:
      return 'amber';
  }
}

function mapGroupColorToN8nColor(groupColor?: string, fallbackColor?: number): number {
  if (typeof fallbackColor === 'number' && fallbackColor >= 1 && fallbackColor <= 7) {
    return fallbackColor;
  }
  switch (groupColor) {
    case 'amber':
      return 1;
    case 'rose':
      return 3;
    case 'emerald':
      return 4;
    case 'sky':
      return 5;
    case 'violet':
      return 6;
    case 'slate':
      return 7;
    default:
      return 4;
  }
}

function parseStickyNoteContent(
  rawContent: string,
  fallbackName?: string
): { label: string; subtitle: string } {
  const trimmed = (rawContent || '').replace(/\r\n/g, '\n').trim();
  if (!trimmed) {
    return {
      label: fallbackName || 'Sticky Note',
      subtitle: '',
    };
  }

  const lines = trimmed.split('\n');
  const firstLine = lines[0].trim();

  // If the first line is a markdown heading (#, ##, ###)
  const headingMatch = firstLine.match(/^#{1,6}\s+(.+)$/);
  if (headingMatch) {
    const rest = lines.slice(1).join('\n').replace(/^\n+/, '');
    return {
      label: headingMatch[1].trim(),
      subtitle: rest,
    };
  }

  // If multiple lines, use first line as header and rest as body
  if (lines.length > 1 && firstLine.length <= 90) {
    const cleanFirst = firstLine.replace(/^\*\*(.+)\*\*$/, '$1').trim();
    const rest = lines.slice(1).join('\n').replace(/^\n+/, '');
    return {
      label: cleanFirst || fallbackName || 'Sticky Note',
      subtitle: rest,
    };
  }

  return {
    label: fallbackName || 'Sticky Note',
    subtitle: trimmed,
  };
}

function buildStickyNoteMarkdown(node: FlowNode): string {
  if (typeof node.data.rawStickyContent === 'string') {
    return node.data.rawStickyContent;
  }
  const title = (node.data.label || '').trim();
  const body = (node.data.subtitle || '').trim();
  if (title && body) {
    if (
      title === 'Sticky Note' ||
      /^Sticky Note(\s+\d+)?$/i.test(title)
    ) {
      return body;
    }
    return `## ${title}\n${body}`;
  }
  if (title) return `## ${title}`;
  return body;
}

// ─── Helper: Detect Brand Icon & App Platform from n8n / Make service type ───

function inferNodeVisualsFromType(
  rawType: string,
  nodeName: string
): {
  role: NodeRole;
  aiSubNodeType?: 'llm' | 'memory' | 'tool' | 'parser';
  isLoopNode?: boolean;
  iconName: string;
  nodeGroup: 'core' | 'app';
  appPlatform: string;
} {
  const t = (rawType || '').toLowerCase();
  const nameLower = (nodeName || '').toLowerCase();

  // 1. AI Sub-Nodes (LLM, Memory, Output Parser, Tool)
  if (
    t.includes('lmchat') ||
    t.includes('llmlangchain') ||
    t.includes('chatopenai') ||
    t.includes('chatanthropic') ||
    t.includes('chatgoogle') ||
    t.includes('chatollama') ||
    t.includes('chatdeepseek') ||
    t.includes('chatgroq') ||
    t.includes('chatmistral') ||
    t.includes('openrouter')
  ) {
    let iconName = 'sparkles';
    let appPlatform = 'OpenAI';
    if (t.includes('anthropic') || nameLower.includes('claude')) {
      iconName = 'anthropic';
      appPlatform = 'Anthropic';
    } else if (t.includes('google') || t.includes('gemini') || nameLower.includes('gemini')) {
      iconName = 'gemini';
      appPlatform = 'Google Gemini';
    } else if (t.includes('deepseek') || nameLower.includes('deepseek')) {
      iconName = 'deepseek';
      appPlatform = 'DeepSeek';
    } else if (t.includes('openai') || nameLower.includes('gpt') || nameLower.includes('openai')) {
      iconName = 'openai';
      appPlatform = 'OpenAI';
    }
    return {
      role: 'ai',
      aiSubNodeType: 'llm',
      iconName,
      nodeGroup: 'core',
      appPlatform,
    };
  }

  if (t.includes('memory')) {
    return {
      role: 'ai',
      aiSubNodeType: 'memory',
      iconName: 'database',
      nodeGroup: 'core',
      appPlatform: 'Core',
    };
  }

  if (t.includes('outputparser')) {
    return {
      role: 'ai',
      aiSubNodeType: 'parser',
      iconName: 'code',
      nodeGroup: 'core',
      appPlatform: 'Core',
    };
  }

  if (
    t.includes('langchain.tool') ||
    t.endsWith('tool') ||
    t.includes('mcp') ||
    t.includes('vectorstore') ||
    t.includes('embeddings') ||
    t.includes('documentdefaultdataloader') ||
    t.includes('textsplitter')
  ) {
    let iconName = 'wrench';
    if (t.includes('serpapi') || t.includes('search') || t.includes('wikipedia')) iconName = 'globe';
    else if (t.includes('code')) iconName = 'code';
    else if (t.includes('http')) iconName = 'globe';
    else if (t.includes('vector') || t.includes('embeddings')) iconName = 'database';
    return {
      role: 'ai',
      aiSubNodeType: 'tool',
      iconName,
      nodeGroup: 'core',
      appPlatform: 'Core',
    };
  }

  // 2. Loop / Split in Batches
  if (
    t.includes('splitinbatches') ||
    t.includes('loop') ||
    t.includes('repeater') ||
    t.includes('iterator')
  ) {
    return {
      role: 'router',
      isLoopNode: true,
      iconName: 'loop',
      nodeGroup: 'core',
      appPlatform: 'Core',
    };
  }

  // 3. AI Agent Hub / LangChain Chains
  if (
    t.includes('.agent') ||
    t.includes('langchain.chain') ||
    t.includes('informationextractor') ||
    t.includes('textclassifier') ||
    t.includes('sentimentanalysis') ||
    t.includes('summarization') ||
    t.includes('openaichat') ||
    t.includes('@n8n/n8n-nodes-langchain.openai')
  ) {
    return {
      role: 'ai',
      iconName: t.includes('openai') ? 'openai' : 'bot',
      nodeGroup: 'core',
      appPlatform: 'Core',
    };
  }

  // 4. Determine Role (Trigger vs Router vs Action)
  let role: NodeRole = 'action';
  if (
    t.includes('trigger') ||
    t.includes('webhook') ||
    t.includes('schedule') ||
    t.includes('cron') ||
    t.includes('formtrigger') ||
    t.includes('chattrigger') ||
    t.includes('emailreadimap')
  ) {
    role = 'trigger';
  } else if (
    t.includes('.if') ||
    t.includes('.switch') ||
    t.includes('.filter') ||
    t.includes('.merge') ||
    t.includes('router')
  ) {
    role = 'router';
  }

  // 5. Map Brand Icons & App Platforms
  if (t.includes('gmail')) return { role, iconName: 'gmail', nodeGroup: 'app', appPlatform: 'Gmail' };
  if (t.includes('googlesheets') || t.includes('sheets'))
    return { role, iconName: 'sheets', nodeGroup: 'app', appPlatform: 'Google Sheets' };
  if (t.includes('googledrive') || t.includes('drive'))
    return { role, iconName: 'drive', nodeGroup: 'app', appPlatform: 'Google Drive' };
  if (t.includes('googledocs') || t.includes('docs'))
    return { role, iconName: 'docs', nodeGroup: 'app', appPlatform: 'Google Docs' };
  if (t.includes('googlecalendar') || t.includes('calendar'))
    return { role, iconName: 'calendar', nodeGroup: 'app', appPlatform: 'Google Calendar' };
  if (t.includes('slack')) return { role, iconName: 'slack', nodeGroup: 'app', appPlatform: 'Slack' };
  if (t.includes('telegram'))
    return { role, iconName: 'telegram', nodeGroup: 'app', appPlatform: 'Telegram' };
  if (t.includes('discord'))
    return { role, iconName: 'discord', nodeGroup: 'app', appPlatform: 'Discord' };
  if (t.includes('whatsapp'))
    return { role, iconName: 'whatsapp', nodeGroup: 'app', appPlatform: 'WhatsApp' };
  if (t.includes('notion'))
    return { role, iconName: 'notion', nodeGroup: 'app', appPlatform: 'Notion' };
  if (t.includes('airtable'))
    return { role, iconName: 'airtable', nodeGroup: 'app', appPlatform: 'Airtable' };
  if (t.includes('hubspot'))
    return { role, iconName: 'hubspot', nodeGroup: 'app', appPlatform: 'HubSpot' };
  if (t.includes('salesforce'))
    return { role, iconName: 'salesforce', nodeGroup: 'app', appPlatform: 'Salesforce' };
  if (t.includes('pipedrive'))
    return { role, iconName: 'pipedrive', nodeGroup: 'app', appPlatform: 'Pipedrive' };
  if (t.includes('highlevel') || t.includes('ghl'))
    return { role, iconName: 'ghl', nodeGroup: 'app', appPlatform: 'GoHighLevel' };
  if (t.includes('stripe'))
    return { role, iconName: 'stripe', nodeGroup: 'app', appPlatform: 'Stripe' };
  if (t.includes('shopify'))
    return { role, iconName: 'shopify', nodeGroup: 'app', appPlatform: 'Shopify' };
  if (t.includes('postgres'))
    return { role, iconName: 'postgres', nodeGroup: 'app', appPlatform: 'PostgreSQL' };
  if (t.includes('supabase'))
    return { role, iconName: 'supabase', nodeGroup: 'app', appPlatform: 'Supabase' };
  if (t.includes('mysql') || t.includes('mongodb') || t.includes('redis'))
    return { role, iconName: 'database', nodeGroup: 'app', appPlatform: 'Database' };
  if (t.includes('pinecone') || t.includes('qdrant'))
    return { role, iconName: 'pinecone', nodeGroup: 'app', appPlatform: 'Vector DB' };
  if (t.includes('github'))
    return { role, iconName: 'github', nodeGroup: 'app', appPlatform: 'GitHub' };
  if (t.includes('jira')) return { role, iconName: 'jira', nodeGroup: 'app', appPlatform: 'Jira' };
  if (t.includes('linear'))
    return { role, iconName: 'linear', nodeGroup: 'app', appPlatform: 'Linear' };
  if (t.includes('trello'))
    return { role, iconName: 'trello', nodeGroup: 'app', appPlatform: 'Trello' };
  if (t.includes('clickup'))
    return { role, iconName: 'clickup', nodeGroup: 'app', appPlatform: 'ClickUp' };
  if (t.includes('asana'))
    return { role, iconName: 'asana', nodeGroup: 'app', appPlatform: 'Asana' };
  if (t.includes('openai'))
    return { role, iconName: 'openai', nodeGroup: 'app', appPlatform: 'OpenAI' };
  if (t.includes('anthropic'))
    return { role, iconName: 'anthropic', nodeGroup: 'app', appPlatform: 'Anthropic' };
  if (t.includes('webhook') || t.includes('respondtowebhook'))
    return { role, iconName: 'webhook', nodeGroup: 'core', appPlatform: 'Core' };
  if (t.includes('schedule') || t.includes('cron') || t.includes('wait'))
    return { role, iconName: 'clock', nodeGroup: 'core', appPlatform: 'Core' };
  if (t.includes('code') || t.includes('function') || t.includes('set') || t.includes('itemlists'))
    return { role, iconName: 'code', nodeGroup: 'core', appPlatform: 'Core' };
  if (t.includes('if') || t.includes('switch') || t.includes('filter') || t.includes('merge'))
    return { role, iconName: 'git-branch', nodeGroup: 'core', appPlatform: 'Core' };
  if (t.includes('email') || t.includes('gmail') || t.includes('mail'))
    return { role, iconName: 'mail', nodeGroup: 'core', appPlatform: 'Core' };

  return {
    role,
    iconName: role === 'trigger' ? 'webhook' : role === 'router' ? 'git-branch' : 'globe',
    nodeGroup: 'core',
    appPlatform: 'Core',
  };
}

/**
 * Generates an n8n-compatible Workflow JSON file including all Sticky Notes,
 * Node Notes, AI Sub-Node connections, Loop Over Items branches, and preserved raw parameters.
 */
export function exportN8nBlueprint(project: WorkflowProject): void {
  const workflowNodes = project.nodes.filter((n) => n.type !== 'resizableGroup');
  const stickyGroupNodes = project.nodes.filter((n) => n.type === 'resizableGroup');

  const usedNames = new Set<string>();
  const nodeIdToExportName = new Map<string, string>();

  const allocateUniqueName = (id: string, preferredName: string): string => {
    const base = (preferredName || 'Node').trim() || 'Node';
    let candidate = base;
    let counter = 1;
    while (usedNames.has(candidate)) {
      candidate = `${base} ${counter++}`;
    }
    usedNames.add(candidate);
    nodeIdToExportName.set(id, candidate);
    return candidate;
  };

  // 1. Serialize Sticky Notes as native n8n-nodes-base.stickyNote nodes
  const exportedStickyNodes = stickyGroupNodes.map((n, index) => {
    const raw = n.data.rawN8nNode || {};
    const preferredName =
      raw.name ||
      (n.data.label && !n.data.label.startsWith('Sticky Note')
        ? `Sticky Note - ${n.data.label}`
        : `Sticky Note${index === 0 ? '' : ` ${index}`}`);
    const exportName = allocateUniqueName(n.id, preferredName);
    const width = Math.round(
      Number(n.style?.width) || Number(n.width) || Number(raw.parameters?.width) || 340
    );
    const height = Math.round(
      Number(n.style?.height) || Number(n.height) || Number(raw.parameters?.height) || 240
    );
    const color = mapGroupColorToN8nColor(
      n.data.groupColor,
      n.data.stickyColor ?? raw.parameters?.color
    );
    const content = buildStickyNoteMarkdown(n);

    return {
      ...raw,
      parameters: {
        ...(raw.parameters || {}),
        content,
        height,
        width,
        color,
      },
      id: raw.id || n.id,
      name: exportName,
      type: raw.type || 'n8n-nodes-base.stickyNote',
      typeVersion: raw.typeVersion || 1,
      position: [Math.round(n.position.x), Math.round(n.position.y)],
    };
  });

  // 2. Serialize Workflow Action / Trigger / AI / Router / Loop Nodes
  const exportedWorkflowNodes = workflowNodes.map((n) => {
    const raw = n.data.rawN8nNode || {};
    const exportName = allocateUniqueName(n.id, n.data.label || raw.name || 'Step');
    const isLoop = Boolean(n.data.isLoopNode || n.data.iconName === 'loop');

    let defaultParameters: Record<string, any> = {};
    if (isLoop) {
      defaultParameters = {
        batchSize: n.data.loopConfig?.batchSize ?? 1,
        options: {
          reset: Boolean(n.data.loopConfig?.resetOnEachRun),
        },
      };
    } else if (n.data.role === 'ai' && !n.data.aiSubNodeType) {
      defaultParameters = {
        promptType: 'define',
        text: n.data.systemPrompt || 'Analyze incoming payload and execute tools.',
        options: {
          baseUrl: n.data.llmBaseUrl || undefined,
          customParameters: n.data.llmParams?.filter((p) => p.enabled) || undefined,
        },
      };
    } else if (n.data.endpointUrl) {
      defaultParameters = {
        url: n.data.endpointUrl,
        method: n.data.httpMethod || 'POST',
        sendBody: true,
        bodyParameters: {
          parameters: [
            {
              name: 'payload',
              value: n.data.payloadSchema || '{}',
            },
          ],
        },
      };
    }

    const mergedParameters = raw.parameters
      ? {
          ...defaultParameters,
          ...raw.parameters,
          ...(isLoop && n.data.loopConfig
            ? {
                batchSize: n.data.loopConfig.batchSize ?? raw.parameters.batchSize ?? 1,
                options: {
                  ...(raw.parameters.options || {}),
                  reset:
                    n.data.loopConfig.resetOnEachRun ??
                    raw.parameters.options?.reset ??
                    false,
                },
              }
            : {}),
        }
      : defaultParameters;

    const resolvedType =
      raw.type ||
      (isLoop
        ? 'n8n-nodes-base.splitInBatches'
        : n.data.serviceName?.includes('.')
        ? n.data.serviceName
        : n.data.role === 'trigger'
        ? 'n8n-nodes-base.webhook'
        : n.data.role === 'ai'
        ? '@n8n/n8n-nodes-langchain.agent'
        : n.data.role === 'router'
        ? 'n8n-nodes-base.switch'
        : 'n8n-nodes-base.httpRequest');

    const noteText = n.data.nodeNotes ?? n.data.roiNotes ?? raw.notes ?? '';
    const nodeOut: Record<string, any> = {
      ...raw,
      parameters: mergedParameters,
      id: raw.id || n.id,
      name: exportName,
      type: resolvedType,
      typeVersion: raw.typeVersion || (isLoop ? 3 : 1),
      position: [Math.round(n.position.x), Math.round(n.position.y)],
    };

    if (noteText) {
      nodeOut.notes = noteText;
      nodeOut.notesInFlow = n.data.notesInFlow ?? raw.notesInFlow ?? true;
    }

    return nodeOut;
  });

  // 3. Serialize Connections (including main, loop branches, router branches, and AI sub-node ports)
  const connections: Record<
    string,
    Record<string, Array<Array<{ node: string; type: string; index: number }>>>
  > = {};

  const ensureConnBucket = (sourceName: string, connType: string, branchIndex: number) => {
    if (!connections[sourceName]) connections[sourceName] = {};
    if (!connections[sourceName][connType]) connections[sourceName][connType] = [];
    while (connections[sourceName][connType].length <= branchIndex) {
      connections[sourceName][connType].push([]);
    }
  };

  const nodeById = new Map(workflowNodes.map((n) => [n.id, n]));

  project.edges.forEach((edge) => {
    const sourceNode = nodeById.get(edge.source);
    const targetNode = nodeById.get(edge.target);
    if (!sourceNode || !targetNode) return;

    const sourceName = nodeIdToExportName.get(sourceNode.id);
    const targetName = nodeIdToExportName.get(targetNode.id);
    if (!sourceName || !targetName) return;

    // Check if this is an AI Agent <-> AI Sub-Node connection on canvas
    const isAiHandle =
      edge.sourceHandle === 'ai-llm' ||
      edge.sourceHandle === 'ai-memory' ||
      edge.sourceHandle === 'ai-tool' ||
      edge.sourceHandle === 'ai-parser' ||
      Boolean(targetNode.data.aiSubNodeType);

    if (isAiHandle && (targetNode.data.aiSubNodeType || sourceNode.data.aiSubNodeType)) {
      const subNode = targetNode.data.aiSubNodeType ? targetNode : sourceNode;
      const agentNode = targetNode.data.aiSubNodeType ? sourceNode : targetNode;
      const subName = nodeIdToExportName.get(subNode.id)!;
      const agentName = nodeIdToExportName.get(agentNode.id)!;

      const subType = subNode.data.aiSubNodeType;
      const n8nAiConnType =
        subType === 'llm' || edge.sourceHandle === 'ai-llm'
          ? 'ai_languageModel'
          : subType === 'memory' || edge.sourceHandle === 'ai-memory'
          ? 'ai_memory'
          : subType === 'parser' || edge.sourceHandle === 'ai-parser'
          ? 'ai_outputParser'
          : 'ai_tool';

      ensureConnBucket(subName, n8nAiConnType, 0);
      connections[subName][n8nAiConnType][0].push({
        node: agentName,
        type: n8nAiConnType,
        index: 0,
      });
      return;
    }

    // Standard / Loop / Router main connections
    let branchIdx = 0;
    const isSourceLoop = Boolean(sourceNode.data.isLoopNode || sourceNode.data.iconName === 'loop');
    if (isSourceLoop) {
      if (edge.sourceHandle === 'loop-body') {
        branchIdx = 1; // n8n SplitInBatches output 1 = "loop"
      } else {
        branchIdx = 0; // n8n SplitInBatches output 0 = "done"
      }
    } else if (edge.sourceHandle?.startsWith('router-out-')) {
      const parsedIdx = parseInt(edge.sourceHandle.replace('router-out-', ''), 10);
      if (!Number.isNaN(parsedIdx) && parsedIdx >= 0) {
        branchIdx = parsedIdx;
      }
    }

    ensureConnBucket(sourceName, 'main', branchIdx);
    connections[sourceName].main[branchIdx].push({
      node: targetName,
      type: 'main',
      index: 0,
    });
  });

  const topMeta = project.rawTopLevelMeta || {};
  const n8nJson: Record<string, any> = {
    name: project.name,
    nodes: [...exportedStickyNodes, ...exportedWorkflowNodes],
    connections,
    active: topMeta.active ?? false,
    settings: topMeta.settings || {
      executionOrder: 'v1',
    },
    ...(topMeta.pinData ? { pinData: topMeta.pinData } : {}),
    ...(topMeta.versionId ? { versionId: topMeta.versionId } : {}),
    ...(topMeta.tags ? { tags: topMeta.tags } : {}),
    meta: {
      ...(topMeta.meta || {}),
      generator: 'FlowArchitect AI',
      exportedAt: new Date().toISOString(),
    },
  };

  const safeName = project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  downloadJsonObject(n8nJson, `${safeName}-n8n-workflow.json`);
}

export function exportMakeBlueprint(project: WorkflowProject): void {
  const workflowNodes = project.nodes.filter((n) => n.type !== 'resizableGroup');
  const stickyGroupNodes = project.nodes.filter((n) => n.type === 'resizableGroup');

  const makeModuleMap: Record<string, string> = {
    trigger: 'gateway:CustomWebHook',
    ai: 'openai-gpt-3:CreateCompletion',
    router: 'builtin:BasicRouter',
    action: 'http:ActionSendData',
  };

  const flow = workflowNodes.map((node, idx) => {
    const rawMod = node.data.rawMakeModule || {};
    const noteContent =
      node.data.nodeNotes || node.data.roiNotes || rawMod.notes || node.data.subtitle || '';

    return {
      ...rawMod,
      id: typeof rawMod.id === 'number' ? rawMod.id : idx + 1,
      module:
        rawMod.module ||
        (node.data.serviceName?.includes(':')
          ? node.data.serviceName
          : makeModuleMap[node.data.role] || 'http:ActionSendData'),
      version: rawMod.version || 3,
      parameters: rawMod.parameters || {},
      ...(noteContent ? { notes: noteContent } : {}),
      mapper: rawMod.mapper || {
        url: node.data.endpointUrl || '',
        method: node.data.httpMethod || 'POST',
        prompt: node.data.systemPrompt || '',
      },
      metadata: {
        ...(rawMod.metadata || {}),
        designer: {
          ...(rawMod.metadata?.designer || {}),
          x: Math.round(node.position.x),
          y: Math.round(node.position.y),
          name: node.data.label,
          notes: noteContent,
        },
      },
    };
  });

  const scenarioNotes = stickyGroupNodes.map((n, index) => ({
    id: n.id || `note_${index + 1}`,
    title: n.data.label || 'Sticky Note',
    content: buildStickyNoteMarkdown(n),
    color: n.data.groupColor || 'amber',
    position: {
      x: Math.round(n.position.x),
      y: Math.round(n.position.y),
    },
    size: {
      width: Math.round(Number(n.style?.width) || Number(n.width) || 340),
      height: Math.round(Number(n.style?.height) || Number(n.height) || 240),
    },
  }));

  const topMeta = project.rawTopLevelMeta || {};
  const makeBlueprint = {
    ...topMeta,
    name: project.name,
    flow,
    notes: scenarioNotes,
    metadata: {
      ...(topMeta.metadata || {}),
      version: 1,
      scenario: {
        ...(topMeta.metadata?.scenario || {}),
        roundtrips: 1,
        maxErrors: 3,
        autoCommit: true,
        notes: scenarioNotes,
      },
      designer: {
        ...(topMeta.metadata?.designer || {}),
        orphans: [],
        notes: scenarioNotes,
      },
      generator: 'FlowArchitect AI',
    },
  };

  const safeName = project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  downloadJsonObject(makeBlueprint, `${safeName}-make-blueprint.json`);
}

/**
 * Supports importing:
 * 1. Native FlowArchitect AI workspace JSON (with sticky notes & metadata)
 * 2. Native n8n workflow JSON (including n8n-nodes-base.stickyNote, AI sub-nodes, SplitInBatches loops, and exact parameters)
 * 3. Native Make.com blueprint JSON (including scenario/module notes and nested router routes)
 */
export function parseImportedWorkflowJson(
  rawText: string,
  fallbackPlatform: PlatformType = 'n8n'
): WorkflowProject {
  const parsed = JSON.parse(rawText);

  // Case 1: FlowArchitect AI native backup or direct WorkflowProject JSON
  if (parsed.project && Array.isArray(parsed.project.nodes)) {
    return {
      ...parsed.project,
      id: `proj_${Date.now()}`,
      updatedAt: Date.now(),
      rawSourceFormat: parsed.project.rawSourceFormat || 'flowarchitect',
    };
  }

  if (
    Array.isArray(parsed.nodes) &&
    Array.isArray(parsed.edges) &&
    parsed.nodes.some((n: any) => n?.data && typeof n.data === 'object')
  ) {
    return {
      ...parsed,
      id: `proj_${Date.now()}`,
      name: parsed.name || 'Imported FlowArchitect Blueprint',
      description: parsed.description || 'Imported FlowArchitect workspace',
      platform: parsed.platform || fallbackPlatform || 'n8n',
      createdAt: parsed.createdAt || Date.now(),
      updatedAt: Date.now(),
      rawSourceFormat: 'flowarchitect',
    };
  }

  // Case 2: Native n8n workflow JSON ({ nodes: [...], connections?: {...} })
  if (Array.isArray(parsed.nodes)) {
    const nodes: FlowNode[] = [];
    const nameToIdMap = new Map<string, string>();
    const rawIdToIdMap = new Map<string, string>();

    parsed.nodes.forEach((n: any, idx: number) => {
      const id = String(n.id || `n8n_${idx + 1}_${Date.now()}`);
      const nodeName = String(n.name || `Step ${idx + 1}`);
      nameToIdMap.set(nodeName, id);
      rawIdToIdMap.set(id, id);

      const pos = Array.isArray(n.position) ? n.position : [idx * 175 + 120, 165];
      const posX = Number(pos[0]) || 0;
      const posY = Number(pos[1]) || 0;
      const typeStr = String(n.type || '');
      const typeLower = typeStr.toLowerCase();

      // 2A: Sticky Note Node (n8n-nodes-base.stickyNote or @n8n/n8n-nodes-base.stickyNote)
      if (typeLower.includes('stickynote')) {
        const rawContent = String(n.parameters?.content ?? n.notes ?? '');
        const width = Math.max(180, Number(n.parameters?.width) || 340);
        const height = Math.max(110, Number(n.parameters?.height) || 240);
        const colorNum = Number(n.parameters?.color) || 4;
        const groupColor = mapN8nColorToGroupColor(colorNum);
        const { label, subtitle } = parseStickyNoteContent(rawContent, nodeName);

        nodes.push({
          id,
          type: 'resizableGroup',
          position: { x: posX, y: posY },
          zIndex: 0,
          style: { width, height },
          width,
          height,
          data: {
            label,
            subtitle,
            role: 'group',
            platform: 'n8n',
            serviceName: typeStr || 'n8n-nodes-base.stickyNote',
            iconName: 'layers',
            groupColor,
            stickyColor: colorNum,
            rawStickyContent: rawContent,
            rawN8nNode: n,
            estimatedTimeSavedMins: 0,
          },
        });
        return;
      }

      // 2B: Standard / AI / Loop / Trigger / Router Workflow Node
      const visuals = inferNodeVisualsFromType(typeStr, nodeName);
      const shortService = typeStr.split('.').pop() || 'n8n Node';
      const nodeNotes = typeof n.notes === 'string' ? n.notes : '';
      const operationParam =
        n.parameters?.operation ||
        n.parameters?.resource ||
        n.parameters?.httpMethod ||
        n.parameters?.method ||
        '';
      const subtitleText = nodeNotes
        ? nodeNotes.split('\n')[0].slice(0, 60)
        : operationParam
        ? `${shortService}: ${operationParam}`
        : shortService;

      const loopConfig = visuals.isLoopNode
        ? {
            mode: 'batch' as const,
            batchSize: Number(n.parameters?.batchSize) || 1,
            resetOnEachRun: Boolean(n.parameters?.options?.reset),
          }
        : undefined;

      const isAiAgentHub = visuals.role === 'ai' && !visuals.aiSubNodeType;
      const isSubNode = Boolean(visuals.aiSubNodeType);
      const nodeStyle = isAiAgentHub
        ? { width: 220, height: 82 }
        : visuals.isLoopNode
        ? { width: 196, height: 82 }
        : isSubNode
        ? { width: 68, height: 68 }
        : { width: 76, height: 76 };

      nodes.push({
        id,
        type: 'workflowNode',
        position: { x: posX, y: posY },
        zIndex: 10,
        style: nodeStyle,
        data: {
          label: nodeName,
          subtitle: subtitleText,
          role: visuals.role,
          aiSubNodeType: visuals.aiSubNodeType,
          isLoopNode: visuals.isLoopNode,
          loopConfig,
          nodeGroup: visuals.nodeGroup,
          appPlatform: visuals.appPlatform,
          operation: String(operationParam || shortService),
          platform: 'n8n',
          serviceName: typeStr || 'n8n-nodes-base.httpRequest',
          iconName: visuals.iconName,
          systemPrompt:
            n.parameters?.text ||
            n.parameters?.prompt ||
            n.parameters?.systemMessage ||
            n.parameters?.options?.systemMessage ||
            '',
          endpointUrl: n.parameters?.url || n.parameters?.path || '',
          httpMethod: n.parameters?.method || n.parameters?.httpMethod || 'POST',
          payloadSchema:
            typeof n.parameters?.jsonBody === 'string'
              ? n.parameters.jsonBody
              : '',
          nodeNotes: nodeNotes || undefined,
          notesInFlow: typeof n.notesInFlow === 'boolean' ? n.notesInFlow : undefined,
          roiNotes: nodeNotes || undefined,
          rawN8nNode: n,
          estimatedTimeSavedMins: 5,
        },
      });
    });

    const nodeById = new Map(nodes.map((n) => [n.id, n]));
    const edges: FlowEdge[] = [];

    if (parsed.connections && typeof parsed.connections === 'object') {
      Object.entries(parsed.connections).forEach(
        ([sourceKey, connObj]: [string, any]) => {
          const sourceId =
            nameToIdMap.get(sourceKey) || rawIdToIdMap.get(sourceKey);
          if (!sourceId || !connObj || typeof connObj !== 'object') return;
          const sourceNode = nodeById.get(sourceId);
          if (!sourceNode) return;

          Object.entries(connObj).forEach(
            ([connType, branches]: [string, any]) => {
              if (!Array.isArray(branches)) return;

              branches.forEach((branchGroup: any[], branchIdx: number) => {
                if (!Array.isArray(branchGroup)) return;

                branchGroup.forEach((targetItem: any, itemIdx: number) => {
                  const targetKey = String(targetItem?.node ?? '');
                  const targetId =
                    nameToIdMap.get(targetKey) || rawIdToIdMap.get(targetKey);
                  if (!targetId) return;
                  const targetNode = nodeById.get(targetId);
                  if (!targetNode) return;

                  // Handle AI Sub-Node Connections (ai_languageModel, ai_memory, ai_tool, ai_outputParser)
                  if (connType.startsWith('ai_')) {
                    const aiHandle =
                      connType === 'ai_languageModel'
                        ? 'ai-llm'
                        : connType === 'ai_memory'
                        ? 'ai-memory'
                        : connType === 'ai_outputParser'
                        ? 'ai-parser'
                        : 'ai-tool';

                    edges.push({
                      id: `e_ai_${targetId}_${sourceId}_${connType}_${branchIdx}_${itemIdx}`,
                      source: targetId,
                      sourceHandle: aiHandle,
                      target: sourceId,
                      targetHandle: 'ai-sub-in',
                      type: 'workflowEdge',
                      animated: true,
                    });
                    return;
                  }

                  // Standard 'main' connections (including SplitInBatches loop & router branches)
                  let sourceHandle: string | undefined;
                  let targetHandle: string | undefined;
                  let edgeLabel: string | undefined;

                  if (sourceNode.data.isLoopNode) {
                    if (branchIdx === 0) {
                      sourceHandle = 'loop-done';
                      edgeLabel = 'done';
                    } else {
                      sourceHandle = 'loop-body';
                      edgeLabel = 'loop';
                    }
                  } else if (
                    sourceNode.data.role === 'router' &&
                    branches.length > 1
                  ) {
                    sourceHandle = `router-out-${Math.min(branchIdx, 3)}`;
                    edgeLabel = `Branch ${branchIdx + 1}`;
                  } else if (branchIdx > 0) {
                    edgeLabel = `Branch ${branchIdx + 1}`;
                  }

                  // Detect loop-back return edge to a SplitInBatches / Loop node
                  if (
                    targetNode.data.isLoopNode &&
                    sourceNode.id !== targetNode.id &&
                    sourceNode.position.x >= targetNode.position.x
                  ) {
                    targetHandle = 'loop-return';
                    edgeLabel = edgeLabel || 'next batch';
                  }

                  edges.push({
                    id: `e_${sourceId}_${targetId}_${connType}_${branchIdx}_${itemIdx}`,
                    source: sourceId,
                    target: targetId,
                    ...(sourceHandle ? { sourceHandle } : {}),
                    ...(targetHandle ? { targetHandle } : {}),
                    type: 'workflowEdge',
                    animated: true,
                    ...(edgeLabel ? { label: edgeLabel } : {}),
                  });
                });
              });
            }
          );
        }
      );
    }

    const stickyCount = nodes.filter((n) => n.type === 'resizableGroup').length;
    const stepCount = nodes.filter((n) => n.type !== 'resizableGroup').length;

    return {
      id: `proj_n8n_${Date.now()}`,
      name: parsed.name || 'Imported n8n Workflow',
      description: `Imported n8n blueprint (${stepCount} steps${stickyCount > 0 ? `, ${stickyCount} sticky notes` : ''})`,
      platform: 'n8n',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      nodes,
      edges,
      rawSourceFormat: 'n8n',
      rawTopLevelMeta: {
        active: parsed.active,
        settings: parsed.settings,
        pinData: parsed.pinData,
        versionId: parsed.versionId,
        tags: parsed.tags,
        meta: parsed.meta,
      },
    };
  }

  // Case 3: Make.com scenario blueprint ({ flow: [...] })
  if (Array.isArray(parsed.flow)) {
    const nodes: FlowNode[] = [];
    const edges: FlowEdge[] = [];

    // 3A: Import scenario-level Sticky Notes if present in Make JSON
    const rawMakeNotes =
      (Array.isArray(parsed.notes) && parsed.notes) ||
      (Array.isArray(parsed.metadata?.scenario?.notes) &&
        parsed.metadata.scenario.notes) ||
      (Array.isArray(parsed.metadata?.designer?.notes) &&
        parsed.metadata.designer.notes) ||
      [];

    rawMakeNotes.forEach((note: any, idx: number) => {
      const content = String(note.content ?? note.text ?? note.note ?? '');
      const title = String(note.title ?? note.name ?? `Sticky Note ${idx + 1}`);
      const { label, subtitle } = parseStickyNoteContent(content, title);
      const width = Math.max(180, Number(note.size?.width ?? note.width) || 320);
      const height = Math.max(110, Number(note.size?.height ?? note.height) || 200);
      const posX = Number(note.position?.x ?? note.x) || 140 + idx * 360;
      const posY = Number(note.position?.y ?? note.y) || 40;

      nodes.push({
        id: String(note.id || `make_note_${idx}_${Date.now()}`),
        type: 'resizableGroup',
        position: { x: posX, y: posY },
        zIndex: 0,
        style: { width, height },
        width,
        height,
        data: {
          label,
          subtitle,
          role: 'group',
          platform: 'make',
          serviceName: 'make:StickyNote',
          iconName: 'layers',
          groupColor: note.color || 'amber',
          rawStickyContent: content || `${title}\n${subtitle}`,
          estimatedTimeSavedMins: 0,
        },
      });
    });

    // 3B: Recursively traverse Make flow (including BasicRouter nested routes[].flow)
    let moduleCounter = 0;
    const traverseMakeFlow = (
      flowArray: any[],
      parentNodeId: string | null,
      routeBranchIndex?: number
    ) => {
      let prevId = parentNodeId;

      flowArray.forEach((m: any, idx: number) => {
        moduleCounter += 1;
        const id = `make_${m.id || moduleCounter}_${moduleCounter}`;
        const designer = m.metadata?.designer || {};
        const modStr = String(m.module || 'http:ActionSendData');
        const label =
          designer.name || m.name || modStr.split(':').pop() || `Module ${moduleCounter}`;
        const visuals = inferNodeVisualsFromType(modStr, label);
        const role: NodeRole =
          parentNodeId === null && idx === 0 ? 'trigger' : visuals.role;

        const modNote = String(m.notes ?? designer.notes ?? '');
        const posX =
          typeof designer.x === 'number' ? designer.x : moduleCounter * 175 + 120;
        const posY =
          typeof designer.y === 'number'
            ? designer.y
            : 165 + (routeBranchIndex ? routeBranchIndex * 160 : 0);

        nodes.push({
          id,
          type: 'workflowNode',
          position: { x: posX, y: posY },
          zIndex: 10,
          style: visuals.isLoopNode
            ? { width: 196, height: 82 }
            : { width: 76, height: 76 },
          data: {
            label,
            subtitle: modNote || modStr,
            role,
            isLoopNode: visuals.isLoopNode,
            nodeGroup: visuals.nodeGroup,
            appPlatform: visuals.appPlatform,
            platform: 'make',
            serviceName: modStr,
            iconName: visuals.iconName,
            endpointUrl: m.mapper?.url || '',
            httpMethod: m.mapper?.method || 'POST',
            systemPrompt: m.mapper?.prompt || '',
            nodeNotes: modNote || undefined,
            roiNotes: modNote || undefined,
            rawMakeModule: m,
            estimatedTimeSavedMins: 5,
          },
        });

        if (prevId) {
          const isRouteBranch =
            prevId === parentNodeId && typeof routeBranchIndex === 'number';
          edges.push({
            id: `make_edge_${prevId}_${id}`,
            source: prevId,
            target: id,
            ...(isRouteBranch
              ? {
                  sourceHandle: `router-out-${Math.min(routeBranchIndex, 3)}`,
                  label: `Route ${routeBranchIndex + 1}`,
                }
              : {}),
            type: 'workflowEdge',
            animated: true,
          });
        }

        prevId = id;

        if (Array.isArray(m.routes)) {
          m.routes.forEach((route: any, rIdx: number) => {
            if (Array.isArray(route.flow) && route.flow.length > 0) {
              traverseMakeFlow(route.flow, id, rIdx);
            }
          });
        }
      });
    };

    traverseMakeFlow(parsed.flow, null);

    return {
      id: `proj_make_${Date.now()}`,
      name: parsed.name || 'Imported Make Scenario',
      description: 'Reverse-engineered from Make.com blueprint JSON',
      platform: 'make',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      nodes,
      edges,
      rawSourceFormat: 'make',
      rawTopLevelMeta: {
        metadata: parsed.metadata,
      },
    };
  }

  throw new Error(
    'Unrecognized JSON format. Please upload a FlowArchitect workspace, n8n workflow, or Make.com blueprint JSON.'
  );
}
