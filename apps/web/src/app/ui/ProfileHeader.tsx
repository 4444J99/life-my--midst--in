'use client';

import type { Profile } from '@in-midst-my-life/schema';

type ProfileHeaderProps = {
  profile: Profile | null;
  profileId: string;
  profiles: Profile[];
  onProfileChange: (id: string) => void;
  apiHealth: string;
  orchHealth: string;
  taskCount: number;
  edgeCount: number;
};

export function ProfileHeader({
  profile,
  profileId,
  profiles,
  onProfileChange,
  apiHealth,
  orchHealth,
  taskCount,
  edgeCount,
}: ProfileHeaderProps) {
  return (
    <section className="section">
      <div className="hero-actions">
        <select
          className="input"
          value={profileId}
          onChange={(e) => onProfileChange(e.target.value)}
        >
          <option value="">Select Profile</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.displayName}
            </option>
          ))}
        </select>
      </div>
      {profile && (
        <div className="stat-card" style={{ marginTop: '1rem' }}>
          <h2 style={{ margin: 0 }}>{profile.displayName}</h2>
          <p className="section-subtitle">{profile.headline || 'No headline set'}</p>
          <div className="chip-row" style={{ marginTop: '0.5rem' }}>
            <span className="chip">API: {apiHealth}</span>
            <span className="chip">Orch: {orchHealth}</span>
            <span className="chip">{taskCount} Tasks</span>
            <span className="chip">{edgeCount} Edges</span>
          </div>
        </div>
      )}
    </section>
  );
}
