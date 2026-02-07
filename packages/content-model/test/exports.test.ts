import { describe, expect, it } from 'vitest';
import {
  // Taxonomy
  MASK_TAXONOMY,
  EPOCH_TAXONOMY,
  STAGE_TAXONOMY,
  PERSONALITY_TAXONOMY,
  SETTING_TAXONOMY,
  MASK_PERSONALITY_RELATIONS,
  MASK_STAGE_AFFINITIES,
  STAGE_SETTING_RELATIONS,
  EPOCH_MASK_MODIFIERS,
  // Narrative
  buildWeightedNarrative,
  buildNarrative,
  buildNarrativeOutput,
  applyMask,
  // Mask selection
  selectBestMask,
  selectMasksForView,
  selectWeightedMasks,
  maskWeight,
  // Templates
  TEMPLATE_BANK,
  BASE_TEMPLATES,
  interpolate,
  // Timeline
  renderTimeline,
  buildEpochMap,
  // Compatibility
  CompatibilityAnalyzer,
  // Tone analysis
  ToneAnalyzer,
  KeywordToneStrategy,
  // Follow-up generation
  FollowUpGenerator,
  generateFollowUps,
  // JSON-LD
  generatePersonJsonLd,
  // Weighting
  scoreNarrativeBlock,
} from '../src';

describe('content-model exports', () => {
  it('exposes mask and epoch taxonomies', () => {
    expect(MASK_TAXONOMY.length).toBeGreaterThan(3);
    expect(EPOCH_TAXONOMY[0]?.stages?.length).toBeGreaterThan(0);
    expect(STAGE_TAXONOMY.length).toBeGreaterThan(3);
  });

  it('exposes all taxonomy collections', () => {
    expect(PERSONALITY_TAXONOMY.length).toBeGreaterThan(0);
    expect(SETTING_TAXONOMY.length).toBeGreaterThan(0);
    expect(typeof MASK_PERSONALITY_RELATIONS).toBe('object');
    expect(typeof MASK_STAGE_AFFINITIES).toBe('object');
    expect(typeof STAGE_SETTING_RELATIONS).toBe('object');
    expect(typeof EPOCH_MASK_MODIFIERS).toBe('object');
  });

  it('exposes narrative functions', () => {
    expect(typeof buildWeightedNarrative).toBe('function');
    expect(typeof buildNarrative).toBe('function');
    expect(typeof buildNarrativeOutput).toBe('function');
    expect(typeof applyMask).toBe('function');
  });

  it('exposes mask selection functions', () => {
    expect(typeof selectBestMask).toBe('function');
    expect(typeof selectMasksForView).toBe('function');
    expect(typeof selectWeightedMasks).toBe('function');
    expect(typeof maskWeight).toBe('function');
  });

  it('exposes template utilities', () => {
    expect(TEMPLATE_BANK.length).toBeGreaterThan(0);
    expect(BASE_TEMPLATES.length).toBeGreaterThan(0);
    expect(typeof interpolate).toBe('function');
  });

  it('exposes timeline functions', () => {
    expect(typeof renderTimeline).toBe('function');
    expect(typeof buildEpochMap).toBe('function');
  });

  it('exposes compatibility analyzer', () => {
    const analyzer = new CompatibilityAnalyzer();
    expect(typeof analyzer.analyzeCompatibility).toBe('function');
  });

  it('exposes tone analyzer', () => {
    const analyzer = new ToneAnalyzer();
    expect(typeof analyzer.analyze).toBe('function');
    const strategy = new KeywordToneStrategy();
    expect(typeof strategy.analyze).toBe('function');
  });

  it('exposes follow-up generator', () => {
    const generator = new FollowUpGenerator();
    expect(typeof generator.generate).toBe('function');
    expect(typeof generateFollowUps).toBe('function');
  });

  it('exposes JSON-LD and weighting utilities', () => {
    expect(typeof generatePersonJsonLd).toBe('function');
    expect(typeof scoreNarrativeBlock).toBe('function');
  });

  it('builds weighted narrative using templates', async () => {
    const narrative = await buildWeightedNarrative({
      profile: {
        id: 'p1',
        identityId: 'i1',
        slug: 'demo',
        displayName: 'Demo User',
        title: 'Engineer',
        headline: 'Testing',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      availableMasks: MASK_TAXONOMY,
      contexts: ['design', 'architecture'],
      tags: ['design', 'impact'],
      timeline: [
        {
          id: 't1',
          title: 'Shipped',
          start: '2023-01-01',
          summary: 'Launched feature',
          tags: ['delivery', 'design'],
        },
      ],
      epochs: EPOCH_TAXONOMY,
    });

    const summaryBlock = narrative.find((b) => b.title === 'Summary');
    const evidenceBlock = narrative.find((b) => b.title === 'Evidence Trail');
    expect(summaryBlock).toBeTruthy();
    expect(evidenceBlock?.body).toContain('Shipped');
  });
});
