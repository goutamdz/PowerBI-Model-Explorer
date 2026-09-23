import { parseSemanticModelFiles } from '../tmdl/tmdlCore';
import demo from '../../demo/model.json';
import { analyzeLocalPaths, compareLocalModels, loadLocalModel, suggestLocalImprovements } from '../localModel';
import type { ModelRequest, ModelWorkerResponse } from './protocol';

self.onmessage = async ({ data }: MessageEvent<ModelRequest & { id: number }>) => {
  try {
    let result: unknown;
    switch (data.type) {
      case 'load':
        result = await loadLocalModel(data.files);
        break;
      case 'demo':
        result = parseSemanticModelFiles(demo.name, demo.files);
        break;
      case 'paths':
        result = analyzeLocalPaths(data.model, data.source, data.target);
        break;
      case 'suggestions':
        result = suggestLocalImprovements(data.model);
        break;
      case 'compare':
        result = compareLocalModels(data.modelA, data.modelB);
        break;
    }
    self.postMessage({ id: data.id, result } satisfies ModelWorkerResponse);
  } catch (error) {
    self.postMessage({
      id: data.id,
      error: error instanceof Error ? error.message : 'Local model processing failed.',
    } satisfies ModelWorkerResponse);
  }
};