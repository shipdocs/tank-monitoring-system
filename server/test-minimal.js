import express from 'express';
import { apiLimiter } from './middleware/rateLimiter.js';

const app = express();
app.use(express.json());

// Test a simple endpoint with rate limiting
app.get('/test', apiLimiter, (req, res) => {
  res.json({ message: 'Hello with rate limiting!' });
});

// Test a parametrized endpoint
app.get('/test/:id', apiLimiter, (req, res) => {
  res.json({ message: `Hello ${req.params.id}` });
});

app.listen(3005, () => {
  console.log('Test server running on port 3005');
});
