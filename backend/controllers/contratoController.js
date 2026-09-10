// Controlador de CONTRATO DE PRESTACIÓN DE SERVICIOS: genera el documento vía
// pdfmake, lo persiste en la base de datos (modelo Contrato) y permite
// listarlo/descargarlo de nuevo.
const { generateContratoPdf } = require('../utils/ContratoDocumentGenerator');
const Contrato = require('../models/contratoModel');

// POST /api/contrato/generar
// Guarda el contrato en la base de datos y responde con el Buffer PDF descargable.
// Si el payload trae `_borradorId`, en lugar de crear un duplicado finaliza el
// borrador existente (estado -> 'completa') con los datos enviados.
const generarContrato = async (req, res) => {
  try {
    const data = { ...(req.body || {}) };

    if (typeof data !== 'object' || Array.isArray(data)) {
      return res.status(400).json({ message: 'Datos del contrato inválidos.' });
    }

    const { _borradorId } = data;
    delete data._borradorId;
    delete data.estado;
    delete data.seccionesGuardadas;
    delete data.user;
    delete data._id;

    let contrato;
    if (_borradorId) {
      contrato = await Contrato.findById(_borradorId);
      if (!contrato) {
        return res.status(404).json({ message: 'Borrador no encontrado.' });
      }
      const isOwner = contrato.user && contrato.user.toString() === req.user._id.toString();
      if (!isOwner && !req.user.isAdmin) {
        return res.status(403).json({ message: 'No autorizado para finalizar este borrador.' });
      }
      contrato.set({ ...data, estado: 'completa' });
      if ('firma' in data) contrato.firma = data.firma;
      if ('firmaContractual' in data) contrato.firmaContractual = data.firmaContractual;
      if ('comitente' in data) contrato.comitente = data.comitente;
      if ('abogado' in data) contrato.abogado = data.abogado;
      if ('siniestro' in data) contrato.siniestro = data.siniestro;
      contrato = await contrato.save();
    } else {
      contrato = await Contrato.create({ user: req.user._id, ...data });
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const buffer = await generateContratoPdf(
      typeof contrato.toObject === 'function' ? contrato.toObject() : contrato,
      { baseUrl }
    );

    const now = new Date().toISOString().slice(0, 10);
    const filename = `contrato-servicios-${now}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.setHeader('Content-Length', buffer.length);

    res.send(buffer);
  } catch (error) {
    console.error('Error al generar el PDF del contrato:', error);
    res.status(500).json({ message: 'Error al generar el documento PDF', error: error.message });
  }
};

// GET /api/contrato
// Lista los contratos del usuario autenticado (los administradores pueden ver todos).
const getMisContratos = async (req, res) => {
  try {
    const query = req.user.isAdmin ? {} : { user: req.user._id };
    const contratos = await Contrato.find(query)
      .populate('user', 'name email')
      .select('-firma -firmaContractual')
      .sort({ createdAt: -1 })
      .lean();
    res.json(contratos);
  } catch (error) {
    console.error('Error al obtener los contratos:', error);
    res.status(500).json({ message: 'Error al obtener los contratos.', error: error.message });
  }
};

// GET /api/contrato/:id
// Trae un contrato completo (incluye firma) para su edición.
// El usuario solo puede acceder a sus propios contratos salvo que sea admin.
const getContratoById = async (req, res) => {
  try {
    const contrato = await Contrato.findById(req.params.id).populate('user', 'name email');
    if (!contrato) {
      return res.status(404).json({ message: 'Contrato no encontrado.' });
    }
    if (contrato.user && contrato.user._id.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({ message: 'No autorizado para ver este contrato.' });
    }
    res.json(contrato);
  } catch (error) {
    console.error('Error al obtener el contrato:', error);
    res.status(500).json({ message: 'Error al obtener el contrato.', error: error.message });
  }
};

// PUT /api/contrato/:id
// Actualiza un contrato existente (modo edición). Protege la integridad del dueño.
const actualizarContrato = async (req, res) => {
  try {
    const contrato = await Contrato.findById(req.params.id);
    if (!contrato) {
      return res.status(404).json({ message: 'Contrato no encontrado.' });
    }
    if (contrato.user.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({ message: 'No autorizado para actualizar este contrato.' });
    }

    const dataToUpdate = { ...req.body };
    delete dataToUpdate.user;
    delete dataToUpdate._id;

    // Soporte para finalizar un borrador (borrador -> completa)
    if (dataToUpdate.estado === 'borrador' || dataToUpdate.estado === 'completa') {
      contrato.estado = dataToUpdate.estado;
    }
    if (dataToUpdate.seccionesGuardadas) {
      contrato.seccionesGuardadas = dataToUpdate.seccionesGuardadas;
    }
    delete dataToUpdate.estado;
    delete dataToUpdate.seccionesGuardadas;

    contrato.set(dataToUpdate);

    if ('firma' in dataToUpdate) contrato.firma = dataToUpdate.firma;
    if ('firmaContractual' in dataToUpdate) contrato.firmaContractual = dataToUpdate.firmaContractual;
    if ('comitente' in dataToUpdate) contrato.comitente = dataToUpdate.comitente;
    if ('abogado' in dataToUpdate) contrato.abogado = dataToUpdate.abogado;
    if ('siniestro' in dataToUpdate) contrato.siniestro = dataToUpdate.siniestro;

    const updated = await contrato.save();
    res.json(updated);
  } catch (error) {
    console.error('Error al actualizar el contrato:', error);
    res.status(500).json({ message: 'Error al actualizar el contrato.', error: error.message });
  }
};

// POST /api/contrato/borrador
// Crea un borrador nuevo o reutiliza el último borrador del usuario (upsert).
const saveBorrador = async (req, res) => {
  try {
    const data = { ...req.body };

    let borrador = await Contrato.findOne({
      user: req.user._id,
      estado: 'borrador',
    }).sort({ updatedAt: -1 });

    if (!borrador) {
      borrador = new Contrato({ user: req.user._id, estado: 'borrador' });
    }

    delete data.user;
    delete data._id;
    delete data.estado;

    borrador.set(data);
    if ('firma' in data) borrador.firma = data.firma;
    if ('firmaContractual' in data) borrador.firmaContractual = data.firmaContractual;
    if ('seccionesGuardadas' in data) borrador.seccionesGuardadas = data.seccionesGuardadas;

    const saved = await borrador.save();
    res.json(saved);
  } catch (error) {
    console.error('Error al guardar el borrador del contrato:', error);
    res.status(400).json({
      message: 'Error al guardar el borrador del contrato.',
      error: error.errors ? Object.values(error.errors).map(e => e.message) : error.message,
    });
  }
};

// PUT /api/contrato/borrador/:id
const updateBorrador = async (req, res) => {
  try {
    const borrador = await Contrato.findById(req.params.id);
    if (!borrador) {
      return res.status(404).json({ message: 'Borrador no encontrado.' });
    }
    const isOwner = borrador.user && borrador.user.toString() === req.user._id.toString();
    if (!isOwner && !req.user.isAdmin) {
      return res.status(404).json({ message: 'Borrador no encontrado.' });
    }
    if (borrador.estado !== 'borrador') {
      return res.status(400).json({ message: 'El contrato ya fue completado y no puede guardarse como borrador.' });
    }

    const data = { ...req.body };
    delete data.user;
    delete data._id;
    delete data.estado;

    borrador.set(data);
    if ('firma' in data) borrador.firma = data.firma;
    if ('firmaContractual' in data) borrador.firmaContractual = data.firmaContractual;
    if ('seccionesGuardadas' in data) borrador.seccionesGuardadas = data.seccionesGuardadas;

    const saved = await borrador.save();
    res.json(saved);
  } catch (error) {
    console.error('Error al actualizar el borrador del contrato:', error);
    res.status(400).json({
      message: 'Error al actualizar el borrador del contrato.',
      error: error.errors ? Object.values(error.errors).map(e => e.message) : error.message,
    });
  }
};

// DELETE /api/contrato/borrador/:id
const deleteBorrador = async (req, res) => {
  try {
    const borrador = await Contrato.findById(req.params.id);
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
    console.error('Error al eliminar el borrador del contrato:', error);
    res.status(500).json({ message: 'Error del servidor al eliminar el borrador.' });
  }
};

// GET /api/contrato/:id/documento
// Regenera el PDF a partir de los datos guardados en la base de datos.
const getContratoDocumento = async (req, res) => {
  try {
    const contrato = await Contrato.findById(req.params.id).populate('user');

    if (!contrato) {
      return res.status(404).json({ message: 'Contrato no encontrado.' });
    }

    if (!contrato.user || (contrato.user._id.toString() !== req.user._id.toString() && !req.user.isAdmin)) {
      return res.status(403).json({ message: 'No autorizado para descargar este contrato.' });
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const buffer = await generateContratoPdf(contrato.toObject(), { baseUrl });

    const filename = `contrato-servicios-${new Date(contrato.createdAt).toISOString().slice(0, 10)}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.setHeader('Content-Length', buffer.length);

    res.send(buffer);
  } catch (error) {
    console.error('Error al descargar el documento del contrato:', error);
    res.status(500).json({ message: 'Error al descargar el documento del contrato.', error: error.message });
  }
};

module.exports = {
  generarContrato,
  getMisContratos,
  getContratoById,
  actualizarContrato,
  getContratoDocumento,
  saveBorrador,
  updateBorrador,
  deleteBorrador,
};