-- Enable the UUID extension (needed if using UUIDs)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


DROP TABLE IF EXISTS users, 
                     friendships, 
                     trips, 
                     trip_members, trip_member_roles, 
                     events, customevents, 
                     travel, friend_requests, 
                     lodging, trip_items, 
                     trip_item_votes, 
                     trip_cancellation_votes, 
                     trip_rsvp_status, 
                     messages, 
                     notifications,
                     notification_preferences,
                     trip_files,
                     CASCADE;
DROP INDEX IF EXISTS idx_events_name, 
                     idx_events_location, 
                     idx_events_type, 
                     idx_travel_departure_location, 
                     idx_travel_arrival_location, 
                     idx_lodging_name, 
                     idx_lodging_location, 
                     idx_messages_trip_id,
                     idx_messages_sender_id;


-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,                    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reset_token VARCHAR(255),
    reset_token_expiry TIMESTAMP,
    theme_preference VARCHAR(10) DEFAULT 'light',
    profile_pic TEXT
     -- this doesn't work in psql need to create  trigger
     -- updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);


-- friendship Table
CREATE TABLE friendships (
    user1_id UUID REFERENCES users(id) ON DELETE CASCADE,
    user2_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (user1_id < user2_id)
);

-- Friend Requests Table
CREATE TABLE friend_requests (
  id SERIAL PRIMARY KEY,
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(sender_id, receiver_id)
);

-- Trips Table
CREATE TABLE trips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
    destination VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_public BOOLEAN DEFAULT false,
    current BOOLEAN DEFAULT true,
    status VARCHAR(255) DEFAULT 'Upcoming'
    -- this doesn't work in psql need to create  trigger
    -- updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
);

-- trip_members Table
CREATE TABLE trip_members (
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    cost_ratio   NUMERIC(5,4) NOT NULL DEFAULT 1.0
        CHECK (cost_ratio > 0 AND cost_ratio <= 1),    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(trip_id, user_id)
);


-- table for trip member roles
CREATE TABLE trip_member_roles (
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('view', 'edit', 'co-creator')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (trip_id, user_id)
);

-- Events Table 
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    location VARCHAR(255) NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    set_price DOUBLE PRECISION,
    min_price DOUBLE PRECISION,
    max_price DOUBLE PRECISION,
    price DOUBLE PRECISION,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Custom Events Table 
CREATE TABLE customevents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    location VARCHAR(255) NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    price DOUBLE PRECISION,
    description TEXT,
    public BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Travel Table
CREATE TABLE travel (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(255) NOT NULL,
    price DOUBLE PRECISION NOT NULL,
    departure TIMESTAMP NOT NULL,
    departure_location VARCHAR(255) NOT NULL,
    arrival TIMESTAMP NOT NULL,
    arrival_location VARCHAR(255) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    -- this doesn't work in psql need to create  trigger
    -- updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Lodging Table 
CREATE TABLE lodging (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL, 
    location VARCHAR(255) NOT NULL,
    price_per_night DOUBLE PRECISION NOT NULL,
    check_in_date DATE,
    check_out_date DATE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE trip_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
    item_type VARCHAR(50) NOT NULL CHECK (item_type IN ('event', 'events', 'custom-event', 'travel', 'lodging')),
    item_id VARCHAR(255) NOT NULL, 
    min_price DOUBLE PRECISION,
    max_price DOUBLE PRECISION,
    price NUMERIC(10,2),
    flight_offer_json JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(trip_id, item_type, item_id)
);

-- RSVP Feature
CREATE TABLE trip_rsvp_status (
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('attending', 'not_attending', 'maybe', 'no_response')),
    response_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (trip_id, user_id)
);

-- Trip Cancellation Votes Table
CREATE TABLE trip_cancellation_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(trip_id, user_id)
);

CREATE TABLE trip_item_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_item_id UUID REFERENCES trip_items(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    vote BOOLEAN NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(trip_item_id, user_id)
);

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    attachment_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE trip_files (
    id SERIAL PRIMARY KEY,
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    data BYTEA NOT NULL,
    mime_type TEXT,
    uploaded_at TIMESTAMP DEFAULT NOW()
);

/* Notification table */
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
    type TEXT,
    message TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

/* Notification Preferences Table */
CREATE TABLE notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    friend_request BOOLEAN DEFAULT true,
    trip_update BOOLEAN DEFAULT true,
    trip_status BOOLEAN DEFAULT true,
    ratio_changed BOOLEAN default true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE INDEX idx_messages_trip_id ON messages(trip_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);

CREATE INDEX idx_events_name ON events(name);
CREATE INDEX idx_events_location ON events(location);
CREATE INDEX idx_events_type ON events(type);
CREATE INDEX idx_travel_departure_location ON travel(departure_location);
CREATE INDEX idx_travel_arrival_location ON travel(arrival_location);
CREATE INDEX idx_lodging_name ON lodging(name);
CREATE INDEX idx_lodging_location ON lodging(location);