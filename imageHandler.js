const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Generate a unique filename for uploaded images
 * @param {string} originalName - Original filename
 * @param {string} mimeType - MIME type of the image
 * @returns {string} - Unique filename
 */
const generateUniqueFilename = (originalName, mimeType) => {
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(8).toString('hex');
  const extension = path.extname(originalName) || getExtensionFromMimeType(mimeType);
  return `${timestamp}_${randomString}${extension}`;
};

/**
 * Get file extension from MIME type
 * @param {string} mimeType - MIME type
 * @returns {string} - File extension
 */
const getExtensionFromMimeType = (mimeType) => {
  const mimeToExt = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp'
  };
  return mimeToExt[mimeType] || '.jpg';
};

/**
 * Validate image data
 * @param {Object} imageData - Image data object
 * @returns {Object} - Validation result
 */
const validateImageData = (imageData) => {
  const errors = [];
  
  if (!imageData.name) {
    errors.push('Image name is required');
  }
  
  if (!imageData.type) {
    errors.push('Image type is required');
  } else if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(imageData.type)) {
    errors.push('Invalid image type. Only JPEG, PNG, and WebP are allowed');
  }
  
  if (!imageData.data) {
    errors.push('Image data is required');
  } else {
    // Validate base64 data
    const base64Regex = /^data:image\/(jpeg|jpg|png|webp);base64,/;
    if (!base64Regex.test(imageData.data)) {
      errors.push('Invalid base64 image data format');
    }
  }
  
  if (imageData.size && imageData.size > 10 * 1024 * 1024) { // 10MB
    errors.push('Image size cannot exceed 10MB');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Process and save image data
 * @param {Object} imageData - Image data object
 * @param {string} uploadDir - Directory to save images
 * @returns {Promise<Object>} - Processing result
 */
const processImage = async (imageData, uploadDir = 'uploads/images') => {
  try {
    // Validate image data
    const validation = validateImageData(imageData);
    if (!validation.isValid) {
      return {
        success: false,
        errors: validation.errors
      };
    }
    
    // Create upload directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    // Generate unique filename
    const filename = generateUniqueFilename(imageData.name, imageData.type);
    const filepath = path.join(uploadDir, filename);
    
    // Extract base64 data (remove data:image/...;base64, prefix)
    const base64Data = imageData.data.replace(/^data:image\/[a-z]+;base64,/, '');
    
    // Convert base64 to buffer and save
    const imageBuffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(filepath, imageBuffer);
    
    return {
      success: true,
      filename,
      filepath,
      size: imageBuffer.length,
      originalName: imageData.name
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Process multiple images
 * @param {Array} images - Array of image data objects
 * @param {string} uploadDir - Directory to save images
 * @returns {Promise<Object>} - Processing result
 */
const processImages = async (images, uploadDir = 'uploads/images') => {
  if (!Array.isArray(images) || images.length === 0) {
    return {
      success: true,
      processedImages: [],
      errors: []
    };
  }
  
  const results = [];
  const errors = [];
  
  for (let i = 0; i < images.length; i++) {
    const imageData = images[i];
    const result = await processImage(imageData, uploadDir);
    
    if (result.success) {
      results.push({
        index: i,
        filename: result.filename,
        filepath: result.filepath,
        size: result.size,
        originalName: result.originalName
      });
    } else {
      errors.push({
        index: i,
        originalName: imageData.name,
        errors: result.errors || [result.error]
      });
    }
  }
  
  return {
    success: errors.length === 0,
    processedImages: results,
    errors
  };
};

module.exports = {
  generateUniqueFilename,
  getExtensionFromMimeType,
  validateImageData,
  processImage,
  processImages
};
