-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  monthly_credits DECIMAL(10,2) DEFAULT 10.00,
  purchased_credits DECIMAL(10,2) DEFAULT 0.00,
  plan VARCHAR(20) DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create presentations table
CREATE TABLE IF NOT EXISTS presentations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  slides JSONB NOT NULL DEFAULT '[]',
  thumbnail TEXT,
  is_starred BOOLEAN DEFAULT FALSE,
  views INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create credit_transactions table
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  type VARCHAR(10) NOT NULL CHECK (type IN ('deduct', 'add')),
  description TEXT NOT NULL,
  input_tokens INTEGER,
  output_tokens INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_presentations_user_id ON presentations(user_id);
CREATE INDEX IF NOT EXISTS idx_presentations_created_at ON presentations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at DESC);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE presentations ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only see and update their own profile
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Users can only see and manage their own presentations
CREATE POLICY "Users can view own presentations" ON presentations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own presentations" ON presentations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own presentations" ON presentations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own presentations" ON presentations
  FOR DELETE USING (auth.uid() = user_id);

-- Users can only see their own credit transactions
CREATE POLICY "Users can view own credit transactions" ON credit_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own credit transactions" ON credit_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_presentations_updated_at BEFORE UPDATE ON presentations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
