-- Active: 1766707967824@@127.0.0.1@5432@fitbuddy
-- =========================
-- USERS
-- =========================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    email TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (
        status IN (
            'active',
            'suspended',
            'deleted'
        )
    ),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX users_status_idx ON users (status);

-- =========================
-- USER SETTINGS
-- =========================
CREATE TABLE user_settings (
    user_id UUID PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    default_visibility TEXT NOT NULL DEFAULT 'public' CHECK (
        default_visibility IN ('public', 'private')
    ),
    share_approx_location BOOLEAN NOT NULL DEFAULT TRUE,
    invite_permissions TEXT NOT NULL DEFAULT 'anyone' CHECK (
        invite_permissions IN ('anyone', 'friends', 'none')
    ),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================
-- RUN SESSIONS
-- =========================
CREATE TABLE run_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    owner_user_id UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    type TEXT NOT NULL CHECK (type IN ('public', 'private')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at TIMESTAMPTZ,
    ended_reason TEXT CHECK (
        ended_reason IN (
            'completed',
            'cancelled',
            'timeout',
            'replaced',
            'disconnect'
        )
    )
);

CREATE INDEX run_sessions_owner_idx ON run_sessions (owner_user_id);

CREATE INDEX run_sessions_active_idx ON run_sessions (owner_user_id)
WHERE
    ended_at IS NULL;

CREATE INDEX run_sessions_started_at_idx ON run_sessions (started_at DESC);

-- =========================
-- SESSION PARTICIPANTS
-- =========================
CREATE TABLE session_participants (
    session_id UUID NOT NULL REFERENCES run_sessions (id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    ROLE TEXT NOT NULL CHECK (ROLE IN ('owner', 'invited')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    left_at TIMESTAMPTZ,
    PRIMARY KEY (session_id, user_id)
);

CREATE INDEX session_participants_user_idx ON session_participants (user_id);

CREATE INDEX session_participants_active_idx ON session_participants (session_id)
WHERE
    left_at IS NULL;

-- =========================
-- INVITES (PHASE 7 SAFE)
-- =========================

CREATE TABLE invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    from_user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    to_user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES run_sessions (id) ON DELETE CASCADE,
    session_type TEXT NOT NULL CHECK (
        session_type IN ('public', 'private')
    ),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    accepted_at TIMESTAMPTZ,
    declined_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    CHECK (
        (accepted_at IS NOT NULL)::int + (declined_at IS NOT NULL)::int + (revoked_at IS NOT NULL)::int <= 1
    )
);

CREATE INDEX invites_to_user_idx ON invites (to_user_id, created_at DESC);

CREATE INDEX invites_from_user_idx ON invites (from_user_id);

CREATE INDEX invites_pending_idx ON invites (to_user_id)
WHERE
    accepted_at IS NULL
    AND declined_at IS NULL
    AND revoked_at IS NULL;

-- =========================
-- SESSION MESSAGES
-- =========================
CREATE TABLE session_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    session_id UUID NOT NULL REFERENCES run_sessions (id) ON DELETE CASCADE,
    from_user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    CONTENT TEXT NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX session_messages_session_idx ON session_messages (session_id, sent_at);

-- =========================
-- FRIEND REQUESTS
-- =========================

-- Prevent impossible states
-- Prevent sending request to self
CREATE TABLE friend_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    from_user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    to_user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    accepted_at TIMESTAMPTZ,
    declined_at TIMESTAMPTZ,
    CHECK (
        (accepted_at IS NOT NULL)::int + (declined_at IS NOT NULL)::int <= 1
    ),
    CHECK (from_user_id <> to_user_id)
);

-- One pending request max per direction
CREATE UNIQUE INDEX friend_requests_pending_unique ON friend_requests (from_user_id, to_user_id)
WHERE
    accepted_at IS NULL
    AND declined_at IS NULL;

-- Query paths
CREATE INDEX friend_requests_to_user_idx ON friend_requests (to_user_id, created_at DESC);

CREATE INDEX friend_requests_from_user_idx ON friend_requests (from_user_id, created_at DESC);