const express = require('express');
const router = express.Router();
const { validatePropertyForm } = require('../middleware/validation');
const { addProperty, getProperties, getProperty, updatePropertyById, deletePropertyById } = require('../controllers/propertyController');

/**
 * @route   POST /api/property
 * @desc    Add new property
 * @access  Public
 */
router.post('/property', validatePropertyForm, addProperty);

/**
 * @route   GET /api/property
 * @desc    Get all properties with optional filters
 * @access  Public
 */
router.get('/property', getProperties);

/**
 * @route   GET /api/property/:id
 * @desc    Get property by ID
 * @access  Public
 */
router.get('/property/:id', getProperty);

/**
 * @route   PUT /api/property/:id
 * @desc    Update property by ID
 * @access  Public
 */
router.put('/property/:id', validatePropertyForm, updatePropertyById);

/**
 * @route   DELETE /api/property/:id
 * @desc    Delete property by ID
 * @access  Public
 */
router.delete('/property/:id', deletePropertyById);

module.exports = router;



