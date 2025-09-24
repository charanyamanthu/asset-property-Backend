
const fs = require('fs');
const path = require('path');

// Data directory
const DATA_DIR = path.join(__dirname, '../../data');
const PROPERTIES_FILE = path.join(DATA_DIR, 'properties.json');

/**
 * Ensure data directory exists
 */
const ensureDataDir = () => {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
};

/**
 * Read properties from file
 * @returns {Array} Array of properties
 */
const readProperties = () => {
  try {
    ensureDataDir();
    if (!fs.existsSync(PROPERTIES_FILE)) {
      return [];
    }
    const data = fs.readFileSync(PROPERTIES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading properties:', error);
    return [];
  }
};

/**
 * Write properties to file
 * @param {Array} properties - Array of properties
 * @returns {boolean} Success status
 */
const writeProperties = (properties) => {
  try {
    ensureDataDir();
    fs.writeFileSync(PROPERTIES_FILE, JSON.stringify(properties, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing properties:', error);
    return false;
  }
};

/**
 * Save a new property
 * @param {Object} propertyData - Property data to save
 * @returns {Object} Saved property with ID
 */
const saveProperty = (propertyData) => {
  const properties = readProperties();
  const propertyId = `PROP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const newProperty = {
    id: propertyId,
    ...propertyData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  properties.push(newProperty);
  
  if (writeProperties(properties)) {
    return newProperty;
  }
  
  throw new Error('Failed to save property');
};

/**
 * Get all properties
 * @returns {Array} Array of all properties
 */
const getAllProperties = () => {
  return readProperties();
};

/**
 * Get property by ID
 * @param {string} id - Property ID
 * @returns {Object|null} Property or null if not found
 */
const getPropertyById = (id) => {
  const properties = readProperties();
  return properties.find(prop => prop.id === id) || null;
};

/**
 * Update property by ID
 * @param {string} id - Property ID
 * @param {Object} updateData - Data to update
 * @returns {Object|null} Updated property or null if not found
 */
const updateProperty = (id, updateData) => {
  const properties = readProperties();
  const index = properties.findIndex(prop => prop.id === id);
  
  if (index === -1) {
    return null;
  }
  
  properties[index] = {
    ...properties[index],
    ...updateData,
    updatedAt: new Date().toISOString()
  };
  
  if (writeProperties(properties)) {
    return properties[index];
  }
  
  throw new Error('Failed to update property');
};

/**
 * Delete property by ID
 * @param {string} id - Property ID
 * @returns {boolean} Success status
 */
const deleteProperty = (id) => {
  const properties = readProperties();
  const filteredProperties = properties.filter(prop => prop.id !== id);
  
  if (filteredProperties.length === properties.length) {
    return false; // Property not found
  }
  
  return writeProperties(filteredProperties);
};

/**
 * Search properties
 * @param {Object} filters - Search filters
 * @returns {Array} Filtered properties
 */
const searchProperties = (filters = {}) => {
  let properties = readProperties();
  
  // Apply filters
  if (filters.propertyType) {
    properties = properties.filter(prop => 
      prop.propertyType.toLowerCase().includes(filters.propertyType.toLowerCase())
    );
  }
  
  if (filters.location) {
    properties = properties.filter(prop => 
      prop.location.toLowerCase().includes(filters.location.toLowerCase())
    );
  }
  
  if (filters.minPrice) {
    properties = properties.filter(prop => prop.price >= filters.minPrice);
  }
  
  if (filters.maxPrice) {
    properties = properties.filter(prop => prop.price <= filters.maxPrice);
  }
  
  if (filters.beds) {
    properties = properties.filter(prop => prop.beds >= filters.beds);
  }
  
  if (filters.baths) {
    properties = properties.filter(prop => prop.baths >= filters.baths);
  }
  
  return properties;
};

module.exports = {
  saveProperty,
  getAllProperties,
  getPropertyById,
  updateProperty,
  deleteProperty,
  searchProperties,
  readProperties,
  writeProperties
};
