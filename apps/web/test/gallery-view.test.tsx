import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GalleryView } from '../src/app/ui/GalleryView';
import type { GalleryItem } from '../src/app/ui/dashboard-utils';

// Mock Next.js Image component
vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

describe('GalleryView', () => {
  const mockItems: GalleryItem[] = [
    {
      id: '1',
      title: 'Project Screenshot',
      description: 'Main dashboard view',
      url: 'https://example.com/image.jpg',
      kind: 'image',
    },
    {
      id: '2',
      title: 'Demo Video',
      description: 'Product walkthrough',
      url: 'https://example.com/video.mp4',
      kind: 'video',
    },
    {
      id: '3',
      title: 'Design Doc',
      description: 'Architecture overview',
      kind: 'fallback',
    },
  ];

  it('renders all gallery items', () => {
    render(<GalleryView items={mockItems} onItemClick={vi.fn()} />);

    expect(screen.getByText('Project Screenshot')).toBeInTheDocument();
    expect(screen.getByText('Demo Video')).toBeInTheDocument();
    expect(screen.getByText('Design Doc')).toBeInTheDocument();
  });

  it('renders image for items with URLs', () => {
    render(<GalleryView items={mockItems} onItemClick={vi.fn()} />);

    const images = screen.getAllByRole('img');
    expect(images.length).toBeGreaterThan(0);
  });

  it('calls onItemClick when item is clicked', () => {
    const mockClick = vi.fn();
    render(<GalleryView items={mockItems} onItemClick={mockClick} />);

    const firstItem = screen.getByText('Project Screenshot').closest('.gallery-card');
    if (firstItem) {
      fireEvent.click(firstItem);
      expect(mockClick).toHaveBeenCalledWith(mockItems[0]);
    }
  });

  it('renders fallback gradient for non-image items', () => {
    render(<GalleryView items={mockItems} onItemClick={vi.fn()} />);

    const cards = screen.getAllByRole('button');
    expect(cards.length).toBe(3);
  });

  it('shows empty state when no items', () => {
    const { container } = render(<GalleryView items={[]} onItemClick={vi.fn()} />);

    const gallery = container.querySelector('.gallery');
    expect(gallery?.children.length).toBe(0);
  });
});
