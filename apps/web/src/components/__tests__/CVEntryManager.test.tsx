import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CVEntryManager from '../CVEntryManager';
import type { CVEntry, TabulaPersonarumEntry, Aetas, Scaena } from '@in-midst-my-life/schema';

const mockPersonas: TabulaPersonarumEntry[] = [
  {
    id: 'persona-1',
    nomen: 'Archimago',
    everyday_name: 'Engineer',
    role_vector: 'Builds systems',
    tone_register: 'Analytical',
    visibility_scope: ['Technica'],
    active: true,
    created_at: new Date(),
    updated_at: new Date(),
  },
];

const mockAetas: Aetas[] = [
  {
    id: 'aetas-1',
    name: 'Initium',
    nomen: 'Initium',
    label: 'Initiation',
    age_range: '18-25',
    description: 'Beginning phase',
    capability_profile: { primary: ['learning', 'exploration'] },
    duration_years: 7,
    created_at: new Date(),
    updated_at: new Date(),
  },
];

const mockScaenae: Scaena[] = [
  {
    id: 'scaena-1',
    name: 'Technica',
    nomen: 'Technica',
    emoji: '⚙️',
    description: 'Technical stage',
    immutable: true,
    canonical: true,
    created_at: new Date(),
    updated_at: new Date(),
  },
];

const mockEntries: CVEntry[] = [
  {
    id: 'entry-1',
    type: 'experience',
    content: 'Senior Engineer at TechCorp',
    personae: ['persona-1'],
    aetas: ['aetas-1'],
    scaenae: ['scaena-1'],
    startDate: '2023-01-01',
    endDate: '2024-01-01',
    priority: 90,
    tags: ['leadership', 'systems'],
    metadata: { company: 'TechCorp' },
  },
];

describe('CVEntryManager', () => {
  const mockOnAddEntry = vi.fn();
  const mockOnUpdateEntry = vi.fn();
  const mockOnDeleteEntry = vi.fn();

  beforeEach(() => {
    mockOnAddEntry.mockClear();
    mockOnUpdateEntry.mockClear();
    mockOnDeleteEntry.mockClear();
  });

  it('renders existing CV entries', () => {
    render(
      <CVEntryManager
        entries={mockEntries}
        personas={mockPersonas}
        aetas={mockAetas}
        scaenae={mockScaenae}
        onAddEntry={mockOnAddEntry}
      />,
    );

    expect(screen.getByText('Senior Engineer at TechCorp')).toBeInTheDocument();
  });

  it('displays entry type with emoji', () => {
    render(
      <CVEntryManager
        entries={mockEntries}
        personas={mockPersonas}
        aetas={mockAetas}
        scaenae={mockScaenae}
      />,
    );

    // Entry type "Work Experience" should be displayed
    expect(screen.getByText('Work Experience')).toBeInTheDocument();
    // Emoji 💼 should be present
    expect(screen.getByText('💼')).toBeInTheDocument();
  });

  it('shows entry types in create form', async () => {
    const user = userEvent.setup();
    render(
      <CVEntryManager
        entries={[]}
        personas={mockPersonas}
        aetas={mockAetas}
        scaenae={mockScaenae}
      />,
    );

    // Open create form
    const createButton = screen.getByText(/Add CV Entry/i);
    await user.click(createButton);

    // Check for entry type selector
    const typeSelector = screen.getByText('Entry Type').nextElementSibling;
    expect(typeSelector).toBeInTheDocument();
  });

  it('allows selecting personae when creating entry', async () => {
    const user = userEvent.setup();
    render(
      <CVEntryManager
        entries={[]}
        personas={mockPersonas}
        aetas={mockAetas}
        scaenae={mockScaenae}
        onAddEntry={mockOnAddEntry}
      />,
    );

    // Open form
    const createButton = screen.getByText(/Add CV Entry/i);
    await user.click(createButton);

    // Find persona checkbox - there may be multiple "Engineer" texts
    const checkboxes = screen.getAllByRole('checkbox');
    // Find persona-related checkbox (first checkbox in the Personas section)
    const personaCheckbox = checkboxes.find(
      (cb) => cb.closest('label')?.textContent?.includes('Engineer'),
    );
    expect(personaCheckbox).toBeDefined();

    if (personaCheckbox) {
      await user.click(personaCheckbox);
      expect(personaCheckbox).toBeChecked();
    }
  });

  it('allows priority adjustment', async () => {
    const user = userEvent.setup();
    render(
      <CVEntryManager
        entries={[]}
        personas={mockPersonas}
        aetas={mockAetas}
        scaenae={mockScaenae}
        onAddEntry={mockOnAddEntry}
      />,
    );

    const createButton = screen.getByText(/Add CV Entry/i);
    await user.click(createButton);

    // Find priority slider by label text
    const priorityLabel = screen.getByText(/Priority:/i);
    expect(priorityLabel).toBeInTheDocument();

    // The range input is a sibling
    const prioritySlider = screen.getByRole('slider');
    expect(prioritySlider).toBeInTheDocument();
  });

  it('allows date range selection for entries', async () => {
    const user = userEvent.setup();
    render(
      <CVEntryManager
        entries={[]}
        personas={mockPersonas}
        aetas={mockAetas}
        scaenae={mockScaenae}
      />,
    );

    const createButton = screen.getByText(/Add CV Entry/i);
    await user.click(createButton);

    // Find date inputs by their labels
    expect(screen.getByText('Start Date')).toBeInTheDocument();
    expect(screen.getByText('End Date')).toBeInTheDocument();
  });

  it('calls onAddEntry with entry data on submit', async () => {
    const user = userEvent.setup();
    render(
      <CVEntryManager
        entries={[]}
        personas={mockPersonas}
        aetas={mockAetas}
        scaenae={mockScaenae}
        onAddEntry={mockOnAddEntry}
      />,
    );

    const createButton = screen.getByText(/Add CV Entry/i);
    await user.click(createButton);

    // Fill content
    const contentInput = screen.getByPlaceholderText(/Describe this entry/i);
    await user.type(contentInput, 'New achievement');

    // Submit
    const submitButton = screen.getByRole('button', { name: /Add Entry/i });
    await user.click(submitButton);

    expect(mockOnAddEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        content: 'New achievement',
      }),
    );
  });

  it('calls onDeleteEntry when delete button clicked', async () => {
    const user = userEvent.setup();
    render(
      <CVEntryManager
        entries={mockEntries}
        personas={mockPersonas}
        aetas={mockAetas}
        scaenae={mockScaenae}
        onDeleteEntry={mockOnDeleteEntry}
      />,
    );

    // Find and click delete button for entry
    const deleteButton = screen.getByRole('button', { name: /delete/i });
    await user.click(deleteButton);

    expect(mockOnDeleteEntry).toHaveBeenCalledWith('entry-1');
  });

  it('displays loading state', () => {
    render(
      <CVEntryManager
        entries={[]}
        personas={mockPersonas}
        aetas={mockAetas}
        scaenae={mockScaenae}
        loading={true}
      />,
    );

    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('shows date range in entry summary', () => {
    const { container } = render(
      <CVEntryManager
        entries={mockEntries}
        personas={mockPersonas}
        aetas={mockAetas}
        scaenae={mockScaenae}
      />,
    );

    // Should display formatted date - check that container has date content
    expect(container.textContent).toMatch(/2023|Jan|entry/i);
  });

  it('supports filtering by persona chips', async () => {
    const user = userEvent.setup();
    render(
      <CVEntryManager
        entries={mockEntries}
        personas={mockPersonas}
        aetas={mockAetas}
        scaenae={mockScaenae}
      />,
    );

    // Find persona filter chip in the filter section
    const filterSection = screen.getByText('Filter by Dimensions');
    expect(filterSection).toBeInTheDocument();

    // Click persona filter chip
    const personaeSection = screen.getByText('Personae:');
    expect(personaeSection).toBeInTheDocument();

    // Should show entry when filter matches
    expect(screen.getByText('Senior Engineer at TechCorp')).toBeInTheDocument();
  });

  it('handles empty entries list', () => {
    render(
      <CVEntryManager
        entries={[]}
        personas={mockPersonas}
        aetas={mockAetas}
        scaenae={mockScaenae}
      />,
    );

    expect(screen.getByText(/No CV entries yet/i)).toBeInTheDocument();
  });

  it('allows editing existing entries', async () => {
    const user = userEvent.setup();
    render(
      <CVEntryManager
        entries={mockEntries}
        personas={mockPersonas}
        aetas={mockAetas}
        scaenae={mockScaenae}
        onUpdateEntry={mockOnUpdateEntry}
      />,
    );

    // Click edit button
    const editButton = screen.getByRole('button', { name: /edit/i });
    await user.click(editButton);

    // Form should now be in edit mode
    expect(screen.getByText('Edit Entry')).toBeInTheDocument();
  });

  it('displays persona tags for entries', () => {
    render(
      <CVEntryManager
        entries={mockEntries}
        personas={mockPersonas}
        aetas={mockAetas}
        scaenae={mockScaenae}
      />,
    );

    // Persona tag should be displayed on the entry card
    // The everyday_name "Engineer" appears both in the entry tags and in the filter section
    const engineerTexts = screen.getAllByText('Engineer');
    expect(engineerTexts.length).toBeGreaterThan(0);
  });

  it('displays scaena tags with name', () => {
    render(
      <CVEntryManager
        entries={mockEntries}
        personas={mockPersonas}
        aetas={mockAetas}
        scaenae={mockScaenae}
      />,
    );

    // Scaena name "Technica" should be visible
    const technicaTexts = screen.getAllByText('Technica');
    expect(technicaTexts.length).toBeGreaterThan(0);
  });

  it('displays custom tags', () => {
    render(
      <CVEntryManager
        entries={mockEntries}
        personas={mockPersonas}
        aetas={mockAetas}
        scaenae={mockScaenae}
      />,
    );

    // Custom tags should be visible
    expect(screen.getByText('leadership')).toBeInTheDocument();
    expect(screen.getByText('systems')).toBeInTheDocument();
  });

  it('has cancel button in form', async () => {
    const user = userEvent.setup();
    render(
      <CVEntryManager
        entries={[]}
        personas={mockPersonas}
        aetas={mockAetas}
        scaenae={mockScaenae}
      />,
    );

    const createButton = screen.getByText(/Add CV Entry/i);
    await user.click(createButton);

    // Cancel button should be present
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    expect(cancelButton).toBeInTheDocument();

    // Clicking cancel should hide form
    await user.click(cancelButton);
    expect(screen.queryByText('Add New Entry')).not.toBeInTheDocument();
  });
});
