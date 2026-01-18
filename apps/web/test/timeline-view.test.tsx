import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TimelineView } from '../src/app/ui/TimelineView';

describe('TimelineView', () => {
  const mockEntries = [
    {
      id: '1',
      type: 'experience',
      title: 'Software Engineer @ Google',
      summary: 'Built amazing things',
      start: '2022-01-01',
      end: '2024-01-01',
      tags: ['typescript', 'react'],
      settingId: 'setting/production',
    },
    {
      id: '2',
      type: 'education',
      title: 'MIT - Computer Science',
      start: '2018-09-01',
      end: '2022-06-01',
      tags: ['algorithms'],
      settingId: 'setting/research',
    },
  ];

  const settingLabels = {
    'setting/production': 'Production Floor',
    'setting/research': 'Research Lab',
  };

  it('renders all timeline entries', () => {
    render(
      <TimelineView
        entries={mockEntries}
        types={['experience', 'education']}
        tags={['typescript', 'react', 'algorithms']}
        settings={['setting/production', 'setting/research']}
        settingLabels={settingLabels}
        selectedType="all"
        selectedTag="all"
        selectedSetting="all"
        onTypeChange={vi.fn()}
        onTagChange={vi.fn()}
        onSettingChange={vi.fn()}
      />,
    );

    expect(screen.getByText('Software Engineer @ Google')).toBeInTheDocument();
    expect(screen.getByText('MIT - Computer Science')).toBeInTheDocument();
  });

  it('filters by type', () => {
    render(
      <TimelineView
        entries={mockEntries}
        types={['experience', 'education']}
        tags={['typescript', 'react', 'algorithms']}
        settings={['setting/production', 'setting/research']}
        settingLabels={settingLabels}
        selectedType="experience"
        selectedTag="all"
        selectedSetting="all"
        onTypeChange={vi.fn()}
        onTagChange={vi.fn()}
        onSettingChange={vi.fn()}
      />,
    );

    expect(screen.getByText('Software Engineer @ Google')).toBeInTheDocument();
    expect(screen.queryByText('MIT - Computer Science')).not.toBeInTheDocument();
  });

  it('filters by tag', () => {
    render(
      <TimelineView
        entries={mockEntries}
        types={['experience', 'education']}
        tags={['typescript', 'react', 'algorithms']}
        settings={['setting/production', 'setting/research']}
        settingLabels={settingLabels}
        selectedType="all"
        selectedTag="algorithms"
        selectedSetting="all"
        onTypeChange={vi.fn()}
        onTagChange={vi.fn()}
        onSettingChange={vi.fn()}
      />,
    );

    expect(screen.queryByText('Software Engineer @ Google')).not.toBeInTheDocument();
    expect(screen.getByText('MIT - Computer Science')).toBeInTheDocument();
  });

  it('calls filter callbacks', () => {
    const mockTypeChange = vi.fn();
    const mockTagChange = vi.fn();
    const mockSettingChange = vi.fn();

    render(
      <TimelineView
        entries={mockEntries}
        types={['experience', 'education']}
        tags={['typescript', 'react', 'algorithms']}
        settings={['setting/production', 'setting/research']}
        settingLabels={settingLabels}
        selectedType="all"
        selectedTag="all"
        selectedSetting="all"
        onTypeChange={mockTypeChange}
        onTagChange={mockTagChange}
        onSettingChange={mockSettingChange}
      />,
    );

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'experience' } });
    expect(mockTypeChange).toHaveBeenCalledWith('experience');
  });

  it('shows empty state when no entries match', () => {
    render(
      <TimelineView
        entries={[]}
        types={[]}
        tags={[]}
        settings={[]}
        settingLabels={settingLabels}
        selectedType="all"
        selectedTag="all"
        selectedSetting="all"
        onTypeChange={vi.fn()}
        onTagChange={vi.fn()}
        onSettingChange={vi.fn()}
      />,
    );

    expect(screen.getByText(/no entries match/i)).toBeInTheDocument();
  });
});
