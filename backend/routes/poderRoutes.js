// poder.routes.js
// Rutas para generación, listado, edición, borradores (auto-save) y descarga del PODER.
const express = require('express');
const router = express.Router();
const {
  generarPoder,
  getMisPoderes,
  getPoderById,
  actualizarPoder,
  getPoderDocumento,
  saveBorrador,
  updateBorrador,
  deleteBorrador,
} = require('../controllers/poderController');
const { protect } = require('../middleware/authMiddleware');

// POST /api/poder/generar
// Espera el JSON con { destinatario, poderdante, apoderado, siniestro, firma },
// lo guarda en la base de datos (o finaliza el borrador si trae _borradorId)
// y responde con un Buffer PDF (application/pdf).
router.post('/generar', protect, generarPoder);

// GET /api/poder
// Lista los poderes del usuario autenticado (o todos, si es administrador).
router.route('/').get(protect, getMisPoderes);

// Rutas de borrador (auto-save). Se registran antes de /:id para que
// "borrador" no sea interpretado como un ObjectId.
router.route('/borrador')
  .post(protect, saveBorrador);

router.route('/borrador/:id')
  .put(protect, updateBorrador)
  .delete(protect, deleteBorrador);

// GET /api/poder/:id (edición con firma incluida) | PUT /api/poder/:id (actualizar)
router.route('/:id')
  .get(protect, getPoderById)
  .put(protect, actualizarPoder);

// GET /api/poder/:id/documento
// Regenera y descarga el PDF del poder guardado.
router.get('/:id/documento', protect, getPoderDocumento);

module.exports = router;

// --------------------- Montaje en index.js (server principal) ---------------------
// const poderRoutes = require('./routes/poder.routes');
// ...
// app.use('/api/poder', poderRoutes);
// -----------------------------------------------------------------------------------