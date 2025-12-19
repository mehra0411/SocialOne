// backend/src/server.ts
import express from 'express';
import adminRoutes from './modules/admin/routes';
import feedRoutes from './modules/feed/routes';
import instagramRoutes from './modules/instagram/routes';
import reelsRoutes from './modules/reels/routes';

const app = express();
app.use(express.json());

app.use('/api/admin', adminRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/instagram', instagramRoutes);
app.use('/api/reels', reelsRoutes);

export default app;
