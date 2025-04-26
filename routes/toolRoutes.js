const express = require('express');
const router = express.Router();
const toolController = require('../controllers/toolController');

// Routes for tool management
router.get('/', toolController.getAllTools);
router.get('/:slug', toolController.getToolBySlug);
router.post('/', toolController.createTool);
router.put('/:id', toolController.updateTool);
router.delete('/:id', toolController.deleteTool);

module.exports = router;
