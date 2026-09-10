// Controlador de PODER: genera el documento vía pdfmake, lo persiste en la
// base de datos (modelo Poder) y permite listarlo/descargarlo de nuevo.
const { generatePoderPdf } = require('../utils/PoderDocumentGenerator');
const Poder = require('../models/poderModel');

// POST /api/poder/generar
// Guarda el poder en la base de datos y responde con el Buffer PDF descargable
// (comportamiento compatible con PoderPage, que fuerza la descarga del PDF).
// Si el payload trae `_borradorId`, en lugar de crear un duplicado finaliza el
// borrador existente (estado -> 'completa') con los datos enviados.
const generarPoder = async (req, res) => {
  try {
    const data = { ...(req.body || {}) };

    if (typeof data !== 'object' || Array.isArray(data)) {
      return res.status(400).json({ message: 'Datos del poder inválidos.' });
    }

    const { _borradorId } = data;
    delete data._borradorId;
    delete data.estado;
    delete data.seccionesGuardadas;
    delete data.user;
    delete data._id;

    let poder;
    if (_borradorId) {
      poder = await Poder.findById(_borradorId);
      if (!poder) {
        return res.status(404).json({ message: 'Borrador no encontrado.' });
      }
      const isOwner = poder.user && poder.user.toString() === req.user._id.toString();
      if (!isOwner && !req.user.isAdmin) {
        return res.status(403).json({ message: 'No autorizado para finalizar este borrador.' });
      }
      poder.set({ ...data, estado: 'completa' });
      if ('firma' in data) poder.firma = data.firma;
      if ('firmaApoderado' in data) poder.firmaApoderado = data.firmaApoderado;
      if ('destinatario' in data) poder.destinatario = data.destinatario;
      if ('poderdante' in data) poder.poderdante = data.poderdante;
      if ('apoderado' in data) poder.apoderado = data.apoderado;
      if ('siniestro' in data) poder.siniestro = data.siniestro;
      poder = await poder.save();
    } else {
      poder = await Poder.create({ user: req.user._id, ...data });
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const buffer = await generatePoderPdf(
      typeof poder.toObject === 'function' ? poder.toObject() : poder,
      { baseUrl }
    );

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
      .select('-firma -firmaApoderado')
      .sort({ createdAt: -1 })
      .lean();
    res.json(poderes);
  } catch (error) {
    console.error('Error al obtener los poderes:', error);
    res.status(500).json({ message: 'Error al obtener los poderes.', error: error.message });
  }
};

// GET /api/poder/:id
// Trae un poder completo (incluye firma) para su edición.
// El usuario solo puede acceder a sus propios poderes salvo que sea admin.
const getPoderById = async (req, res) => {
  try {
    const poder = await Poder.findById(req.params.id).populate('user', 'name email');
    if (!poder) {
      return res.status(404).json({ message: 'Poder no encontrado.' });
    }
    if (poder.user && poder.user._id.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({ message: 'No autorizado para ver este poder.' });
    }
    res.json(poder);
  } catch (error) {
    console.error('Error al obtener el poder:', error);
    res.status(500).json({ message: 'Error al obtener el poder.', error: error.message });
  }
};

// PUT /api/poder/:id
// Actualiza un poder existente (modo edición). Protege la integridad del dueño.
const actualizarPoder = async (req, res) => {
  try {
    const poder = await Poder.findById(req.params.id);
    if (!poder) {
      return res.status(404).json({ message: 'Poder no encontrado.' });
    }
    if (poder.user.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({ message: 'No autorizado para actualizar este poder.' });
    }

    const dataToUpdate = { ...req.body };
    delete dataToUpdate.user;
    delete dataToUpdate._id;

    // Soporte para finalizar un borrador (borrador -> completa)
    if (dataToUpdate.estado === 'borrador' || dataToUpdate.estado === 'completa') {
      poder.estado = dataToUpdate.estado;
    }
    if (dataToUpdate.seccionesGuardadas) {
      poder.seccionesGuardadas = dataToUpdate.seccionesGuardadas;
    }
    delete dataToUpdate.estado;
    delete dataToUpdate.seccionesGuardadas;

    poder.set(dataToUpdate);

    if ('firma' in dataToUpdate) poder.firma = dataToUpdate.firma;
    if ('firmaApoderado' in dataToUpdate) poder.firmaApoderado = dataToUpdate.firmaApoderado;
    if ('destinatario' in dataToUpdate) poder.destinatario = dataToUpdate.destinatario;
    if ('poderdante' in dataToUpdate) poder.poderdante = dataToUpdate.poderdante;
    if ('apoderado' in dataToUpdate) poder.apoderado = dataToUpdate.apoderado;
    if ('siniestro' in dataToUpdate) poder.siniestro = dataToUpdate.siniestro;

    const updated = await poder.save();
    res.json(updated);
  } catch (error) {
    console.error('Error al actualizar el poder:', error);
    res.status(500).json({ message: 'Error al actualizar el poder.', error: error.message });
  }
};

// POST /api/poder/borrador
// Crea un borrador nuevo o reutiliza el último borrador del usuario (upsert).
// Habilitado por el auto-save del formulario de poder.
const saveBorrador = async (req, res) => {
  try {
    const data = { ...req.body };

    let borrador = await Poder.findOne({
      user: req.user._id,
      estado: 'borrador',
    }).sort({ updatedAt: -1 });

    if (!borrador) {
      borrador = new Poder({ user: req.user._id, estado: 'borrador' });
    }

    delete data.user;
    delete data._id;
    delete data.estado;

    borrador.set(data);
    if ('firma' in data) borrador.firma = data.firma;
    if ('firmaApoderado' in data) borrador.firmaApoderado = data.firmaApoderado;
    if ('seccionesGuardadas' in data) borrador.seccionesGuardadas = data.seccionesGuardadas;

    const saved = await borrador.save();
    res.json(saved);
  } catch (error) {
    console.error('Error al guardar el borrador del poder:', error);
    res.status(400).json({
      message: 'Error al guardar el borrador del poder.',
      error: error.errors ? Object.values(error.errors).map(e => e.message) : error.message,
    });
  }
};

// PUT /api/poder/borrador/:id
const updateBorrador = async (req, res) => {
  try {
    const borrador = await Poder.findById(req.params.id);
    if (!borrador) {
      return res.status(404).json({ message: 'Borrador no encontrado.' });
    }
    const isOwner = borrador.user && borrador.user.toString() === req.user._id.toString();
    if (!isOwner && !req.user.isAdmin) {
      return res.status(404).json({ message: 'Borrador no encontrado.' });
    }
    if (borrador.estado !== 'borrador') {
      return res.status(400).json({ message: 'El poder ya fue completado y no puede guardarse como borrador.' });
    }

    const data = { ...req.body };
    delete data.user;
    delete data._id;
    delete data.estado;

    borrador.set(data);
    if ('firma' in data) borrador.firma = data.firma;
    if ('firmaApoderado' in data) borrador.firmaApoderado = data.firmaApoderado;
    if ('seccionesGuardadas' in data) borrador.seccionesGuardadas = data.seccionesGuardadas;

    const saved = await borrador.save();
    res.json(saved);
  } catch (error) {
    console.error('Error al actualizar el borrador del poder:', error);
    res.status(400).json({
      message: 'Error al actualizar el borrador del poder.',
      error: error.errors ? Object.values(error.errors).map(e => e.message) : error.message,
    });
  }
};

// DELETE /api/poder/borrador/:id
const deleteBorrador = async (req, res) => {
  try {
    const borrador = await Poder.findById(req.params.id);
    if (!borrador) {
      return res.status(404).json({ message: 'Borrador no encontrado.' });
    }
    const isOwner = borrador.user && borrador.user.toString() === req.user._id.toString();
    if (!isOwner && !req.user.isAdmin) {
      return res.status(404).json({ message: 'Borrador no encontrado.' });
    }
    await borrador.deleteOne();
    res.json({ message: 'Borrador eliminado', id: req.params.id });
  } catch (error) {
    console.error('Error al eliminar el borrador del poder:', error);
    res.status(500).json({ message: 'Error del servidor al eliminar el borrador.' });
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

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const buffer = await generatePoderPdf(poder.toObject(), { baseUrl });

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

module.exports = {
  generarPoder,
  getMisPoderes,
  getPoderById,
  actualizarPoder,
  getPoderDocumento,
  saveBorrador,
  updateBorrador,
  deleteBorrador,
};