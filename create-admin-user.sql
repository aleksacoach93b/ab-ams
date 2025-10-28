-- Create Admin User
-- Run this AFTER the database-setup.sql script

-- Insert admin user
INSERT INTO "users" (
    "id",
    "email", 
    "password",
    "role",
    "firstName",
    "lastName",
    "isActive",
    "emailVerified",
    "createdAt",
    "updatedAt"
) VALUES (
    'admin_user_001',
    'aleksacoach@gmail.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBdXm8hQ0.5.5C', -- This is the hashed password for 'Teodor06022025'
    'ADMIN',
    'Aleksa',
    'Boskovic',
    true,
    true,
    NOW(),
    NOW()
);

-- Insert admin coach record
INSERT INTO "coaches" (
    "id",
    "userId",
    "firstName",
    "lastName",
    "email",
    "coachType",
    "specialization",
    "experience",
    "isActive",
    "createdAt",
    "updatedAt"
) VALUES (
    'admin_coach_001',
    'admin_user_001',
    'Aleksa',
    'Boskovic',
    'aleksacoach@gmail.com',
    'Head Coach',
    'Strength & Conditioning',
    10,
    true,
    NOW(),
    NOW()
);
