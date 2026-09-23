import { fileURLToPath } from 'node:url';

export const DEMO_MODEL_PATH = fileURLToPath(new URL('../demo-source/Demo.SemanticModel', import.meta.url));
