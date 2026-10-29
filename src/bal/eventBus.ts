export type FlowEventType =
  | 'NODE_DRAG_OVER_TARGET'
  | 'NODE_SWAPPED'
  | 'NODE_REPLACED_FROM_LIBRARY'
  | 'PLATFORM_TRANSLATED'
  | 'AI_GENERATION_STARTED'
  | 'AI_GENERATION_COMPLETED'
  | 'PROJECT_SAVED'
  | 'TOAST_NOTIFY';

export interface FlowEventPayloadMap {
  NODE_DRAG_OVER_TARGET: { draggedId?: string; targetId: string | null };
  NODE_SWAPPED: { sourceLabel: string; targetLabel: string };
  NODE_REPLACED_FROM_LIBRARY: { oldLabel: string; newLabel: string };
  PLATFORM_TRANSLATED: { from: string; to: string; count: number };
  AI_GENERATION_STARTED: { prompt: string; platform: string };
  AI_GENERATION_COMPLETED: { title: string; nodeCount: number; providerUsed?: string };
  PROJECT_SAVED: { projectId: string; timestamp: number };
  TOAST_NOTIFY: { message: string; type: 'info' | 'success' | 'warning' | 'error' };
}

type EventHandler<T extends FlowEventType> = (payload: FlowEventPayloadMap[T]) => void;

class ClientEventBus {
  private listeners: Map<FlowEventType, Set<EventHandler<any>>> = new Map();

  on<T extends FlowEventType>(event: T, handler: EventHandler<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
    return () => {
      this.listeners.get(event)?.delete(handler);
    };
  }

  emit<T extends FlowEventType>(event: T, payload: FlowEventPayloadMap[T]): void {
    const handlers = this.listeners.get(event);
    if (!handlers) return;
    handlers.forEach((fn) => {
      try {
        fn(payload);
      } catch (err) {
        console.error(`Error in EventBus handler for ${event}:`, err);
      }
    });
  }
}

export const eventBus = new ClientEventBus();
