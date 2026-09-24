import type { Css, StylesheetStyle } from 'cytoscape';
import { getTableSize } from './graphLayout';

const edgeLabels: Css.Edge = {
  'source-label': 'data(sourceCard)',
  'target-label': 'data(targetCard)',
  'source-text-offset': 20,
  'target-text-offset': 20,
  'font-family': 'IBM Plex Mono, monospace',
  'font-size': 11,
  'font-weight': 700,
  'text-background-color': '#0f172a',
  'text-background-opacity': 0.9,
  'text-background-padding': '3px',
  'line-opacity': 1,
};

function highlightedEdge(selector: string, color: string, width: number, extra: Css.Edge): StylesheetStyle {
  return {
    selector,
    style: {
      ...edgeLabels,
      width,
      'line-color': color,
      'target-arrow-color': color,
      'source-arrow-color': color,
      ...extra,
    },
  };
}

export function createGraphStyles(tableCount: number): StylesheetStyle[] {
  return [...createTableStyles(tableCount), ...createRelationshipStyles()];
}

function createTableStyles(tableCount: number): StylesheetStyle[] {
  const tableSize = getTableSize(tableCount);
  return [
    {
      selector: 'node',
      style: {
        label: 'data(label)',
        color: '#e2e8f0',
        'font-family': 'Inter, sans-serif',
        'font-size': 13,
        'font-weight': 500,
        'text-wrap': 'wrap',
        'text-max-width': `${tableSize.width - 16}px`,
        'text-overflow-wrap': 'anywhere',
        'text-valign': 'center',
        'text-halign': 'center',
        'background-color': '#1e40af',
        'background-opacity': 0.95,
        'border-width': 1.5,
        'border-color': '#3b82f6',
        'border-opacity': 0.5,
        ...tableSize,
        shape: 'round-rectangle',
        'overlay-opacity': 0,
        'text-background-color': '#0f172a',
        'text-background-opacity': 0,
        'transition-property': 'background-color, border-color, border-width, opacity, width, height',
        'transition-duration': 250,
      },
    },
    { selector: 'node[kind = "fact"]', style: { 'background-color': '#065f46', 'border-color': '#10b981' } },
    { selector: 'node.dimmed', style: { opacity: 0.04, 'text-opacity': 0 } },
    { selector: 'node:active', style: { 'overlay-opacity': 0 } },
    {
      selector: 'node.hover',
      style: {
        'border-width': 3,
        'border-color': '#93c5fd',
        'background-opacity': 1,
        'font-size': 15,
        'font-weight': 600,
        'text-background-opacity': 0.9,
        'text-background-color': '#0f172a',
        'text-background-padding': '4px',
        'z-index': 999,
      },
    },
    {
      selector: 'node.pathNode',
      style: {
        'background-color': '#0e7490',
        'border-color': '#22d3ee',
        'border-width': 2.5,
        color: '#ffffff',
        'font-size': 14,
      },
    },
    {
      selector: 'node.pathEndpoint',
      style: {
        'background-color': '#047857',
        'border-color': '#34d399',
        'border-width': 3,
        color: '#ffffff',
        'font-size': 16,
        'font-weight': 700,
      },
    },
    {
      selector: 'node.searchMatch',
      style: {
        'background-color': '#92400e',
        'border-color': '#f59e0b',
        'border-width': 2.5,
        color: '#fef3c7',
      },
    },
    {
      selector: 'node.focusNode',
      style: {
        'background-color': '#581c87',
        'border-color': '#a855f7',
        'border-width': 3,
        color: '#f3e8ff',
        'font-size': 14,
        'font-weight': 600,
      },
    },
    {
      selector: 'node.inspectorNode',
      style: {
        'background-color': '#064e3b',
        'border-color': '#10b981',
        'border-width': 3.5,
        color: '#d1fae5',
        'font-size': 15,
        'font-weight': 700,
      },
    },
  ];
}

function createRelationshipStyles(): StylesheetStyle[] {
  return [
    {
      selector: 'edge',
      style: {
        label: '',
        'source-label': '',
        'target-label': '',
        // Separate parallel links so inactive relationships are not hidden underneath active ones.
        'curve-style': 'bezier',
        'control-point-step-size': 40,
        width: 1.8,
        'line-color': '#3b82f6',
        'line-opacity': 0.7,
        'target-arrow-color': '#3b82f6',
        'target-arrow-shape': 'triangle',
        'arrow-scale': 1.2,
        'source-arrow-shape': 'none',
        'overlay-opacity': 0,
        'transition-property': 'line-color, width, opacity, target-arrow-color, line-opacity',
        'transition-duration': 250,
      },
    },
    {
      selector: 'edge[active = "false"]',
      style: {
        'line-style': 'dashed',
        'line-dash-pattern': [8, 5],
        width: 1.5,
        'line-color': '#ef4444',
        'line-opacity': 0.6,
        'target-arrow-color': '#ef4444',
      },
    },
    { selector: 'edge[direction = "both"]', style: { 'source-arrow-shape': 'triangle', 'source-arrow-color': '#3b82f6' } },
    { selector: 'edge[active = "false"][direction = "both"]', style: { 'source-arrow-color': '#ef4444' } },
    { selector: 'edge.dimmed', style: { 'line-opacity': 0, 'target-arrow-shape': 'none', 'source-arrow-shape': 'none' } },
    highlightedEdge('edge.hoverEdge', '#60a5fa', 2, { color: '#cbd5e1' }),
    highlightedEdge('edge.pathEdge', '#06b6d4', 3, { color: '#a5f3fc', opacity: 1 }),
    highlightedEdge('edge.focusEdge', '#a855f7', 2.5, { color: '#e9d5ff' }),
    highlightedEdge('edge.inspectorEdge', '#10b981', 3.5, {
      color: '#d1fae5',
      'font-size': 12,
      'text-background-opacity': 0.95,
      'text-background-padding': '4px',
    }),
  ];
}
