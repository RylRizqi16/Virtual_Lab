const path = require('path');
const dotenvPath = path.join(__dirname, '..', '.env');
require('dotenv').config({ path: dotenvPath });

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'virtual-lab-secret-change-me';
const SALT_ROUNDS = Number(process.env.SALT_ROUNDS || 10);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || '*';

module.exports = {
    PORT,
    JWT_SECRET,
    SALT_ROUNDS,
    CLIENT_ORIGIN,
};
