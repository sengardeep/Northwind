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
import * as Sentry from '@sentry/node';
import { sentryClerkUserMiddleware } from './middleware/sentryClerkUser.js';
import checkoutRouter from './routes/checkoutRouter.js';
import adminRouter from './routes/adminRouter.js';

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
app.use(sentryClerkUserMiddleware);

app.get('/health', (_req, res) => {
    res.json({
        ok: true
    });
})

app.use('/api/me', meRouter);
app.use('/api/products', productRouter);
app.use('/api/stream', streamRouter);
app.use('/api/checkout',checkoutRouter);
app.use('/api/admin',adminRouter);

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

Sentry.setupExpressErrorHandler(app);
const errorHandler: express.ErrorRequestHandler = (_err, _req, res, _next) => {
    const sentryId = (res as express.Response & { sentry?: string }).sentry;

    res.status(500).json({
        error: 'Internal Server Error',
        ...(sentryId ? { sentryId } : {}),
    });
};
app.use(errorHandler);

app.listen(env.PORT, () => {
    console.log(`Server is running on port ${env.PORT}`);
    if (env.NODE_ENV === 'production') {
        job.start();
    }
});