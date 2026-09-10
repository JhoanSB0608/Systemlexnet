// contratoRoutes.js
// Rutas para generación, listado, edición, borradores (auto-save) y descarga del
// CONTRATO DE PRESTACIÓN DE SERVICIOS PROFESIONALES DE ABOGADO.
const express = require('express');
const router = express.Router();
const {
  generarContrato,
  getMisContratos,
  getContratoById,
  actualizarContrato,
  getContratoDocumento,
  saveBorrador,
  updateBorrador,
  deleteBorrador,
} = require('../controllers/contratoController');
const { protect } = require('../middleware/authMiddleware');

// POST /api/contrato/generar
// Guarda el contrato en la base de datos (o finaliza el borrador si trae _borradorId)
// y responde con un Buffer PDF (application/pdf).
router.post('/generar', protect, generarContrato);

// GET /api/contrato
// Lista los contratos del usuario autenticado (o todos, si es administrador).
router.route('/').get(protect, getMisContratos);

// Rutas de borrador (auto-save). Se registran antes de /:id para que
// "borrador" no sea interpretado como un ObjectId.
router.route('/borrador')
  .post(protect, saveBorrador);

router.route('/borrador/:id')
  .put(protect, updateBorrador)
  .delete(protect, deleteBorrador);

// GET /api/contrato/:id (edición con firma incluida) | PUT /api/contrato/:id (actualizar)
router.route('/:id')
  .get(protect, getContratoById)
  .put(protect, actualizarContrato);

// GET /api/contrato/:id/documento
// Regenera y descarga el PDF del contrato guardado.
router.get('/:id/documento', protect, getContratoDocumento);

module.exports = router;