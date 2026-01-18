import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TheatricalNarrativeEditor from '../TheatricalNarrativeEditor';
import type { NarrativeBlock, TabulaPersonarumEntry } from '@in-midst-my-life/schema';

const mockPersona: TabulaPersonarumEntry = {
  id: 'persona-1',
  nomen: 'Archimago',
  everyday_name: 'The Engineer',
  role_vector: 'Builds systems',
  tone_register: 'Analytical',
  visibility_scope: ['Technica'],
  active: true,
  created_at: new Date(),
  updated_at: new Date(),
};

const mockNarrativeBlocks: NarrativeBlock[] = [
  {
    id: 'block-1',
    title: 'Technical Journey',
    content: 'Started coding at 14...',
    weight: 85,
    type: 'experience',
    theatrical_metadata: {
      scaena: 'Technica',
      performance_note: 'Technical depth',
      authentic_caveat: 'Emphasizes technical skills',
    },
  },
];

describe('TheatricalNarrativeEditor', () => {
  const mockOnSave = vi.fn();
  const mockOnGenerate = vi.fn();

  beforeEach(() => {
    mockOnSave.mockClear();
    mockOnGenerate.mockClear();
  });

  it('displays theatrical preamble editor', () => {
    render(
      <TheatricalNarrativeEditor
        persona={mockPersona}
        blocks={mockNarrativeBlocks}
        theatricalPreamble="The following presents me as..."
        onSave={mockOnSave}
        onGenerate={mockOnGenerate}
      />,
    );

    expect(screen.getByText(/Theatrical Preamble/i)).toBeInTheDocument();
    // The preamble text is in a textarea, check it's there
    const preambleTextarea = screen.getByPlaceholderText(/following narrative is presented/i);
    expect(preambleTextarea).toBeInTheDocument();
  });

  it('allows editing theatrical preamble', async () => {
    const user = userEvent.setup();

    render(
      <TheatricalNarrativeEditor
        persona={mockPersona}
        blocks={mockNarrativeBlocks}
        theatricalPreamble="Original preamble"
        onSave={mockOnSave}
        onGenerate={mockOnGenerate}
      />,
    );

    const preambleTextarea = screen.getByPlaceholderText(/following narrative is presented/i);
    await user.clear(preambleTextarea);
    await user.type(preambleTextarea, 'New preamble');

    expect(preambleTextarea).toHaveValue('New preamble');
  });

  it('displays authentic disclaimer editor', () => {
    render(
      <TheatricalNarrativeEditor
        persona={mockPersona}
        blocks={mockNarrativeBlocks}
        authenticDisclaimer="Emphasizes technical work"
        onSave={mockOnSave}
        onGenerate={mockOnGenerate}
      />,
    );

    expect(screen.getByText(/Authentic Disclaimer/i)).toBeInTheDocument();
  });

  it('allows editing authentic disclaimer', async () => {
    const user = userEvent.setup();

    render(
      <TheatricalNarrativeEditor
        persona={mockPersona}
        blocks={mockNarrativeBlocks}
        authenticDisclaimer="Original"
        onSave={mockOnSave}
        onGenerate={mockOnGenerate}
      />,
    );

    const disclaimerTextarea = screen.getByPlaceholderText(/emphasizes/i);
    await user.clear(disclaimerTextarea);
    await user.type(disclaimerTextarea, 'Updated disclaimer');

    expect(disclaimerTextarea).toHaveValue('Updated disclaimer');
  });

  it('renders narrative blocks with edit capability', () => {
    render(
      <TheatricalNarrativeEditor
        persona={mockPersona}
        blocks={mockNarrativeBlocks}
        onSave={mockOnSave}
        onGenerate={mockOnGenerate}
      />,
    );

    expect(screen.getByText('Technical Journey')).toBeInTheDocument();
    expect(screen.getByText(/Started coding/i)).toBeInTheDocument();
  });

  it('allows editing narrative block title', async () => {
    const user = userEvent.setup();

    render(
      <TheatricalNarrativeEditor
        persona={mockPersona}
        blocks={mockNarrativeBlocks}
        onSave={mockOnSave}
        onGenerate={mockOnGenerate}
      />,
    );

    // Click edit button on the block
    const editButton = screen.getByRole('button', { name: /edit/i });
    await user.click(editButton);

    // Find and edit the title input
    const titleInput = screen.getByDisplayValue('Technical Journey');
    await user.clear(titleInput);
    await user.type(titleInput, 'Updated Title');

    expect(titleInput).toHaveValue('Updated Title');
  });

  it('allows editing narrative block content', async () => {
    const user = userEvent.setup();

    render(
      <TheatricalNarrativeEditor
        persona={mockPersona}
        blocks={mockNarrativeBlocks}
        onSave={mockOnSave}
        onGenerate={mockOnGenerate}
      />,
    );

    // Click edit button
    const editButton = screen.getByRole('button', { name: /edit/i });
    await user.click(editButton);

    // Find and edit the content textarea
    const contentTextarea = screen.getByDisplayValue('Started coding at 14...');
    await user.clear(contentTextarea);
    await user.type(contentTextarea, 'New narrative content');

    expect(contentTextarea).toHaveValue('New narrative content');
  });

  it('allows adjusting narrative block weight', async () => {
    const user = userEvent.setup();

    render(
      <TheatricalNarrativeEditor
        persona={mockPersona}
        blocks={mockNarrativeBlocks}
        onSave={mockOnSave}
        onGenerate={mockOnGenerate}
      />,
    );

    // Click edit button
    const editButton = screen.getByRole('button', { name: /edit/i });
    await user.click(editButton);

    // Find weight input
    const weightInput = screen.getByDisplayValue('85');
    expect(weightInput).toBeInTheDocument();

    await user.clear(weightInput);
    await user.type(weightInput, '75');

    expect(weightInput).toHaveValue(75);
  });

  it('displays scaena field for theatrical metadata', async () => {
    const user = userEvent.setup();

    render(
      <TheatricalNarrativeEditor
        persona={mockPersona}
        blocks={mockNarrativeBlocks}
        onSave={mockOnSave}
        onGenerate={mockOnGenerate}
      />,
    );

    // Click edit button
    const editButton = screen.getByRole('button', { name: /edit/i });
    await user.click(editButton);

    // Should have scaena input field
    expect(screen.getByPlaceholderText(/Academica, Technica/i)).toBeInTheDocument();
  });

  it('displays performance note editor', async () => {
    const user = userEvent.setup();

    render(
      <TheatricalNarrativeEditor
        persona={mockPersona}
        blocks={mockNarrativeBlocks}
        onSave={mockOnSave}
        onGenerate={mockOnGenerate}
      />,
    );

    // Click edit button
    const editButton = screen.getByRole('button', { name: /edit/i });
    await user.click(editButton);

    // Should have performance note field
    expect(screen.getByPlaceholderText(/Why is this block important/i)).toBeInTheDocument();
  });

  it('displays authentic caveat editor', async () => {
    const user = userEvent.setup();

    render(
      <TheatricalNarrativeEditor
        persona={mockPersona}
        blocks={mockNarrativeBlocks}
        onSave={mockOnSave}
        onGenerate={mockOnGenerate}
      />,
    );

    // Click edit button
    const editButton = screen.getByRole('button', { name: /edit/i });
    await user.click(editButton);

    // Should have authentic caveat field
    expect(screen.getByPlaceholderText(/emphasized\/de-emphasized/i)).toBeInTheDocument();
  });

  it('allows saving changes', async () => {
    const user = userEvent.setup();

    render(
      <TheatricalNarrativeEditor
        persona={mockPersona}
        blocks={mockNarrativeBlocks}
        onSave={mockOnSave}
        onGenerate={mockOnGenerate}
      />,
    );

    // Click save button
    const saveButton = screen.getByRole('button', { name: /save narrative/i });
    await user.click(saveButton);

    expect(mockOnSave).toHaveBeenCalled();
  });

  it('allows regenerating narrative', async () => {
    const user = userEvent.setup();

    render(
      <TheatricalNarrativeEditor
        persona={mockPersona}
        blocks={mockNarrativeBlocks}
        onSave={mockOnSave}
        onGenerate={mockOnGenerate}
      />,
    );

    const regenerateButton = screen.getByRole('button', { name: /regenerate/i });
    await user.click(regenerateButton);

    expect(mockOnGenerate).toHaveBeenCalled();
  });

  it('allows deleting narrative blocks', async () => {
    const user = userEvent.setup();

    render(
      <TheatricalNarrativeEditor
        persona={mockPersona}
        blocks={mockNarrativeBlocks}
        onSave={mockOnSave}
        onGenerate={mockOnGenerate}
      />,
    );

    // Click edit button to enter edit mode
    const editButton = screen.getByRole('button', { name: /edit/i });
    await user.click(editButton);

    // Find and click delete button
    const deleteButton = screen.getByRole('button', { name: /delete block/i });
    await user.click(deleteButton);

    // Block should be removed from UI
    await waitFor(() => {
      expect(screen.queryByText('Technical Journey')).not.toBeInTheDocument();
    });
  });

  it('shows display vs. edit mode toggle', async () => {
    const user = userEvent.setup();

    render(
      <TheatricalNarrativeEditor
        persona={mockPersona}
        blocks={mockNarrativeBlocks}
        onSave={mockOnSave}
        onGenerate={mockOnGenerate}
      />,
    );

    // Should start in display mode
    expect(screen.getByText('Technical Journey')).toBeInTheDocument();

    // Toggle to edit mode
    const editButton = screen.getByRole('button', { name: /edit/i });
    await user.click(editButton);

    // Should show edit controls
    expect(screen.getByDisplayValue('Technical Journey')).toBeInTheDocument();

    // Toggle back to display mode
    const doneButton = screen.getByRole('button', { name: /done editing/i });
    await user.click(doneButton);

    // Should return to display mode
    expect(screen.getByText('Technical Journey')).toBeInTheDocument();
  });

  it('handles empty narrative blocks', () => {
    render(
      <TheatricalNarrativeEditor
        persona={mockPersona}
        blocks={[]}
        onSave={mockOnSave}
        onGenerate={mockOnGenerate}
      />,
    );

    expect(screen.getByText(/No narrative blocks yet/i)).toBeInTheDocument();
  });

  it('displays loading state', () => {
    render(
      <TheatricalNarrativeEditor
        persona={mockPersona}
        blocks={mockNarrativeBlocks}
        loading={true}
        onSave={mockOnSave}
        onGenerate={mockOnGenerate}
      />,
    );

    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('shows message when no persona is selected', () => {
    render(
      <TheatricalNarrativeEditor
        persona={null}
        blocks={mockNarrativeBlocks}
        onSave={mockOnSave}
        onGenerate={mockOnGenerate}
      />,
    );

    expect(screen.getByText(/Select a persona/i)).toBeInTheDocument();
  });
});
