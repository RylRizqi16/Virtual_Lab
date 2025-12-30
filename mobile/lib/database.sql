-- ============================================
-- Virtual Lab - Supabase Database Schema
-- ============================================
-- Jalankan SQL ini di Supabase SQL Editor

-- 1. Tabel user_progress untuk menyimpan progress eksperimen
CREATE TABLE IF NOT EXISTS user_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    experiment VARCHAR(50) NOT NULL, -- 'pendulum', 'freefall', 'projectile'
    payload JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint: satu user hanya punya satu record per experiment
    UNIQUE(user_id, experiment)
);

-- 2. Tabel quiz_stats untuk menyimpan statistik quiz
CREATE TABLE IF NOT EXISTS quiz_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    experiment VARCHAR(50) NOT NULL,
    attempts INTEGER DEFAULT 0,
    correct_count INTEGER DEFAULT 0,
    incorrect_count INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, experiment)
);

-- 3. Tabel activity_log untuk riwayat aktivitas
CREATE TABLE IF NOT EXISTS activity_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'simulation_progress', 'quiz_attempt'
    experiment VARCHAR(50) NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Extended user profile (opsional)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    full_name VARCHAR(255),
    institution VARCHAR(255),
    bio TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Indexes for better query performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_experiment ON user_progress(experiment);
CREATE INDEX IF NOT EXISTS idx_quiz_stats_user_id ON quiz_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_type ON activity_log(type);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at DESC);

-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================

-- Enable RLS on all tables
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- user_progress policies
CREATE POLICY "Users can view own progress" ON user_progress
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress" ON user_progress
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress" ON user_progress
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own progress" ON user_progress
    FOR DELETE USING (auth.uid() = user_id);

-- quiz_stats policies
CREATE POLICY "Users can view own quiz stats" ON quiz_stats
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quiz stats" ON quiz_stats
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own quiz stats" ON quiz_stats
    FOR UPDATE USING (auth.uid() = user_id);

-- activity_log policies
CREATE POLICY "Users can view own activity" ON activity_log
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activity" ON activity_log
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- user_profiles policies
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- Functions & Triggers
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_user_progress_updated_at
    BEFORE UPDATE ON user_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quiz_stats_updated_at
    BEFORE UPDATE ON quiz_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to upsert progress (insert or update)
CREATE OR REPLACE FUNCTION upsert_progress(
    p_user_id UUID,
    p_experiment VARCHAR(50),
    p_payload JSONB
)
RETURNS user_progress AS $$
DECLARE
    result user_progress;
BEGIN
    INSERT INTO user_progress (user_id, experiment, payload)
    VALUES (p_user_id, p_experiment, p_payload)
    ON CONFLICT (user_id, experiment) 
    DO UPDATE SET 
        payload = p_payload,
        updated_at = NOW()
    RETURNING * INTO result;
    
    -- Log activity
    INSERT INTO activity_log (user_id, type, experiment, metadata)
    VALUES (p_user_id, 'simulation_progress', p_experiment, p_payload);
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Sample Queries (untuk referensi)
-- ============================================

-- Get all progress for a user
-- SELECT * FROM user_progress WHERE user_id = auth.uid() ORDER BY updated_at DESC;

-- Get specific experiment progress
-- SELECT * FROM user_progress WHERE user_id = auth.uid() AND experiment = 'pendulum';

-- Upsert progress
-- SELECT upsert_progress(auth.uid(), 'pendulum', '{"L": 1.0, "T": 2.0, "g": 9.81}'::jsonb);
