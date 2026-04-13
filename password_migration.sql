-- Migration script to hash existing passwords in the admins table
-- Run this in your Supabase SQL editor

-- Create a function to hash passwords using SHA-256
-- Note: PostgreSQL doesn't have built-in SHA-256, so we use pgcrypto extension

-- Enable pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Update existing passwords to their SHA-256 hashes
-- IMPORTANT: Run this ONLY once after deploying the new login system
-- You'll need to manually update the passwords after this

-- Example: To set a new password for an admin
-- UPDATE admins 
-- SET password = encode(digest('new_password_here', 'sha256'), 'hex')
-- WHERE username = 'admin_username';

-- To verify a password in the future (for reference):
-- SELECT * FROM admins 
-- WHERE password = encode(digest('password_to_check', 'sha256'), 'hex');

SELECT 'Migration script loaded. Use digest() function to hash passwords.' as message;
