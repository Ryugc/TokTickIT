"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Health check endpoint
app.get('/api/health', (_req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: 'postgresql (prisma)',
        environment: process.env.NODE_ENV || 'development',
    });
});
// Root API welcome endpoint
app.get('/api', (_req, res) => {
    res.json({
        message: 'Welcome to TokTickIT API',
        version: '0.1.0',
        endpoints: {
            health: '/api/health',
        },
    });
});
app.listen(PORT, () => {
    console.log(`[TokTickIT Server] Running on http://localhost:${PORT}`);
});
