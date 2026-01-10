CREATE TABLE IF NOT EXISTS experiences (
  id uuid PRIMARY KEY,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  data jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS educations (
  id uuid PRIMARY KEY,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  data jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  data jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS skills (
  id uuid PRIMARY KEY,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  data jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS publications (
  id uuid PRIMARY KEY,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  data jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS awards (
  id uuid PRIMARY KEY,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  data jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS certifications (
  id uuid PRIMARY KEY,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  data jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS social_links (
  id uuid PRIMARY KEY,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  data jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_experiences_profile_id ON experiences (profile_id);
CREATE INDEX IF NOT EXISTS idx_educations_profile_id ON educations (profile_id);
CREATE INDEX IF NOT EXISTS idx_projects_profile_id ON projects (profile_id);
CREATE INDEX IF NOT EXISTS idx_skills_profile_id ON skills (profile_id);
CREATE INDEX IF NOT EXISTS idx_publications_profile_id ON publications (profile_id);
CREATE INDEX IF NOT EXISTS idx_awards_profile_id ON awards (profile_id);
CREATE INDEX IF NOT EXISTS idx_certifications_profile_id ON certifications (profile_id);
CREATE INDEX IF NOT EXISTS idx_social_links_profile_id ON social_links (profile_id);

CREATE INDEX IF NOT EXISTS idx_experiences_updated_at ON experiences (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_educations_updated_at ON educations (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_skills_updated_at ON skills (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_publications_updated_at ON publications (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_awards_updated_at ON awards (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_certifications_updated_at ON certifications (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_links_updated_at ON social_links (updated_at DESC);
