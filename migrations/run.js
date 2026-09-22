const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'postgres',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
});

async function runMigrations() {
    console.log('Running database migrations...');
    
    const client = await pool.connect();
    try {
        // Create extension
        await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
        await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');
        
        // Read and execute schema
        const schemaPath = path.join(__dirname, '01_schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf-8');
        await client.query(schema);
        
        console.log('✓ Database schema created successfully');
        
        // Add table for providers
        await client.query(`
            CREATE TABLE IF NOT EXISTS providers (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) UNIQUE NOT NULL,
                api_endpoint TEXT,
                api_key_iv BYTEA,
                api_key_enc BYTEA,
                rate_limit INTEGER DEFAULT 1000,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `);
        console.log('✓ Providers table ready');
        
        process.exit(0);
    } catch (err) {
        console.error('Migration error:', err);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

runMigrations();