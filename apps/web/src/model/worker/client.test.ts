import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ModelRequest, ModelWorkerResponse } from './protocol';

class FakeWorker {
  static instances: FakeWorker[] = [];
  onmessage?: (event: MessageEvent<ModelWorkerResponse>) => void;
  onerror?: (event: ErrorEvent) => void;
  onmessageerror?: () => void;
  postMessage = vi.fn<(message: ModelRequest & { id: number }) => void>();
  terminate = vi.fn();

  constructor() {
    FakeWorker.instances.push(this);
  }

  respond(response: ModelWorkerResponse): void {
    this.onmessage?.({ data: response } as MessageEvent<ModelWorkerResponse>);
  }
}

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  FakeWorker.instances = [];
  vi.stubGlobal('Worker', FakeWorker);
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('local worker client', () => {
  it('matches out-of-order replies to requests and ignores unknown IDs', async () => {
    const { fetchDemoModel } = await import('./client');
    const first = fetchDemoModel();
    const second = fetchDemoModel();
    const worker = FakeWorker.instances[0];
    expect(FakeWorker.instances).toHaveLength(1);
    worker.respond({ id: 999, result: 'ignored' });
    worker.respond({ id: 2, result: 'second model' });
    worker.respond({ id: 1, result: 'first model' });
    await expect(first).resolves.toBe('first model');
    await expect(second).resolves.toBe('second model');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('passes only TMDL files and their selected relative paths to the worker', async () => {
    const { fetchModel } = await import('./client');
    const tmdl = { name: 'Sales.TMDL', webkitRelativePath: 'Model/definition/Sales.TMDL' } as File;
    const cache = { name: 'cache.abf', webkitRelativePath: 'Model/.pbi/cache.abf' } as File;
    const result = fetchModel([tmdl, cache]);
    const worker = FakeWorker.instances[0];
    expect(worker.postMessage).toHaveBeenCalledWith({
      type: 'load', id: 1, files: [{ path: tmdl.webkitRelativePath, file: tmdl }],
    });
    worker.respond({ id: 1, result: 'model' });
    await expect(result).resolves.toBe('model');
  });

  it('reports request errors without discarding a healthy worker', async () => {
    const { fetchDemoModel } = await import('./client');
    const result = fetchDemoModel();
    const worker = FakeWorker.instances[0];
    worker.respond({ id: 1, error: 'Invalid definition' });
    await expect(result).rejects.toThrow('Invalid definition');
    expect(worker.terminate).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);

    worker.postMessage.mockImplementationOnce(() => { throw new Error('Could not clone'); });
    await expect(fetchDemoModel()).rejects.toThrow('Could not clone');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('rejects all pending requests on timeout and creates a fresh worker for retry', async () => {
    const { fetchDemoModel } = await import('./client');
    const requests = Promise.allSettled([fetchDemoModel(), fetchDemoModel()]);
    vi.advanceTimersByTime(60_000);
    const results = await requests;
    expect(results).toEqual([
      { status: 'rejected', reason: new Error('Local analysis timed out. Try a smaller model.') },
      { status: 'rejected', reason: new Error('Local analysis timed out. Try a smaller model.') },
    ]);
    expect(FakeWorker.instances[0].terminate).toHaveBeenCalledOnce();
    const retry = fetchDemoModel();
    expect(FakeWorker.instances).toHaveLength(2);
    FakeWorker.instances[1].respond({ id: 3, result: 'recovered model' });
    await expect(retry).resolves.toBe('recovered model');
  });

  it.each(['error', 'messageerror'])('resets the worker after %s', async (eventType) => {
    const { fetchDemoModel } = await import('./client');
    const result = fetchDemoModel();
    const worker = FakeWorker.instances[0];
    if (eventType === 'error') {
      const preventDefault = vi.fn();
      worker.onerror?.({ preventDefault } as unknown as ErrorEvent);
      expect(preventDefault).toHaveBeenCalledOnce();
      await expect(result).rejects.toThrow('The local processing worker failed. Please try loading the model again.');
    } else {
      worker.onmessageerror?.();
      await expect(result).rejects.toThrow('The local processing worker could not read the model data.');
    }
    expect(worker.terminate).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
});
