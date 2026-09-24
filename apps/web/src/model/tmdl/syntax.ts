export function normalizeIdentifier(rawValue: string): string {
  return rawValue.trim().replace(/^['"]|['"]$/g, '').replace(/^\[(.+)\]$/, '$1');
}

export function getIndentation(line: string): number {
  return line.match(/^\s*/)?.[0].length ?? 0;
}

export function extractDeclarationName(line: string, keyword: string): string | undefined {
  const pattern = new RegExp(`^${keyword}\\s+(.+?)(?:\\s*=)?$`, 'i');
  const match = line.trim().match(pattern);
  if (!match) {
    return undefined;
  }

  return normalizeIdentifier(match[1]);
}

export function splitColumnReference(reference: string): { table: string; column: string } | undefined {
  const cleaned = normalizeIdentifier(reference.replace(/;$/, ''));
  const bracketMatch = cleaned.match(/^(.*?)\[(.+)\]$/);

  if (bracketMatch) {
    return {
      table: normalizeIdentifier(bracketMatch[1]),
      column: normalizeIdentifier(bracketMatch[2]),
    };
  }

  const dottedParts = cleaned.split('.');
  if (dottedParts.length >= 2) {
    return {
      table: normalizeIdentifier(dottedParts.slice(0, -1).join('.')),
      column: normalizeIdentifier(dottedParts.at(-1) ?? ''),
    };
  }

  return undefined;
}
