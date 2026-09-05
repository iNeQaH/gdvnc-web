import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json({ limit: '10mb' }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

import apiRouter from './routes';
app.use('/api', apiRouter);

export default app;