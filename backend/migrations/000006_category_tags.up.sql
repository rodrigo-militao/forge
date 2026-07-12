ALTER TABLE generated_content ADD COLUMN category TEXT;
ALTER TABLE generated_content ADD COLUMN tags TEXT[] NOT NULL DEFAULT '{}';
