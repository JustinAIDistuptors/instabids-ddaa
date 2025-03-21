-- =============================================================================
-- INSTABIDS USER MANAGEMENT DOMAIN SCHEMA (DDAA)
-- =============================================================================
-- This script creates the tables for the User Management domain, which handles
-- user profiles for different user types (homeowners, contractors, etc.)
--
-- In the DDAA architecture, this domain's tables are isolated in the 
-- user_management schema, with clearly defined access paths to core entities.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- HOMEOWNER PROFILES
-- -----------------------------------------------------------------------------

-- Homeowner profiles
CREATE TABLE user_management.homeowners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
  address_id UUID REFERENCES core.user_addresses(id),
  property_details JSONB DEFAULT '{}'::jsonb,       -- Details about primary property
  preferred_contact_method TEXT DEFAULT 'email',    -- 'email', 'phone', 'sms'
  preferred_contact_times JSONB,                    -- Time preferences for contact
  rating DECIMAL(3,2),                              -- AI-generated homeowner rating
  rating_count INTEGER DEFAULT 0,                   -- Number of ratings received
  desirability_score DECIMAL(3,2),                  -- For contractor-facing metrics
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure uniqueness of user_id
  UNIQUE(user_id),
  
  -- Ensure preferred_contact_method values are valid
  CONSTRAINT homeowners_contact_method_check CHECK (preferred_contact_method IN (
    'email', 'phone', 'sms', 'app'
  ))
);

-- Create index on user_id for faster lookups
CREATE INDEX idx_homeowners_user_id ON user_management.homeowners(user_id);

-- Create index on rating for sorting
CREATE INDEX idx_homeowners_rating ON user_management.homeowners(rating);

-- Homeowner reviews (from contractors)
CREATE TABLE user_management.homeowner_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  homeowner_id UUID NOT NULL REFERENCES user_management.homeowners(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES core.users(id),   -- Always a contractor
  project_id UUID NOT NULL,                         -- Reference to completed project
  rating DECIMAL(3,2) NOT NULL,                     -- 1-5 star rating
  review_text TEXT,
  cooperation_score DECIMAL(3,2),                   -- How easy to work with
  payment_promptness DECIMAL(3,2),                  -- How quickly they paid
  communication_score DECIMAL(3,2),                 -- How well they communicated
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  visible_to_homeowner BOOLEAN DEFAULT false,       -- Whether homeowner can see it
  
  -- Ensure rating is valid
  CONSTRAINT homeowner_reviews_rating_check CHECK (rating BETWEEN 1.0 AND 5.0)
);

-- Create index on homeowner_id for faster lookups
CREATE INDEX idx_homeowner_reviews_homeowner_id ON user_management.homeowner_reviews(homeowner_id);

-- Create index on project_id for faster lookups
CREATE INDEX idx_homeowner_reviews_project_id ON user_management.homeowner_reviews(project_id);

-- -----------------------------------------------------------------------------
-- CONTRACTOR PROFILES
-- -----------------------------------------------------------------------------

-- Contractor profiles
CREATE TABLE user_management.contractors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  contact_person TEXT,
  business_address_id UUID REFERENCES core.user_addresses(id),
  business_phone TEXT,
  business_email TEXT,
  services TEXT[],                                  -- Array of service types offered
  service_areas JSONB,                              -- Service area details
  license_info JSONB DEFAULT '{}'::jsonb,           -- License information by state/type
  insurance_info JSONB DEFAULT '{}'::jsonb,         -- Insurance coverage details
  verification_status TEXT DEFAULT 'pending',       -- 'pending', 'verified', 'rejected'
  verification_method TEXT DEFAULT 'ai',            -- 'ai', 'manual', 'community'
  google_rating DECIMAL(3,2),                       -- Rating from Google
  internal_rating DECIMAL(3,2),                     -- Platform-specific rating
  rating_count INTEGER DEFAULT 0,
  job_completion_rate DECIMAL(5,2),                 -- % of jobs completed successfully
  jobs_completed INTEGER DEFAULT 0,
  subscription_tier TEXT DEFAULT 'basic',           -- 'basic', 'pro', 'premium'
  gc_experience BOOLEAN DEFAULT false,              -- Has General Contractor experience
  gc_projects_completed INTEGER DEFAULT 0,          -- Number of GC projects completed
  can_coordinate_trades BOOLEAN DEFAULT false,      -- Can coordinate multiple trades
  completion_tier TEXT DEFAULT 'starter',           -- Based on job completion volume
  metadata JSONB DEFAULT '{}'::jsonb,               -- Extensible metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure uniqueness of user_id
  UNIQUE(user_id),
  
  -- Ensure verification_status values are valid
  CONSTRAINT contractors_status_check CHECK (verification_status IN (
    'pending', 'verified', 'rejected', 'expired'
  ))
);

-- Create index on user_id for faster lookups
CREATE INDEX idx_contractors_user_id ON user_management.contractors(user_id);

-- Create index on service_areas for geographic queries
CREATE INDEX idx_contractors_service_areas ON user_management.contractors USING GIN (service_areas);

-- Create index on services for service-type queries
CREATE INDEX idx_contractors_services ON user_management.contractors USING GIN (services);

-- Create index on internal_rating for sorting
CREATE INDEX idx_contractors_rating ON user_management.contractors(internal_rating);

-- Contractor portfolio items
CREATE TABLE user_management.contractor_portfolio (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contractor_id UUID NOT NULL REFERENCES user_management.contractors(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  media_urls TEXT[] NOT NULL,                       -- Array of image/video URLs
  job_type TEXT,                                    -- Reference to job_types
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_featured BOOLEAN DEFAULT false,                -- Featured on profile?
  
  -- Create index on contractor_id for faster lookups
  CONSTRAINT contractor_portfolio_contractor_idx UNIQUE(contractor_id, title)
);

-- Create index on contractor_id for faster lookups
CREATE INDEX idx_contractor_portfolio_contractor_id ON user_management.contractor_portfolio(contractor_id);

-- Create index on job_type for filtering
CREATE INDEX idx_contractor_portfolio_job_type ON user_management.contractor_portfolio(job_type);

-- Contractor verification details
CREATE TABLE user_management.verification_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contractor_id UUID NOT NULL REFERENCES user_management.contractors(id) ON DELETE CASCADE,
  check_type TEXT NOT NULL,                         -- 'google_listing', 'website', 'business_name', 'license', 'insurance'
  status TEXT NOT NULL DEFAULT 'pending',           -- 'pending', 'verified', 'failed'
  verification_data JSONB,                          -- Data collected during verification
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  notes TEXT,
  verification_source TEXT,                         -- 'ai', 'manual', 'community'
  
  -- Ensure status values are valid
  CONSTRAINT verification_checks_status_check CHECK (status IN (
    'pending', 'verified', 'failed', 'expired'
  ))
);

-- Create index on contractor_id for faster lookups
CREATE INDEX idx_verification_checks_contractor_id ON user_management.verification_checks(contractor_id);

-- Create index on check_type for filtering
CREATE INDEX idx_verification_checks_type ON user_management.verification_checks(check_type);

-- Contractor verification documents
CREATE TABLE user_management.verification_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contractor_id UUID NOT NULL REFERENCES user_management.contractors(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,                      -- 'license', 'insurance', 'certification', etc.
  document_url TEXT NOT NULL,                       -- URL to stored document
  verification_status TEXT DEFAULT 'pending',       -- 'pending', 'verified', 'rejected'
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  expiration_date TIMESTAMPTZ,                      -- When document expires
  
  -- Ensure document_type values are valid
  CONSTRAINT verification_documents_type_check CHECK (document_type IN (
    'license', 'insurance', 'certification', 'photo_id', 'business_registration', 'other'
  ))
);

-- Create index on contractor_id for faster lookups
CREATE INDEX idx_verification_documents_contractor_id ON user_management.verification_documents(contractor_id);

-- Create index on document_type for filtering
CREATE INDEX idx_verification_documents_type ON user_management.verification_documents(document_type);

-- Contractor reviews (from homeowners)
CREATE TABLE user_management.contractor_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contractor_id UUID NOT NULL REFERENCES user_management.contractors(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES core.users(id),   -- Homeowner who wrote review
  project_id UUID NOT NULL,                         -- Reference to completed project
  source TEXT NOT NULL DEFAULT 'platform',          -- 'platform' or 'google'
  rating DECIMAL(3,2) NOT NULL,                     -- 1-5 star rating
  review_text TEXT,
  job_type TEXT,
  job_size TEXT,                                    -- 'small', 'medium', 'large'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  visible_to_public BOOLEAN DEFAULT true,
  
  -- Ensure rating is valid
  CONSTRAINT contractor_reviews_rating_check CHECK (rating BETWEEN 1.0 AND 5.0)
);

-- Create index on contractor_id for faster lookups
CREATE INDEX idx_contractor_reviews_contractor_id ON user_management.contractor_reviews(contractor_id);

-- Create index on project_id for faster lookups
CREATE INDEX idx_contractor_reviews_project_id ON user_management.contractor_reviews(project_id);

-- -----------------------------------------------------------------------------
-- PROPERTY MANAGER PROFILES
-- -----------------------------------------------------------------------------

-- Property manager profiles
CREATE TABLE user_management.property_managers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  business_address_id UUID REFERENCES core.user_addresses(id),
  business_phone TEXT,
  business_email TEXT,
  business_details JSONB DEFAULT '{}'::jsonb,
  rating DECIMAL(3,2),
  rating_count INTEGER DEFAULT 0,
  verification_status TEXT DEFAULT 'pending',       -- 'pending', 'verified', 'rejected'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure uniqueness of user_id
  UNIQUE(user_id)
);

-- Create index on user_id for faster lookups
CREATE INDEX idx_property_managers_user_id ON user_management.property_managers(user_id);

-- Create index on company_name for searches
CREATE INDEX idx_property_managers_company ON user_management.property_managers(company_name);

-- Create index on rating for sorting
CREATE INDEX idx_property_managers_rating ON user_management.property_managers(rating);

-- Managed properties
CREATE TABLE user_management.managed_properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_manager_id UUID NOT NULL REFERENCES user_management.property_managers(id) ON DELETE CASCADE,
  property_name TEXT NOT NULL,
  address_id UUID REFERENCES core.user_addresses(id),
  property_type TEXT NOT NULL,                      -- 'apartment_building', 'condo_complex', 'office_building'
  unit_count INTEGER,
  property_details JSONB DEFAULT '{}'::jsonb,
  primary_contact_name TEXT,
  primary_contact_phone TEXT,
  primary_contact_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure property_type values are valid
  CONSTRAINT managed_properties_type_check CHECK (property_type IN (
    'apartment_building', 'condo_complex', 'office_building', 'retail', 'industrial', 'mixed_use', 'single_family', 'other'
  ))
);

-- Create index on property_manager_id for faster lookups
CREATE INDEX idx_managed_properties_manager_id ON user_management.managed_properties(property_manager_id);

-- Create index on address_id for location queries
CREATE INDEX idx_managed_properties_address ON user_management.managed_properties(address_id);

-- -----------------------------------------------------------------------------
-- LABOR HELPER PROFILES
-- -----------------------------------------------------------------------------

-- Labor helper profiles
CREATE TABLE user_management.labor_helpers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  bio TEXT,
  profile_image TEXT,
  hourly_rate DECIMAL(10,2) NOT NULL,
  minimum_hours DECIMAL(4,1) DEFAULT 1.0,
  maximum_travel_distance INTEGER,                 -- miles
  has_vehicle BOOLEAN DEFAULT false,
  verification_level TEXT NOT NULL DEFAULT 'basic', -- 'basic', 'background_checked', 'identity_verified'
  is_active BOOLEAN DEFAULT true,
  average_rating DECIMAL(3,2),
  rating_count INTEGER DEFAULT 0,
  jobs_completed INTEGER DEFAULT 0,
  completion_rate DECIMAL(5,2),                    -- % of accepted jobs completed
  response_time_avg INTEGER,                       -- Average minutes to respond
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure uniqueness of user_id
  UNIQUE(user_id),
  
  -- Ensure verification_level values are valid
  CONSTRAINT labor_helpers_verification_check CHECK (verification_level IN (
    'basic', 'background_checked', 'identity_verified', 'expert_verified'
  ))
);

-- Create index on user_id for faster lookups
CREATE INDEX idx_labor_helpers_user_id ON user_management.labor_helpers(user_id);

-- Create index on hourly_rate for filtering
CREATE INDEX idx_labor_helpers_rate ON user_management.labor_helpers(hourly_rate);

-- Create index on average_rating for sorting
CREATE INDEX idx_labor_helpers_rating ON user_management.labor_helpers(average_rating);

-- Helper skills
CREATE TABLE user_management.helper_skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  helper_id UUID NOT NULL REFERENCES user_management.labor_helpers(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  related_trade TEXT,                               -- e.g., 'plumbing', 'electrical', 'carpentry'
  years_experience INTEGER,
  expertise_level TEXT NOT NULL,                    -- 'beginner', 'intermediate', 'expert'
  is_verified BOOLEAN DEFAULT false,
  verification_method TEXT,                         -- 'credential', 'contractor_endorsed', 'self_reported'
  
  -- Ensure expertise_level values are valid
  CONSTRAINT helper_skills_level_check CHECK (expertise_level IN (
    'beginner', 'intermediate', 'expert', 'master'
  ))
);

-- Create index on helper_id for faster lookups
CREATE INDEX idx_helper_skills_helper_id ON user_management.helper_skills(helper_id);

-- Create index on skill_name for filtering
CREATE INDEX idx_helper_skills_name ON user_management.helper_skills(skill_name);

-- Create index on related_trade for filtering
CREATE INDEX idx_helper_skills_trade ON user_management.helper_skills(related_trade);

-- -----------------------------------------------------------------------------
-- COMMUNITY VERIFICATION
-- -----------------------------------------------------------------------------

-- Community endorsements table
CREATE TABLE user_management.community_endorsements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  endorser_id UUID NOT NULL REFERENCES core.users(id),
  endorsee_id UUID NOT NULL REFERENCES core.users(id),
  endorsement_type TEXT NOT NULL,                   -- 'skill', 'reliability', 'quality', etc.
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Prevent self-endorsements
  CONSTRAINT community_endorsements_no_self_check CHECK (endorser_id != endorsee_id),
  
  -- Ensure each user can only endorse each skill once
  UNIQUE(endorser_id, endorsee_id, endorsement_type)
);

-- Create index on endorser_id for faster lookups
CREATE INDEX idx_community_endorsements_endorser ON user_management.community_endorsements(endorser_id);

-- Create index on endorsee_id for faster lookups
CREATE INDEX idx_community_endorsements_endorsee ON user_management.community_endorsements(endorsee_id);

-- Create index on endorsement_type for filtering
CREATE INDEX idx_community_endorsements_type ON user_management.community_endorsements(endorsement_type);

-- Community trust score
CREATE TABLE user_management.community_trust_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
  trust_score DECIMAL(5,2) NOT NULL,                -- Overall trust score
  score_components JSONB NOT NULL,                  -- Breakdown of what contributes to score
  calculation_version TEXT NOT NULL,                -- Algorithm version used
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  next_calculation_at TIMESTAMPTZ,                  -- When score should be recalculated
  
  -- Ensure uniqueness of user_id
  UNIQUE(user_id),
  
  -- Ensure trust_score is valid
  CONSTRAINT community_trust_scores_check CHECK (trust_score BETWEEN 0.0 AND 100.0)
);

-- Create index on user_id for faster lookups
CREATE INDEX idx_community_trust_scores_user_id ON user_management.community_trust_scores(user_id);

-- Create index on trust_score for sorting
CREATE INDEX idx_community_trust_scores_score ON user_management.community_trust_scores(trust_score);

-- -----------------------------------------------------------------------------
-- SUPABASE RLS POLICIES
-- -----------------------------------------------------------------------------

-- Enable RLS on all tables
ALTER TABLE user_management.homeowners ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_management.homeowner_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_management.contractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_management.contractor_portfolio ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_management.verification_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_management.verification_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_management.contractor_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_management.property_managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_management.managed_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_management.labor_helpers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_management.helper_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_management.community_endorsements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_management.community_trust_scores ENABLE ROW LEVEL SECURITY;

-- Homeowner policies
CREATE POLICY homeowners_read_own ON user_management.homeowners
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY homeowners_read_for_bidding ON user_management.homeowners
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM bidding.bids b
    JOIN bidding.bid_cards bc ON b.bid_card_id = bc.id
    WHERE b.contractor_id = auth.uid() AND bc.creator_id = user_management.homeowners.user_id
  ));

-- Contractor policies
CREATE POLICY contractors_read_own ON user_management.contractors
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY contractors_read_public ON user_management.contractors
  FOR SELECT USING (true);

CREATE POLICY contractors_update_own ON user_management.contractors
  FOR UPDATE USING (auth.uid() = user_id);

-- Property manager policies
CREATE POLICY property_managers_read_own ON user_management.property_managers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY property_managers_read_public ON user_management.property_managers
  FOR SELECT USING (true);

-- Labor helper policies
CREATE POLICY labor_helpers_read_own ON user_management.labor_helpers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY labor_helpers_read_public ON user_management.labor_helpers
  FOR SELECT USING (true);

-- Review policies
CREATE POLICY contractor_reviews_read_all ON user_management.contractor_reviews
  FOR SELECT USING (visible_to_public OR auth.uid() = 
    (SELECT user_id FROM user_management.contractors WHERE id = contractor_id));

CREATE POLICY homeowner_reviews_read_contractor ON user_management.homeowner_reviews
  FOR SELECT USING (auth.uid() = reviewer_id);

-- -----------------------------------------------------------------------------
-- DATABASE TRIGGERS
-- -----------------------------------------------------------------------------

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_homeowners_timestamp
BEFORE UPDATE ON user_management.homeowners
FOR EACH ROW EXECUTE FUNCTION core.update_timestamp();

CREATE TRIGGER update_contractors_timestamp
BEFORE UPDATE ON user_management.contractors
FOR EACH ROW EXECUTE FUNCTION core.update_timestamp();

CREATE TRIGGER update_property_managers_timestamp
BEFORE UPDATE ON user_management.property_managers
FOR EACH ROW EXECUTE FUNCTION core.update_timestamp();

CREATE TRIGGER update_managed_properties_timestamp
BEFORE UPDATE ON user_management.managed_properties
FOR EACH ROW EXECUTE FUNCTION core.update_timestamp();

CREATE TRIGGER update_labor_helpers_timestamp
BEFORE UPDATE ON user_management.labor_helpers
FOR EACH ROW EXECUTE FUNCTION core.update_timestamp();

-- Trigger function to update user ratings
CREATE OR REPLACE FUNCTION user_management.update_contractor_rating()
RETURNS TRIGGER AS $$
DECLARE
  avg_rating DECIMAL(3,2);
  review_count INTEGER;
BEGIN
  -- Calculate new average rating
  SELECT AVG(rating), COUNT(*)
  INTO avg_rating, review_count
  FROM user_management.contractor_reviews
  WHERE contractor_id = NEW.contractor_id;
  
  -- Update contractor record
  UPDATE user_management.contractors
  SET 
    internal_rating = avg_rating,
    rating_count = review_count,
    updated_at = NOW()
  WHERE id = NEW.contractor_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the rating update trigger
CREATE TRIGGER update_contractor_rating_trigger
AFTER INSERT OR UPDATE OR DELETE ON user_management.contractor_reviews
FOR EACH ROW EXECUTE FUNCTION user_management.update_contractor_rating();

-- Similar triggers for other user types
CREATE OR REPLACE FUNCTION user_management.update_homeowner_rating()
RETURNS TRIGGER AS $$
DECLARE
  avg_rating DECIMAL(3,2);
  review_count INTEGER;
BEGIN
  -- Calculate new average rating
  SELECT AVG(rating), COUNT(*)
  INTO avg_rating, review_count
  FROM user_management.homeowner_reviews
  WHERE homeowner_id = NEW.homeowner_id;
  
  -- Update homeowner record
  UPDATE user_management.homeowners
  SET 
    rating = avg_rating,
    rating_count = review_count,
    updated_at = NOW()
  WHERE id = NEW.homeowner_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the rating update trigger
CREATE TRIGGER update_homeowner_rating_trigger
AFTER INSERT OR UPDATE OR DELETE ON user_management.homeowner_reviews
FOR EACH ROW EXECUTE FUNCTION user_management.update_homeowner_rating();

-- Apply similar trigger for labor helpers
CREATE OR REPLACE FUNCTION user_management.update_labor_helper_rating()
RETURNS TRIGGER AS $$
DECLARE
  avg_rating DECIMAL(3,2);
  review_count INTEGER;
BEGIN
  -- Calculate new average rating
  SELECT AVG(rating), COUNT(*)
  INTO avg_rating, review_count
  FROM user_management.labor_helper_reviews
  WHERE helper_id = NEW.helper_id;
  
  -- Update labor helper record
  UPDATE user_management.labor_helpers
  SET 
    average_rating = avg_rating,
    rating_count = review_count,
    updated_at = NOW()
  WHERE id = NEW.helper_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the rating update trigger for labor helpers (table will be created in labor marketplace domain)
-- This is commented out until the labor_helper_reviews table is created
/*
CREATE TRIGGER update_labor_helper_rating_trigger
AFTER INSERT OR UPDATE OR DELETE ON labor_marketplace.labor_helper_reviews
FOR EACH ROW EXECUTE FUNCTION user_management.update_labor_helper_rating();
*/

-- -----------------------------------------------------------------------------
-- DOMAIN EVENTS
-- -----------------------------------------------------------------------------

-- Create a table for User Management domain events
CREATE TABLE events.user_management_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT NOT NULL,                       -- 'user_created', 'profile_updated', etc.
  user_id UUID NOT NULL REFERENCES core.users(id),
  entity_type TEXT NOT NULL,                      -- 'homeowner', 'contractor', etc.
  entity_id UUID NOT NULL,
  event_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ
);

-- Create index on event_type for filtering
CREATE INDEX idx_user_events_type ON events.user_management_events(event_type);

-- Create index on user_id for faster lookups
CREATE INDEX idx_user_events_user_id ON events.user_management_events(user_id);

-- Create index on processed status
CREATE INDEX idx_user_events_processed ON events.user_management_events(processed);

-- Trigger function to create events for profile creation
CREATE OR REPLACE FUNCTION user_management.create_profile_event()
RETURNS TRIGGER AS $$
DECLARE
  profile_type TEXT;
BEGIN
  -- Determine profile type
  CASE TG_TABLE_NAME
    WHEN 'homeowners' THEN profile_type := 'homeowner';
    WHEN 'contractors' THEN profile_type := 'contractor';
    WHEN 'property_managers' THEN profile_type := 'property_manager';
    WHEN 'labor_helpers' THEN profile_type := 'labor_helper';
  END CASE;
  
  -- Insert event
  INSERT INTO events.user_management_events (
    event_type, user_id, entity_type, entity_id, event_data
  ) VALUES (
    'profile_created',
    NEW.user_id,
    profile_type,
    NEW.id,
    to_jsonb(NEW)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the event triggers
CREATE TRIGGER homeowner_created_event
AFTER INSERT ON user_management.homeowners
FOR EACH ROW EXECUTE FUNCTION user_management.create_profile_event();

CREATE TRIGGER contractor_created_event
AFTER INSERT ON user_management.contractors
FOR EACH ROW EXECUTE FUNCTION user_management.create_profile_event();

CREATE TRIGGER property_manager_created_event
AFTER INSERT ON user_management.property_managers
FOR EACH ROW EXECUTE FUNCTION user_management.create_profile_event();

CREATE TRIGGER labor_helper_created_event
AFTER INSERT ON user_management.labor_helpers
FOR EACH ROW EXECUTE FUNCTION user_management.create_profile_event();
