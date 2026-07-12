DROP TABLE IF EXISTS content_tags;
DROP TABLE IF EXISTS digest_article_tags;
DROP TABLE IF EXISTS tags;

ALTER TABLE generated_content DROP CONSTRAINT IF EXISTS generated_content_status_check;
ALTER TABLE generated_content ADD CONSTRAINT generated_content_status_check CHECK (status IN ('draft', 'approved', 'rejected'));
