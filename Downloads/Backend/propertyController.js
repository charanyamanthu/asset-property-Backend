const { ApiError } = require('../utils/errorHandler');
const { processImages } = require('../utils/imageHandler');
const { saveProperty, getAllProperties, getPropertyById, updateProperty, deleteProperty, searchProperties } = require('../utils/storage');

/**
 * Handle property form submission
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const addProperty = async (req, res, next) => {
  try {
    const propertyData = req.validatedData;
    
    // Log the property data for debugging
    console.log(`[${req.requestId}] Property submission received:`, {
      title: propertyData.title,
      propertyType: propertyData.propertyType,
      price: propertyData.price,
      location: propertyData.location,
      imagesCount: propertyData.images ? propertyData.images.length : 0
    });

    // Process images if provided
    let processedImages = [];
    if (propertyData.images && propertyData.images.length > 0) {
      console.log(`[${req.requestId}] Processing ${propertyData.images.length} images...`);
      
      const imageResult = await processImages(propertyData.images);
      
      if (!imageResult.success) {
        console.error(`[${req.requestId}] Image processing errors:`, imageResult.errors);
        return res.status(400).json({
          success: false,
          message: 'Image processing failed',
          errors: imageResult.errors,
          requestId: req.requestId
        });
      }
      
      processedImages = imageResult.processedImages;
      console.log(`[${req.requestId}] Successfully processed ${processedImages.length} images`);
    }
    
    // Save property data to storage
    const savedProperty = saveProperty({
      ...propertyData,
      images: processedImages.map(img => ({
        filename: img.filename,
        originalName: img.originalName,
        size: img.size,
        filepath: img.filepath
      }))
    });

    console.log(`[${req.requestId}] Property saved with ID: ${savedProperty.id}`);

    // Send success response
    res.status(201).json({
      success: true,
      message: 'Property has been added successfully',
      propertyId: savedProperty.id,
      data: {
        id: savedProperty.id,
        title: savedProperty.title,
        propertyType: savedProperty.propertyType,
        price: savedProperty.price,
        location: savedProperty.location,
        imagesProcessed: processedImages.length,
        imageFiles: processedImages.map(img => ({
          filename: img.filename,
          originalName: img.originalName,
          size: img.size
        })),
        createdAt: savedProperty.createdAt
      }
    });
    
  } catch (err) {
    console.error(`[${req.requestId}] Error processing property:`, err);
    next(new ApiError('Failed to process property submission: ' + err.message, 500));
  }
};

/**
 * Get all properties
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getProperties = async (req, res, next) => {
  try {
    const { propertyType, location, minPrice, maxPrice, beds, baths } = req.query;
    
    const filters = {};
    if (propertyType) filters.propertyType = propertyType;
    if (location) filters.location = location;
    if (minPrice) filters.minPrice = parseFloat(minPrice);
    if (maxPrice) filters.maxPrice = parseFloat(maxPrice);
    if (beds) filters.beds = parseInt(beds);
    if (baths) filters.baths = parseInt(baths);
    
    const properties = searchProperties(filters);
    
    res.status(200).json({
      success: true,
      count: properties.length,
      data: properties
    });
    
  } catch (err) {
    next(new ApiError('Failed to retrieve properties: ' + err.message, 500));
  }
};

/**
 * Get property by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getProperty = async (req, res, next) => {
  try {
    const { id } = req.params;
    const property = getPropertyById(id);
    
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: property
    });
    
  } catch (err) {
    next(new ApiError('Failed to retrieve property: ' + err.message, 500));
  }
};

/**
 * Update property by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const updatePropertyById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.validatedData;
    
    const updatedProperty = updateProperty(id, updateData);
    
    if (!updatedProperty) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Property updated successfully',
      data: updatedProperty
    });
    
  } catch (err) {
    next(new ApiError('Failed to update property: ' + err.message, 500));
  }
};

/**
 * Delete property by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const deletePropertyById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = deleteProperty(id);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Property deleted successfully'
    });
    
  } catch (err) {
    next(new ApiError('Failed to delete property: ' + err.message, 500));
  }
};

module.exports = {
  addProperty,
  getProperties,
  getProperty,
  updatePropertyById,
  deletePropertyById
};

