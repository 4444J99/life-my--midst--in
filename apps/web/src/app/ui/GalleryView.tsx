'use client';

import Image from 'next/image';
import type { IntegrityProof } from '@in-midst-my-life/schema';

type GalleryItem = {
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

type GalleryViewProps = {
  items: GalleryItem[];
  onItemClick: (item: GalleryItem) => void;
};

export function GalleryView({ items, onItemClick }: GalleryViewProps) {
  return (
    <section className="section">
      <h2 className="section-title">Gallery + Immersive Mode</h2>
      <p className="section-subtitle">
        Visual artifacts, project media, and cover imagery. Click to open immersive mode.
      </p>
      <div className="gallery">
        {items.map((item) => (
          <div
            key={item.id}
            className="gallery-card"
            onClick={() => onItemClick(item)}
            role="button"
            tabIndex={0}
          >
            {item.kind === 'image' && item.url ? (
              <Image
                src={item.url}
                alt={item.title}
                width={300}
                height={140}
                style={{ width: '100%', height: '140px', objectFit: 'cover' }}
              />
            ) : (
              <div
                style={{
                  height: '140px',
                  background:
                    'linear-gradient(135deg, rgba(211, 107, 60, 0.3), rgba(47, 94, 100, 0.3))',
                }}
              />
            )}
            <div className="caption">
              <strong>{item.title}</strong>
              <div className="section-subtitle">{item.description}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
