import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CVEntities } from '../src/app/ui/CVEntities';

describe('CVEntities', () => {
  it('renders all entity counts', () => {
    render(
      <CVEntities
        experiences={[{ id: '1' }, { id: '2' }] as any}
        projects={[{ id: '1' }] as any}
        educations={[{ id: '1' }, { id: '2' }, { id: '3' }] as any}
        skills={[{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }] as any}
      />,
    );

    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('renders refresh button when onRefresh provided', () => {
    const mockRefresh = vi.fn();
    render(
      <CVEntities
        experiences={[]}
        projects={[]}
        educations={[]}
        skills={[]}
        onRefresh={mockRefresh}
      />,
    );

    const button = screen.getByRole('button', { name: /refresh data/i });
    expect(button).toBeInTheDocument();
    fireEvent.click(button);
    expect(mockRefresh).toHaveBeenCalled();
  });

  it('does not render refresh button when onRefresh not provided', () => {
    render(<CVEntities experiences={[]} projects={[]} educations={[]} skills={[]} />);

    expect(screen.queryByRole('button', { name: /refresh data/i })).not.toBeInTheDocument();
  });

  it('renders zero counts correctly', () => {
    render(<CVEntities experiences={[]} projects={[]} educations={[]} skills={[]} />);

    const zeros = screen.getAllByText('0');
    expect(zeros).toHaveLength(4);
  });
});
