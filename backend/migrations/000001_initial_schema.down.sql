-- Reverses 000001_initial_schema.up.sql
DROP TABLE IF EXISTS usage_counters     CASCADE;
DROP TABLE IF EXISTS jobs               CASCADE;
DROP TABLE IF EXISTS voice_routing_config CASCADE;
DROP TABLE IF EXISTS generated_content  CASCADE;
DROP TABLE IF EXISTS topics             CASCADE;
DROP TABLE IF EXISTS sources            CASCADE;
DROP TABLE IF EXISTS users              CASCADE;
