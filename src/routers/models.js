const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('crypto');

module.exports = (pool, jwt, authMiddleware) => {
    // Get all active models with pricing
    router.get('/', async (req, res) => {
        try {
            const result = await pool.query(`
                SELECT id, name, provider, base_price_per_1k, context_window, 
                       max_output, created_at,
                       (SELECT COUNT(*) FROM model_versions WHERE model_id = models.id AND is_active = true) as versions
                FROM models WHERE is_active = true
                ORDER BY provider, name
            `);
            res.json({ models: result.rows });
        } catch (err) {
            res.status(500).json({ error: 'Failed to fetch models' });
        }
    });

    // Get specific model details
    router.get('/:id', async (req, res) => {
        const { id } = req.params;
        try {
            const result = await pool.query(`
                SELECT m.*, mv.version as latest_version
                FROM models m
                LEFT JOIN model_versions mv ON mv.model_id = m.id AND mv.is_active = true
                WHERE m.id = $1 AND m.is_active = true
            `, [id]);
            
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Model not found' });
            }
            res.json({ model: result.rows[0] });
        } catch (err) {
            res.status(500).json({ error: 'Failed to fetch model' });
        }
    });

    // Register new model (auth required)
    router.post('/', authMiddleware, async (req, res) => {
        const { name, provider, apiEndpoint, apiKey, basePricePer1k, contextWindow, maxOutput } = req.body;
        
        if (!name || !provider || !apiEndpoint || !apiKey) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        try {
            // Encrypt API key using simple AES
            const crypto = require('crypto');
            const key = crypto.createHash('sha256').update(process.env.ENCRYPTION_KEY || 'default-key').digest();
            const iv = crypto.randomBytes(16);
            const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
            const encrypted = Buffer.concat([cipher.update(apiKey), cipher.final()]);
            
            const result = await pool.query(`
                INSERT INTO models (name, provider, api_endpoint, api_key_encrypted, base_price_per_1k, 
                                   context_window, max_output, created_by)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id, name, provider, base_price_per_1k, context_window, created_at
            `, [name, provider, apiEndpoint, Buffer.concat([iv, encrypted]), basePricePer1k || 0.0001, 
                contextWindow, maxOutput, req.userId]);
            
            res.status(201).json({ model: result.rows[0] });
        } catch (err) {
            res.status(500).json({ error: 'Failed to register model' });
        }
    });

    // Update model pricing (auth required)
    router.put('/:id/pricing', authMiddleware, async (req, res) => {
        const { id } = req.params;
        const { basePricePer1k, maxPricePer1k } = req.body;
        
        try {
            const result = await pool.query(
                'UPDATE models SET base_price_per_1k = $1, max_price_per_1k = $2 WHERE id = $3',
                [basePricePer1k, maxPricePer1k, id]
            );
            
            if (result.rowCount === 0) {
                return res.status(404).json({ error: 'Model not found' });
            }
            
            res.json({ message: 'Pricing updated', model_id: id });
        } catch (err) {
            res.status(500).json({ error: 'Failed to update pricing' });
        }
    });

    // Get model pricing history
    router.get('/:id/pricing/history', authMiddleware, async (req, res) => {
        const { id } = req.params;
        try {
            const result = await pool.query(`
                SELECT mv.version, mv.price_per_1k, mv.created_at
                FROM model_versions mv
                WHERE mv.model_id = $1
                ORDER BY mv.created_at DESC
            `, [id]);
            res.json({ history: result.rows });
        } catch (err) {
            res.status(500).json({ error: 'Failed to fetch pricing history' });
        }
    });

    return router;
};