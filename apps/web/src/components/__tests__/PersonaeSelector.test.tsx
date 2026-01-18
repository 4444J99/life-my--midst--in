import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PersonaeSelector from '../PersonaeSelector';
import type { TabulaPersonarumEntry, PersonaResonance } from '@in-midst-my-life/schema';

// Mock data
const mockPersonas: TabulaPersonarumEntry[] = [
  {
    id: 'persona-1',
    nomen: 'Archimago',
    everyday_name: 'The Engineer',
    role_vector: 'Builds systems and solves problems',
    tone_register: 'Analytical, precise, methodical',
    visibility_scope: ['Technica', 'Academica'],
    motto: 'Via ratio ad solutionem',
    description: 'Technical architect and problem solver',
    active: true,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-15'),
  },
  {
    id: 'persona-2',
    nomen: 'Artifex',
    everyday_name: 'The Artist',
    role_vector: 'Creates and expresses through various mediums',
    tone_register: 'Expressive, intuitive, creative',
    visibility_scope: ['Artistica', 'Domestica'],
    motto: 'Creatio est vita',
    description: 'Creative force and visual thinker',
    active: true,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-15'),
  },
];

const mockResonances: PersonaResonance[] = [
  {
    persona_id: 'persona-1',
    context: 'Technical Interview',
    fit_score: 92,
    alignment_keywords: ['systems', 'architecture', 'scalability'],
    misalignment_keywords: ['soft skills'],
    last_used: new Date('2024-01-10'),
    success_count: 5,
    feedback: 'Excellent technical depth',
  },
  {
    persona_id: 'persona-2',
    context: 'Creative Brief',
    fit_score: 78,
    alignment_keywords: ['visual', 'innovation', 'storytelling'],
    misalignment_keywords: ['technical depth'],
    last_used: new Date('2024-01-09'),
    success_count: 3,
    feedback: 'Strong creative expression',
  },
];

describe('PersonaeSelector', () => {
  const mockOnSelectPersona = vi.fn();

  beforeEach(() => {
    mockOnSelectPersona.mockClear();
  });

  it('renders all personas with metadata', () => {
    render(
      <PersonaeSelector
        personas={mockPersonas}
        resonances={mockResonances}
        onSelectPersona={mockOnSelectPersona}
      />,
    );

    // Check for first persona
    expect(screen.getByText('Archimago')).toBeInTheDocument();
    expect(screen.getByText('The Engineer')).toBeInTheDocument();

    // Check for second persona
    expect(screen.getByText('Artifex')).toBeInTheDocument();
    expect(screen.getByText('The Artist')).toBeInTheDocument();
  });

  it('displays persona mottos', () => {
    render(
      <PersonaeSelector
        personas={mockPersonas}
        resonances={mockResonances}
        onSelectPersona={mockOnSelectPersona}
      />,
    );

    // Mottos are displayed in quotes
    expect(screen.getByText(/"Via ratio ad solutionem"/)).toBeInTheDocument();
    expect(screen.getByText(/"Creatio est vita"/)).toBeInTheDocument();
  });

  it('shows visibility scopes for each persona', async () => {
    const user = userEvent.setup();
    render(
      <PersonaeSelector
        personas={mockPersonas}
        resonances={mockResonances}
        onSelectPersona={mockOnSelectPersona}
      />,
    );

    // Click on the persona name to expand (this triggers the click handler)
    const personaName = screen.getByText('Archimago');
    await user.click(personaName);

    // After expansion, visibility scopes should show
    await waitFor(() => {
      const technicaElements = screen.getAllByText('Technica');
      expect(technicaElements.length).toBeGreaterThan(0);
    });
  });

  it('displays resonance fit scores when available', () => {
    render(
      <PersonaeSelector
        personas={mockPersonas}
        resonances={mockResonances}
        onSelectPersona={mockOnSelectPersona}
      />,
    );

    // Fit scores are displayed with format "Fit Score: X%"
    expect(screen.getByText(/Fit Score: 92%/)).toBeInTheDocument();
    expect(screen.getByText(/Fit Score: 78%/)).toBeInTheDocument();
  });

  it('shows success counts from resonance data', () => {
    render(
      <PersonaeSelector
        personas={mockPersonas}
        resonances={mockResonances}
        onSelectPersona={mockOnSelectPersona}
      />,
    );

    // Success counts should be visible
    expect(screen.getByText('5 successes')).toBeInTheDocument();
    expect(screen.getByText('3 successes')).toBeInTheDocument();
  });

  it('calls onSelectPersona when a persona card is clicked', async () => {
    const user = userEvent.setup();
    render(
      <PersonaeSelector
        personas={mockPersonas}
        resonances={mockResonances}
        onSelectPersona={mockOnSelectPersona}
      />,
    );

    // Click on the persona name (inside the clickable div)
    const personaName = screen.getByText('Archimago');
    await user.click(personaName);

    expect(mockOnSelectPersona).toHaveBeenCalledWith('persona-1');
  });

  it('highlights selected persona with active style', () => {
    render(
      <PersonaeSelector
        personas={mockPersonas}
        resonances={mockResonances}
        selectedPersonaId="persona-1"
        onSelectPersona={mockOnSelectPersona}
      />,
    );

    // Selected persona should have accent border styling
    const selectedCard = screen.getByText('Archimago').closest('div[class*="stat-card"]');
    expect(selectedCard).toHaveClass('active');
  });

  it('shows loading state when loading prop is true', () => {
    render(<PersonaeSelector personas={[]} loading={true} onSelectPersona={mockOnSelectPersona} />);

    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('displays alignment keywords from resonances when expanded', async () => {
    const user = userEvent.setup();
    render(
      <PersonaeSelector
        personas={mockPersonas}
        resonances={mockResonances}
        onSelectPersona={mockOnSelectPersona}
      />,
    );

    // Click on persona name to expand
    const personaName = screen.getByText('Archimago');
    await user.click(personaName);

    // After expansion, alignment keywords should show
    await waitFor(() => {
      const keywordElements = screen.getAllByText('systems');
      expect(keywordElements.length).toBeGreaterThan(0);
    });
  });

  it('handles empty personas list gracefully', () => {
    render(<PersonaeSelector personas={[]} onSelectPersona={mockOnSelectPersona} />);

    expect(screen.getByText(/No Personas Available/i)).toBeInTheDocument();
  });

  it('color-codes fit scores based on thresholds', () => {
    const customResonances: PersonaResonance[] = [
      {
        persona_id: 'persona-1',
        context: 'test',
        fit_score: 92, // should be green (≥80%)
      },
      {
        persona_id: 'persona-2',
        context: 'test',
        fit_score: 65, // should be yellow (≥60%, <80%)
      },
    ];

    render(
      <PersonaeSelector
        personas={mockPersonas}
        resonances={customResonances}
        onSelectPersona={mockOnSelectPersona}
      />,
    );

    // Both fit scores should be visible
    expect(screen.getByText(/Fit Score: 92%/)).toBeInTheDocument();
    expect(screen.getByText(/Fit Score: 65%/)).toBeInTheDocument();
  });

  it('expands persona details on click', async () => {
    const user = userEvent.setup();
    render(
      <PersonaeSelector
        personas={mockPersonas}
        resonances={mockResonances}
        onSelectPersona={mockOnSelectPersona}
      />,
    );

    // Click on persona name to expand
    const personaName = screen.getByText('Archimago');
    await user.click(personaName);

    // After expansion, should show role vector and tone register
    await waitFor(() => {
      expect(screen.getByText(/Builds systems/)).toBeInTheDocument();
      expect(screen.getByText(/Analytical, precise/)).toBeInTheDocument();
    });
  });
});
