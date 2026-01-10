INSERT INTO tasks (id, role, description, payload, status, result)
VALUES
('seed-task-1', 'architect', 'Seeded architecture task', '{}'::jsonb, 'queued', NULL)
ON CONFLICT (id) DO NOTHING;
