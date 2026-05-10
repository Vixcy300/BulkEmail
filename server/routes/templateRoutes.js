const express = require('express');
const Template = require('../models/Template');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/templates
router.get('/', authMiddleware, async (req, res) => {
  try {
    const templates = await Template.find().sort({ createdAt: -1 });
    res.json(templates);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching templates', error: err.message });
  }
});

// POST /api/templates
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, subject, body } = req.body;
    if (!name || !subject || !body) {
      return res.status(400).json({ message: 'Name, subject, and body are required.' });
    }
    const template = await Template.create({ name, subject, body });
    res.status(201).json(template);
  } catch (err) {
    res.status(500).json({ message: 'Error saving template', error: err.message });
  }
});

// DELETE /api/templates/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await Template.findByIdAndDelete(req.params.id);
    res.json({ message: 'Template deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting template', error: err.message });
  }
});

module.exports = router;
