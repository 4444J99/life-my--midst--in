import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProfileHeader } from '../src/app/ui/ProfileHeader';
import type { Profile } from '@in-midst-my-life/schema';

describe('ProfileHeader', () => {
  const mockProfile: Profile = {
    id: 'prof-1',
    displayName: 'Test User',
    headline: 'Software Engineer',
    visibility: 'public',
    settings: {},
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  };

  const mockProfiles: Profile[] = [mockProfile];

  it('renders profile selector', () => {
    render(
      <ProfileHeader
        profile={mockProfile}
        profileId="prof-1"
        profiles={mockProfiles}
        onProfileChange={vi.fn()}
        apiHealth="healthy"
        orchHealth="healthy"
        taskCount={5}
        edgeCount={10}
      />,
    );

    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('displays profile information', () => {
    render(
      <ProfileHeader
        profile={mockProfile}
        profileId="prof-1"
        profiles={mockProfiles}
        onProfileChange={vi.fn()}
        apiHealth="healthy"
        orchHealth="healthy"
        taskCount={5}
        edgeCount={10}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Test User' })).toBeInTheDocument();
    expect(screen.getByText('Software Engineer')).toBeInTheDocument();
  });

  it('displays health indicators', () => {
    render(
      <ProfileHeader
        profile={mockProfile}
        profileId="prof-1"
        profiles={mockProfiles}
        onProfileChange={vi.fn()}
        apiHealth="healthy"
        orchHealth="degraded"
        taskCount={3}
        edgeCount={7}
      />,
    );

    expect(screen.getByText('API: healthy')).toBeInTheDocument();
    expect(screen.getByText('Orch: degraded')).toBeInTheDocument();
    expect(screen.getByText('3 Tasks')).toBeInTheDocument();
    expect(screen.getByText('7 Edges')).toBeInTheDocument();
  });

  it('calls onProfileChange when selecting different profile', () => {
    const mockChange = vi.fn();
    const profiles = [
      mockProfile,
      { ...mockProfile, id: 'prof-2', displayName: 'Another User' },
    ];
    render(
      <ProfileHeader
        profile={mockProfile}
        profileId="prof-1"
        profiles={profiles}
        onProfileChange={mockChange}
        apiHealth="healthy"
        orchHealth="healthy"
        taskCount={5}
        edgeCount={10}
      />,
    );

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'prof-2' } });
    expect(mockChange).toHaveBeenCalledWith('prof-2');
  });
});
