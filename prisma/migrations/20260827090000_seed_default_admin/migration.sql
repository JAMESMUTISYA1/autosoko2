-- Create the platform "Super Admin" role (idempotent)
INSERT INTO roles (id, name, scope, is_system_role)
SELECT gen_random_uuid(), 'Super Admin', 'platform', true
WHERE NOT EXISTS (
    SELECT 1 FROM roles WHERE name = 'Super Admin' AND scope = 'platform'
);

-- Create the admin user (replace 'admin@autosoko.africa' with your email)
-- Replace the password_hash with a real bcrypt hash generated from your app's hashPassword function.
INSERT INTO users (
    id, email, full_name, password_hash, status,
    email_verified_at, created_at, updated_at
)
SELECT gen_random_uuid(), 'admin@autosoko.africa', 'Platform Admin',
       '$2b$10$...REPLACE_WITH_REAL_HASH...', 'active',
       now(), now(), now()
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE email = 'admin@autosoko.africa'
);

-- Link the user to the Super Admin role
INSERT INTO user_roles (user_id, role_id, assigned_by, assigned_at)
SELECT u.id, r.id, NULL, now()
FROM users u
JOIN roles r ON r.name = 'Super Admin' AND r.scope = 'platform'
WHERE u.email = 'admin@autosoko.africa'
AND NOT EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = u.id AND ur.role_id = r.id
);