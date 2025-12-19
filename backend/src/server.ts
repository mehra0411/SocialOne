import express from 'express';
import type { Request, Response } from 'express';

import adminRoutes from './modules/admin/routes';
import feedRoutes from './modules/feed/routes';
import instagramRoutes from './modules/instagram/routes';
import reelsRoutes from './modules/reels/routes';
import brandsRoutes from './modules/brands/brands.routes';

const app = express();

app.use(express.json());

app.use('/api/admin', adminRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/instagram', instagramRoutes);
app.use('/api/reels', reelsRoutes);
app.use('/api/brands', brandsRoutes);

// Health check
app.get('/health', (_req: Request, res: Response) => {
  return res.json({ status: 'ok' });
});

export default app;
