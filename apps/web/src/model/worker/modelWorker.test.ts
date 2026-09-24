import { afterEach, describe, expect, it, vi } from 'vitest';
import demo from '../../demo/model.json';
import { analyzeLocalPaths, compareLocalModels, suggestLocalImprovements } from '../localModel';
import { parseSemanticModelFiles } from '../tmdl/tmdlCore';
import type { ModelRequest, ModelWorkerResponse } from './protocol';

async function createWorkerHarness() {
  vi.resetModules();
  const workerScope = {
    onmessage: undefined as ((event: MessageEvent<ModelRequest & { id: number }>) => Promise<void>) | undefined,
    postMessage: vi.fn<(response: ModelWorkerResponse) => void>(),
  };
  vi.stubGlobal('self', workerScope);
  await import('./modelWorker');
  return {
    async request(message: ModelRequest, id = 1): Promise<ModelWorkerResponse> {
      await workerScope.onmessage?.({ data: { ...message, id } } as MessageEvent<ModelRequest & { id: number }>);
      return workerScope.postMessage.mock.lastCall![0];
    },
  };
}

afterEach(() => vi.unstubAllGlobals());

describe('model worker dispatch', () => {
  it('runs every operation locally and keeps response IDs', async () => {
    const network = vi.fn(() => { throw new Error('Network access is forbidden'); });
    vi.stubGlobal('fetch', network);
    const worker = await createWorkerHarness();
    const model = parseSemanticModelFiles(demo.name, demo.files);
    expect(await worker.request({ type: 'demo' }, 7)).toEqual({ id: 7, result: model });
    expect(await worker.request({ type: 'paths', model, source: 'Customer', target: 'Sales' })).toEqual({
      id: 1, result: analyzeLocalPaths(model, 'Customer', 'Sales'),
    });
    expect(await worker.request({ type: 'suggestions', model })).toEqual({
      id: 1, result: suggestLocalImprovements(model),
    });
    expect(await worker.request({ type: 'compare', modelA: model, modelB: model })).toEqual({
      id: 1, result: compareLocalModels(model, model),
    });
    const loaded = await worker.request({
      type: 'load',
      files: [{ path: 'Test/definition/table.tmdl', file: new Blob(['table Sales']) }],
    });
    expect(loaded).toMatchObject({ id: 1, result: { folderPath: 'Test', metrics: { totalTables: 1 } } });
    expect(network).not.toHaveBeenCalled();
  });

  it('returns validation messages and a fallback for non-Error failures', async () => {
    const worker = await createWorkerHarness();
    expect(await worker.request({ type: 'load', files: [] })).toEqual({
      id: 1, error: 'Select one semantic model folder containing a definition directory with TMDL files.',
    });
    const file = { text: () => Promise.reject('unreadable') } as unknown as Blob;
    expect(await worker.request({ type: 'load', files: [{ path: 'Test/definition/table.tmdl', file }] })).toEqual({
      id: 1, error: 'Local model processing failed.',
    });
  });
});
