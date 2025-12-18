// backend/src/server.ts
import express from 'express';
import feedRoutes from './modules/feed/routes';
import reelsRoutes from './modules/reels/routes';

const app = express();
app.use(express.json());

app.use('/feed', feedRoutes);
app.use('/reels', reelsRoutes);

export default app;
