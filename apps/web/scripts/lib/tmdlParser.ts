import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { ZodError, z } from 'zod';
import type { SemanticModelResponse } from '../../src/model/types.js';
import { parseSemanticModelFiles } from '../../src/model/tmdl/tmdlCore.js';
import { collectFilesRecursive } from './fs.js';

const folderPathSchema = z.string().min(1, 'Folder path is required.');

export async function parseSemanticModel(folderPathInput: string): Promise<SemanticModelResponse> {
  let folderPath: string;
  try {
    folderPath = folderPathSchema.parse(folderPathInput.trim());
  } catch (error) {
    if (error instanceof ZodError) {
      throw new Error(error.issues[0]?.message ?? 'Folder path is invalid.');
    }
    throw error;
  }

  await access(folderPath);
  const definitionPath = path.join(folderPath, 'definition');
  await access(definitionPath);
  const filePaths = await collectFilesRecursive(definitionPath, '.tmdl');
  const files = await Promise.all(filePaths.map(async (filePath) => ({
    path: filePath,
    content: await readFile(filePath, 'utf8'),
  })));
  return parseSemanticModelFiles(folderPath, files);
}