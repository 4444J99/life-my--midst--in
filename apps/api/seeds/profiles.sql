INSERT INTO profiles (id, data, created_at, updated_at)
VALUES
('00000000-0000-0000-0000-000000000001',
 '{
  "id":"00000000-0000-0000-0000-000000000001",
  "identityId":"00000000-0000-0000-0000-000000000010",
  "slug":"seed-demo",
  "displayName":"Seed Demo",
  "title":"Contributor",
  "headline":"Ships narratives",
  "externalIds":[{"system":"github","value":"https://github.com/seed-demo","label":"GitHub"}],
  "settings":{
    "visibility":"public",
    "defaultThemeId":"classic",
    "defaultLanguage":"en",
    "sectionOrder":{
      "sections":[
        {"type":"experience","isVisible":true,"sortOrder":1},
        {"type":"projects","isVisible":true,"sortOrder":2},
        {"type":"skills","isVisible":true,"sortOrder":3}
      ]
    }
  },
  "createdAt":"2024-01-01T00:00:00.000Z",
  "updatedAt":"2024-01-01T00:00:00.000Z"
 }',
 '2024-01-01T00:00:00.000Z','2024-01-01T00:00:00.000Z')
ON CONFLICT (id) DO NOTHING;
