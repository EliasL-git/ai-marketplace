const request = require('supertest');
const { app, pool } = require('../src/index');
const jwt = require('jsonwebtoken');

describe('AI Marketplace API', () => {
    let token;
    let testUserId;

    beforeAll(async () => {
        // Clean test database
        await pool.query('DELETE FROM ledger');
        await pool.query('DELETE FROM usage');
        await pool.query('DELETE FROM models');
        await pool.query('DELETE FROM users');
    });

    afterAll(async () => {
        await pool.end();
    });

    describe('Authentication', () => {
        it('should register a new user', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    email: 'test@example.com',
                    password: 'password123',
                    name: 'Test User'
                });
            
            expect(res.status).toBe(201);
            expect(res.body.token).toBeDefined();
            expect(res.body.user.email).toBe('test@example.com');
        });

        it('should login with valid credentials', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'test@example.com',
                    password: 'password123'
                });
            
            expect(res.status).toBe(200);
            expect(res.body.token).toBeDefined();
        });

        it('should reject invalid credentials', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'test@example.com',
                    password: 'wrongpassword'
                });
            
            expect(res.status).toBe(401);
        });
    });

    describe('Health Check', () => {
        it('should return ok status', async () => {
            const res = await request(app).get('/health');
            expect(res.status).toBe(200);
            expect(res.body.status).toBe('ok');
        });
    });
});