
import express from 'express';
import cors from 'cors';
import rlmRoutes from './routes';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/rlm', rlmRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'FreeRADIUS RLM REST API is running' });
});

app.listen(PORT, () => {
  console.log(`FreeRADIUS RLM REST API server running on port ${PORT}`);
});

