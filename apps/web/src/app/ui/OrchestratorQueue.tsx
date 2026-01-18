'use client';

type OrchestratorQueueProps = {
  tasks: Array<{ id: string; description: string; status: string }>;
  orchMetrics: Record<string, number>;
  status: 'loading' | 'ready' | 'error';
};

export function OrchestratorQueue({ tasks, orchMetrics, status }: OrchestratorQueueProps) {
  return (
    <section className="section">
      <h2 className="section-title">Orchestrator Queue</h2>
      <p className="section-subtitle">Recent tasks and orchestration counters.</p>
      {tasks.length === 0 ? (
        <div className="stat-card">
          {status === 'loading'
            ? 'Loading tasks...'
            : 'No tasks yet. Trigger via orchestrator webhook or POST /tasks.'}
        </div>
      ) : (
        <div className="grid two">
          {tasks.slice(0, 6).map((task) => (
            <div key={task.id} className="stat-card">
              <div className="stat-label">{task.status}</div>
              <div className="stat-value">{task.description}</div>
            </div>
          ))}
        </div>
      )}
      {Object.keys(orchMetrics).length > 0 && (
        <div className="chip-row" style={{ marginTop: '0.75rem' }}>
          <span className="chip">
            Dispatched {orchMetrics['orchestrator_tasks_dispatched'] ?? 0}
          </span>
          <span className="chip">Completed {orchMetrics['orchestrator_tasks_completed'] ?? 0}</span>
          <span className="chip">Failed {orchMetrics['orchestrator_tasks_failed'] ?? 0}</span>
          <span className="chip">Retries {orchMetrics['orchestrator_tasks_retries'] ?? 0}</span>
        </div>
      )}
    </section>
  );
}
