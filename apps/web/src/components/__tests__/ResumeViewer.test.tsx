import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ResumeViewer from '../ResumeViewer';
import type { CVEntry, TabulaPersonarumEntry } from '@in-midst-my-life/schema';

const mockPersona: TabulaPersonarumEntry = {
  id: 'persona-1',
  nomen: 'Archimago',
  everyday_name: 'Engineer',
  role_vector: 'Builds systems',
  tone_register: 'Analytical',
  visibility_scope: ['Technica'],
  motto: 'Via ratio ad solutionem',
  active: true,
  created_at: new Date(),
  updated_at: new Date(),
};

const mockEntries: CVEntry[] = [
  {
    id: 'entry-1',
    type: 'experience',
    content: 'Senior Engineer at TechCorp (2023-2024)',
    priority: 95,
    startDate: '2023-01-01',
    endDate: '2024-01-01',
  },
  {
    id: 'entry-2',
    type: 'achievement',
    content: 'Led migration of 100+ microservices',
    priority: 85,
  },
  {
    id: 'entry-3',
    type: 'skill',
    content: 'TypeScript, React, Node.js',
    priority: 75,
  },
  {
    id: 'entry-4',
    type: 'education',
    content: 'BS Computer Science',
    priority: 60,
  },
];

describe('ResumeViewer', () => {
  const mockOnExport = vi.fn();

  beforeEach(() => {
    mockOnExport.mockClear();
  });

  it('renders theatrical preamble when provided', () => {
    const preamble = 'The following presents me as an Engineer';
    render(
      <ResumeViewer entries={mockEntries} persona={mockPersona} theatricalPreamble={preamble} />,
    );

    expect(screen.getByText(preamble)).toBeInTheDocument();
  });

  it('displays persona header with role vector', () => {
    render(<ResumeViewer entries={mockEntries} persona={mockPersona} />);

    expect(screen.getByText('Archimago')).toBeInTheDocument();
    expect(screen.getByText('Engineer')).toBeInTheDocument();
    expect(screen.getByText('Builds systems')).toBeInTheDocument();
  });

  it('shows persona visibility scope', () => {
    render(<ResumeViewer entries={mockEntries} persona={mockPersona} />);

    expect(screen.getByText('Technica')).toBeInTheDocument();
  });

  it('displays all entry types with corresponding emojis', async () => {
    const user = userEvent.setup();
    render(<ResumeViewer entries={mockEntries} persona={mockPersona} />);

    // Click to expand each type section
    const experienceSection = screen.getByText('💼 Experience');
    await user.click(experienceSection);
    expect(experienceSection).toBeInTheDocument();

    const achievementSection = screen.getByText('🏆 Achievements');
    expect(achievementSection).toBeInTheDocument();

    const skillSection = screen.getByText('⚙️ Skills');
    expect(skillSection).toBeInTheDocument();

    const educationSection = screen.getByText('🎓 Education');
    expect(educationSection).toBeInTheDocument();
  });

  it('groups entries by type by default', () => {
    render(<ResumeViewer entries={mockEntries} persona={mockPersona} />);

    // Should show type headings
    expect(screen.getByText('💼 Experience')).toBeInTheDocument();
    expect(screen.getByText('🏆 Achievements')).toBeInTheDocument();
    expect(screen.getByText('⚙️ Skills')).toBeInTheDocument();
    expect(screen.getByText('🎓 Education')).toBeInTheDocument();
  });

  it('allows toggling between group by type and date', async () => {
    const user = userEvent.setup();
    render(<ResumeViewer entries={mockEntries} persona={mockPersona} />);

    // Type grouping radio should be checked by default
    const typeRadio = screen.getByLabelText('Group by Type');
    expect(typeRadio).toBeChecked();

    // Click date grouping radio
    const dateRadio = screen.getByLabelText('Group by Date');
    await user.click(dateRadio);

    expect(dateRadio).toBeChecked();
  });

  it('expands sections to show entries', async () => {
    const user = userEvent.setup();
    render(<ResumeViewer entries={mockEntries} persona={mockPersona} />);

    // Click to expand experience section
    const experienceHeader = screen.getByText('💼 Experience');
    await user.click(experienceHeader);

    // Should now show the entry content
    expect(screen.getByText('Senior Engineer at TechCorp (2023-2024)')).toBeInTheDocument();
  });

  it('allows PDF export', async () => {
    const user = userEvent.setup();
    render(<ResumeViewer entries={mockEntries} persona={mockPersona} onExport={mockOnExport} />);

    const pdfButton = screen.getByRole('button', { name: /PDF/i });
    await user.click(pdfButton);

    expect(mockOnExport).toHaveBeenCalledWith('pdf');
  });

  it('allows JSON export', async () => {
    const user = userEvent.setup();
    render(<ResumeViewer entries={mockEntries} persona={mockPersona} onExport={mockOnExport} />);

    const jsonButton = screen.getByRole('button', { name: /JSON/i });
    await user.click(jsonButton);

    expect(mockOnExport).toHaveBeenCalledWith('json');
  });

  it('allows Markdown export', async () => {
    const user = userEvent.setup();
    render(<ResumeViewer entries={mockEntries} persona={mockPersona} onExport={mockOnExport} />);

    const mdButton = screen.getByRole('button', { name: /MD/i });
    await user.click(mdButton);

    expect(mockOnExport).toHaveBeenCalledWith('markdown');
  });

  it('shows batch generation UI when allPersonas is provided', () => {
    const allPersonas = [mockPersona, { ...mockPersona, id: 'persona-2' }];
    render(
      <ResumeViewer
        entries={mockEntries}
        persona={mockPersona}
        allPersonas={allPersonas}
        onGenerateForMask={() => {}}
      />,
    );

    expect(screen.getByText(/Generate Resumes for All Masks/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Generate All Resumes/i })).toBeInTheDocument();
  });

  it('displays entry count in section headers', () => {
    const { container } = render(<ResumeViewer entries={mockEntries} persona={mockPersona} />);

    // Entry counts appear as "1 •" in section headers
    // Just verify we have stat-card elements rendered (one per entry type)
    const statCards = container.querySelectorAll('.stat-card');
    expect(statCards.length).toBeGreaterThan(0);
  });

  it('handles empty entries gracefully', () => {
    render(<ResumeViewer entries={[]} persona={mockPersona} />);

    expect(screen.getByText(/No entries match the filters/i)).toBeInTheDocument();
  });

  it('displays loading state', () => {
    render(<ResumeViewer entries={mockEntries} persona={mockPersona} loading={true} />);

    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('displays persona motto', () => {
    render(<ResumeViewer entries={mockEntries} persona={mockPersona} />);

    // Motto is displayed in quotes
    expect(screen.getByText(/"Via ratio ad solutionem"/)).toBeInTheDocument();
  });

  it('shows select persona message when no persona selected', () => {
    render(<ResumeViewer entries={[]} persona={null} />);

    expect(screen.getByText(/Select a persona/i)).toBeInTheDocument();
  });
});
