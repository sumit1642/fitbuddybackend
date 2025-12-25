-- Active: 1766560643629@@127.0.0.1@5432@fitbuddy
-- db/seed-dev-user.sql
-- Insert development test user

INSERT INTO
    users (
        id,
        email,
        display_name,
        status
    )
VALUES (
        '00000000-0000-0000-0000-000000000000',
        'dev@local',
        'Dev User',
        'active'
    )
ON CONFLICT (id) DO NOTHING;

-- Also create default settings for this user
INSERT INTO
    user_settings (
        user_id,
        default_visibility,
        share_approx_location,
        invite_permissions
    )
VALUES (
        '00000000-0000-0000-0000-000000000000',
        'public',
        FALSE,
        'anyone'
    )
ON CONFLICT (user_id) DO NOTHING;