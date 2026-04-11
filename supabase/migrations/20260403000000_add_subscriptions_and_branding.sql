-- Add subscription management and company branding for multi-tenant support
-- This migration adds tables to track company subscriptions, payment history, and branding

-- ============================================================================
-- 1. ADD BRANDING COLUMNS TO CLINICS TABLE
-- ============================================================================

ALTER TABLE clinics
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#2563eb',
ADD COLUMN IF NOT EXISTS secondary_color TEXT DEFAULT '#1e40af',
ADD COLUMN IF NOT EXISTS custom_domain TEXT,
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/Chicago';

COMMENT ON COLUMN clinics.company_name IS 'Display name for the company (shown in portal header)';
COMMENT ON COLUMN clinics.logo_url IS 'URL to company logo image';
COMMENT ON COLUMN clinics.primary_color IS 'Primary brand color (hex)';
COMMENT ON COLUMN clinics.secondary_color IS 'Secondary brand color (hex)';
COMMENT ON COLUMN clinics.custom_domain IS 'Custom domain for white-label (Enterprise tier)';
COMMENT ON COLUMN clinics.timezone IS 'Company timezone for scheduling';

-- ============================================================================
-- 2. CREATE SUBSCRIPTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  
  -- Subscription tier
  tier TEXT NOT NULL CHECK (tier IN ('basic', 'premium', 'enterprise')),
  
  -- Stripe integration
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT,
  
  -- Subscription status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'canceled', 'trialing', 'incomplete')),
  
  -- Billing period
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  cancel_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  
  -- Features
  sms_enabled BOOLEAN DEFAULT false,
  sms_credits_remaining INTEGER DEFAULT 0,
  max_drivers INTEGER DEFAULT 10,
  max_trips_per_day INTEGER DEFAULT 50,
  data_retention_months INTEGER DEFAULT 6,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT one_subscription_per_clinic UNIQUE(clinic_id)
);

COMMENT ON TABLE subscriptions IS 'Tracks subscription tiers and billing for each clinic';
COMMENT ON COLUMN subscriptions.tier IS 'Subscription tier: basic, premium, or enterprise';
COMMENT ON COLUMN subscriptions.sms_enabled IS 'Whether SMS reminders are enabled (Premium+)';
COMMENT ON COLUMN subscriptions.sms_credits_remaining IS 'Remaining SMS credits for the billing period';
COMMENT ON COLUMN subscriptions.max_drivers IS 'Maximum number of active drivers allowed';
COMMENT ON COLUMN subscriptions.max_trips_per_day IS 'Maximum trips per day allowed';

-- Create indexes
CREATE INDEX idx_subscriptions_clinic_id ON subscriptions(clinic_id);
CREATE INDEX idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_period_end ON subscriptions(current_period_end);

-- ============================================================================
-- 3. CREATE PAYMENT HISTORY TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  
  -- Payment details
  stripe_payment_intent_id TEXT,
  stripe_invoice_id TEXT,
  amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'usd',
  
  -- Status
  status TEXT NOT NULL CHECK (status IN ('succeeded', 'failed', 'pending', 'refunded')),
  
  -- Timestamps
  paid_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Metadata
  failure_reason TEXT,
  receipt_url TEXT,
  invoice_pdf_url TEXT
);

COMMENT ON TABLE payment_history IS 'Tracks all payment transactions for subscriptions';

-- Create indexes
CREATE INDEX idx_payment_history_subscription ON payment_history(subscription_id);
CREATE INDEX idx_payment_history_clinic ON payment_history(clinic_id);
CREATE INDEX idx_payment_history_status ON payment_history(status);
CREATE INDEX idx_payment_history_paid_at ON payment_history(paid_at);

-- ============================================================================
-- 4. CREATE SMS PROVIDER SETTINGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS sms_provider_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  
  -- Provider details
  provider TEXT NOT NULL DEFAULT 'twilio' CHECK (provider IN ('twilio', 'custom')),
  enabled BOOLEAN DEFAULT false,
  
  -- Twilio credentials (encrypted in application layer)
  account_sid TEXT,
  auth_token_encrypted TEXT,
  phone_number TEXT,
  
  -- Usage tracking
  messages_sent_this_month INTEGER DEFAULT 0,
  last_message_sent_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT one_sms_config_per_clinic UNIQUE(clinic_id)
);

COMMENT ON TABLE sms_provider_settings IS 'SMS provider configuration for each clinic';
COMMENT ON COLUMN sms_provider_settings.auth_token_encrypted IS 'Encrypted Twilio auth token';

-- Create indexes
CREATE INDEX idx_sms_provider_clinic ON sms_provider_settings(clinic_id);

-- ============================================================================
-- 5. CREATE FEATURE FLAGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  
  -- Feature toggles
  sms_reminders_enabled BOOLEAN DEFAULT false,
  advanced_analytics_enabled BOOLEAN DEFAULT false,
  api_access_enabled BOOLEAN DEFAULT false,
  custom_branding_enabled BOOLEAN DEFAULT false,
  white_label_enabled BOOLEAN DEFAULT false,
  priority_support_enabled BOOLEAN DEFAULT false,
  
  -- Limits
  max_api_calls_per_day INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT one_feature_flag_per_clinic UNIQUE(clinic_id)
);

COMMENT ON TABLE feature_flags IS 'Feature flags based on subscription tier';

-- Create index
CREATE INDEX idx_feature_flags_clinic ON feature_flags(clinic_id);

-- ============================================================================
-- 6. CREATE FUNCTION TO AUTO-UPDATE FEATURE FLAGS BASED ON TIER
-- ============================================================================

CREATE OR REPLACE FUNCTION update_feature_flags_from_tier()
RETURNS TRIGGER AS $$
BEGIN
  -- Upsert feature flags based on subscription tier
  INSERT INTO feature_flags (
    clinic_id,
    sms_reminders_enabled,
    advanced_analytics_enabled,
    api_access_enabled,
    custom_branding_enabled,
    white_label_enabled,
    priority_support_enabled,
    max_api_calls_per_day
  )
  VALUES (
    NEW.clinic_id,
    CASE 
      WHEN NEW.tier IN ('premium', 'enterprise') AND NEW.sms_enabled THEN true
      ELSE false
    END,
    CASE WHEN NEW.tier IN ('premium', 'enterprise') THEN true ELSE false END,
    CASE WHEN NEW.tier IN ('premium', 'enterprise') THEN true ELSE false END,
    CASE WHEN NEW.tier IN ('premium', 'enterprise') THEN true ELSE false END,
    CASE WHEN NEW.tier = 'enterprise' THEN true ELSE false END,
    CASE WHEN NEW.tier IN ('premium', 'enterprise') THEN true ELSE false END,
    CASE 
      WHEN NEW.tier = 'enterprise' THEN 10000
      WHEN NEW.tier = 'premium' THEN 1000
      ELSE 0
    END
  )
  ON CONFLICT (clinic_id) DO UPDATE SET
    sms_reminders_enabled = CASE 
      WHEN NEW.tier IN ('premium', 'enterprise') AND NEW.sms_enabled THEN true
      ELSE false
    END,
    advanced_analytics_enabled = CASE WHEN NEW.tier IN ('premium', 'enterprise') THEN true ELSE false END,
    api_access_enabled = CASE WHEN NEW.tier IN ('premium', 'enterprise') THEN true ELSE false END,
    custom_branding_enabled = CASE WHEN NEW.tier IN ('premium', 'enterprise') THEN true ELSE false END,
    white_label_enabled = CASE WHEN NEW.tier = 'enterprise' THEN true ELSE false END,
    priority_support_enabled = CASE WHEN NEW.tier IN ('premium', 'enterprise') THEN true ELSE false END,
    max_api_calls_per_day = CASE 
      WHEN NEW.tier = 'enterprise' THEN 10000
      WHEN NEW.tier = 'premium' THEN 1000
      ELSE 0
    END,
    updated_at = NOW();
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_feature_flags ON subscriptions;
CREATE TRIGGER trigger_update_feature_flags
  AFTER INSERT OR UPDATE OF tier, sms_enabled ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_feature_flags_from_tier();

-- ============================================================================
-- 7. CREATE FUNCTION TO CHECK SUBSCRIPTION STATUS
-- ============================================================================

CREATE OR REPLACE FUNCTION check_subscription_active(p_clinic_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_status TEXT;
BEGIN
  SELECT status INTO v_status
  FROM subscriptions
  WHERE clinic_id = p_clinic_id;
  
  RETURN v_status IN ('active', 'trialing');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION check_subscription_active IS 'Check if a clinic has an active subscription';

-- ============================================================================
-- 8. ADD RLS POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_provider_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

-- Subscriptions policies
CREATE POLICY "Superadmins can view all subscriptions"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'superadmin'
    )
  );

CREATE POLICY "Admins can view their clinic subscription"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (
    clinic_id IN (
      SELECT clinic_id FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "Superadmins can manage all subscriptions"
  ON subscriptions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'superadmin'
    )
  );

-- Payment history policies
CREATE POLICY "Admins can view their clinic payment history"
  ON payment_history FOR SELECT
  TO authenticated
  USING (
    clinic_id IN (
      SELECT clinic_id FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'superadmin')
    )
  );

-- SMS provider settings policies
CREATE POLICY "Admins can manage their clinic SMS settings"
  ON sms_provider_settings FOR ALL
  TO authenticated
  USING (
    clinic_id IN (
      SELECT clinic_id FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'superadmin')
    )
  );

-- Feature flags policies (read-only for most users)
CREATE POLICY "Users can view their clinic feature flags"
  ON feature_flags FOR SELECT
  TO authenticated
  USING (
    clinic_id IN (
      SELECT clinic_id FROM users
      WHERE users.id = auth.uid()
    )
  );

-- ============================================================================
-- 9. CREATE DEFAULT SUBSCRIPTIONS FOR EXISTING CLINICS
-- ============================================================================

-- Give all existing clinics a trial subscription
INSERT INTO subscriptions (clinic_id, tier, status, trial_end, max_drivers, max_trips_per_day)
SELECT 
  id,
  'basic',
  'trialing',
  NOW() + INTERVAL '30 days',
  10,
  50
FROM clinics
WHERE id NOT IN (SELECT clinic_id FROM subscriptions)
ON CONFLICT (clinic_id) DO NOTHING;

-- ============================================================================
-- 10. UPDATE UPDATED_AT TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sms_provider_settings_updated_at
  BEFORE UPDATE ON sms_provider_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feature_flags_updated_at
  BEFORE UPDATE ON feature_flags
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
