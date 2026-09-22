module.exports = (pool, authMiddleware) => {
    const express = require('express');
    const router = express.Router();

    // Get all available providers
    router.get('/', async (req, res) => {
        try {
            const result = await pool.query(`
                SELECT DISTINCT provider, 
                       COUNT(*) as model_count,
                       AVG(base_price_per_1k) as avg_price_per_1k
                FROM models 
                WHERE is_active = true
                GROUP BY provider
                ORDER BY provider
            `);
            res.json({ providers: result.rows });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Failed to fetch providers' });
        }
    });

    // Get models by provider
    router.get('/:provider', async (req, res) => {
        const { provider } = req.params;
        try {
            const result = await pool.query(`
                SELECT id, name, base_price_per_1k, context_window, max_output, created_at
                FROM models 
                WHERE provider = $1 AND is_active = true
                ORDER BY base_price_per_1k ASC
            `, [provider]);
            res.json({ provider, models: result.rows });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Failed to fetch provider models' });
        }
    });

    return router;
};