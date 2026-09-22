require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const jwt = require('jsonwebtoken');
const WebSocket = require('ws');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const axios = require('axios');
const crypto = require('crypto');

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '10mb' }));

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'ai_marketplace',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
});

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token provided' });
    try {
        const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'secret');
        req.userId = decoded.userId;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

// ENCRYPT/DECRYPT HELPERS
function encryptKey(key) {
    const iv = crypto.randomBytes(16);
    const encKey = crypto.createHash('sha256').update(process.env.ENCRYPTION_KEY || 'default-key-32-bytes-long!!').digest();
    const cipher = crypto.createCipheriv('aes-256-cbc', encKey, iv);
    const encrypted = Buffer.concat([cipher.update(key), cipher.final()]);
    return Buffer.concat([iv, encrypted]);
}

function decryptKey(encrypted) {
    const data = Buffer.from(encrypted);
    const iv = data.slice(0, 16);
    const text = data.slice(16);
    const key = crypto.createHash('sha256').update(process.env.ENCRYPTION_KEY || 'default-key-32-bytes-long!!').digest();
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    return Buffer.concat([decipher.update(text), decipher.final()]).toString();
}

// HEALTH CHECK
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// USER REGISTRATION
app.post('/api/auth/register', async (req, res) => {
    const { email, password, name, walletAddress } = req.body;
    try {
        const hashed = await bcrypt.hash(password, 10);
        const result = await pool.query(
            'INSERT INTO users (email, password_hash, name, wallet_address) VALUES ($1, $2, $3, $4) RETURNING id, email, name, wallet_address',
            [email, hashed, name, walletAddress]
        );
        const token = jwt.sign({ userId: result.rows[0].id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({ token, user: result.rows[0] });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// USER LOGIN
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (!result.rows.length || !(await bcrypt.compare(password, result.rows[0].password_hash))) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ userId: result.rows[0].id }, process.env.JWT_SECRET);
    res.json({ token, user: result.rows[0] });
});

// GET CREDITS & BALANCE
app.get('/api/balance', authMiddleware, async (req, res) => {
    const { rows } = await pool.query('SELECT credits, balance FROM users WHERE id = $1', [req.userId]);
    res.json({ 
        credits: parseFloat(rows[0]?.credits) || 0,
        balance: parseFloat(rows[0]?.balance) || 0 
    });
});

// DEPOSIT - Add to platform balance (for testing/buying)
app.post('/api/deposit', authMiddleware, async (req, res) => {
    const { amount } = req.body;
    await pool.query('UPDATE users SET balance = balance + $1 WHERE id = $2', [amount, req.userId]);
    res.json({ success: true });
});

// LIST YOUR API KEYS (with model info)
app.get('/api/key', authMiddleware, async (req, res) => {
    const result = await pool.query(
        'SELECT id, provider, model_name, price_per_1k, max_tokens, remaining_tokens, status FROM api_keys WHERE seller_id = $1 ORDER BY created_at DESC',
        [req.userId]
    );
    res.json({ keys: result.rows });
});

// MODEL PRICING CONSTRAINTS - Set seller's price bounds per model
app.post('/api/models/pricing', async (req, res) => {
    const { provider, modelName, maxPricePer1k, minPricePer1k } = req.body;
    if (!provider || !modelName) {
        return res.status(400).json({ error: 'provider and modelName required' });
    }
    const result = await pool.query(`
        INSERT INTO model_pricing (provider, model_name, max_price_per_1k, min_price_per_1k)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (provider, model_name) 
        DO UPDATE SET max_price_per_1k = $3, min_price_per_1k = $4
        RETURNING *
    `, [provider, modelName, maxPricePer1k, minPricePer1k]);
    res.json({ pricing: result.rows[0] });
});

app.get('/api/models/pricing', async (req, res) => {
    const { rows } = await pool.query('SELECT * FROM model_pricing ORDER BY provider, model_name');
    res.json({ pricing: rows });
});

// LIST AVAILABLE MARKETPLACE KEYS (filter by provider/model)
app.get('/api/keys', async (req, res) => {
    const { provider, modelName } = req.query;
    let query = `
        SELECT ak.id, ak.provider, ak.model_name, ak.price_per_1k, ak.max_tokens, ak.remaining_tokens, 
               mp.max_price_per_1k, mp.min_price_per_1k, u.name as seller_name
        FROM api_keys ak 
        JOIN users u ON ak.seller_id = u.id
        LEFT JOIN model_pricing mp ON ak.provider = mp.provider AND ak.model_name = mp.model_name
        WHERE ak.status = 'active' AND ak.remaining_tokens > 0
    `;
    const params = [];
    if (provider) {
        params.push(provider);
        query += ` AND ak.provider = $${params.length}`;
    }
    if (modelName) {
        params.push(modelName);
        query += ` AND ak.model_name = $${params.length}`;
    }
    query += ' ORDER BY ak.price_per_1k ASC';
    
    const { rows } = await pool.query(query, params);
    res.json({ keys: rows });
});

// ADD KEY TO MARKETPLACE (Seller lists key with model selection)
app.post('/api/keys', authMiddleware, async (req, res) => {
    const { provider, modelName, apiKey, pricePer1k, maxTokens, apiEndpoint, minPricePer1k, maxPricePer1k } = req.body;
    
    if (!provider || !modelName) {
        return res.status(400).json({ error: 'provider and modelName required' });
    }
    
    const encrypted = encryptKey(apiKey);
    const result = await pool.query(`
        INSERT INTO api_keys (seller_id, provider, model_name, api_key_encrypted, api_endpoint, 
                                price_per_1k, max_tokens, remaining_tokens, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $7, 'active') RETURNING id
    `, [req.userId, provider, modelName, encrypted, apiEndpoint, pricePer1k, maxTokens]);
    
    res.status(201).json({ keyId: result.rows[0].id, provider, modelName });
});

// BUY TOKENS - Buyer spends balance, gets escrow tokens
app.post('/api/keys/:id/buy', authMiddleware, async (req, res) => {
    const { id } = req.params;
    
    const { rows: keys } = await pool.query('SELECT * FROM api_keys WHERE id = $1 FOR UPDATE', [id]);
    if (!keys.length) return res.status(404).json({ error: 'Key not found' });
    
    const key = keys[0];
    const tokenCost = (key.max_tokens / 1000) * key.price_per_1k;
    const creditEarning = (key.max_tokens / 1000) * key.price_per_1k;
    
    const { rows: users } = await pool.query('SELECT balance FROM users WHERE id = $1', [req.userId]);
    if ((parseFloat(users[0]?.balance) || 0) < tokenCost) {
        return res.status(402).json({ error: 'Insufficient balance' });
    }
    
    // Deduct from buyer's balance
    await pool.query('UPDATE users SET balance = balance - $1 WHERE id = $2', [tokenCost, req.userId]);
    
    // Add to escrow (buyer can now use tokens)
    // Give credits to seller
    await pool.query('UPDATE users SET credits = credits + $1 WHERE id = $2', [creditEarning, key.seller_id]);
    
    const result = await pool.query(`
        INSERT INTO token_purchases (buyer_id, key_id, tokens_purchased, tokens_remaining, price_paid, credits_earned, status)
        VALUES ($1, $2, $3, $3, $4, $5, 'active') RETURNING id
    `, [req.userId, id, key.max_tokens, tokenCost, creditEarning]);
    
    res.json({ purchaseId: result.rows[0].id, tokensRemaining: key.max_tokens });
});

// EXECUTE - Use escrow tokens, credits auto-flow to seller
app.post('/api/execute', authMiddleware, async (req, res) => {
    const { purchaseId, messages, maxTokens } = req.body;
    
    const { rows } = await pool.query(`
        SELECT tp.*, ak.api_key_encrypted, ak.provider, ak.model_name, ak.api_endpoint, ak.seller_id, ak.price_per_1k
        FROM token_purchases tp
        JOIN api_keys ak ON tp.key_id = ak.id
        WHERE tp.buyer_id = $1 AND tp.id = $2 AND tp.tokens_remaining > 0
        FOR UPDATE
    `, [req.userId, purchaseId]);
    
    if (!rows.length) return res.status(400).json({ error: 'No tokens available' });
    
    const purchase = rows[0];
    const usedTokens = Math.min(maxTokens || 1000, purchase.tokens_remaining);
    const creditEarning = (usedTokens / 1000) * parseFloat(purchase.credits_earned) / (purchase.tokens_purchased || 1);
    
    try {
        const apiKey = decryptKey(purchase.api_key_encrypted);
        
        const response = await axios.post(purchase.api_endpoint, {
            model: purchase.model_name,
            messages,
            max_tokens: usedTokens
        }, { headers: { Authorization: "Bearer " + apiKey } });
        
        await pool.query('UPDATE token_purchases SET tokens_remaining = tokens_remaining - $1 WHERE id = $2', [usedTokens, purchaseId]);
        
        await pool.query(`
            INSERT INTO usage (buyer_id, purchase_id, provider, model_name, input_tokens, output_tokens, total_tokens, buyer_cost, seller_credit)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
            req.userId, purchaseId, purchase.provider, purchase.model_name,
            Math.ceil(usedTokens * 0.3), Math.ceil(usedTokens * 0.7), usedTokens,
            (usedTokens / 1000) * parseFloat(purchase.price_per_1k), creditEarning
        ]);
        
        res.json({ 
            response: response.data, 
            tokensUsed: usedTokens, 
            tokensRemaining: purchase.tokens_remaining - usedTokens,
            creditEarning
        });
    } catch (err) {
        res.status(502).json({ error: 'Provider error', message: err.message });
    }
});

// USER'S HISTORY
app.get('/api/history', authMiddleware, async (req, res) => {
    const { rows } = await pool.query(`
        SELECT u.*, ep.provider, ep.tokens_remaining, ep.created_at as purchase_date
        FROM token_purchases ep
        WHERE ep.buyer_id = $1 OR ep.seller_id = $1
        ORDER BY ep.created_at DESC
    `, [req.userId]);
    res.json({ purchases: rows });
});

const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/ws' });

wss.on('connection', (ws, req) => {
    const token = req.headers['sec-websocket-protocol'];
    if (!token) return ws.close(4001, 'Auth required');
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        ws.userId = decoded.userId;
    } catch (e) {
        ws.close(4002, 'Invalid token');
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("P2P AI Marketplace on port " + PORT));

module.exports = { app, pool };