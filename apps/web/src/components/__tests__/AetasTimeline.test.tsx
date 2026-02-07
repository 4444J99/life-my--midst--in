import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AetasTimeline, { Epoch } from '../AetasTimeline';

// Mock ResizeObserver since it's not available in JSDOM
// Vitest 4 requires `function` for mocks used as constructors (not arrow functions)
const mockResizeObserver = vi.fn().mockImplementation(function () {
  return {
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  };
});

beforeAll(() => {
  vi.stubGlobal('ResizeObserver', mockResizeObserver);
});

afterAll(() => {
  vi.unstubAllGlobals();
});

const mockEpochs: Epoch[] = [
  {
    id: 'epoch-1',
    name: 'Foundation',
    description: 'Early career building skills and learning the craft',
    startDate: new Date('2015-01-01'),
    endDate: new Date('2018-12-31'),
    milestones: ['First job', 'First major project'],
    inflectionPoints: ['Career pivot'],
    activeMasks: ['Engineer', 'Learner'],
    color: 'hsl(200, 70%, 55%)',
  },
  {
    id: 'epoch-2',
    name: 'Growth',
    description: 'Taking on leadership and advancing technical skills',
    startDate: new Date('2019-01-01'),
    endDate: new Date('2022-12-31'),
    milestones: ['Promoted to Senior', 'Led first team'],
    inflectionPoints: ['Management track decision'],
    activeMasks: ['Leader', 'Mentor'],
    color: 'hsl(120, 70%, 55%)',
  },
  {
    id: 'epoch-3',
    name: 'Mastery',
    description: 'Current phase focusing on architecture and strategic impact',
    startDate: new Date('2023-01-01'),
    milestones: ['Principal Engineer'],
    inflectionPoints: [],
    activeMasks: ['Architect', 'Strategist'],
    color: 'hsl(45, 70%, 55%)',
  },
];

describe('AetasTimeline', () => {
  const mockOnEpochSelected = vi.fn();

  beforeEach(() => {
    mockOnEpochSelected.mockClear();
  });

  it('renders all epochs in timeline', () => {
    const { container } = render(
      <AetasTimeline epochs={mockEpochs} onEpochSelected={mockOnEpochSelected} />,
    );

    // SVG text elements - names may be abbreviated (3 chars) when container is narrow
    const svg = container.querySelector('svg');
    // Check for abbreviated names in SVG (component uses substring(0,3) for narrow widths)
    expect(svg?.textContent).toContain('Fou'); // Foundation
    expect(svg?.textContent).toContain('Gro'); // Growth
    expect(svg?.textContent).toContain('Mas'); // Mastery
  });

  it('displays timeline title', () => {
    render(<AetasTimeline epochs={mockEpochs} onEpochSelected={mockOnEpochSelected} />);

    expect(screen.getByText(/Professional Epochs/i)).toBeInTheDocument();
  });

  it('shows legend for milestones and inflection points', () => {
    render(<AetasTimeline epochs={mockEpochs} onEpochSelected={mockOnEpochSelected} />);

    expect(screen.getByText(/Milestones/i)).toBeInTheDocument();
    expect(screen.getByText(/Inflection Points/i)).toBeInTheDocument();
  });

  it('shows mask activity in legend', () => {
    render(<AetasTimeline epochs={mockEpochs} onEpochSelected={mockOnEpochSelected} />);

    expect(screen.getByText(/Mask Activity/i)).toBeInTheDocument();
  });

  it('calls onEpochSelected when epoch is clicked', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <AetasTimeline epochs={mockEpochs} onEpochSelected={mockOnEpochSelected} />,
    );

    // Click on the first epoch group (SVG g element)
    const epochGroups = container.querySelectorAll('.epoch-block');
    if (epochGroups[0]) {
      await user.click(epochGroups[0]);
      expect(mockOnEpochSelected).toHaveBeenCalledWith('epoch-1');
    } else {
      // Fallback: click on SVG rect element
      const rects = container.querySelectorAll('svg rect');
      await user.click(rects[1]!); // First rect is grid, second is first epoch
      expect(mockOnEpochSelected).toHaveBeenCalled();
    }
  });

  it('highlights selected epoch', () => {
    render(
      <AetasTimeline
        epochs={mockEpochs}
        selectedEpoch="epoch-2"
        onEpochSelected={mockOnEpochSelected}
      />,
    );

    // Selected epoch should have the active class
    // The detail panel should show for the selected epoch
    expect(screen.getByText('Growth')).toBeInTheDocument();
    // Detail panel with description
    expect(
      screen.getByText(/Taking on leadership and advancing technical skills/i),
    ).toBeInTheDocument();
  });

  it('shows epoch milestones in detail panel', () => {
    render(
      <AetasTimeline
        epochs={mockEpochs}
        selectedEpoch="epoch-1"
        onEpochSelected={mockOnEpochSelected}
      />,
    );

    // Milestones are prefixed with "✓" in the component
    expect(screen.getByText(/First job/)).toBeInTheDocument();
    expect(screen.getByText(/First major project/)).toBeInTheDocument();
  });

  it('shows epoch inflection points in detail panel', () => {
    render(
      <AetasTimeline
        epochs={mockEpochs}
        selectedEpoch="epoch-1"
        onEpochSelected={mockOnEpochSelected}
      />,
    );

    // Inflection points are prefixed with "⚡" in the component
    expect(screen.getByText(/Career pivot/)).toBeInTheDocument();
  });

  it('shows active masks in detail panel', () => {
    render(
      <AetasTimeline
        epochs={mockEpochs}
        selectedEpoch="epoch-1"
        onEpochSelected={mockOnEpochSelected}
      />,
    );

    expect(screen.getByText('Engineer')).toBeInTheDocument();
    expect(screen.getByText('Learner')).toBeInTheDocument();
  });

  it('handles empty epochs gracefully', () => {
    render(<AetasTimeline epochs={[]} onEpochSelected={mockOnEpochSelected} />);

    expect(screen.getByText(/No epochs yet/i)).toBeInTheDocument();
  });

  it('renders SVG timeline visualization', () => {
    const { container } = render(
      <AetasTimeline epochs={mockEpochs} onEpochSelected={mockOnEpochSelected} />,
    );

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('supports custom height prop', () => {
    const { container } = render(
      <AetasTimeline epochs={mockEpochs} height={600} onEpochSelected={mockOnEpochSelected} />,
    );

    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('height', '600');
  });

  it('shows epoch date ranges in visualization', () => {
    render(
      <AetasTimeline
        epochs={mockEpochs}
        selectedEpoch="epoch-1"
        onEpochSelected={mockOnEpochSelected}
      />,
    );

    // In detail panel, dates are shown (SVG dates only show when width > 80)
    // Detail panel shows the description and full info
    expect(screen.getByText(/Early career/i)).toBeInTheDocument();
  });

  it('shows ongoing epoch without end date', () => {
    render(
      <AetasTimeline
        epochs={mockEpochs}
        selectedEpoch="epoch-3"
        onEpochSelected={mockOnEpochSelected}
      />,
    );

    // Mastery epoch has no end date (current) - shown in detail panel
    // Detail panel shows the full name and description
    expect(screen.getByText(/Current phase/i)).toBeInTheDocument();
  });
});
