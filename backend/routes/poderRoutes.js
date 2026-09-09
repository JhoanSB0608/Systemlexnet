// poder.routes.js
// Rutas para la generación, listado y descarga del documento de PODER.
const express = require('express');
const router = express.Router();
const { generarPoder, getMisPoderes, getPoderDocumento } = require('../controllers/poderController');
const { protect } = require('../middleware/authMiddleware');

// POST /api/poder/generar
// Espera el JSON con { destinatario, poderdante, apoderado, siniestro, firma },
// lo guarda en la base de datos y responde con un Buffer PDF (application/pdf).
router.post('/generar', protect, generarPoder);

// GET /api/poder
// Lista los poderes del usuario autenticado (o todos, si es administrador).
router.route('/').get(protect, getMisPoderes);

// GET /api/poder/:id/documento
// Regenera y descarga el PDF del poder guardado.
router.get('/:id/documento', protect, getPoderDocumento);

module.exports = router;

// --------------------- Montaje en index.js (server principal) ---------------------
// const poderRoutes = require('./routes/poder.routes');
// ...
// app.use('/api/poder', poderRoutes);
// -----------------------------------------------------------------------------------