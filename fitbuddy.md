classDiagram
direction BT
class invites {
   uuid from_user_id
   uuid to_user_id
   text session_type
   timestamp with time zone created_at
   timestamp with time zone accepted_at
   timestamp with time zone declined_at
   uuid id
}
class run_sessions {
   uuid owner_user_id
   text type
   timestamp with time zone started_at
   timestamp with time zone ended_at
   text ended_reason
   uuid id
}
class session_messages {
   uuid session_id
   uuid from_user_id
   text content
   timestamp with time zone sent_at
   uuid id
}
class session_participants {
   text role
   timestamp with time zone joined_at
   timestamp with time zone left_at
   uuid session_id
   uuid user_id
}
class user_settings {
   text default_visibility
   boolean share_approx_location
   text invite_permissions
   timestamp with time zone updated_at
   uuid user_id
}
class users {
   text email
   text display_name
   text avatar_url
   text status
   timestamp with time zone created_at
   uuid id
}

invites  -->  users : from_user_id:id
invites  -->  users : to_user_id:id
run_sessions  -->  users : owner_user_id:id
session_messages  -->  run_sessions : session_id:id
session_messages  -->  users : from_user_id:id
session_participants  -->  run_sessions : session_id:id
session_participants  -->  users : user_id:id
user_settings  -->  users : user_id:id
