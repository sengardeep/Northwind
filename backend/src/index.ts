import express from 'express';
import cors from 'cors';
import { clerkMiddleware } from '@clerk/express';
import { clerkWebhookHandler } from './webhooks/clerk.js';
import 'dotenv/config';
import { getEnv } from './lib/env.js';
import fs from 'node:fs';
import path from 'node:path';
import job from './lib/cron.js';
import meRouter from './routes/meRouter.js';
import productRouter from './routes/productRouter.js';
import streamRouter from './routes/streamRouter.js';
import { polarWebhookHandler } from './webhooks/polar.js';

const env = getEnv();
const app = express();

const rawJson = express.raw({ type: 'application/json', limit: "1mb" });

app.post('/webhooks/clerk', rawJson, (req, res) => {
    void clerkWebhookHandler(req, res);
})
app.post('/webhooks/polar', rawJson, (req, res) => {
    void polarWebhookHandler(req, res);
});

app.use(express.json());
app.use(cors());
app.use(clerkMiddleware());

app.get('/health', (_req, res) => {
    res.json({
        ok: true
    });
})

app.use('/api/me', meRouter);
app.use('/api/products', productRouter);
app.use('/api/stream', streamRouter);


const publicDir = path.join(process.cwd(), 'public');
if (fs.existsSync(publicDir)) {
    app.use(express.static(publicDir));
    app.get('/{*any}', (req, res, next) => {
        if (req.method != 'GET' && req.method != 'HEAD') {
            return next();
        }
        if (req.path.startsWith('/api') || req.path.startsWith('/webhooks')) {
            return next();
        }
        res.sendFile(path.join(publicDir, 'index.html'), err => {
            if (err) {
                next(err);
            }
        });
    })
}

app.listen(env.PORT, () => {
    console.log(`Server is running on port ${env.PORT}`);
    if (env.NODE_ENV === 'production') {
        job.start();
    }
});