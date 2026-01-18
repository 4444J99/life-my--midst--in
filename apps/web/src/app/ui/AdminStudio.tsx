'use client';

import type { DragEvent } from 'react';
import type { Mask, Stage, Epoch, ContentEdge } from '@in-midst-my-life/schema';
import { RelationshipBuilder } from '../../components/RelationshipBuilder';
import { TaxonomyEditor } from '../../components/TaxonomyEditor';
import type { GraphNode } from './graph-utils';

type AdminStudioProps = {
  relationshipStack: GraphNode[];
  availableNodes: GraphNode[];
  relationType: string;
  edges: ContentEdge[];
  taxonomyMasks: Mask[];
  taxonomyStages: Stage[];
  taxonomyEpochs: Epoch[];
  onRelationTypeChange: (type: string) => void;
  onDropToStack: (event: DragEvent<HTMLDivElement>, index?: number) => void;
  onClearStack: () => void;
  onSaveEdges: () => void;
  onUpdateMask: (mask: Mask) => void;
  onUpdateStage: (stage: Stage) => void;
  onUpdateEpoch: (epoch: Epoch) => void;
  setMasks: (masks: Mask[]) => void;
  setStages: (stages: Stage[]) => void;
  setEpochs: (epochs: Epoch[]) => void;
};

export function AdminStudio({
  relationshipStack,
  availableNodes,
  relationType,
  edges,
  taxonomyMasks,
  taxonomyStages,
  taxonomyEpochs,
  onRelationTypeChange,
  onDropToStack,
  onClearStack,
  onSaveEdges,
  onUpdateMask,
  onUpdateStage,
  onUpdateEpoch,
  setMasks,
  setStages,
  setEpochs,
}: AdminStudioProps) {
  return (
    <section className="section">
      <h2 className="section-title">Admin Studio</h2>
      <p className="section-subtitle">Curate edges and update mask/stage taxonomies.</p>
      <div className="editor-grid">
        <RelationshipBuilder
          relationshipStack={relationshipStack}
          availableNodes={availableNodes}
          relationType={relationType}
          setRelationType={onRelationTypeChange}
          onDropToStack={onDropToStack}
          onClear={onClearStack}
          onSave={onSaveEdges}
          edges={edges}
        />
        <TaxonomyEditor
          masks={taxonomyMasks}
          stages={taxonomyStages}
          epochs={taxonomyEpochs}
          onUpdateMask={onUpdateMask}
          onUpdateStage={onUpdateStage}
          onUpdateEpoch={onUpdateEpoch}
          setMasks={setMasks}
          setStages={setStages}
          setEpochs={setEpochs}
        />
      </div>
    </section>
  );
}
