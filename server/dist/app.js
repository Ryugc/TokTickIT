"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
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
// Root API welcome endpoint
exports.app.get('/api', (_req, res) => {
    res.json({
        message: 'Welcome to TokTickIT API',
        version: '0.1.0',
        endpoints: {
            health: '/api/health',
        },
    });
});
exports.default = exports.app;
