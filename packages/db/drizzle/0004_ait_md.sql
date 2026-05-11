ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS estimated_md numeric(10,2);

ALTER TABLE mit_items
  ADD COLUMN IF NOT EXISTS estimated_md numeric(10,2);
