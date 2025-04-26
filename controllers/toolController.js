const Tool = require('../models/Tool');
const path = require('path');
const fs = require('fs');

// Get all tools
exports.getAllTools = async (req, res) => {
  try {
    const tools = await Tool.find({});
    res.json(tools);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tools', error: error.message });
  }
};

// Get a single tool by slug
exports.getToolBySlug = async (req, res) => {
  try {
    const tool = await Tool.findOne({ slug: req.params.slug });
    if (!tool) {
      return res.status(404).json({ message: 'Tool not found' });
    }
    res.json(tool);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tool', error: error.message });
  }
};

// Create a new tool
exports.createTool = async (req, res) => {
  try {
    const newTool = new Tool(req.body);
    await newTool.save();
    res.status(201).json(newTool);
  } catch (error) {
    res.status(400).json({ message: 'Error creating tool', error: error.message });
  }
};

// Update a tool
exports.updateTool = async (req, res) => {
  try {
    const updatedTool = await Tool.findByIdAndUpdate(
      req.params.id, 
      req.body,
      { new: true, runValidators: true }
    );
    if (!updatedTool) {
      return res.status(404).json({ message: 'Tool not found' });
    }
    res.json(updatedTool);
  } catch (error) {
    res.status(400).json({ message: 'Error updating tool', error: error.message });
  }
};

// Delete a tool
exports.deleteTool = async (req, res) => {
  try {
    const tool = await Tool.findByIdAndDelete(req.params.id);
    if (!tool) {
      return res.status(404).json({ message: 'Tool not found' });
    }
    res.json({ message: 'Tool deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting tool', error: error.message });
  }
};
