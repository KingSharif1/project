-- Migration: Add pending signups and support ticket system
-- Purpose: Enable superadmin-managed company onboarding and admin support communication

-- ============================================================================
-- PENDING SIGNUPS TABLE
-- ============================================================================
-- Tracks company signup requests before payment and account creation

CREATE TABLE IF NOT EXISTS pending_signups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Company Information
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  
  -- Subscription Details
  requested_tier TEXT NOT NULL CHECK (requested_tier IN ('basic', 'premium', 'enterprise')),
  
  -- Payment Tracking
  stripe_checkout_session_id TEXT,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  
  -- Status Workflow: pending → payment_sent → paid → account_created
  status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'payment_sent', 'paid', 'account_created', 'canceled')),
  
  -- Additional Info
  notes TEXT,
  
  -- Created Account References (after successful payment)
  created_clinic_id UUID REFERENCES clinics(id),
  created_admin_id UUID REFERENCES users(id),
  
  -- Audit Trail
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payment_sent_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  account_created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_pending_signups_status ON pending_signups(status);
CREATE INDEX idx_pending_signups_email ON pending_signups(contact_email);
CREATE INDEX idx_pending_signups_stripe_session ON pending_signups(stripe_checkout_session_id);
CREATE INDEX idx_pending_signups_created_at ON pending_signups(created_at DESC);

-- RLS Policies: Only superadmins can access
ALTER TABLE pending_signups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins can view all pending signups"
  ON pending_signups FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'superadmin'
    )
  );

CREATE POLICY "Superadmins can insert pending signups"
  ON pending_signups FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'superadmin'
    )
  );

CREATE POLICY "Superadmins can update pending signups"
  ON pending_signups FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'superadmin'
    )
  );

-- ============================================================================
-- SUPPORT TICKETS TABLE
-- ============================================================================
-- Enables admins to contact superadmin for support

CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Ticket Details
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  
  -- Status Management
  status TEXT NOT NULL DEFAULT 'open' 
    CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority TEXT NOT NULL DEFAULT 'normal' 
    CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  
  -- Assignment
  assigned_to UUID REFERENCES users(id),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ
);

-- Ticket Responses/Comments
CREATE TABLE IF NOT EXISTS ticket_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT FALSE, -- Internal notes only visible to superadmins
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_support_tickets_clinic ON support_tickets(clinic_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_priority ON support_tickets(priority);
CREATE INDEX idx_support_tickets_created_at ON support_tickets(created_at DESC);
CREATE INDEX idx_ticket_responses_ticket ON ticket_responses(ticket_id);

-- RLS Policies for support_tickets
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Admins can view tickets from their clinic
CREATE POLICY "Admins can view own clinic tickets"
  ON support_tickets FOR SELECT
  TO authenticated
  USING (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'superadmin'
    )
  );

-- Admins can create tickets for their clinic
CREATE POLICY "Admins can create tickets"
  ON support_tickets FOR INSERT
  TO authenticated
  WITH CHECK (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
    AND created_by = auth.uid()
  );

-- Admins can update their own tickets (mark as closed)
CREATE POLICY "Admins can update own tickets"
  ON support_tickets FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'superadmin'
    )
  );

-- RLS Policies for ticket_responses
ALTER TABLE ticket_responses ENABLE ROW LEVEL SECURITY;

-- Users can view responses for tickets they have access to
CREATE POLICY "Users can view ticket responses"
  ON ticket_responses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM support_tickets st
      WHERE st.id = ticket_responses.ticket_id
      AND (
        st.clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid())
        OR
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'superadmin')
      )
    )
    AND (
      is_internal = FALSE
      OR
      EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'superadmin')
    )
  );

-- Users can create responses for tickets they have access to
CREATE POLICY "Users can create ticket responses"
  ON ticket_responses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM support_tickets st
      WHERE st.id = ticket_responses.ticket_id
      AND (
        st.clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid())
        OR
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'superadmin')
      )
    )
    AND user_id = auth.uid()
  );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for auto-updating updated_at
CREATE TRIGGER update_pending_signups_updated_at
  BEFORE UPDATE ON pending_signups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE pending_signups IS 'Tracks company signup requests before payment confirmation';
COMMENT ON TABLE support_tickets IS 'Support ticket system for admin to superadmin communication';
COMMENT ON TABLE ticket_responses IS 'Responses and comments on support tickets';
