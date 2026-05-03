const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const bootstrapDatabase = require('./config/bootstrapDb');
const errorHandler = require('./middleware/error');
const logger = require('./utils/logger');

// Load env vars
dotenv.config();

const app = express();

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookie parser
app.use(cookieParser());

// Enable CORS
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));

// Mount routers
app.use('/api/auth', require('./routes/auth'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/users', require('./routes/users'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/files', require('./routes/files'));
app.use('/api/presets', require('./routes/presets'));

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'FYP Management System API is running'
  });
});

// Error handler middleware (must be last)
app.use(errorHandler);

let server;

const startServer = async () => {
  await connectDB();
  await bootstrapDatabase();

  const PORT = process.env.PORT || 5000;
  server = app.listen(PORT, () => {
    logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      logger.error(`Port ${PORT} is already in use. Please stop the existing server or change PORT in your environment.`);
    } else {
      logger.error('Server error', { message: err.message, stack: err.stack });
    }
    process.exit(1);
  });

  process.on('unhandledRejection', (err) => {
    logger.error('Unhandled rejection', { message: err.message, stack: err.stack });
    if (server) {
      server.close(() => process.exit(1));
      return;
    }
    process.exit(1);
  });

  return server;
};

if (require.main === module) {
  startServer().catch((error) => {
    logger.error('Failed to start server', { message: error.message, stack: error.stack });
    process.exit(1);
  });
}

module.exports = app;
