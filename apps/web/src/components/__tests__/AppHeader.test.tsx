import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AppHeader from '../AppHeader';
import type { TabulaPersonarumEntry } from '@in-midst-my-life/schema';

const mockPersonas: TabulaPersonarumEntry[] = [
  {
    id: 'persona-1',
    nomen: 'Archimago',
    everyday_name: 'Engineer',
    role_vector: 'Builds systems',
    tone_register: 'Analytical',
    visibility_scope: ['Technica'],
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'persona-2',
    nomen: 'Artifex',
    everyday_name: 'Artist',
    role_vector: 'Creates',
    tone_register: 'Expressive',
    visibility_scope: ['Artistica'],
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

describe('AppHeader', () => {
  const mockOnSelectPersona = vi.fn();

  beforeEach(() => {
    mockOnSelectPersona.mockClear();
  });

  it('displays branding and profile name', () => {
    render(
      <AppHeader
        profileId="profile-1"
        profileName="John Doe"
        allPersonas={mockPersonas}
        currentPersona={mockPersonas[0] ?? null}
        onSelectPersona={mockOnSelectPersona}
      />,
    );

    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('shows navigation links', () => {
    render(
      <AppHeader
        profileId="profile-1"
        profileName="John Doe"
        allPersonas={mockPersonas}
        currentPersona={mockPersonas[0] ?? null}
        onSelectPersona={mockOnSelectPersona}
      />,
    );

    // Component should have navigation links
    const links = screen.getAllByRole('link');
    expect(links.length).toBeGreaterThan(0);
  });

  it('displays current persona information', () => {
    render(
      <AppHeader
        profileId="profile-1"
        profileName="John Doe"
        allPersonas={mockPersonas}
        currentPersona={mockPersonas[0] ?? null}
        onSelectPersona={mockOnSelectPersona}
      />,
    );

    // Current persona button shows everyday_name
    expect(screen.getByText('Engineer')).toBeInTheDocument();
  });

  it('opens persona selector dropdown on click', async () => {
    const user = userEvent.setup();

    render(
      <AppHeader
        profileId="profile-1"
        profileName="John Doe"
        allPersonas={mockPersonas}
        currentPersona={mockPersonas[0] ?? null}
        onSelectPersona={mockOnSelectPersona}
      />,
    );

    // Click persona context button
    const personaButton = screen.getByRole('button', { name: /archimago|engineer/i });
    await user.click(personaButton);

    // Should show dropdown with other personas
    expect(screen.getByText('Artifex')).toBeInTheDocument();
  });

  it('lists all personas in dropdown with nomen and everyday_name', async () => {
    const user = userEvent.setup();

    render(
      <AppHeader
        profileId="profile-1"
        profileName="John Doe"
        allPersonas={mockPersonas}
        currentPersona={mockPersonas[0] ?? null}
        onSelectPersona={mockOnSelectPersona}
      />,
    );

    // Open dropdown
    const personaButton = screen.getByRole('button', { name: /archimago|engineer/i });
    await user.click(personaButton);

    // Both personas should be visible
    expect(screen.getByText('Archimago')).toBeInTheDocument();
    expect(screen.getByText('Artifex')).toBeInTheDocument();
  });

  it('calls onSelectPersona when persona is selected', async () => {
    const user = userEvent.setup();

    render(
      <AppHeader
        profileId="profile-1"
        profileName="John Doe"
        allPersonas={mockPersonas}
        currentPersona={mockPersonas[0] ?? null}
        onSelectPersona={mockOnSelectPersona}
      />,
    );

    // Open dropdown
    const personaButton = screen.getByRole('button', { name: /archimago|engineer/i });
    await user.click(personaButton);

    // Click on second persona - find any element with Artifex text and click it
    const artifexElements = screen.getAllByText('Artifex');
    await user.click(artifexElements[artifexElements.length - 1]!);

    expect(mockOnSelectPersona).toHaveBeenCalledWith('persona-2');
  });

  it('displays persona nomen in dropdown', async () => {
    const user = userEvent.setup();

    render(
      <AppHeader
        profileId="profile-1"
        profileName="John Doe"
        allPersonas={mockPersonas}
        currentPersona={mockPersonas[0] ?? null}
        onSelectPersona={mockOnSelectPersona}
      />,
    );

    // Open dropdown
    const personaButton = screen.getByRole('button', { name: /engineer/i });
    await user.click(personaButton);

    // Dropdown shows everyday_name and nomen for each persona
    expect(screen.getByText('Archimago')).toBeInTheDocument();
    expect(screen.getByText('Artifex')).toBeInTheDocument();
  });

  it('handles missing profile name gracefully', () => {
    render(
      <AppHeader
        profileId="profile-1"
        profileName=""
        allPersonas={mockPersonas}
        currentPersona={mockPersonas[0] ?? null}
        onSelectPersona={mockOnSelectPersona}
      />,
    );

    // Should still display header
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('displays correct persona after change', async () => {
    const { rerender } = render(
      <AppHeader
        profileId="profile-1"
        profileName="John Doe"
        allPersonas={mockPersonas}
        currentPersona={mockPersonas[0] ?? null}
        onSelectPersona={mockOnSelectPersona}
      />,
    );

    // Button shows everyday_name
    expect(screen.getByText('Engineer')).toBeInTheDocument();

    // Update to second persona
    rerender(
      <AppHeader
        profileId="profile-1"
        profileName="John Doe"
        allPersonas={mockPersonas}
        currentPersona={mockPersonas[1] ?? null}
        onSelectPersona={mockOnSelectPersona}
      />,
    );

    // Should show new persona's everyday_name
    expect(screen.getByText('Artist')).toBeInTheDocument();
  });

  it('handles null currentPersona gracefully', () => {
    render(
      <AppHeader
        profileId="profile-1"
        profileName="John Doe"
        allPersonas={mockPersonas}
        currentPersona={null}
        onSelectPersona={mockOnSelectPersona}
      />,
    );

    // Should still render header
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('handles loading state', () => {
    render(
      <AppHeader
        profileId="profile-1"
        profileName="John Doe"
        allPersonas={mockPersonas}
        currentPersona={mockPersonas[0] ?? null}
        onSelectPersona={mockOnSelectPersona}
        loading={true}
      />,
    );

    // Should still render header during loading
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });
});
