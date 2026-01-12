-- Migration: Add AI configuration to bots table
-- This enables multi-provider LLM support for each bot

-- Add ai_config column to bots table
ALTER TABLE bots ADD COLUMN ai_config TEXT DEFAULT '{"enabled":false}';

-- Create ai_conversations table for tracking AI chat sessions
CREATE TABLE IF NOT EXISTS ai_conversations (
    id TEXT PRIMARY KEY,
    bot_id TEXT NOT NULL,
    contact_id TEXT NOT NULL,
    contact_name TEXT,
    started_at TEXT DEFAULT CURRENT_TIMESTAMP,
    ended_at TEXT,
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'completed', 'abandoned')),
    mode TEXT CHECK(mode IN ('chat', 'data_collection', 'hybrid')),
    extracted_data TEXT DEFAULT '{}',
    messages TEXT DEFAULT '[]',
    FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE CASCADE
);

-- Create ai_usage table for tracking API usage and costs
CREATE TABLE IF NOT EXISTS ai_usage (
    id TEXT PRIMARY KEY,
    bot_id TEXT NOT NULL,
    conversation_id TEXT,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    tokens_input INTEGER DEFAULT 0,
    tokens_output INTEGER DEFAULT 0,
    cost REAL DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE CASCADE,
    FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE SET NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_ai_conversations_bot_id ON ai_conversations(bot_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_contact_id ON ai_conversations(contact_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_status ON ai_conversations(status);
CREATE INDEX IF NOT EXISTS idx_ai_usage_bot_id ON ai_usage(bot_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_created_at ON ai_usage(created_at);
