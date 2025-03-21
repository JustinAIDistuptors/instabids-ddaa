-- =============================================================================
-- INSTABIDS DOMAIN-DRIVEN AGENT ARCHITECTURE (DDAA) SCHEMA SETUP
-- =============================================================================
-- This script establishes the foundation for the DDAA approach by:
-- 1. Creating PostgreSQL schemas for domain separation
-- 2. Setting up proper object ownership and permissions
-- 3. Enabling extensions required by the application
--
-- Each domain has its own dedicated schema namespace to enforce separation
-- and support the domain-specific agent architecture.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- DATABASE CONFIGURATION AND EXTENSIONS
-- -----------------------------------------------------------------------------

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- For UUID generation
CREATE EXTENSION IF NOT EXISTS "postgis";        -- For geospatial features
CREATE EXTENSION IF NOT EXISTS "pg_trgm";        -- For text search
CREATE EXTENSION IF NOT EXISTS "pgcrypto";       -- For encryption functions

-- -----------------------------------------------------------------------------
-- SCHEMA CREATION FOR DOMAIN SEPARATION
-- -----------------------------------------------------------------------------

-- Core schema - shared resources and reference data
CREATE SCHEMA IF NOT EXISTS core;

-- User Management domain
CREATE SCHEMA IF NOT EXISTS user_management;

-- Project Management domain
CREATE SCHEMA IF NOT EXISTS project_management;

-- Bidding domain
CREATE SCHEMA IF NOT EXISTS bidding;

-- Messaging domain
CREATE SCHEMA IF NOT EXISTS messaging;

-- Payment domain
CREATE SCHEMA IF NOT EXISTS payment;

-- Community domain
CREATE SCHEMA IF NOT EXISTS community;

-- AI Outreach domain
CREATE SCHEMA IF NOT EXISTS ai_outreach;

-- Social Sharing domain
CREATE SCHEMA IF NOT EXISTS social_sharing;

-- Dream Projects domain
CREATE SCHEMA IF NOT EXISTS dream_projects;

-- Labor Marketplace domain
CREATE SCHEMA IF NOT EXISTS labor_marketplace;

-- Cross-domain events schema
CREATE SCHEMA IF NOT EXISTS events;

-- -----------------------------------------------------------------------------
-- SHARED FUNCTIONS AND TRIGGERS
-- -----------------------------------------------------------------------------

-- Timestamp update function in core schema
CREATE OR REPLACE FUNCTION core.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Audit logging function in core schema
CREATE OR REPLACE FUNCTION core.log_audit_event()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO core.audit_logs (
    user_id, action, entity_type, entity_id, change_data
  ) VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    NEW.id,
    CASE
      WHEN TG_OP = 'INSERT' THEN to_jsonb(NEW)
      WHEN TG_OP = 'UPDATE' THEN jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW))
      WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD)
    END
  );
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- COMMENT ON SCHEMA ORGANIZATION
-- -----------------------------------------------------------------------------

COMMENT ON SCHEMA core IS 'Core schema for shared tables and reference data';
COMMENT ON SCHEMA user_management IS 'User profiles, authentication, and user-specific data';
COMMENT ON SCHEMA project_management IS 'Project creation, management, and workflow';
COMMENT ON SCHEMA bidding IS 'Bid cards, bids, and the bidding process';
COMMENT ON SCHEMA messaging IS 'Conversations, messages, and notifications';
COMMENT ON SCHEMA payment IS 'Payment processing, transactions, and escrow';
COMMENT ON SCHEMA community IS 'Reviews, ratings, and community features';
COMMENT ON SCHEMA ai_outreach IS 'AI-powered contractor outreach and matching';
COMMENT ON SCHEMA events IS 'Cross-domain events for domain coordination';
