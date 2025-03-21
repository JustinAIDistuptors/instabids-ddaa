-- =============================================================================
-- INSTABIDS BIDDING DOMAIN SCHEMA (DDAA)
-- =============================================================================
-- This script creates the tables for the Bidding domain, which handles
-- bid cards, bids, bid acceptance, and group bidding functionality.
--
-- In the DDAA architecture, this domain's tables are isolated in the 
-- bidding schema, with clearly defined access paths to other domains.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- BID CARDS
-- -----------------------------------------------------------------------------

-- Main table for storing bid card information
CREATE TABLE bidding.bid_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES core.users(id),
  job_category_id UUID NOT NULL REFERENCES core.job_categories(id),
  job_type_id UUID NOT NULL REFERENCES core.job_types(id),
  title TEXT NOT NULL,
  description TEXT,
  location JSONB NOT NULL,
  zip_code TEXT NOT NULL,
  budget_min DECIMAL(10,2),
  budget_max DECIMAL(10,2),
  timeline_start DATE,
  timeline_end DATE,
  bid_deadline TIMESTAMPTZ,
  group_bidding_enabled BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'open', -- 'open', 'in_progress', 'awarded', 'completed', 'cancelled'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  visibility TEXT NOT NULL DEFAULT 'public', -- 'public', 'private', 'invited'
  max_contractor_messages INTEGER DEFAULT 5, -- Limit to 5 contractors as specified
  homeowner_rating_summary JSONB, -- Summary of homeowner ratings for contractors
  prohibit_negotiation BOOLEAN DEFAULT true, -- Default to no negotiation
  guidance_for_bidders TEXT, -- Tips for contractors
  current_revision_number INTEGER DEFAULT 0,
  has_active_revision BOOLEAN DEFAULT false,
  last_revised_at TIMESTAMPTZ,
  managed_property_id UUID, -- References managed_properties in user_management schema
  open_to_group_bidding BOOLEAN,
  job_start_window_start TIMESTAMPTZ,
  job_start_window_end TIMESTAMPTZ,
  job_size TEXT,
  custom_answers JSONB DEFAULT '{}'::jsonb,
  intention_type_id UUID, -- References project_intention_types in project_management schema
  timeline_horizon_id UUID, -- References timeline_horizons in project_management schema 
  group_eligible BOOLEAN DEFAULT false,
  price_driven BOOLEAN DEFAULT false,
  min_bids_target INTEGER NOT NULL DEFAULT 3,
  max_bids_allowed INTEGER NOT NULL DEFAULT 5,
  current_commitments INTEGER DEFAULT 0,
  current_bids INTEGER DEFAULT 0,
  commitment_duration_hours INTEGER DEFAULT 24,
  acceptance_time_limit_hours INTEGER DEFAULT 24,
  current_accepted_bid_id UUID, -- References bids - filled in later
  acceptance_expires_at TIMESTAMPTZ,
  previous_accepted_bids UUID[] DEFAULT '{}',
  project_phase_id UUID, -- References project_phases in project_management schema
  is_part_of_suite BOOLEAN DEFAULT false,

  -- Ensure valid status values
  CONSTRAINT bid_cards_status_check CHECK (status IN (
    'draft', 'open', 'review', 'negotiation', 'awarded', 'in_progress', 'completed', 'cancelled', 'expired'
  )),
  
  -- Ensure valid visibility values
  CONSTRAINT bid_cards_visibility_check CHECK (visibility IN (
    'public', 'private', 'group'
  )),
  
  -- Ensure valid job size values
  CONSTRAINT bid_cards_job_size_check CHECK (job_size IN (
    'small', 'medium', 'large', 'x-large'
  ))
);

-- Create index on creator_id for faster lookups
CREATE INDEX idx_bid_cards_creator_id ON bidding.bid_cards(creator_id);

-- Create index on job_type_id for filtering
CREATE INDEX idx_bid_cards_job_type_id ON bidding.bid_cards(job_type_id);

-- Create index on status for filtering
CREATE INDEX idx_bid_cards_status ON bidding.bid_cards(status);

-- Create index on zip_code for location-based searches
CREATE INDEX idx_bid_cards_zip_code ON bidding.bid_cards(zip_code);

-- Create index for group bidding eligibility
CREATE INDEX idx_bid_cards_group_bidding ON bidding.bid_cards(group_bidding_enabled);

-- Media attachments for bid cards (photos, videos, etc.)
CREATE TABLE bidding.bid_card_media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bid_card_id UUID NOT NULL REFERENCES bidding.bid_cards(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL, -- 'photo', 'video', 'document', 'measurement'
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  description TEXT,
  metadata JSONB, -- For measurements, dimensions, etc.
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure media_type values are valid
  CONSTRAINT bid_card_media_type_check CHECK (media_type IN (
    'photo', 'video', 'document', 'measurement'
  ))
);

-- Create index on bid_card_id for faster lookups
CREATE INDEX idx_bid_card_media_bid_card_id ON bidding.bid_card_media(bid_card_id);

-- Create index on media_type for filtering
CREATE INDEX idx_bid_card_media_type ON bidding.bid_card_media(media_type);

-- -----------------------------------------------------------------------------
-- BID CARD REVISIONS
-- -----------------------------------------------------------------------------

-- Track bid card revisions
CREATE TABLE bidding.bid_card_revisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bid_card_id UUID NOT NULL REFERENCES bidding.bid_cards(id) ON DELETE CASCADE,
  revision_number INTEGER NOT NULL,
  revision_type TEXT NOT NULL, -- 'minor' or 'major'
  change_summary TEXT NOT NULL,
  detailed_changes JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notification_sent BOOLEAN DEFAULT false,
  notification_sent_at TIMESTAMPTZ,
  UNIQUE(bid_card_id, revision_number)
);

-- Track fields that changed
CREATE TABLE bidding.bid_card_change_details (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  revision_id UUID NOT NULL REFERENCES bidding.bid_card_revisions(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  change_type TEXT NOT NULL -- 'added', 'removed', 'modified'
);

-- New media items added in revision
CREATE TABLE bidding.bid_card_revision_media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  revision_id UUID NOT NULL REFERENCES bidding.bid_card_revisions(id) ON DELETE CASCADE,
  media_id UUID NOT NULL REFERENCES bidding.bid_card_media(id) ON DELETE CASCADE
);

-- -----------------------------------------------------------------------------
-- BIDS
-- -----------------------------------------------------------------------------

-- Contractor bids on bid cards
CREATE TABLE bidding.bids (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bid_card_id UUID NOT NULL REFERENCES bidding.bid_cards(id) ON DELETE CASCADE,
  contractor_id UUID NOT NULL, -- References contractors.id in user_management schema
  amount DECIMAL(10,2) NOT NULL,
  is_final_offer BOOLEAN DEFAULT true, -- Default to true for "best price first"
  scope_of_work TEXT NOT NULL,
  materials_included JSONB,
  timeline JSONB,
  value_propositions TEXT[] NOT NULL, -- What makes this bid unique (array of points)
  additional_notes TEXT,
  status TEXT NOT NULL DEFAULT 'submitted', -- 'submitted', 'viewed', 'accepted', 'declined', 'expired', 'retracted'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_updated_at TIMESTAMPTZ,
  update_count INTEGER DEFAULT 0,
  is_retracted BOOLEAN DEFAULT false,
  retraction_reason TEXT,
  has_messaging_access BOOLEAN DEFAULT true,
  overflow_bid BOOLEAN DEFAULT false,
  original_bid_id UUID REFERENCES bidding.bids(id),
  bid_card_revision_id UUID REFERENCES bidding.bid_card_revisions(id),
  is_current_revision BOOLEAN DEFAULT true,
  project_suite_id UUID, -- References project_suites in project_management schema
  is_conditional BOOLEAN DEFAULT false,
  conditional_bid_ids UUID[],
  
  -- Ensure uniqueness of contractor and bid card combination
  UNIQUE(bid_card_id, contractor_id),
  
  -- Ensure valid status values
  CONSTRAINT bids_status_check CHECK (status IN (
    'submitted', 'viewed', 'shortlisted', 'accepted', 'declined', 'expired', 'withdrawn'
  ))
);

-- Create circular reference now that bids table exists
ALTER TABLE bidding.bid_cards ADD CONSTRAINT fk_current_accepted_bid_id 
FOREIGN KEY (current_accepted_bid_id) REFERENCES bidding.bids(id);

-- Create index on bid_card_id for faster lookups
CREATE INDEX idx_bids_bid_card_id ON bidding.bids(bid_card_id);

-- Create index on contractor_id for faster lookups
CREATE INDEX idx_bids_contractor_id ON bidding.bids(contractor_id);

-- Create index on status for filtering
CREATE INDEX idx_bids_status ON bidding.bids(status);

-- Create index on amount for sorting
CREATE INDEX idx_bids_amount ON bidding.bids(amount);

-- Contractor responses to revisions
CREATE TABLE bidding.bid_revisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  original_bid_id UUID NOT NULL REFERENCES bidding.bids(id) ON DELETE CASCADE,
  bid_card_revision_id UUID NOT NULL REFERENCES bidding.bid_card_revisions(id) ON DELETE CASCADE,
  revised_amount DECIMAL(10,2),
  scope_changes TEXT,
  timeline_changes JSONB,
  materials_changes JSONB,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'submitted', 'no_change'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  UNIQUE(original_bid_id, bid_card_revision_id)
);

-- -----------------------------------------------------------------------------
-- BID ACCEPTANCE AND CONNECTION PAYMENTS
-- -----------------------------------------------------------------------------
-- Bid acceptance and payment process
CREATE TABLE bidding.bid_acceptances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bid_id UUID NOT NULL REFERENCES bidding.bids(id) ON DELETE CASCADE,
  bid_card_id UUID NOT NULL REFERENCES bidding.bid_cards(id),
  accepted_by UUID NOT NULL REFERENCES core.users(id),
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  connection_fee_amount DECIMAL(10,2) NOT NULL,
  fee_calculation_method TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_payment', -- 'pending_payment', 'paid', 'expired', 'cancelled'
  expiry_notified BOOLEAN DEFAULT false,
  expiry_notification_sent_at TIMESTAMPTZ,
  fallback_activated_at TIMESTAMPTZ,
  fallback_bid_id UUID REFERENCES bidding.bids(id),
  UNIQUE(bid_id)
);

-- Payment transactions - belongs in payment domain but referenced here
CREATE TABLE payment.connection_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bid_acceptance_id UUID NOT NULL REFERENCES bidding.bid_acceptances(id) ON DELETE CASCADE,
  contractor_id UUID NOT NULL, -- References contractors.id in user_management schema
  amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT,
  payment_processor TEXT,
  transaction_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  UNIQUE(bid_acceptance_id)
);

-- Create index on bid_acceptance_id for faster lookups
CREATE INDEX idx_connection_payments_bid_acceptance_id ON payment.connection_payments(bid_acceptance_id);

-- Create index on contractor_id for filtering
CREATE INDEX idx_connection_payments_contractor_id ON payment.connection_payments(contractor_id);

-- Create index on status for filtering
CREATE INDEX idx_connection_payments_status ON payment.connection_payments(status);

-- Contact information release records
CREATE TABLE bidding.contact_releases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bid_acceptance_id UUID NOT NULL REFERENCES bidding.bid_acceptances(id),
  homeowner_contact JSONB NOT NULL,
  contractor_contact JSONB NOT NULL,
  released_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  viewed_by_contractor BOOLEAN DEFAULT false,
  viewed_at TIMESTAMPTZ
);

-- Create index on bid_acceptance_id for faster lookups
CREATE INDEX idx_contact_releases_bid_acceptance_id ON bidding.contact_releases(bid_acceptance_id);

-- -----------------------------------------------------------------------------
-- BID COMMITMENTS
-- -----------------------------------------------------------------------------
-- Add commitment status to bid system
CREATE TABLE bidding.bid_commitments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bid_card_id UUID NOT NULL REFERENCES bidding.bid_cards(id) ON DELETE CASCADE,
  contractor_id UUID NOT NULL, -- References contractors.id in user_management schema
  status TEXT NOT NULL DEFAULT 'committed', -- 'committed', 'completed', 'expired', 'cancelled'
  committed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deadline TIMESTAMPTZ NOT NULL,
  reminder_sent BOOLEAN DEFAULT false,
  reminder_sent_at TIMESTAMPTZ,
  UNIQUE(bid_card_id, contractor_id)
);

-- -----------------------------------------------------------------------------
-- GROUP BIDDING
-- -----------------------------------------------------------------------------

-- Bid grouping table
CREATE TABLE bidding.bid_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  job_category_id UUID REFERENCES core.job_categories(id),
  bid_deadline TIMESTAMPTZ,
  job_start_window_start TIMESTAMPTZ,
  job_start_window_end TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'forming', -- 'forming', 'active', 'bidding', 'pending_acceptance', 'completed', 'expired'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES core.users(id),
  is_auto_generated BOOLEAN DEFAULT false
);

-- Create index on zip_code for location-based matching
CREATE INDEX idx_bid_groups_zip_code ON bidding.bid_groups(zip_code);

-- Create index on status for filtering
CREATE INDEX idx_bid_groups_status ON bidding.bid_groups(status);

-- Linking bid cards to groups
CREATE TABLE bidding.bid_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bid_group_id UUID NOT NULL REFERENCES bidding.bid_groups(id) ON DELETE CASCADE,
  bid_card_id UUID NOT NULL REFERENCES bidding.bid_cards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES core.users(id),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'joined', -- 'joined', 'accepted_group_bid', 'declined_group_bid', 'left'
  visible_to_group BOOLEAN DEFAULT true,
  UNIQUE(bid_group_id, bid_card_id)
);

-- Create index on bid_group_id for faster lookups
CREATE INDEX idx_bid_group_members_bid_group_id ON bidding.bid_group_members(bid_group_id);

-- Create index on bid_card_id for faster lookups
CREATE INDEX idx_bid_group_members_bid_card_id ON bidding.bid_group_members(bid_card_id);

-- Group bids (from contractors)
CREATE TABLE bidding.group_bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bid_group_id UUID NOT NULL REFERENCES bidding.bid_groups(id) ON DELETE CASCADE,
  contractor_id UUID NOT NULL, -- References contractors.id in user_management schema
  individual_price DECIMAL(10,2) NOT NULL, -- Regular price if not grouped
  group_price DECIMAL(10,2) NOT NULL, -- Discounted price if grouped
  required_acceptance_count INTEGER, -- How many must accept (e.g., 4 out of 5)
  required_acceptance_percentage INTEGER, -- Or percentage that must accept
  acceptance_deadline TIMESTAMPTZ NOT NULL, -- Deadline for group to accept
  terms TEXT,
  timeline JSONB,
  status TEXT NOT NULL DEFAULT 'submitted', -- 'submitted', 'partially_accepted', 'threshold_met', 'expired', 'extended'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on bid_group_id for faster lookups
CREATE INDEX idx_group_bids_bid_group_id ON bidding.group_bids(bid_group_id);

-- Create index on contractor_id for faster lookups
CREATE INDEX idx_group_bids_contractor_id ON bidding.group_bids(contractor_id);

-- Group Bid Acceptances
CREATE TABLE bidding.group_bid_acceptances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_bid_id UUID NOT NULL REFERENCES bidding.group_bids(id) ON DELETE CASCADE,
  bid_card_id UUID NOT NULL REFERENCES bidding.bid_cards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES core.users(id),
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(group_bid_id, bid_card_id)
);

-- Create index on group_bid_id for faster lookups
CREATE INDEX idx_group_bid_acceptances_group_bid_id ON bidding.group_bid_acceptances(group_bid_id);

-- Create index on bid_card_id for faster lookups
CREATE INDEX idx_group_bid_acceptances_bid_card_id ON bidding.group_bid_acceptances(bid_card_id);

-- "Nudges" for encouraging group participation
CREATE TABLE bidding.group_nudges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL, -- References a templates table
  sender_id UUID NOT NULL REFERENCES core.users(id),
  recipient_id UUID NOT NULL REFERENCES core.users(id),
  bid_group_id UUID NOT NULL REFERENCES bidding.bid_groups(id),
  message TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

CREATE TABLE bidding.nudge_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message TEXT NOT NULL,
  icon TEXT,
  category TEXT DEFAULT 'general'
);

-- For tracking group bid extensions
CREATE TABLE bidding.group_bid_extensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_bid_id UUID NOT NULL REFERENCES bidding.group_bids(id) ON DELETE CASCADE,
  previous_deadline TIMESTAMPTZ NOT NULL,
  new_deadline TIMESTAMPTZ NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES core.users(id)
);

-- -----------------------------------------------------------------------------
-- DOMAIN EVENTS (for cross-domain communication)
-- -----------------------------------------------------------------------------

-- Create a table for Bidding domain events
CREATE TABLE events.bidding_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT NOT NULL, -- 'bid_created', 'bid_accepted', 'bid_group_formed', etc.
  user_id UUID REFERENCES core.users(id),
  entity_type TEXT NOT NULL, -- 'bid_card', 'bid', 'group_bid', etc.
  entity_id UUID NOT NULL,
  event_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ
);

-- Create index on event_type for filtering
CREATE INDEX idx_bidding_events_type ON events.bidding_events(event_type);

-- Create index on user_id for faster lookups
CREATE INDEX idx_bidding_events_user_id ON events.bidding_events(user_id);

-- Create index on processed status
CREATE INDEX idx_bidding_events_processed ON events.bidding_events(processed);

-- Trigger function to create events for bid card creation
CREATE OR REPLACE FUNCTION bidding.create_bid_card_event()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert event
  INSERT INTO events.bidding_events (
    event_type, user_id, entity_type, entity_id, event_data
  ) VALUES (
    'bid_card_created',
    NEW.creator_id,
    'bid_card',
    NEW.id,
    to_jsonb(NEW)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the event trigger
CREATE TRIGGER bid_card_created_event
AFTER INSERT ON bidding.bid_cards
FOR EACH ROW EXECUTE FUNCTION bidding.create_bid_card_event();

-- Trigger function to create events for bid submission
CREATE OR REPLACE FUNCTION bidding.create_bid_event()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert event
  INSERT INTO events.bidding_events (
    event_type, user_id, entity_type, entity_id, event_data
  ) VALUES (
    'bid_submitted',
    NEW.contractor_id,
    'bid',
    NEW.id,
    to_jsonb(NEW)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the event trigger
CREATE TRIGGER bid_submitted_event
AFTER INSERT ON bidding.bids
FOR EACH ROW EXECUTE FUNCTION bidding.create_bid_event();

-- Trigger function to create events for bid acceptance
CREATE OR REPLACE FUNCTION bidding.create_bid_acceptance_event()
RETURNS TRIGGER AS $$
DECLARE
  bid_record bidding.bids%ROWTYPE;
  bid_card_record bidding.bid_cards%ROWTYPE;
  event_payload JSONB;
BEGIN
  -- Get the associated bid and bid card
  SELECT * INTO bid_record FROM bidding.bids WHERE id = NEW.bid_id;
  SELECT * INTO bid_card_record FROM bidding.bid_cards WHERE id = NEW.bid_card_id;
  
  -- Create an event payload with all relevant information
  event_payload = jsonb_build_object(
    'bid_acceptance', to_jsonb(NEW),
    'bid', to_jsonb(bid_record),
    'bid_card', to_jsonb(bid_card_record)
  );
  
  -- Insert event
  INSERT INTO events.bidding_events (
    event_type, user_id, entity_type, entity_id, event_data
  ) VALUES (
    'bid_accepted',
    NEW.accepted_by,
    'bid_acceptance',
    NEW.id,
    event_payload
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the event trigger
CREATE TRIGGER bid_acceptance_created_event
AFTER INSERT ON bidding.bid_acceptances
FOR EACH ROW EXECUTE FUNCTION bidding.create_bid_acceptance_event();

-- -----------------------------------------------------------------------------
-- SUPABASE RLS POLICIES
-- -----------------------------------------------------------------------------

-- Enable RLS on all tables
ALTER TABLE bidding.bid_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE bidding.bid_card_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE bidding.bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE bidding.bid_card_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bidding.bid_card_change_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE bidding.bid_card_revision_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE bidding.bid_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bidding.bid_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment.connection_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE bidding.contact_releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE bidding.bid_commitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE bidding.bid_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE bidding.bid_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE bidding.group_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE bidding.group_bid_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE bidding.group_nudges ENABLE ROW LEVEL SECURITY;
ALTER TABLE bidding.nudge_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE bidding.group_bid_extensions ENABLE ROW LEVEL SECURITY;

-- Bid card policies
CREATE POLICY bid_cards_select_public ON bidding.bid_cards FOR SELECT USING (visibility = 'public');
CREATE POLICY bid_cards_select_creator ON bidding.bid_cards FOR SELECT USING (auth.uid() = creator_id);
CREATE POLICY bid_cards_select_group ON bidding.bid_cards FOR SELECT USING (
    EXISTS (SELECT 1 FROM bidding.bid_group_members WHERE bid_card_id = bidding.bid_cards.id AND user_id = auth.uid())
);

CREATE POLICY bid_cards_insert_creator ON bidding.bid_cards FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY bid_cards_update_creator ON bidding.bid_cards FOR UPDATE USING (auth.uid() = creator_id);

-- Bid policies
CREATE POLICY bids_select_contractor ON bidding.bids FOR SELECT USING (auth.uid() = contractor_id);
CREATE POLICY bids_select_homeowner ON bidding.bids FOR SELECT USING (
    auth.uid() = (SELECT creator_id FROM bidding.bid_cards WHERE id = bid_card_id)
);

CREATE POLICY bids_insert_contractor ON bidding.bids FOR INSERT WITH CHECK (auth.uid() = contractor_id);
CREATE POLICY bids_update_contractor ON bidding.bids FOR UPDATE USING (auth.uid() = contractor_id);

-- -----------------------------------------------------------------------------
-- DATABASE TRIGGERS
-- -----------------------------------------------------------------------------

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_bid_cards_timestamp
BEFORE UPDATE ON bidding.bid_cards
FOR EACH ROW EXECUTE FUNCTION core.update_timestamp();

-- Trigger to manage bid slots
CREATE OR REPLACE FUNCTION bidding.manage_bid_slots()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if this is a new bid
  IF TG_OP = 'INSERT' THEN
    -- Check if max bids already reached
    IF (SELECT current_bids FROM bidding.bid_cards WHERE id = NEW.bid_card_id) >= 
       (SELECT max_bids_allowed FROM bidding.bid_cards WHERE id = NEW.bid_card_id) THEN
      -- If slots full, mark this bid as overflow
      NEW.has_messaging_access := false;
      NEW.overflow_bid := true;
    ELSE
      -- If slots available, grant messaging access
      NEW.has_messaging_access := true;
      NEW.overflow_bid := false;
      
      -- Update current_bids count
      UPDATE bidding.bid_cards 
      SET current_bids = current_bids + 1
      WHERE id = NEW.bid_card_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bid_slot_management
BEFORE INSERT ON bidding.bids
FOR EACH ROW EXECUTE FUNCTION bidding.manage_bid_slots();
