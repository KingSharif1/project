-- Add driver signature field to drivers table for one-time signature storage
-- This signature will be used for all trips completed by the driver

ALTER TABLE drivers
ADD COLUMN signature_data TEXT,
ADD COLUMN signature_signed_at TIMESTAMPTZ,
ADD COLUMN signature_location_lat DECIMAL(10, 8),
ADD COLUMN signature_location_lng DECIMAL(11, 8);

COMMENT ON COLUMN drivers.signature_data IS 'Base64 encoded driver signature image (one-time signature used for all trips)';
COMMENT ON COLUMN drivers.signature_signed_at IS 'Timestamp when driver provided their signature';
COMMENT ON COLUMN drivers.signature_location_lat IS 'Latitude where signature was captured';
COMMENT ON COLUMN drivers.signature_location_lng IS 'Longitude where signature was captured';
