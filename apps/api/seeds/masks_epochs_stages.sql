-- Full Mask Taxonomy
INSERT INTO masks (id, name, ontology, functional_scope, tone, rhetorical_mode, compression_ratio, contexts, triggers, include_tags, exclude_tags, priority_weights)
VALUES
('analyst', 'Analyst', 'cognitive', 'precision reasoning, decomposition, structure', 'neutral', 'deductive', 0.55, ARRAY['analysis','research','validation'], ARRAY['metric','benchmark'], ARRAY['analysis','metrics','impact'], ARRAY['speculation'], '{"impact":2,"metrics":2}'),
('synthesist', 'Synthesist', 'cognitive', 'pattern merging and integrative creativity', 'expansive', 'comparative', 0.65, ARRAY['strategy','research','exploration'], ARRAY['pattern','signal'], ARRAY['research','vision','integration'], ARRAY['narrow'], '{"vision":2}'),
('observer', 'Observer', 'cognitive', 'detached perception and data intake', 'measured', 'expository', 0.6, ARRAY['audit','discovery'], ARRAY['anomaly','trend'], ARRAY['observability','research'], ARRAY[]::text[], '{"reliability":1}'),
('strategist', 'Strategist', 'cognitive', 'long-horizon planning and prioritization', 'persuasive', 'comparative', 0.65, ARRAY['roadmap','product','portfolio'], ARRAY['tradeoff','priority'], ARRAY['roadmap','vision'], ARRAY[]::text[], '{"vision":2,"priority":2}'),
('speculator', 'Speculator', 'cognitive', 'scenario projection and hypothesis generation', 'exploratory', 'hypothetical', 0.7, ARRAY['futures','exploration'], ARRAY['what-if','risk'], ARRAY['hypothesis','risk'], ARRAY['certainty'], '{"risk":1}'),
('interpreter', 'Interpreter', 'expressive', 'translation across media and audiences', 'clarifying', 'dialogic', 0.6, ARRAY['communication','handoff'], ARRAY['bridge','translate'], ARRAY['communication','documentation'], ARRAY[]::text[], '{"clarity":2}'),
('artisan', 'Artisan', 'expressive', 'craft-level creation and refinement', 'precise', 'narrative', 0.55, ARRAY['craft','build'], ARRAY['prototype','artifact'], ARRAY['craft','artifact'], ARRAY[]::text[], '{"quality":2}'),
('architect', 'Architect', 'expressive', 'systems design and trade-off narration', 'assertive', 'structured', 0.6, ARRAY['design','systems','architecture'], ARRAY['blueprint','diagram'], ARRAY['design','system'], ARRAY['ad-hoc'], '{"reliability":3,"scalability":3}'),
('narrator', 'Narrator', 'expressive', 'story-first framing with outcomes and emotion', 'warm', 'story', 0.7, ARRAY['story','case-study'], ARRAY['impact','user-story'], ARRAY['impact','user'], ARRAY[]::text[], '{"impact":2}'),
('provoker', 'Provoker', 'expressive', 'disruption and tension-generation', 'direct', 'critical', 0.5, ARRAY['innovation','retrospective'], ARRAY['anti-pattern','contrarian'], ARRAY['experiment','innovation'], ARRAY['status-quo'], '{"innovation":2}'),
('mediator', 'Mediator', 'expressive', 'alignment and stakeholder framing', 'empathetic', 'dialogic', 0.6, ARRAY['alignment','collaboration'], ARRAY['consensus','handoff'], ARRAY['stakeholder','collaboration'], ARRAY[]::text[], '{"collaboration":2}'),
('executor', 'Executor', 'operational', 'action, throughput, closure', 'decisive', 'procedural', 0.5, ARRAY['delivery','launch'], ARRAY['deadline','rollout'], ARRAY['delivery','release'], ARRAY['blocked'], '{"delivery":2,"reliability":1}'),
('steward', 'Steward', 'operational', 'maintenance, governance, oversight', 'measured', 'forensic', 0.5, ARRAY['maintenance','governance'], ARRAY['runbook','audit'], ARRAY['reliability','observability'], ARRAY[]::text[], '{"reliability":3}'),
('integrator', 'Integrator', 'operational', 'cross-team assembly and interoperability', 'technical', 'expository', 0.55, ARRAY['integration','platform'], ARRAY['contract','interface'], ARRAY['integration','api'], ARRAY['silo'], '{"integration":2,"api":1}'),
('custodian', 'Custodian', 'operational', 'record-keeping, curation, historical fidelity', 'measured', 'forensic', 0.5, ARRAY['operations','compliance'], ARRAY['audit','incident'], ARRAY['reliability','governance'], ARRAY[]::text[], '{"reliability":3}'),
('calibrator', 'Calibrator', 'operational', 'evaluation, metrics, standards alignment', 'precise', 'evaluative', 0.5, ARRAY['quality','testing'], ARRAY['benchmark','defect'], ARRAY['quality','testing'], ARRAY['speculative'], '{"quality":3}')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  ontology = EXCLUDED.ontology,
  functional_scope = EXCLUDED.functional_scope,
  tone = EXCLUDED.tone,
  rhetorical_mode = EXCLUDED.rhetorical_mode,
  compression_ratio = EXCLUDED.compression_ratio,
  contexts = EXCLUDED.contexts,
  triggers = EXCLUDED.triggers,
  include_tags = EXCLUDED.include_tags,
  exclude_tags = EXCLUDED.exclude_tags,
  priority_weights = EXCLUDED.priority_weights;

-- Full Epoch Taxonomy
INSERT INTO epochs (id, name, summary, ordering) VALUES
('initiation', 'Initiation', 'Entry and foundational skill building', 1),
('expansion', 'Expansion', 'Diversification and scope scaling', 2),
('consolidation', 'Consolidation', 'Integration and coherence building', 3),
('divergence', 'Divergence', 'Branching experimentation and exploration', 4),
('mastery', 'Mastery', 'System-level thinking and innovation', 5),
('reinvention', 'Reinvention', 'Reboot and reframing for new arcs', 6),
('transmission', 'Transmission', 'Teaching, sharing, and institutionalizing knowledge', 7),
('legacy', 'Legacy', 'Long-term impact and codification', 8)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  summary = EXCLUDED.summary,
  ordering = EXCLUDED.ordering;

-- Full Stage Taxonomy
INSERT INTO stages (id, title, summary, tags, epoch_id, ordering) VALUES
('stage/inquiry', 'Inquiry', 'Research, exploration, question formation', ARRAY['research','exploration'], 'initiation', 1),
('stage/design', 'Design', 'Ideation, architectural thinking, structuring', ARRAY['design','architecture'], 'initiation', 2),
('stage/construction', 'Construction', 'Production and implementation', ARRAY['build','delivery'], 'expansion', 1),
('stage/calibration', 'Calibration', 'Testing, refinement, verification', ARRAY['testing','quality'], 'consolidation', 1),
('stage/transmission', 'Transmission', 'Publishing and presentation', ARRAY['communication','docs'], 'mastery', 2),
('stage/reflection', 'Reflection', 'Retrospective analysis, synthesis', ARRAY['retro','synthesis'], 'consolidation', 2),
('stage/negotiation', 'Negotiation', 'Alignment and stakeholder engagement', ARRAY['stakeholder','collaboration'], 'expansion', 2),
('stage/archival', 'Archival', 'Documentation and record-setting', ARRAY['documentation','records'], 'transmission', 2)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  summary = EXCLUDED.summary,
  tags = EXCLUDED.tags,
  epoch_id = EXCLUDED.epoch_id,
  ordering = EXCLUDED.ordering;