"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const prisma_1 = __importDefault(require("./lib/prisma"));
dotenv_1.default.config();
exports.app = (0, express_1.default)();
exports.app.use((0, cors_1.default)());
exports.app.use(express_1.default.json());
// Health check endpoint
exports.app.get('/api/health', (_req, res) => {
    res.status(200).json({
        status: 'ok',
        service: 'TokTickIT API',
    });
});
// Categories list endpoint
exports.app.get('/api/categories', async (_req, res) => {
    try {
        const categories = await prisma_1.default.category.findMany({
            select: {
                id: true,
                name: true,
            },
            orderBy: {
                id: 'asc',
            },
        });
        res.status(200).json(categories);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});
// Root API welcome endpoint
exports.app.get('/api', (_req, res) => {
    res.json({
        message: 'Welcome to TokTickIT API',
        version: '0.1.0',
        endpoints: {
            health: '/api/health',
            categories: '/api/categories',
        },
    });
});
exports.default = exports.app;
