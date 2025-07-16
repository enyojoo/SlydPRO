-- Verify the presentations table schema matches our code
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'presentations'
ORDER BY ordinal_position;

-- Expected columns:
-- id (uuid, not null)
-- user_id (uuid, not null)
-- name (text, not null)
-- slides (jsonb, nullable)
-- thumbnail (text, nullable)
-- created_at (timestamp with time zone, not null)
-- updated_at (timestamp with time zone, not null)
