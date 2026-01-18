import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { OrchestratorQueue } from '../src/app/ui/OrchestratorQueue';

describe('OrchestratorQueue', () => {
  const mockTasks = [
    { id: '1', description: 'Process data', status: 'running' },
    { id: '2', description: 'Generate report', status: 'completed' },
  ];

  const mockMetrics = {
    orchestrator_tasks_dispatched: 10,
    orchestrator_tasks_completed: 8,
    orchestrator_tasks_failed: 1,
    orchestrator_tasks_retries: 2,
  };

  it('renders tasks', () => {
    render(
      <OrchestratorQueue
        tasks={mockTasks}
        orchMetrics={mockMetrics}
        status="ready"
      />,
    );

    expect(screen.getByText('Process data')).toBeInTheDocument();
    expect(screen.getByText('Generate report')).toBeInTheDocument();
  });

  it('displays metrics', () => {
    render(
      <OrchestratorQueue
        tasks={mockTasks}
        orchMetrics={mockMetrics}
        status="ready"
      />,
    );

    expect(screen.getByText('Dispatched 10')).toBeInTheDocument();
    expect(screen.getByText('Completed 8')).toBeInTheDocument();
    expect(screen.getByText('Failed 1')).toBeInTheDocument();
    expect(screen.getByText('Retries 2')).toBeInTheDocument();
  });

  it('shows empty state when no tasks', () => {
    render(
      <OrchestratorQueue
        tasks={[]}
        orchMetrics={{}}
        status="ready"
      />,
    );

    expect(screen.getByText(/no tasks yet/i)).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(
      <OrchestratorQueue
        tasks={[]}
        orchMetrics={{}}
        status="loading"
      />,
    );

    expect(screen.getByText(/loading tasks/i)).toBeInTheDocument();
  });

  it('limits tasks displayed to 6', () => {
    const manyTasks = Array.from({ length: 10 }, (_, i) => ({
      id: `${i}`,
      description: `Task ${i}`,
      status: 'pending',
    }));

    render(
      <OrchestratorQueue
        tasks={manyTasks}
        orchMetrics={{}}
        status="ready"
      />,
    );

    expect(screen.getByText('Task 0')).toBeInTheDocument();
    expect(screen.getByText('Task 5')).toBeInTheDocument();
    expect(screen.queryByText('Task 6')).not.toBeInTheDocument();
  });
});
