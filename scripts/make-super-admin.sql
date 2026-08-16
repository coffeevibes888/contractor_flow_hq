-- Update your user to have superAdmin role
-- Replace 'your-email@example.com' with your actual email

UPDATE "User" 
SET role = 'superAdmin' 
WHERE email = 'your-email@example.com';

-- Verify the change
SELECT id, email, name, role 
FROM "User" 
WHERE email = 'your-email@example.com';
