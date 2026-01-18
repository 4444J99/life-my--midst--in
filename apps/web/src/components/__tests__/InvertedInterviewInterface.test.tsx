import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InvertedInterviewInterface from '../InvertedInterviewInterface';
import type { TabulaPersonarumEntry, PersonaResonance } from '@in-midst-my-life/schema';

const mockPersona: TabulaPersonarumEntry = {
  id: 'persona-1',
  nomen: 'Archimago',
  everyday_name: 'Engineer',
  role_vector: 'Builds systems',
  tone_register: 'Analytical',
  visibility_scope: ['Technica'],
  active: true,
  created_at: new Date(),
  updated_at: new Date(),
};

describe('InvertedInterviewInterface', () => {
  const mockOnSubmitResponse = vi.fn();
  const mockOnCalculateCompatibility = vi.fn<
    [TabulaPersonarumEntry, any[]],
    PersonaResonance
  >().mockReturnValue({
    persona_id: 'persona-1',
    context: 'Test Interview',
    fit_score: 85,
    alignment_keywords: ['growth', 'learning'],
    misalignment_keywords: ['rigid'],
  });

  beforeEach(() => {
    mockOnSubmitResponse.mockClear();
    mockOnCalculateCompatibility.mockClear();
  });

  it('displays inverted interview title', () => {
    render(<InvertedInterviewInterface profilePersona={mockPersona} />);

    // May be multiple elements with this text
    const elements = screen.getAllByText(/Inverted Interview/i);
    expect(elements.length).toBeGreaterThan(0);
  });

  it('shows persona name in header', () => {
    render(<InvertedInterviewInterface profilePersona={mockPersona} />);

    expect(screen.getByText(/Engineer/)).toBeInTheDocument();
  });

  it('displays default interview questions', () => {
    render(<InvertedInterviewInterface profilePersona={mockPersona} />);

    // Should show the first default question
    expect(screen.getByText(/learning and growth|organizational culture/i)).toBeInTheDocument();
  });

  it('provides textarea for answering questions', () => {
    render(<InvertedInterviewInterface profilePersona={mockPersona} />);

    const textarea = screen.getByPlaceholderText(/Share your thoughts/i);
    expect(textarea).toBeInTheDocument();
  });

  it('displays question progress indicator', () => {
    render(<InvertedInterviewInterface profilePersona={mockPersona} />);

    // Should show "Question X of Y"
    expect(screen.getByText(/Question 1 of 5/i)).toBeInTheDocument();
  });

  it('shows category emoji for questions', () => {
    render(<InvertedInterviewInterface profilePersona={mockPersona} />);

    // Default questions include growth, values, sustainability, culture, impact
    // Should see at least one category emoji
    expect(screen.getByText(/🚀|💎|🌱|🏛️|⭐/)).toBeInTheDocument();
  });

  it('provides star rating for confidence', async () => {
    const user = userEvent.setup();
    render(<InvertedInterviewInterface profilePersona={mockPersona} />);

    // Should have star rating buttons (1-5)
    const stars = screen.getAllByText(/★|☆/);
    expect(stars.length).toBeGreaterThanOrEqual(5);

    // Click a star to change rating
    await user.click(stars[3]);
  });

  it('allows navigation to next question after answering', async () => {
    const user = userEvent.setup();
    render(
      <InvertedInterviewInterface
        profilePersona={mockPersona}
        onSubmitResponse={mockOnSubmitResponse}
      />,
    );

    // Type an answer
    const textarea = screen.getByPlaceholderText(/Share your thoughts/i);
    await user.type(textarea, 'This organization values growth');

    // Click next question
    const nextButton = screen.getByRole('button', { name: /Next Question/i });
    await user.click(nextButton);

    // Should show question 2
    expect(screen.getByText(/Question 2 of 5/i)).toBeInTheDocument();
  });

  it('shows previous button after first question', async () => {
    const user = userEvent.setup();
    render(<InvertedInterviewInterface profilePersona={mockPersona} />);

    // Answer first question
    const textarea = screen.getByPlaceholderText(/Share your thoughts/i);
    await user.type(textarea, 'Test answer');

    const nextButton = screen.getByRole('button', { name: /Next Question/i });
    await user.click(nextButton);

    // Should now have previous button
    expect(screen.getByRole('button', { name: /Previous/i })).toBeInTheDocument();
  });

  it('disables next button when answer is empty', () => {
    render(<InvertedInterviewInterface profilePersona={mockPersona} />);

    const nextButton = screen.getByRole('button', { name: /Next Question/i });
    expect(nextButton).toBeDisabled();
  });

  it('shows Calculate Fit button on last question', async () => {
    const user = userEvent.setup();
    render(<InvertedInterviewInterface profilePersona={mockPersona} />);

    // Answer all questions to get to the last one
    for (let i = 0; i < 4; i++) {
      const textarea = screen.getByPlaceholderText(/Share your thoughts/i);
      await user.clear(textarea);
      await user.type(textarea, `Answer ${i + 1}`);

      const nextButton = screen.getByRole('button', { name: /Next Question/i });
      await user.click(nextButton);
    }

    // Last question should have "Calculate Fit" button instead of "Next"
    expect(screen.getByRole('button', { name: /Calculate Fit/i })).toBeInTheDocument();
  });

  it('shows results after completing interview', async () => {
    const user = userEvent.setup();
    render(
      <InvertedInterviewInterface
        profilePersona={mockPersona}
        onCalculateCompatibility={mockOnCalculateCompatibility}
      />,
    );

    // Complete all 5 questions
    for (let i = 0; i < 5; i++) {
      const textarea = screen.getByPlaceholderText(/Share your thoughts/i);
      await user.clear(textarea);
      await user.type(textarea, `Answer ${i + 1}`);

      const button = screen.getByRole('button', { name: /Next Question|Calculate Fit/i });
      await user.click(button);
    }

    // Should show results
    await waitFor(() => {
      expect(screen.getByText(/Interview Results/i)).toBeInTheDocument();
    });
  });

  it('displays fit score in results', async () => {
    const user = userEvent.setup();
    render(
      <InvertedInterviewInterface
        profilePersona={mockPersona}
        onCalculateCompatibility={mockOnCalculateCompatibility}
      />,
    );

    // Complete interview
    for (let i = 0; i < 5; i++) {
      const textarea = screen.getByPlaceholderText(/Share your thoughts/i);
      await user.clear(textarea);
      await user.type(textarea, `Answer ${i + 1}`);
      const button = screen.getByRole('button', { name: /Next Question|Calculate Fit/i });
      await user.click(button);
    }

    // Should show fit score percentage
    await waitFor(() => {
      expect(screen.getByText(/85%/)).toBeInTheDocument();
    });
  });

  it('shows alignment keywords in results', async () => {
    const user = userEvent.setup();
    render(
      <InvertedInterviewInterface
        profilePersona={mockPersona}
        onCalculateCompatibility={mockOnCalculateCompatibility}
      />,
    );

    // Complete interview
    for (let i = 0; i < 5; i++) {
      const textarea = screen.getByPlaceholderText(/Share your thoughts/i);
      await user.clear(textarea);
      await user.type(textarea, `Answer ${i + 1}`);
      const button = screen.getByRole('button', { name: /Next Question|Calculate Fit/i });
      await user.click(button);
    }

    // Should show alignment keywords - may be multiple elements
    await waitFor(() => {
      const growthElements = screen.getAllByText(/growth/i);
      const learningElements = screen.getAllByText(/learning/i);
      expect(growthElements.length).toBeGreaterThan(0);
      expect(learningElements.length).toBeGreaterThan(0);
    });
  });

  it('allows restarting interview from results', async () => {
    const user = userEvent.setup();
    render(
      <InvertedInterviewInterface
        profilePersona={mockPersona}
        onCalculateCompatibility={mockOnCalculateCompatibility}
      />,
    );

    // Complete interview
    for (let i = 0; i < 5; i++) {
      const textarea = screen.getByPlaceholderText(/Share your thoughts/i);
      await user.clear(textarea);
      await user.type(textarea, `Answer ${i + 1}`);
      const button = screen.getByRole('button', { name: /Next Question|Calculate Fit/i });
      await user.click(button);
    }

    // Click restart
    await waitFor(() => {
      const restartButton = screen.getByRole('button', { name: /Restart Interview/i });
      return user.click(restartButton);
    });

    // Should be back at first question
    expect(screen.getByText(/Question 1 of 5/i)).toBeInTheDocument();
  });

  it('displays loading state', () => {
    render(<InvertedInterviewInterface profilePersona={mockPersona} loading={true} />);

    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('shows message when no persona selected', () => {
    render(<InvertedInterviewInterface profilePersona={null} />);

    expect(screen.getByText(/Select your theatrical persona/i)).toBeInTheDocument();
  });

  it('displays tip about inverted interview purpose', () => {
    render(<InvertedInterviewInterface profilePersona={mockPersona} />);

    expect(screen.getByText(/Tip:/i)).toBeInTheDocument();
    expect(screen.getByText(/give you power in the hiring process/i)).toBeInTheDocument();
  });
});
