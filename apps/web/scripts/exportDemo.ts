import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEMO_MODEL_PATH } from './config.js';
import { collectFilesRecursive } from './lib/fs.js';
import { parseSemanticModel } from './lib/tmdlParser.js';
import { parseSemanticModelFiles } from '../src/model/tmdl/tmdlCore.js';

const sourcePath = process.argv[2];
if (process.argv.length > 3) throw new Error('Usage: demo:export [path to a .SemanticModel folder]');

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
const quote = (name: string) => `'${name.replace(/'/g, "''")}'`;
const blocks = Object.values(model.tables).map((table) => [
  `table ${quote(table.name)}`,
  ...table.columns.map((column) => `\tcolumn ${quote(column)}`),
  ...table.measures.map((measure) => [
    `\tmeasure ${quote(measure.name)} =`,
    ...measure.expression.split('\n').map((line) => `\t\t\t${line}`),
  ].join('\n')),
].join('\n'));

model.relationships.forEach((relationship, index) => {
  const [fromCardinality, toCardinality] = relationship.cardinality.split(':');
  blocks.push([
    `relationship ${quote(relationship.name ?? `Relationship${index + 1}`)}`,
    `\tisActive: ${relationship.isActive}`,
    `\tcrossFilteringBehavior: ${relationship.direction === 'both' ? 'bothDirections' : 'oneDirection'}`,
    `\tfromCardinality: ${fromCardinality === '1' ? 'one' : 'many'}`,
    `\ttoCardinality: ${toCardinality === '1' ? 'one' : 'many'}`,
    `\tfromColumn: ${quote(relationship.fromTable)}.${quote(relationship.fromColumn)}`,
    `\ttoColumn: ${quote(relationship.toTable)}.${quote(relationship.toColumn)}`,
  ].join('\n'));
});

const demo = {
  name: 'Demo.SemanticModel',
  files: [{ path: 'definition/demo.tmdl', content: `${blocks.join('\n\n')}\n` }],
};
const parsedDemo = parseSemanticModelFiles(demo.name, demo.files);
assert.deepEqual(parsedDemo.metrics, model.metrics);
assert.deepEqual(parsedDemo.tables, model.tables);
assert.deepEqual(parsedDemo.analysis, model.analysis);
assert.deepEqual(
  parsedDemo.relationships.map(({ sourceFile, ...relationship }) => relationship),
  model.relationships.map(({ sourceFile, ...relationship }) => relationship),
);

if (sourcePath) {
  const fixturePath = path.join(DEMO_MODEL_PATH, 'definition', 'demo.tmdl');
  await mkdir(path.dirname(fixturePath), { recursive: true });
  await writeFile(fixturePath, demo.files[0].content, 'utf8');
}
const outputPath = fileURLToPath(new URL('../src/demo/model.json', import.meta.url));
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(demo, null, 2)}\n`, 'utf8');
console.log('Exported demo with original names and DAX:', parsedDemo.metrics);
