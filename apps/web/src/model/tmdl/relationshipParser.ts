import type { RelationshipEdge } from '../types.js';
import { extractDeclarationName, getIndentation, splitColumnReference } from './syntax.js';

function normalizeCardinalitySide(value?: string): string | undefined {
  const lowered = value?.trim().toLowerCase();
  if (lowered === 'one' || lowered === 'single') {
    return '1';
  }
  if (lowered === 'many') {
    return '*';
  }
  return undefined;
}

function normalizeCombinedCardinality(rawValue: string): string {
  const lowered = rawValue.trim().toLowerCase().replace(/[^a-z]/g, '');
  switch (lowered) {
    case 'manytomany': return '*:*';
    case 'manytoone': return '*:1';
    case 'onetomany': return '1:*';
    case 'onetoone': return '1:1';
  }
  if (/^[1*]:[1*]$/.test(rawValue.trim())) {
    return rawValue.trim();
  }
  return '*:*';
}

function readCardinality(properties: Map<string, string>): string {
  const combined = properties.get('cardinality');
  if (combined) {
    return normalizeCombinedCardinality(combined);
  }

  // Omitted side properties use Power BI's many-to-one default.
  const from = normalizeCardinalitySide(properties.get('fromcardinality')) ?? '*';
  const to = normalizeCardinalitySide(properties.get('tocardinality')) ?? '1';
  return `${from}:${to}`;
}

function readProperties(
  lines: string[],
  startIndex: number,
): { properties: Map<string, string>; lastPropertyIndex: number } {
  const relationshipIndent = getIndentation(lines[startIndex]);
  const properties = new Map<string, string>();
  let index = startIndex + 1;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();
    const isDeclaration = /^(table|column|measure|hierarchy|relationship|partition|annotation|culture|role)\b/i.test(trimmed);
    if (trimmed && getIndentation(line) <= relationshipIndent && isDeclaration) {
      break;
    }

    const propertyMatch = trimmed.match(/^([A-Za-z]+):\s*(.+)$/);
    if (propertyMatch) {
      properties.set(propertyMatch[1].toLowerCase(), propertyMatch[2]);
    }
    index += 1;
  }

  return { properties, lastPropertyIndex: index - 1 };
}

export function parseRelationships(content: string, sourceFile: string): RelationshipEdge[] {
  const lines = content.split(/\r?\n/);
  const relationships: RelationshipEdge[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const name = extractDeclarationName(lines[index], 'relationship');
    if (!name) {
      continue;
    }

    const { properties, lastPropertyIndex } = readProperties(lines, index);
    index = lastPropertyIndex;
    const from = splitColumnReference(properties.get('fromcolumn') ?? '');
    const to = splitColumnReference(properties.get('tocolumn') ?? '');
    if (!from || !to) {
      continue;
    }

    const filterBehavior = properties.get('crossfilteringbehavior');
    const activeValue = properties.get('isactive');
    relationships.push({
      id: `${from.table}.${from.column}->${to.table}.${to.column}`,
      name,
      fromTable: from.table,
      fromColumn: from.column,
      toTable: to.table,
      toColumn: to.column,
      cardinality: readCardinality(properties),
      direction: filterBehavior?.toLowerCase().includes('both') ? 'both' : 'single',
      isActive: activeValue ? activeValue.trim().toLowerCase() === 'true' : true,
      sourceFile: sourceFile.replace(/\\/g, '/'),
    });
  }

  return relationships;
}

export function deduplicateRelationships(relationships: RelationshipEdge[]): RelationshipEdge[] {
  const uniqueRelationships = new Map<string, RelationshipEdge>();
  for (const relationship of relationships) {
    // Keep named or differently configured links even when their endpoint IDs match.
    const key = `${relationship.name ?? ''}|${relationship.id}|${relationship.cardinality}|${relationship.direction}|${relationship.isActive}`;
    if (!uniqueRelationships.has(key)) {
      uniqueRelationships.set(key, relationship);
    }
  }
  return Array.from(uniqueRelationships.values());
}
