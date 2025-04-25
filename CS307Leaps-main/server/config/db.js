const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

pool.connect() 
    .then(() => console.log('Connected to the database'))
    .catch(err => console.error('Error connecting to the database', err.stack));

module.exports = {
    query: (text, params) => pool.query(text, params)
}
