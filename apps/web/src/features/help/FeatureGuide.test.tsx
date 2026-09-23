import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import ModelWorkspace from '../../app/ModelWorkspace';
import { featureHelp, modelTerms } from './featureHelp';
import { FeatureGuide } from './FeatureGuide';
import { CompareModels } from '../comparison/CompareModels';
import { EdgeDetailPopup } from '../relationships/EdgeDetailPopup';
import { RelationshipTable } from '../relationships/RelationshipTable';
import { SuggestionsPanel } from '../model-checks/SuggestionsPanel';
import { MapLegend } from '../canvas/MapLegend';

const onClose = () => {};

describe('beginner-friendly feature explanations', () => {
  it('keeps feature descriptions short and crisp', () => {
    for (const feature of Object.values(featureHelp)) {
      expect(feature.description.length).toBeLessThanOrEqual(85);
      expect(feature.description.split(/\s+/).length).toBeLessThanOrEqual(12);
    }
  });

  it('renders only the five requested legend items without floating controls', () => {
    const html = renderToStaticMarkup(<MapLegend />);
    expect(html).not.toContain('absolute');
    expect(html).toContain('aria-label="Map legend"');
    expect(html.match(/<li\b/g)).toHaveLength(5);
    for (const label of ['Active link', 'Inactive link', 'Fact table', 'Dimension table', 'Search match']) {
      expect(html).toContain(label);
    }
    for (const label of ['Filter path', 'Focused table', 'Table connections']) {
      expect(html).not.toContain(label);
    }
  });

  it('explains every feature and technical term in an accessible guide', () => {
    const html = renderToStaticMarkup(<FeatureGuide onClose={onClose} />);
    expect(html).toContain('aria-labelledby="feature-guide-title"');
    for (const feature of Object.values(featureHelp)) {
      expect(html).toContain(feature.title);
      expect(html).toContain(feature.description);
    }
    for (const { term } of modelTerms) expect(html).toContain(term);
    expect(html).toContain('Product Category');
    expect(html).toContain('2,000 unique table routes');
    expect(html).toContain('includes inactive relationships');
  });

  it('explains loading and makes help discoverable on the welcome screen', () => {
    const html = renderToStaticMarkup(<ModelWorkspace onNavigateCompare={onClose} />);
    expect(html).toContain(featureHelp.load.description);
    expect(html).toContain('Feature guide');
    expect(html).toContain(featureHelp.demo.description);
    expect(html).toContain(featureHelp.compare.title);
  });

  it('states the scope of relationship comparison before choosing files', () => {
    const html = renderToStaticMarkup(<CompareModels onBack={onClose} />);
    expect(html).toContain(featureHelp.compare.description);
    expect(html).toContain('Feature guide');
    expect(html).toContain('aria-label="Back to model explorer"');
  });

  it('explains the graph-oriented filter direction and inactive status', () => {
    const html = renderToStaticMarkup(<EdgeDetailPopup onClose={onClose} edge={{
      id: 'calendar-sales',
      source: 'Calendar',
      target: 'Sales',
      fromColumn: 'Date',
      toColumn: 'Delivery Date',
      cardinality: '1:*',
      direction: 'single',
      active: 'false',
    }} />);
    expect(html).toContain('Calendar can filter Sales, but not the reverse');
    expect(html).toContain('Not used by default');
    expect(html).toContain('Cardinality: 1 means a unique key');
  });

  it('keeps relationship help available for an empty tool-panel list', () => {
    const html = renderToStaticMarkup(<RelationshipTable relationships={[]} />);
    expect(html).toContain('aria-label="Relationship list"');
    expect(html).toContain('No relationships to show');
    expect(html).not.toContain('absolute');
  });

  it('does not claim that an empty check result proves correctness', () => {
    const html = renderToStaticMarkup(<SuggestionsPanel suggestions={[]} loading={false} />);
    expect(html).toContain('does not guarantee');
    expect(html).toContain('fixed rules, not AI');
  });
});
