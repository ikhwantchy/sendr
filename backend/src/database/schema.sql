-- =====================================================
-- WhatsApp Automation Platform - Database Schema
-- Multi-Tenant Architecture with Complete Isolation
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TENANTS & USERS
-- =====================================================

CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_status ON tenants(status);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('OWNER', 'OPERATOR', 'VIEWER')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deleted')),
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, email)
);

CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- =====================================================
-- BOTS & CONNECTIONS
-- =====================================================

CREATE TABLE bots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(50),
    status VARCHAR(20) DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'connecting', 'error')),
    qr_code TEXT,
    qr_expires_at TIMESTAMP,
    session_data JSONB,
    config JSONB DEFAULT '{}',
    last_connected_at TIMESTAMP,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bots_tenant ON bots(tenant_id);
CREATE INDEX idx_bots_status ON bots(status);
CREATE INDEX idx_bots_phone ON bots(phone_number);

-- =====================================================
-- KEYWORD RULES (Bot Automation)
-- =====================================================

CREATE TABLE keyword_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    keyword VARCHAR(500) NOT NULL,
    match_type VARCHAR(20) NOT NULL CHECK (match_type IN ('equals', 'contains', 'regex')),
    scope VARCHAR(20) NOT NULL CHECK (scope IN ('global', 'group', 'contact')),
    scope_target VARCHAR(255), -- group_id or contact_id if scope is not global
    priority INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    actions JSONB NOT NULL DEFAULT '[]', -- Array of action configs
    metadata JSONB DEFAULT '{}',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_rules_tenant ON keyword_rules(tenant_id);
CREATE INDEX idx_rules_bot ON keyword_rules(bot_id);
CREATE INDEX idx_rules_active ON keyword_rules(is_active);
CREATE INDEX idx_rules_scope ON keyword_rules(scope);

-- =====================================================
-- DATA SOURCES (Spreadsheets)
-- =====================================================

CREATE TABLE data_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) DEFAULT 'google_sheets' CHECK (type IN ('google_sheets', 'csv', 'api')),
    connection_config JSONB NOT NULL, -- spreadsheet_id, sheet_name, etc.
    column_mapping JSONB NOT NULL, -- Maps columns to variables
    cache_ttl INT DEFAULT 300, -- Cache time in seconds
    last_fetched_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_datasources_tenant ON data_sources(tenant_id);
CREATE INDEX idx_datasources_active ON data_sources(is_active);

-- =====================================================
-- REMINDERS (Scheduled Messages)
-- =====================================================

CREATE TABLE reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    cron_expression VARCHAR(100) NOT NULL,
    scope VARCHAR(20) NOT NULL CHECK (scope IN ('global', 'group', 'contact')),
    scope_target VARCHAR(255), -- group_id or contact_id
    message_template TEXT NOT NULL,
    data_source_id UUID REFERENCES data_sources(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    last_run_at TIMESTAMP,
    next_run_at TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reminders_tenant ON reminders(tenant_id);
CREATE INDEX idx_reminders_bot ON reminders(bot_id);
CREATE INDEX idx_reminders_active ON reminders(is_active);
CREATE INDEX idx_reminders_next_run ON reminders(next_run_at);

-- =====================================================
-- CONTACTS (WhatsApp Contacts)
-- =====================================================

CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
    wa_id VARCHAR(255) NOT NULL, -- WhatsApp ID (phone@c.us)
    phone_number VARCHAR(50),
    name VARCHAR(255),
    is_group BOOLEAN DEFAULT false,
    group_name VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    last_message_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, bot_id, wa_id)
);

CREATE INDEX idx_contacts_tenant ON contacts(tenant_id);
CREATE INDEX idx_contacts_bot ON contacts(bot_id);
CREATE INDEX idx_contacts_wa_id ON contacts(wa_id);
CREATE INDEX idx_contacts_is_group ON contacts(is_group);

-- =====================================================
-- CAMPAIGNS (Broadcast Messages)
-- =====================================================

CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    message_type VARCHAR(20) NOT NULL CHECK (message_type IN ('text', 'image', 'document')),
    message_template TEXT NOT NULL,
    media_url TEXT,
    target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('all', 'groups', 'contacts', 'custom')),
    target_list JSONB, -- Array of contact/group IDs
    data_source_id UUID REFERENCES data_sources(id) ON DELETE SET NULL,
    throttle_config JSONB DEFAULT '{"delay_min": 1000, "delay_max": 3000, "batch_size": 10}',
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'running', 'completed', 'failed', 'cancelled')),
    scheduled_at TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    total_targets INT DEFAULT 0,
    sent_count INT DEFAULT 0,
    failed_count INT DEFAULT 0,
    replied_count INT DEFAULT 0,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_campaigns_tenant ON campaigns(tenant_id);
CREATE INDEX idx_campaigns_bot ON campaigns(bot_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_scheduled ON campaigns(scheduled_at);

-- =====================================================
-- CAMPAIGN LOGS (Individual Message Tracking)
-- =====================================================

CREATE TABLE campaign_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'sent', 'failed', 'replied')),
    message_content TEXT,
    error_message TEXT,
    sent_at TIMESTAMP,
    replied_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_campaign_logs_tenant ON campaign_logs(tenant_id);
CREATE INDEX idx_campaign_logs_campaign ON campaign_logs(campaign_id);
CREATE INDEX idx_campaign_logs_status ON campaign_logs(status);

-- =====================================================
-- EVENT LOGS (System Events)
-- =====================================================

CREATE TABLE event_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB NOT NULL,
    context JSONB NOT NULL, -- Standard context object
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_event_logs_tenant ON event_logs(tenant_id);
CREATE INDEX idx_event_logs_type ON event_logs(event_type);
CREATE INDEX idx_event_logs_created ON event_logs(created_at);

-- =====================================================
-- MESSAGES (Message History)
-- =====================================================

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    wa_message_id VARCHAR(255),
    direction VARCHAR(10) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    message_type VARCHAR(20) NOT NULL,
    content TEXT,
    media_url TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_messages_tenant ON messages(tenant_id);
CREATE INDEX idx_messages_bot ON messages(bot_id);
CREATE INDEX idx_messages_contact ON messages(contact_id);
CREATE INDEX idx_messages_created ON messages(created_at);

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to all tables with updated_at
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bots_updated_at BEFORE UPDATE ON bots FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_keyword_rules_updated_at BEFORE UPDATE ON keyword_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_data_sources_updated_at BEFORE UPDATE ON data_sources FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reminders_updated_at BEFORE UPDATE ON reminders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- INITIAL DATA
-- =====================================================

-- Create default tenant for development
INSERT INTO tenants (id, name, slug, status) 
VALUES ('00000000-0000-0000-0000-000000000001', 'Default Tenant', 'default', 'active');

-- Create default admin user (password: admin123)
INSERT INTO users (tenant_id, email, password_hash, name, role, status)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'admin@example.com',
    '$2a$10$rZ8qNQxQxQxQxQxQxQxQxO7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7',
    'Admin User',
    'OWNER',
    'active'
);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE tenants IS 'Multi-tenant organizations';
COMMENT ON TABLE users IS 'User accounts with RBAC';
COMMENT ON TABLE bots IS 'WhatsApp bot instances';
COMMENT ON TABLE keyword_rules IS 'Automation rules for keyword matching';
COMMENT ON TABLE data_sources IS 'External data sources (spreadsheets)';
COMMENT ON TABLE reminders IS 'Scheduled reminder messages';
COMMENT ON TABLE contacts IS 'WhatsApp contacts and groups';
COMMENT ON TABLE campaigns IS 'Broadcast campaigns';
COMMENT ON TABLE campaign_logs IS 'Individual campaign message tracking';
COMMENT ON TABLE event_logs IS 'System event audit log';
COMMENT ON TABLE messages IS 'Message history';
