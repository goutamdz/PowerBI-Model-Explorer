import type { SemanticModelResponse } from '../types';
import type { SelectedModelFile } from '../localModel';

export type ModelRequest =
  | { type: 'load'; files: SelectedModelFile[] }
  | { type: 'demo' }
  | { type: 'paths'; model: SemanticModelResponse; source: string; target: string }
  | { type: 'suggestions'; model: SemanticModelResponse }
  | { type: 'compare'; modelA: SemanticModelResponse; modelB: SemanticModelResponse };

export interface ModelWorkerResponse {
  id: number;
  result?: unknown;
  error?: string;
}
