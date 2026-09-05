import 'dotenv/config';
import app from './app';
import { setupJobs } from './jobs/cron';

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`[server]: Server is running at http://localhost:${PORT}`);
  setupJobs();
});