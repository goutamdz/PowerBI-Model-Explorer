import type { CompareResponse, PathsResponse, SemanticModelResponse } from '../types';
import type { ModelRequest, ModelWorkerResponse } from './protocol';
import type { ModelSuggestion } from '../localModel';

export type { ModelSuggestion } from '../localModel';

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}

let worker: Worker | undefined;
let requestId = 0;
const pending = new Map<number, PendingRequest>();

function resetWorker(message: string) {
  worker?.terminate();
  worker = undefined;
  for (const request of pending.values()) {
    clearTimeout(request.timeout);
    request.reject(new Error(message));
  }
  pending.clear();
}

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./modelWorker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = ({ data }: MessageEvent<ModelWorkerResponse>) => {
      const request = pending.get(data.id);
      if (!request) return;
      clearTimeout(request.timeout);
      pending.delete(data.id);
      if (data.error) request.reject(new Error(data.error));
      else request.resolve(data.result);
    };
    worker.onerror = (event) => {
      event.preventDefault();
      resetWorker('The local processing worker failed. Please try loading the model again.');
    };
    worker.onmessageerror = () => resetWorker('The local processing worker could not read the model data.');
  }
  return worker;
}

function processLocally<T>(message: ModelRequest): Promise<T> {
  return new Promise((resolve, reject) => {
    const processor = getWorker();
    const id = ++requestId;
    const timeout = setTimeout(() => resetWorker('Local analysis timed out. Try a smaller model.'), 60000);
    pending.set(id, { resolve: (value) => resolve(value as T), reject, timeout });
    try {
      processor.postMessage({ ...message, id });
    } catch (error) {
      clearTimeout(timeout);
      pending.delete(id);
      reject(error);
    }
  });
}

export function fetchModel(files: File[]): Promise<SemanticModelResponse> {
  return processLocally({
    type: 'load',
    files: files.filter((file) => file.name.toLowerCase().endsWith('.tmdl')).map((file) => ({
      path: file.webkitRelativePath,
      file,
    })),
  });
}

export function fetchDemoModel(): Promise<SemanticModelResponse> {
  return processLocally({ type: 'demo' });
}

export function fetchPaths(model: SemanticModelResponse, source: string, target: string): Promise<PathsResponse> {
  return processLocally({ type: 'paths', model, source, target });
}

export function fetchSuggestions(model: SemanticModelResponse): Promise<{ suggestions: ModelSuggestion[] }> {
  return processLocally({ type: 'suggestions', model });
}

export function fetchCompare(modelA: SemanticModelResponse, modelB: SemanticModelResponse): Promise<CompareResponse> {
  return processLocally({ type: 'compare', modelA, modelB });
}
