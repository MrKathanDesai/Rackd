import dotenv from 'dotenv';
import path from 'path';

// Load .env from backend/ directory (parent of src/)
dotenv.config({ path: path.resolve(__dirname, '../.env') });
// Also try project root (parent of backend/)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
