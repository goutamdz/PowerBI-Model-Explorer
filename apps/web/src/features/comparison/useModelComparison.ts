import { useState } from 'react';
import { fetchCompare, fetchModel } from '../../model/worker/client';
import type { CompareResponse, SemanticModelResponse } from '../../model/types';
import type { ComparisonFilter } from './ComparisonResults';

export function useModelComparison() {
  const [modelA, setModelA] = useState<SemanticModelResponse | null>(null);
  const [modelB, setModelB] = useState<SemanticModelResponse | null>(null);
  const [loadingFolder, setLoadingFolder] = useState<'a' | 'b' | null>(null);
  const [result, setResult] = useState<CompareResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ComparisonFilter>('all');

  function clearResults() {
    setResult(null);
    setFilter('all');
  }

  async function selectFolder(side: 'a' | 'b', files: File[]) {
    const setModel = side === 'a' ? setModelA : setModelB;
    setLoadingFolder(side);
    setModel(null);
    clearResults();
    setError(null);
    try {
      setModel(await fetchModel(files));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to read the selected model.');
    } finally {
      setLoadingFolder(null);
    }
  }

  async function compareModels() {
    if (!modelA || !modelB) {
      setError('Select both model folders.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setResult(await fetchCompare(modelA, modelB));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Comparison failed.');
    } finally {
      setLoading(false);
    }
  }

  return {
    modelA, modelB, loadingFolder, result, loading, error, filter,
    selectFolder, compareModels, clearResults, setFilter,
  };
}
