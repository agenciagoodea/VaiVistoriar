-- Migration: Add is_approved column to system_reviews
-- Purpose: Enable review approval workflow before displaying on landing page

ALTER TABLE system_reviews 
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false;

-- Update existing reviews to be approved by default (backward compatibility)
UPDATE system_reviews 
SET is_approved = true 
WHERE is_approved IS NULL;

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_system_reviews_approved 
ON system_reviews(is_approved);

COMMENT ON COLUMN system_reviews.is_approved IS 'Indicates if review has been approved for public display';
