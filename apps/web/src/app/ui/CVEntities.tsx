'use client';

import type { Experience, Education, Project, Skill } from '@in-midst-my-life/schema';

type CVEntitiesProps = {
  experiences: Experience[];
  projects: Project[];
  educations: Education[];
  skills: Skill[];
  onRefresh?: () => void;
};

export function CVEntities({
  experiences,
  projects,
  educations,
  skills,
  onRefresh,
}: CVEntitiesProps) {
  return (
    <section className="section">
      <h2 className="section-title">CV Entities</h2>
      <p className="section-subtitle">Overview of profile entities loaded from the API.</p>
      <div className="grid two" style={{ gap: '1rem' }}>
        <div className="stat-card">
          <div className="stat-label">Experiences</div>
          <div className="stat-value">{experiences.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Projects</div>
          <div className="stat-value">{projects.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Education</div>
          <div className="stat-value">{educations.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Skills</div>
          <div className="stat-value">{skills.length}</div>
        </div>
      </div>
      {onRefresh && (
        <div className="hero-actions" style={{ marginTop: '1rem' }}>
          <button className="button ghost" onClick={onRefresh}>
            Refresh Data
          </button>
        </div>
      )}
    </section>
  );
}
