const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const xss = require('xss-clean');
const hpp = require('hpp');
const mongoSanitize = require('express-mongo-sanitize');
const compression = require('compression');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
require('dotenv').config();

const contactRoutes = require('./src/routes/contactRoutes');
const propertyRoutes = require('./src/routes/propertyRoutes');
const { logError } = require('./src/utils/errorHandler');

const app = express();

// === Security & Middleware ===
app.use(helmet());

// Enable compression for better performance with large payloads
app.use(compression());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: 'Too many contact form submissions from this IP, please try again later',
});

// Increased limits for property submissions with images
app.use(bodyParser.json({ 
  limit: '100mb',
  parameterLimit: 50000,
  type: 'application/json'
}));
app.use(bodyParser.urlencoded({ 
  extended: true, 
  limit: '100mb',
  parameterLimit: 50000
}));

// Additional middleware for handling large payloads
app.use((req, res, next) => {
  // Set timeout for large requests
  req.setTimeout(300000); // 5 minutes
  res.setTimeout(300000); // 5 minutes
  next();
});

app.use(mongoSanitize());
app.use(xss());
app.use(hpp());

const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 3600,
  credentials: true
};
app.use(cors(corsOptions));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  next();
});

app.use((req, res, next) => {
  req.requestId = require('crypto').randomBytes(16).toString('hex');
  res.setHeader('X-Request-ID', req.requestId);
  next();
});

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${req.ip} - ID: ${req.requestId}`);
  next();
});

// === Secret Manager Setup ===
const secretClient = new SecretManagerServiceClient();
async function getSecret(secretName) {
  try {
    const [version] = await secretClient.accessSecretVersion({
      name: `projects/${process.env.GCP_PROJECT}/secrets/${secretName}/versions/latest`,
    });
    return version.payload.data.toString('utf8');
  } catch (err) {
    console.error(`Error retrieving secret "${secretName}":`, err.message);
    return null;
  }
}

// === App Startup ===
(async () => {
  // Load secrets
  if (process.env.NODE_ENV === 'production') {
    // Load secrets from GCP Secret Manager
    // const inquiryEmailId = await getSecret('EMAIL_ID') || process.env.EMAIL_USER;
    // const inquiryEmailPassword = await getSecret('EMAIL_PASSWORD') || process.env.EMAIL_APP_PASSWORD;
    const inquiryEmailId = process.env.EMAIL_USER;
    const inquiryEmailPassword = process.env.EMAIL_APP_PASSWORD;
    const recipientEmail = await getSecret('TO_EMAIL_ID') || process.env.RECIPIENT_EMAIL;
    if (inquiryEmailPassword) {
      process.env.EMAIL_USER = inquiryEmailId;
      process.env.EMAIL_APP_PASSWORD = inquiryEmailPassword;
      process.env.RECIPIENT_EMAIL = recipientEmail;
      console.log(`🔐 Secret loaded: Inquiry Email`);
    } else {
      console.warn('⚠️ Inquiry Email not loaded from Secret Manager');
    }
  } else {
    console.log('🧪 Skipping GCP secret loading in non-production mode');
    process.env.EMAIL_USER = process.env.EMAIL_USER;
    process.env.EMAIL_APP_PASSWORD = process.env.EMAIL_APP_PASSWORD;
    process.env.RECIPIENT_EMAIL = process.env.RECIPIENT_EMAIL;
  }

  // Routes (after secrets and middleware)
  app.use('/api/contact', contactLimiter); // Apply rate limit to contact
  
  // Property routes with higher rate limit for image uploads
  const propertyLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // Allow more requests for property submissions
    message: 'Too many property submissions from this IP, please try again later',
  });
  app.use('/api/property', propertyLimiter);
  
  app.use('/api', contactRoutes);
  app.use('/api', propertyRoutes);

  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'OK',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString()
    });
  });

  app.get('/', (req, res) => {
    res.status(200).json({
      message: 'Contact Form API is running',
      documentation: '/api-docs',
      health: '/health'
    });
  });

  app.use((req, res) => {
    res.status(404).json({
      success: false,
      message: 'Resource not found'
    });
  });

  app.use((err, req, res, next) => {
    logError(err, req);
    const isProd = process.env.NODE_ENV === 'production';
    res.status(err.statusCode || 500).json({
      success: false,
      message: isProd && err.statusCode === 500 ? 'Internal server error' : err.message,
      requestId: req.requestId
    });
  });

  // Start server after secrets are ready
  const PORT = process.env.PORT || 8090;
  console.log(`👀 Starting server on port ${PORT}`);
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });

  // Graceful shutdown handlers
  process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
  });
})();
