-- Add newsletter as a product type for assembled editions.
ALTER TABLE generated_content
    DROP CONSTRAINT IF EXISTS generated_content_product_check,
    ADD CONSTRAINT generated_content_product_check
        CHECK (product IN ('digest', 'compose', 'newsletter'));

-- Allow 'edition' as a source type.
ALTER TABLE generated_content
    DROP CONSTRAINT IF EXISTS generated_content_source_type_check,
    ADD CONSTRAINT generated_content_source_type_check
        CHECK (source_type IN ('topic', 'discovery', 'edition'));
