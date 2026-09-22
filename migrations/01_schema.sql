-- P2P AI Token Marketplace Schema
-- Enhanced with Model Selection and Price Bounds

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users: Can earn credits from listing keys
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    wallet_address VARCHAR(255),
    credits DECIMAL(15,6) DEFAULT 0.000000,
    balance DECIMAL(15,6) DEFAULT 0.000000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Model price constraints
CREATE TABLE IF NOT EXISTS model_pricing (
    id SERIAL PRIMARY KEY,
    provider VARCHAR(100) NOT NULL,
    model_name VARCHAR(255) NOT NULL,
    max_price_per_1k DECIMAL(10,6) NOT NULL,  -- Seller's max they'll pay
    min_price_per_1k DECIMAL(10,6) NOT NULL,  -- Seller's minimum
    UNIQUE(provider, model_name)
);

-- API Keys listed by users for sale
-- Now supports multiple allowed models with independent pricing
CREATE TABLE IF NOT EXISTS api_keys (
    id SERIAL PRIMARY KEY,
    seller_id UUID REFERENCES users(id),
    provider VARCHAR(100) NOT NULL,
    model_name VARCHAR(255) NOT NULL,  -- e.g., "deepseek-chat", "gpt-4"
    api_key_encrypted BYTEA NOT NULL,
    api_endpoint TEXT,
    price_per_1k DECIMAL(10,6) NOT NULL,  -- Fixed price for this model
    max_tokens INTEGER NOT NULL,
    remaining_tokens INTEGER NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Token purchases (buyer deposits, gets escrow tokens)
CREATE TABLE IF NOT EXISTS token_purchases (
    id SERIAL PRIMARY KEY,
    buyer_id UUID REFERENCES users(id),
    key_id INTEGER REFERENCES api_keys(id),
    tokens_purchased INTEGER NOT NULL,
    tokens_remaining INTEGER NOT NULL,
    price_paid DECIMAL(15,6) NOT NULL,
    credits_earned DECIMAL(15,6) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Usage that credits sellers
CREATE TABLE IF NOT EXISTS usage (
    id SERIAL PRIMARY KEY,
    buyer_id UUID REFERENCES users(id),
    purchase_id INTEGER REFERENCES token_purchases(id),
    provider VARCHAR(100),
    model_name VARCHAR(255),
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    buyer_cost DECIMAL(15,6) DEFAULT 0,
    seller_credit DECIMAL(15,6) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seller withdrawals
CREATE TABLE IF NOT EXISTS withdrawals (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    amount DECIMAL(15,6) NOT NULL,
    wallet_address VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_keys_seller ON api_keys(seller_id);
CREATE INDEX IF NOT EXISTS idx_keys_model ON api_keys(provider, model_name);
CREATE INDEX IF NOT EXISTS idx_purchases_buyer ON token_purchases(buyer_id);
CREATE INDEX IF NOT EXISTS idx_usage_buyer ON usage(buyer_id);