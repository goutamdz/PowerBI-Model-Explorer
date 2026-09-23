import { readdir } from 'node:fs/promises';
import path from 'node:path';

export async function collectFilesRecursive(root: string, extension: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      return collectFilesRecursive(fullPath, extension);
    }

    return fullPath.toLowerCase().endsWith(extension.toLowerCase()) ? [fullPath] : [];
  }));

  return files.flat().sort((left, right) => left.localeCompare(right));
}
