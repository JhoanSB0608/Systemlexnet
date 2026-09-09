// Controlador de PODER: genera el documento vía pdfmake, lo persiste en la
// base de datos (modelo Poder) y permite listarlo/descargarlo de nuevo.
const { generatePoderPdf } = require('../utils/PoderDocumentGenerator');
const Poder = require('../models/poderModel');

// POST /api/poder/generar
// Guarda el poder en la base de datos y responde con el Buffer PDF descargable
// (comportamiento compatible con PoderPage, que fuerza la descarga del PDF).
const generarPoder = async (req, res) => {
  try {
    const data = req.body || {};

    if (typeof data !== 'object' || Array.isArray(data)) {
      return res.status(400).json({ message: 'Datos del poder inválidos.' });
    }

    const poder = await Poder.create({ user: req.user._id, ...data });

    const buffer = await generatePoderPdf(poder.toObject());

    const now = new Date().toISOString().slice(0, 10);
    const filename = `poder-${now}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.setHeader('Content-Length', buffer.length);

    res.send(buffer);
  } catch (error) {
    console.error('Error al generar el PDF del poder:', error);
    res.status(500).json({ message: 'Error al generar el documento PDF', error: error.message });
  }
};

// GET /api/poder
// Lista los poderes del usuario autenticado (los administradores pueden ver todos).
const getMisPoderes = async (req, res) => {
  try {
    const query = req.user.isAdmin ? {} : { user: req.user._id };
    const poderes = await Poder.find(query)
      .populate('user', 'name email')
      .select('-firma')
      .sort({ createdAt: -1 })
      .lean();
    res.json(poderes);
  } catch (error) {
    console.error('Error al obtener los poderes:', error);
    res.status(500).json({ message: 'Error al obtener los poderes.', error: error.message });
  }
};

// GET /api/poder/:id/documento
// Regenera el PDF a partir de los datos guardados en la base de datos.
const getPoderDocumento = async (req, res) => {
  try {
    const poder = await Poder.findById(req.params.id).populate('user');

    if (!poder) {
      return res.status(404).json({ message: 'Poder no encontrado.' });
    }

    if (!poder.user || (poder.user._id.toString() !== req.user._id.toString() && !req.user.isAdmin)) {
      return res.status(403).json({ message: 'No autorizado para descargar este poder.' });
    }

    const buffer = await generatePoderPdf(poder.toObject());

    const filename = `poder-${new Date(poder.createdAt).toISOString().slice(0, 10)}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.setHeader('Content-Length', buffer.length);

    res.send(buffer);
  } catch (error) {
    console.error('Error al descargar el documento del poder:', error);
    res.status(500).json({ message: 'Error al descargar el documento del poder.', error: error.message });
  }
};

module.exports = { generarPoder, getMisPoderes, getPoderDocumento };