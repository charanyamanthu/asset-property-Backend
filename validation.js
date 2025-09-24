
const Joi = require('joi');
const { ApiError } = require('../utils/errorHandler');

// Add additional security for email validation
const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Enhanced validation schema with strict security constraints
const contactFormSchema = Joi.object({
  fullName: Joi.string().required().min(2).max(100).trim()
    .pattern(/^[a-zA-Z\s'-]+$/) // Only allow letters, spaces, hyphens, and apostrophes
    .messages({
      'string.base': 'Full name must be a string',
      'string.empty': 'Full name is required',
      'string.min': 'Full name must be at least {#limit} characters long',
      'string.max': 'Full name cannot exceed {#limit} characters',
      'string.pattern.base': 'Full name contains invalid characters',
      'any.required': 'Full name is required'
    }),
  
  email: Joi.string().email().required().trim().lowercase()
    .pattern(emailPattern) // Extra validation beyond Joi's built-in email
    .max(254) // RFC 5321 maximum length
    .messages({
      'string.base': 'Email must be a string',
      'string.empty': 'Email is required',
      'string.email': 'Please provide a valid email address',
      'string.pattern.base': 'Please provide a valid email address',
      'string.max': 'Email is too long',
      'any.required': 'Email is required'
    }),
  
  phoneNumber: Joi.string().pattern(/^\d{10,15}$/).required().trim()
    .messages({
      'string.base': 'Phone number must be a string',
      'string.empty': 'Phone number is required',
      'string.pattern.base': 'Phone number must contain between 10-15 digits only',
      'any.required': 'Phone number is required'
    }),
  
  message: Joi.string().allow('').trim().max(1000) // Limit message length to prevent abuse
    .messages({
      'string.base': 'Message must be a string',
      'string.max': 'Message cannot exceed 1000 characters'
    }),
  
  viewProperty: Joi.boolean().required()
    .messages({
      'boolean.base': 'View property must be a boolean value',
      'any.required': 'View property preference is required'
    }),
  
  dataConsent: Joi.boolean().valid(true).required()
    .messages({
      'boolean.base': 'Data consent must be a boolean value',
      'any.only': 'You must provide consent to process your data',
      'any.required': 'Data consent is required'
    }),
  
  propertyId: Joi.string().required().trim()
    .pattern(/^[A-Z0-9-]{3,30}$/) // Restrict to specific format
    .messages({
      'string.base': 'Property ID must be a string',
      'string.empty': 'Property ID is required',
      'string.pattern.base': 'Property ID format is invalid',
      'any.required': 'Property ID is required'
    }),
  
  requestDate: Joi.date().iso().required()
    .max(new Date(Date.now() + 15 * 60 * 1000).toISOString()) // Allow up to 15 minutes in the future
    .min(new Date(Date.now() - 15 * 60 * 1000).toISOString()) // Allow up to 15 minutes in the past
    .messages({
      'date.base': 'Request date must be a valid date',
      'date.format': 'Request date must be in ISO format',
      'date.max': 'Request date cannot be in the future',
      'date.min': 'Request date is too old',
      'any.required': 'Request date is required'
    })
}).options({ stripUnknown: { objects: true, arrays: true } }); // Remove any extra properties

// Middleware for validating contact form data
const validateContactForm = (req, res, next) => {
  // Check for Content-Type
  if (!req.is('application/json')) {
    return res.status(415).json({
      success: false,
      message: 'Unsupported Media Type. Content-Type must be application/json'
    });
  }

  const { error, value } = contactFormSchema.validate(req.body, { 
    abortEarly: false,
    stripUnknown: true 
  });

  if (error) {
    // Log validation errors with request ID for monitoring
    console.log(`[${req.requestId}] Validation error:`, error.details);
    console.log("Max date (current UTC):", new Date().toISOString());
    console.log("Min date (24 hours ago in UTC):", new Date(Date.now() - 86400000).toISOString());
    console.log("Received request date:", req.body.requestDate);
    
    const errorMessages = error.details.map(detail => detail.message);
    
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: errorMessages,
      requestId: req.requestId
    });
  }

  // Additional security checks beyond Joi validation
  // Check for suspicious patterns or known attack vectors in fields
  if (containsSuspiciousPatterns(value)) {
    return next(new ApiError('Request contains suspicious patterns', 403));
  }

  // Attach the validated data to the request object
  req.validatedData = value;
  next();
};

// Function to check for suspicious patterns
function containsSuspiciousPatterns(data) {
  // Check for SQL injection patterns
  const sqlPatterns = /(union|select|insert|update|delete|drop|alter|exec|--|;|\/\*|\*\/)/i;
  
  // Check for potential XSS patterns
  const xssPatterns = /(<script|javascript:|on\w+\s*=|alert\s*\()/i;
  
  // Check for command injection patterns
  const cmdPatterns = /(;|\||`|&|\$\()/i;
  
  // Combine all checks (can be expanded as needed)
  const allChecks = [
    sqlPatterns.test(JSON.stringify(data)),
    xssPatterns.test(JSON.stringify(data)),
    cmdPatterns.test(JSON.stringify(data))
  ];
  
  return allChecks.some(result => result === true);
}

// Property validation schema
const propertyFormSchema = Joi.object({
  title: Joi.string().required().min(2).max(200).trim()
    .messages({
      'string.base': 'Title must be a string',
      'string.empty': 'Title is required',
      'string.min': 'Title must be at least {#limit} characters long',
      'string.max': 'Title cannot exceed {#limit} characters',
      'any.required': 'Title is required'
    }),

  description: Joi.string().required().min(10).max(2000).trim()
    .messages({
      'string.base': 'Description must be a string',
      'string.empty': 'Description is required',
      'string.min': 'Description must be at least {#limit} characters long',
      'string.max': 'Description cannot exceed {#limit} characters',
      'any.required': 'Description is required'
    }),

  location: Joi.string().required().min(5).max(200).trim()
    .messages({
      'string.base': 'Location must be a string',
      'string.empty': 'Location is required',
      'string.min': 'Location must be at least {#limit} characters long',
      'string.max': 'Location cannot exceed {#limit} characters',
      'any.required': 'Location is required'
    }),

  address: Joi.string().required().min(5).max(300).trim()
    .messages({
      'string.base': 'Address must be a string',
      'string.empty': 'Address is required',
      'string.min': 'Address must be at least {#limit} characters long',
      'string.max': 'Address cannot exceed {#limit} characters',
      'any.required': 'Address is required'
    }),

  propertyType: Joi.string().required().valid('Flat', 'House', 'Apartment', 'Studio', 'Penthouse', 'Villa', 'Townhouse')
    .messages({
      'string.base': 'Property type must be a string',
      'string.empty': 'Property type is required',
      'any.only': 'Property type must be one of: Flat, House, Apartment, Studio, Penthouse, Villa, Townhouse',
      'any.required': 'Property type is required'
    }),

  price: Joi.number().required().min(0).max(10000000)
    .messages({
      'number.base': 'Price must be a number',
      'number.min': 'Price must be at least {#limit}',
      'number.max': 'Price cannot exceed {#limit}',
      'any.required': 'Price is required'
    }),

  rentFrequency: Joi.string().required().valid('per month', 'per week', 'per day', 'per year')
    .messages({
      'string.base': 'Rent frequency must be a string',
      'string.empty': 'Rent frequency is required',
      'any.only': 'Rent frequency must be one of: per month, per week, per day, per year',
      'any.required': 'Rent frequency is required'
    }),

  beds: Joi.number().integer().min(0).max(20).required()
    .messages({
      'number.base': 'Number of beds must be a number',
      'number.integer': 'Number of beds must be a whole number',
      'number.min': 'Number of beds must be at least {#limit}',
      'number.max': 'Number of beds cannot exceed {#limit}',
      'any.required': 'Number of beds is required'
    }),

  baths: Joi.number().integer().min(0).max(20).required()
    .messages({
      'number.base': 'Number of baths must be a number',
      'number.integer': 'Number of baths must be a whole number',
      'number.min': 'Number of baths must be at least {#limit}',
      'number.max': 'Number of baths cannot exceed {#limit}',
      'any.required': 'Number of baths is required'
    }),

  sqft: Joi.number().min(0).max(100000).required()
    .messages({
      'number.base': 'Square footage must be a number',
      'number.min': 'Square footage must be at least {#limit}',
      'number.max': 'Square footage cannot exceed {#limit}',
      'any.required': 'Square footage is required'
    }),

  sqftUnit: Joi.string().valid('FT²', 'M²').default('FT²')
    .messages({
      'string.base': 'Square footage unit must be a string',
      'any.only': 'Square footage unit must be either FT² or M²'
    }),

  availability: Joi.string().required().min(5).max(100).trim()
    .messages({
      'string.base': 'Availability must be a string',
      'string.empty': 'Availability is required',
      'string.min': 'Availability must be at least {#limit} characters long',
      'string.max': 'Availability cannot exceed {#limit} characters',
      'any.required': 'Availability is required'
    }),

  keyFeatures: Joi.array().items(Joi.string().max(100)).max(20)
    .messages({
      'array.base': 'Key features must be an array',
      'array.max': 'Cannot have more than {#limit} key features',
      'string.max': 'Each key feature cannot exceed {#limit} characters'
    }),

  images: Joi.array().items(
    Joi.object({
      name: Joi.string().required().max(255),
      size: Joi.number().max(10 * 1024 * 1024), // 10MB max per image
      type: Joi.string().valid('image/jpeg', 'image/jpg', 'image/png', 'image/webp'),
      data: Joi.string().base64().max(15 * 1024 * 1024) // 15MB max base64 data
    })
  ).max(20) // Maximum 20 images
    .messages({
      'array.base': 'Images must be an array',
      'array.max': 'Cannot upload more than {#limit} images',
      'object.base': 'Each image must be an object',
      'string.base': 'Image name must be a string',
      'string.empty': 'Image name is required',
      'string.max': 'Image name cannot exceed {#limit} characters',
      'number.max': 'Image size cannot exceed 10MB',
      'any.only': 'Image type must be JPEG, PNG, or WebP',
      'string.base64': 'Image data must be valid base64',
      'string.max': 'Image data is too large'
    }),

  // Optional contact fields
  contactName: Joi.string().allow('').max(100).trim()
    .messages({
      'string.base': 'Contact name must be a string',
      'string.max': 'Contact name cannot exceed {#limit} characters'
    }),

  contactEmail: Joi.string().email().allow('').max(254).trim().lowercase()
    .messages({
      'string.base': 'Contact email must be a string',
      'string.email': 'Please provide a valid email address',
      'string.max': 'Contact email is too long'
    }),

  contactPhone: Joi.string().allow('').pattern(/^\d{10,15}$/).trim()
    .messages({
      'string.base': 'Contact phone must be a string',
      'string.pattern.base': 'Contact phone must contain between 10-15 digits only'
    }),

  // Optional financial fields
  deposit: Joi.string().allow('').max(50).trim()
    .messages({
      'string.base': 'Deposit must be a string',
      'string.max': 'Deposit cannot exceed {#limit} characters'
    }),

  serviceCharge: Joi.string().allow('').max(50).trim()
    .messages({
      'string.base': 'Service charge must be a string',
      'string.max': 'Service charge cannot exceed {#limit} characters'
    }),

  utilityBills: Joi.string().allow('').max(50).trim()
    .messages({
      'string.base': 'Utility bills must be a string',
      'string.max': 'Utility bills cannot exceed {#limit} characters'
    })

}).options({ stripUnknown: { objects: true, arrays: true } });

// Middleware for validating property form data
const validatePropertyForm = (req, res, next) => {
  // Check for Content-Type
  if (!req.is('application/json')) {
    return res.status(415).json({
      success: false,
      message: 'Unsupported Media Type. Content-Type must be application/json'
    });
  }

  const { error, value } = propertyFormSchema.validate(req.body, { 
    abortEarly: false,
    stripUnknown: true 
  });

  if (error) {
    // Log validation errors with request ID for monitoring
    console.log(`[${req.requestId}] Property validation error:`, error.details);
    
    const errorMessages = error.details.map(detail => detail.message);
    
    return res.status(400).json({
      success: false,
      message: 'Property validation error',
      errors: errorMessages,
      requestId: req.requestId
    });
  }

  // Additional security checks beyond Joi validation
  if (containsSuspiciousPatterns(value)) {
    return next(new ApiError('Request contains suspicious patterns', 403));
  }

  // Attach the validated data to the request object
  req.validatedData = value;
  next();
};

module.exports = {
  validateContactForm,
  validatePropertyForm
};
