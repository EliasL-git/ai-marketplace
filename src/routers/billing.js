const express = require('express');
const router = express.Router();

module.exports = (pool, jwt, authMiddleware) => {
    // Get user balance
    router.get('/balance', authMiddleware, async (req, res) => {
        try {
            const result = await pool.query(
                'SELECT balance FROM users WHERE id = $1',
                [req.userId]
            );
            
            const balance = result.rows[0]?.balance || 0;
            
            // Get recent ledger
            const ledgerResult = await pool.query(`
                SELECT type, amount, balance_after, description, created_at
                FROM ledger WHERE user_id = $1
                ORDER BY created_at DESC
                LIMIT 20
            `, [req.userId]);
            
            res.json({ balance: parseFloat(balance), history: ledgerResult.rows });
        } catch (err) {
            res.status(500).json({ error: 'Failed to fetch balance' });
        }
    });

    // Add credit (deposit)
    router.post('/deposit', authMiddleware, async (req, res) => {
        const { amount, description } = req.body;
        
        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Invalid amount' });
        }

        try {
            await pool.query('BEGIN');
            
            // Get current balance
            const balanceResult = await pool.query(
                'SELECT balance FROM users WHERE id = $1',
                [req.userId]
            );
            
            const oldBalance = parseFloat(balanceResult.rows[0]?.balance || 0);
            const newBalance = oldBalance + parseFloat(amount);
            const transactionId = `DEP_${Date.now()}`;
            
            // Update balance
            await pool.query(
                'UPDATE users SET balance = $1 WHERE id = $2',
                [newBalance, req.userId]
            );
            
            // Add ledger entry
            await pool.query(`
                INSERT INTO ledger (user_id, type, amount, balance_after, description, reference_id)
                VALUES ($1, 'credit', $2, $3, $4, $5)
            `, [req.userId, amount, newBalance, description || 'Deposit', transactionId]);
            
            await pool.query('COMMIT');
            
            res.json({ 
                success: true, 
                balance: newBalance,
                transaction: { id: transactionId, amount, type: 'credit' }
            });
        } catch (err) {
            await pool.query('ROLLBACK');
            res.status(500).json({ error: 'Failed to add credit' });
        }
    });

    // Get ledger history
    router.get('/history', authMiddleware, async (req, res) => {
        const { limit = 50, offset = 0 } = req.query;
        
        try {
            const result = await pool.query(`
                SELECT type, amount, balance_after, description, reference_id, created_at
                FROM ledger WHERE user_id = $1
                ORDER BY created_at DESC
                LIMIT $2 OFFSET $3
            `, [req.userId, parseInt(limit), parseInt(offset)]);
            
            res.json({ history: result.rows });
        } catch (err) {
            res.status(500).json({ error: 'Failed to fetch history' });
        }
    });

    // Get usage stats
    router.get('/usage', authMiddleware, async (req, res) => {
        const { days = 30 } = req.query;
        const since = new Date();
        since.setDate(since.getDate() - parseInt(days));
        
        try {
            const result = await pool.query(`
                SELECT 
                    SUM(total_tokens) as total_tokens,
                    SUM(total_cost) as total_cost,
                    COUNT(*) as total_requests,
                    ARRAY_AGG(DISTINCT provider) as providers_used
                FROM usage
                WHERE user_id = $1 AND created_at >= $2
            `, [req.userId, since]);
            
            const stats = result.rows[0] || {};
            res.json({
                period: `${days} days`,
                total_tokens: parseInt(stats.total_tokens) || 0,
                total_cost: parseFloat(stats.total_cost) || 0,
                total_requests: parseInt(stats.total_requests) || 0,
                providers: stats.providers_used || []
            });
        } catch (err) {
            res.status(500).json({ error: 'Failed to fetch usage' });
        }
    });

    return router;
};