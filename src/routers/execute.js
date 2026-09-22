const express = require('express');
const axios = require('axios');
const router = express.Router();

module.exports = (pool, jwt, authMiddleware) => {
    // Dynamic model routing and execution
    router.post('/', authMiddleware, async (req, res) => {
        const { model, messages, maxTokens, temperature } = req.body;
        
        if (!model || !messages) {
            return res.status(400).json({ error: 'Missing model or messages' });
        }

        try {
            await pool.query('BEGIN');
            
            // Get user balance
            const userResult = await pool.query(
                'SELECT id, balance FROM users WHERE id = $1',
                [req.userId]
            );
            
            if (!userResult.rows[0]) {
                await pool.query('ROLLBACK');
                return res.status(401).json({ error: 'User not found' });
            }
            
            const userId = req.userId;
            let userBalance = parseFloat(userResult.rows[0].balance) || 0;
            
            // Find the best model/route
            const modelResult = await pool.query(`
                SELECT m.*, mv.price_per_1k as version_price
                FROM models m
                LEFT JOIN model_versions mv ON mv.model_id = m.id AND mv.is_active = true
                WHERE m.name = $1 AND m.is_active = true
                ORDER BY m.base_price_per_1k ASC
                LIMIT 1
            `, [model]);
            
            if (modelResult.rows.length === 0) {
                await pool.query('ROLLBACK');
                return res.status(404).json({ error: 'Model not found or inactive' });
            }
            
            const modelInfo = modelResult.rows[0];
            const pricePer1k = parseFloat(modelInfo.version_price) || parseFloat(modelInfo.base_price_per_1k);
            
            // Calculate expected cost
            const promptText = JSON.stringify(messages);
            const inputTokens = Math.ceil(promptText.length / 4); // Rough estimate
            const outputTokens = maxTokens || 1000;
            const totalTokens = inputTokens + outputTokens;
            const estimatedCost = (totalTokens / 1000) * pricePer1k;
            
            // Check balance
            if (userBalance < estimatedCost) {
                await pool.query('ROLLBACK');
                return res.status(402).json({ 
                    error: 'Insufficient balance',
                    required: estimatedCost,
                    balance: userBalance 
                });
            }
            
            // Create usage record
            const usageResult = await pool.query(`
                INSERT INTO usage (user_id, model_id, provider, input_tokens, output_tokens, 
                                   total_tokens, total_cost, status, request_metadata)
                VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8)
                RETURNING id
            `, [userId, modelInfo.id, modelInfo.provider, inputTokens, outputTokens,
        totalTokens, estimatedCost, { model, temperature }]);
            
            const usageId = usageResult.rows[0].id;
            
            // Execute through provider
            const startTime = Date.now();
            let actualCost = estimatedCost;
            let responseStatus = 'completed';
            
            try {
                // Get encrypted API key
                // For demo, we use placeholder - in production decrypt it
                const apiKey = await getApiKey(pool, modelInfo.id);
                
                const response = await axios({
                    method: 'POST',
                    url: modelInfo.api_endpoint,
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    data: {
                        model: model,
                        messages,
                        max_tokens: maxTokens,
                        temperature: temperature || 0.7
                    },
                    timeout: 120000
                });
                
                const actualOutputTokens = response.data?.usage?.total_tokens || outputTokens;
                actualCost = (actualOutputTokens / 1000) * pricePer1k;
                
                // Deduct from balance
                userBalance -= actualCost;
                
                // Update usage
                await pool.query(`
                    UPDATE usage SET 
                        output_tokens = $1, total_tokens = $2, total_cost = $3,
                        completed_at = NOW(), status = 'completed'
                    WHERE id = $4
                `, [actualOutputTokens, Math.ceil(actualOutputTokens * 1.3), actualCost, usageId]);
                
                // Update user balance
                await pool.query(
                    'UPDATE users SET balance = $1 WHERE id = $2',
                    [userBalance, userId]
                );
                
                await pool.query('COMMIT');
                
                // Add ledger entry
                await pool.query(`
                    INSERT INTO ledger (user_id, type, amount, balance_after, description, reference_id)
                    VALUES ($1, 'debit', $2, $3, 'API usage: ' || $4, $5)
                `, [userId, actualCost, userBalance, model, usageId]);
                
                res.json({
                    usage_id: usageId,
                    response: response.data,
                    cost: actualCost,
                    balance: userBalance,
                    tokens: {
                        input: inputTokens,
                        output: actualOutputTokens,
                        total: Math.ceil(actualOutputTokens * 1.3)
                    }
                });
                
            } catch (apiErr) {
                responseStatus = 'failed';
                
                // Update usage as failed
                await pool.query(`
                    UPDATE usage SET status = 'failed', completed_at = NOW()
                    WHERE id = $1
                `, [usageId]);
                
                await pool.query('ROLLBACK');
                
                res.status(502).json({
                    error: 'Provider API error',
                    message: apiErr.response?.data?.error || apiErr.message,
                    usage_id: usageId
                });
            }
            
        } catch (err) {
            await pool.query('ROLLBACK');
            console.error('Execution error:', err);
            res.status(500).json({ error: 'Execution failed' });
        }
    });

    // Get available providers
    router.get('/providers', async (req, res) => {
        try {
            const result = await pool.query(
                "SELECT DISTINCT provider FROM models WHERE is_active = true"
            );
            res.json({ providers: result.rows.map(r => r.provider) });
        } catch (err) {
            res.status(500).json({ error: 'Failed to fetch providers' });
        }
    });

    return router;
};

async function getApiKey(pool, modelId) {
    const providerMap = {
        'deepseek': process.env.DEEPSEEK_API_KEY,
        'openai': process.env.OPENAI_API_KEY,
        'anthropic': process.env.ANTHROPIC_API_KEY,
        'claude': process.env.ANTHROPIC_API_KEY,
        'google': process.env.GEMINI_API_KEY,
        'gemini': process.env.GEMINI_API_KEY,
    };
    
    const result = await pool.query(
        'SELECT provider FROM models WHERE id = $1',
        [modelId]
    );
    const provider = result.rows[0]?.provider?.toLowerCase();
    
    const apiKey = providerMap[provider] || process.env.DEFAULT_API_KEY;
    return apiKey || 'no-api-key-configured';
}