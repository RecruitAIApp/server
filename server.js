import http from 'http';
import app from './app.js';
import { connectDB } from './src/config/db.config.js';
import { redisConnection } from './src/config/redis.config.js';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 5001;


const server = http.createServer(app);

const startServer = async () => {
  try {
    await connectDB();

    redisConnection.on('connect', () => {
      console.log('Redis Connected successfully for Queues');
    });

    server.listen(PORT, () => {
      console.log(`Server is running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    });

  } catch (error) {
    console.error(`Failed to start the server: ${error.message}`);
    process.exit(1);
  }
};

startServer();