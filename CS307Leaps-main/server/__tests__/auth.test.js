const request = require('supertest');
const app = require('../index'); // Import your Express app
const db = require('../config/db'); // Import your database connection
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Mock the database and other external dependencies
jest.mock('../config/db');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('../middleware/auth', () => (req, res, next) => {
  req.user = { id: 1 };  // Mock authenticated user for tests
  next();
});

describe('Auth API', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('POST /api/auth/register', async () => {
        it('should return 400 if any field is missing', async () => {

            const response = await request(app)
            .post('/api/auth/register')
            .send({
                username: '',
                email: 'test@example.com',
                password: 'password123'
            });

            expect(res.status).toBe(400);
            expect(res.body.message).toBe('All fields are required');
        });


        it('should return 400 if email is invalid', async () => {
            const res = await request(app).post('/auth/register').send({
                username: 'testuser',
                email: 'invalid-email',
                password: 'password123'
            });
            expect(res.status).toBe(400);
            expect(res.body.message).toBe('Invalid email format');
        });

        it('should return 400 if password is too short', async () => {
            const res = await request(app).post('/auth/register').send({
                username: 'testuser',
                email: 'test@example.com',
                password: 'short'
            });
            expect(res.status).toBe(400);
            expect(res.body.message).toBe('Password must be at least 8 characters long');
        });

        it('should return 400 if user already exists', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
            const res = await request(app).post('/auth/register').send({
                username: 'testuser',
                email: 'test@example.com',
                password: 'password123'
            });
            expect(res.status).toBe(400);
            expect(res.body.message).toBe('User already exists');
        });

        it('should register a user and return token', async () => {
            db.query.mockResolvedValueOnce({ rows: [] }); // User does not exist
            db.query.mockResolvedValueOnce({ rows: [{ id: 1, username: 'testuser', email: 'test@example.com' }] });

            const res = await request(app).post('/auth/register').send({
                username: 'testuser',
                email: 'test@example.com',
                password: 'password123'
            });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('token');
            expect(res.body.user.username).toBe('testuser');
        });
    });

    test('POST /api/auth/login', async () => {
        it('should return 400 if email or password is missing', async () => {
            const res = await request(app).post('/auth/login').send({
                email: ' ',
                password: 'password123'
            });
        });

        it('should return 400 if password is incorrect', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ password_hash: 'hashedpassword' }] });
            bcrypt.compare = jest.fn().mockResolvedValue(false);
                
            const res = await request(app).post('/auth/login').send({
                email: 'test@example.com',
                password: 'wrongpassword'
            });
            expect(res.status).toBe(400);
            expect(res.body.message).toBe('Invalid credentials');
        });

        it('should return a token on successful login', async () => {
            const hashedPassword = await bcrypt.hash('password123', 10);
            db.query.mockResolvedValueOnce({ rows: [{ id: 1, username: 'testuser', email: 'test@example.com', password_hash: hashedPassword }] });
            bcrypt.compare = jest.fn().mockResolvedValue(true);
    
            const res = await request(app).post('/auth/login').send({
                email: 'test@example.com',
                password: 'password123'
            });
    
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('token');
        
        });
    });
});