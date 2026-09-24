import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEMO_MODEL_PATH } from './config.js';
import { collectFilesRecursive } from './lib/fs.js';
import { parseSemanticModel } from './lib/tmdlParser.js';
import { parseSemanticModelFiles } from '../src/model/tmdl/tmdlCore.js';
import { serializeDemo, validateDemoRoundTrip } from './lib/demoSerialization.js';

const sourcePath = process.argv[2];
if (process.argv.length > 3) {
  throw new Error('Usage: demo:export [path to a .SemanticModel folder]');
}

async function loadSourceModel(folder: string) {
  const definitionPath = path.join(folder, 'definition');
  const tablePaths = await collectFilesRecursive(path.join(definitionPath, 'tables'), '.tmdl');
  const filePaths = [...tablePaths, path.join(definitionPath, 'relationships.tmdl')];
  const files = await Promise.all(filePaths.map(async (filePath) => ({
    path: path.relative(folder, filePath).replace(/\\/g, '/'),
    content: await readFile(filePath, 'utf8'),
  })));
  return parseSemanticModelFiles('Demo.SemanticModel', files);
}

const model = sourcePath ? await loadSourceModel(sourcePath) : await parseSemanticModel(DEMO_MODEL_PATH);
const demo = serializeDemo(model);
const parsedDemo = validateDemoRoundTrip(demo, model);

if (sourcePath) {
  const fixturePath = path.join(DEMO_MODEL_PATH, 'definition', 'demo.tmdl');
  await mkdir(path.dirname(fixturePath), { recursive: true });
  await writeFile(fixturePath, demo.files[0].content, 'utf8');
}
const outputPath = fileURLToPath(new URL('../src/demo/model.json', import.meta.url));
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(demo, null, 2)}\n`, 'utf8');
console.log('Exported demo with original names and DAX:', parsedDemo.metrics);
