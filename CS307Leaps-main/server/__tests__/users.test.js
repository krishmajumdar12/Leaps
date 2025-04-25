const request = require('supertest');
const app = require('../app');
const db = require('../config/db');
const jwt = require('jsonwebtoken');

jest.mock('../config/db');

const mockToken = jwt.sign({ id: 1 }, process.env.JWT_SECRET, { expiresIn: '12h' });

describe('Users API', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('PUT /update/username', () => {
        it('should return 400 if username is missing', async () => {
            const res = await request(app)
                .put('/users/update/username')
                .set('Authorization', `Bearer ${mockToken}`)
                .send({});
            expect(res.status).toBe(400);
            expect(res.body.message).toBe('Username are required');
        });

        it('should return 404 if user is not found', async () => {
            db.query.mockResolvedValueOnce({ rows: [] });
            const res = await request(app)
                .put('/users/update/username')
                .set('Authorization', `Bearer ${mockToken}`)
                .send({ username: 'newUsername' });

            expect(res.status).toBe(404);
            expect(res.body.message).toBe('User not found');
        });

        it('should update username successfully', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ id: 1, username: 'newUsername' }] });

            const res = await request(app)
                .put('/users/update/username')
                .set('Authorization', `Bearer ${mockToken}`)
                .send({ username: 'newUsername' });

            expect(res.status).toBe(200);
            expect(res.body.username).toBe('newUsername');
        });
    });

    describe('PUT /update/email', () => {
        it('should return 400 if email is invalid', async () => {
            const res = await request(app)
                .put('/users/update/email')
                .set('Authorization', `Bearer ${mockToken}`)
                .send({ email: 'invalid-email' });

            expect(res.status).toBe(400);
            expect(res.body.message).toBe('Invalid email format');
        });

        it('should update email successfully', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ id: 1, email: 'newemail@example.com' }] });

            const res = await request(app)
                .put('/users/update/email')
                .set('Authorization', `Bearer ${mockToken}`)
                .send({ email: 'newemail@example.com' });

            expect(res.status).toBe(200);
            expect(res.body.email).toBe('newemail@example.com');
        });
    });

    describe('DELETE /delete', () => {
        it('should return 404 if user is not found', async () => {
            db.query.mockResolvedValueOnce({ rows: [] });
            const res = await request(app)
                .delete('/users/delete')
                .set('Authorization', `Bearer ${mockToken}`);

            expect(res.status).toBe(404);
            expect(res.body.message).toBe('User not found');
        });

        it('should delete user successfully', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });

            const res = await request(app)
                .delete('/users/delete')
                .set('Authorization', `Bearer ${mockToken}`);

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('User deleted successfully');
        });
    });
});
