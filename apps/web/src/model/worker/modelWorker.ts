import { parseSemanticModelFiles } from '../tmdl/tmdlCore';
import demo from '../../demo/model.json';
import { analyzeLocalPaths, compareLocalModels, loadLocalModel, suggestLocalImprovements } from '../localModel';
import type { ModelRequest, ModelWorkerResponse } from './protocol';

async function processRequest(request: ModelRequest): Promise<unknown> {
  switch (request.type) {
    case 'load':
      return loadLocalModel(request.files);
    case 'demo':
      return parseSemanticModelFiles(demo.name, demo.files);
    case 'paths':
      return analyzeLocalPaths(request.model, request.source, request.target);
    case 'suggestions':
      return suggestLocalImprovements(request.model);
    case 'compare':
      return compareLocalModels(request.modelA, request.modelB);
  }
}

self.onmessage = async ({ data }: MessageEvent<ModelRequest & { id: number }>) => {
  try {
    const result = await processRequest(data);
    self.postMessage({ id: data.id, result } satisfies ModelWorkerResponse);
  } catch (error) {
    self.postMessage({
      id: data.id,
      error: error instanceof Error ? error.message : 'Local model processing failed.',
    } satisfies ModelWorkerResponse);
  }
};