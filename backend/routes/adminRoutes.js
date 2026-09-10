const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getStats, getSolicitudes, getPoderes, getContratos, uploadAnexo } = require('../controllers/adminController.js');
const { protect, admin } = require('../middleware/authMiddleware.js');

// Multer config for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = 'uploads/';
    // Ensure the directory exists
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Use a more specific name for admin uploads to avoid conflicts
    cb(null, `anexo-admin-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ storage: storage }).single('anexo');

// Todas las rutas de admin requieren autenticación y rol de administrador
router.get('/stats', protect, admin, getStats);
router.get('/solicitudes', protect, admin, getSolicitudes);
router.get('/poderes', protect, admin, getPoderes);
router.get('/contratos', protect, admin, getContratos);

// Route for uploading an anexo
router.post('/upload-anexo/:tipo/:id', protect, admin, upload, uploadAnexo);

module.exports = router;
