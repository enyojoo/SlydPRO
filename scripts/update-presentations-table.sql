-- Update presentations table to match the actual schema
-- Remove columns that don't exist and ensure we only have the required columns

-- First, let's see what columns exist
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'presentations';

-- If description, is_starred, views columns exist and need to be removed:
-- ALTER TABLE presentations DROP COLUMN IF EXISTS description;
-- ALTER TABLE presentations DROP COLUMN IF EXISTS is_starred;
-- ALTER TABLE presentations DROP COLUMN IF EXISTS views;

-- Ensure the table has the correct structure
CREATE TABLE IF NOT EXISTS presentations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  slides JSONB NOT NULL DEFAULT '[]',
  thumbnail TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recreate indexes if needed
CREATE INDEX IF NOT EXISTS idx_presentations_user_id ON presentations(user_id);
CREATE INDEX IF NOT EXISTS idx_presentations_created_at ON presentations(created_at DESC);

-- Ensure RLS policies exist
DROP POLICY IF EXISTS "Users can view own presentations" ON presentations;
DROP POLICY IF EXISTS "Users can insert own presentations" ON presentations;
DROP POLICY IF EXISTS "Users can update own presentations" ON presentations;
DROP POLICY IF EXISTS "Users can delete own presentations" ON presentations;

CREATE POLICY "Users can view own presentations" ON presentations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own presentations" ON presentations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own presentations" ON presentations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own presentations" ON presentations
  FOR DELETE USING (auth.uid() = user_id);

-- Ensure updated_at trigger exists
CREATE TRIGGER update_presentations_updated_at BEFORE UPDATE ON presentations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
