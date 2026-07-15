ALTER TABLE generated_content ADD COLUMN source_digest_article_id UUID REFERENCES generated_content(id) ON DELETE SET NULL;
ALTER TABLE ideas ADD COLUMN source_digest_article_id UUID REFERENCES generated_content(id) ON DELETE SET NULL;
