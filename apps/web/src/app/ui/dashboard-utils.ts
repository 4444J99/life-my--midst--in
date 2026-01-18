import type { Profile, IntegrityProof, Project, ContentEdge } from '@in-midst-my-life/schema';
import type { GraphNode } from './graph-utils';

export type GalleryItem = {
  id: string;
  title: string;
  description?: string;
  url?: string;
  kind: 'image' | 'video' | 'fallback';
  integrity?: IntegrityProof;
  payload?: Record<string, unknown>;
  profileId?: string;
  entityType?: string;
};

export function buildGalleryItems(projects: Project[], profile: Profile | null): GalleryItem[] {
  const items: GalleryItem[] = [];
  
  projects.forEach((project) => {
    if (project.mediaGallery && project.mediaGallery.length > 0) {
      project.mediaGallery.forEach((media) => {
        items.push({
          id: media.id,
          title: media.title ?? project.name,
          description: media.description ?? project.subtitle ?? '',
          url: media.thumbnailUrl ?? media.url,
          kind: media.type === 'video' ? 'video' : 'image',
          integrity: project.integrity,
          payload: project as unknown as Record<string, unknown>,
          profileId: project.profileId,
          entityType: 'project',
        });
      });
    } else {
      items.push({
        id: project.id,
        title: project.name,
        description: project.subtitle ?? project.role ?? '',
        kind: 'fallback',
        integrity: project.integrity,
        payload: project as unknown as Record<string, unknown>,
        profileId: project.profileId,
        entityType: 'project',
      });
    }
  });
  
  if (items.length === 0 && profile?.coverImageUrl) {
    items.push({
      id: profile.id,
      title: profile.displayName,
      description: profile.headline ?? '',
      url: profile.coverImageUrl,
      kind: 'image',
      payload: profile as unknown as Record<string, unknown>,
    });
  }
  
  return items;
}

export function buildMermaidChart(graphNodes: GraphNode[], edges: ContentEdge[]): string {
  if (graphNodes.length === 0) return '';
  
  const nodeDefs = graphNodes
    .map((n) => {
      const safeId = n.id.replace(/-/g, '_');
      const safeLabel = n.label.replace(/"/g, "'");
      return `${safeId}["${safeLabel}"]`;
    })
    .join('\n');

  const edgeDefs = edges
    .map((e) => {
      const safeFrom = e.fromId.replace(/-/g, '_');
      const safeTo = e.toId.replace(/-/g, '_');
      return `${safeFrom} -->|${e.relationType}| ${safeTo}`;
    })
    .join('\n');

  return `graph TD\n${nodeDefs}\n${edgeDefs}`;
}
