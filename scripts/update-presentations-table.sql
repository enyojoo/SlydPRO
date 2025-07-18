-- Add chat_history column to presentations table
ALTER TABLE presentations 
ADD COLUMN chat_history JSONB DEFAULT '[]'::jsonb;

-- Update existing presentations to have empty chat history
UPDATE presentations 
SET chat_history = '[]'::jsonb 
WHERE chat_history IS NULL;
