const Conciliacion = require('../models/conciliacionModel');
const fs = require('fs');
const path = require('path');

const { generateConciliacionPdf } = require('../utils/conciliacionDocumentGenerator');
const { generateConciliacionDocx } = require('../utils/docxGenerator');

const createConciliacion = async (req, res) => {
  console.log("[conciliacionController] createConciliacion - received body:", JSON.stringify(req.body, null, 2));
  try {
    const dataToSave = req.body;
    dataToSave.user = req.user._id;

    // The 'anexos' and 'firma' fields are already in the correct format from the client.
    const conciliacion = new Conciliacion(dataToSave);
    console.log("[conciliacionController] createConciliacion - object to be saved:", JSON.stringify(conciliacion.toObject(), null, 2));
    const createdConciliacion = await conciliacion.save();
    res.status(201).json(createdConciliacion);
  } catch (error) {
    console.error('Error al crear la conciliación:', error);
    res.status(400).json({ 
        message: 'Error de validación al guardar la conciliación.', 
        error: error.errors ? Object.values(error.errors).map(e => e.message) : error.message,
        details: error.errors 
    });
  }
};

const getConciliacionDocumento = async (req, res) => {
  try {
    const solicitud = await Conciliacion.findById(req.params.id).populate('user');

    if (!solicitud) {
      return res.status(404).json({ message: 'Solicitud de conciliación no encontrada' });
    }

    // Security check
    if (!solicitud.user || (solicitud.user._id.toString() !== req.user._id.toString() && !req.user.isAdmin)) {
        return res.status(401).json({ message: 'No autorizado para ver este documento' });
    }
    
    const format = req.query.format || 'pdf';

    if (format === 'pdf') {
        const buffer = await generateConciliacionPdf(solicitud);
        const filename = `conciliacion-${solicitud._id}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
        res.send(buffer);
    } else if (format === 'docx') {
        const buffer = await generateConciliacionDocx(solicitud);
        const filename = `conciliacion-${solicitud._id}.docx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
        res.send(buffer);
    } else if (format === 'anexo') {
      try {
        const { filename } = req.query;
        if (!filename) {
          return res.status(400).json({ message: 'Nombre de archivo del anexo no especificado.' });
        }

        const anexo = solicitud.anexos.find(a => a.filename === filename);
        if (!anexo) {
          return res.status(404).json({ message: 'Anexo no encontrado.' });
        }

        const filePath = path.resolve(anexo.path);
        
        // Security check: ensure the path is within the uploads directory
        const uploadsDir = path.resolve('uploads');
        if (!filePath.startsWith(uploadsDir)) {
          return res.status(403).json({ message: 'Acceso a archivo no permitido.' });
        }

        res.download(filePath, anexo.filename, (err) => {
          if (err) {
            console.error('Error al descargar el anexo:', err);
            if (!res.headersSent) {
              if (err.code === "ENOENT") {
                return res.status(404).send({ message: "El archivo del anexo no existe en el servidor." });
              }
              res.status(500).send({ message: "No se pudo descargar el archivo." });
            }
          }
        });
      } catch (err) {
        console.error('Error procesando la descarga del anexo:', err);
        return res.status(500).json({ message: 'Error procesando la descarga del anexo', error: err.message });
      }
    } else {
        return res.status(400).json({ message: `Formato de documento no soportado: ${format}` });
    }

  } catch (error) {
    console.error('Error al generar el documento de conciliación:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Error en el servidor al generar el documento.', error: error.message });
    }
  }
};

const getConciliacionById = async (req, res) => {
  try {
    const conciliacion = await Conciliacion.findById(req.params.id).populate('user', 'name email');
    if (conciliacion) {
      // Security check could be more robust, ensuring only user or admin can access
      // For now, allowing any authenticated user to fetch for editing purposes
      res.json(conciliacion);
    } else {
      res.status(404).json({ message: 'Solicitud de conciliación no encontrada' });
    }
  } catch (error) {
    console.error('Error fetching conciliation by ID:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
};

const updateConciliacion = async (req, res) => {
  console.log(`[conciliacionController] updateConciliacion ${req.params.id} - received body:`, JSON.stringify(req.body, null, 2));
  try {
    const conciliacion = await Conciliacion.findById(req.params.id);

    if (!conciliacion) {
      return res.status(404).json({ message: 'Solicitud de conciliación no encontrada' });
    }

    // Authorization check
    if (conciliacion.user.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(401).json({ message: 'No autorizado para actualizar esta solicitud' });
    }
    
    // The incoming request body is now the source of truth.
    const dataToUpdate = { ...req.body };
    delete dataToUpdate.user;
    delete dataToUpdate._id;

    // Soportar el cambio de estado (borrador -> completa) al finalizar
    if (dataToUpdate.estado === 'borrador' || dataToUpdate.estado === 'completa') {
      conciliacion.estado = dataToUpdate.estado;
    }
    delete dataToUpdate.estado;

    if (dataToUpdate.seccionesGuardadas) {
      conciliacion.seccionesGuardadas = dataToUpdate.seccionesGuardadas;
    }
    delete dataToUpdate.seccionesGuardadas;

    // Directly assign the data from the request body to the Mongoose document.
    conciliacion.set(dataToUpdate);

    // The 'anexos' and 'firma' arrays from the client are the source of truth.
    // Only overwrite when explicitly sent, so partial saves no las borran.
    if ('anexos' in dataToUpdate) {
      conciliacion.anexos = dataToUpdate.anexos || [];
    }
    if ('firma' in dataToUpdate) {
      conciliacion.firma = dataToUpdate.firma;
    }
    
    console.log("[conciliacionController] updateConciliacion - object to be saved:", JSON.stringify(conciliacion.toObject(), null, 2));
    const updatedConciliacion = await conciliacion.save();
    res.json(updatedConciliacion);

  } catch (error) {
    console.error('Error updating conciliation:', error);
    res.status(400).json({ 
        message: 'Error de validación al actualizar la solicitud.', 
        error: error.errors ? Object.values(error.errors).map(e => e.message) : error.message,
        details: error.errors 
    });
  }
};

// GET /api/conciliaciones — lista de conciliaciones del usuario autenticado
const getMisConciliaciones = async (req, res) => {
  try {
    const query = { user: req.user._id };
    if (req.query.estado) {
      query.estado = req.query.estado;
    }
    const conciliaciones = await Conciliacion.find(query).sort({ updatedAt: -1 });
    res.json(conciliaciones);
  } catch (error) {
    console.error('Error al obtener las conciliaciones del usuario:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
};

// POST /api/conciliaciones/borrador — crea o reutiliza el borrador activo del usuario
const saveBorrador = async (req, res) => {
  console.log("[conciliacionController] saveBorrador - body:", JSON.stringify(req.body, null, 2));
  try {
    const data = { ...req.body };

    let borrador = await Conciliacion.findOne({
      user: req.user._id,
      estado: 'borrador',
    }).sort({ updatedAt: -1 });

    if (!borrador) {
      borrador = new Conciliacion({
        user: req.user._id,
        estado: 'borrador',
        tipoSolicitud: 'Solicitud de Conciliación Unificada',
      });
    }

    delete data.user;
    delete data._id;
    delete data.estado;

    borrador.set(data);

    if ('anexos' in data) borrador.anexos = data.anexos || [];
    if ('firma' in data) borrador.firma = data.firma;
    if ('seccionesGuardadas' in data) borrador.seccionesGuardadas = data.seccionesGuardadas;

    const saved = await borrador.save();
    res.json(saved);
  } catch (error) {
    console.error('Error al guardar el borrador:', error);
    res.status(400).json({
      message: 'Error al guardar el borrador.',
      error: error.errors ? Object.values(error.errors).map(e => e.message) : error.message,
    });
  }
};

// PUT /api/conciliaciones/borrador/:id
const updateBorrador = async (req, res) => {
  console.log(`[conciliacionController] updateBorrador ${req.params.id} - body:`, JSON.stringify(req.body, null, 2));
  try {
    const borrador = await Conciliacion.findById(req.params.id);

    if (!borrador) {
      return res.status(404).json({ message: 'Borrador no encontrado' });
    }
    const isOwner = borrador.user && borrador.user.toString() === req.user._id.toString();
    if (!isOwner && !req.user.isAdmin) {
      return res.status(404).json({ message: 'Borrador no encontrado' });
    }
    if (borrador.estado !== 'borrador') {
      return res.status(400).json({ message: 'La solicitud ya fue completada y no puede guardarse como borrador.' });
    }

    const data = { ...req.body };
    delete data.user;
    delete data._id;
    delete data.estado;

    borrador.set(data);

    if ('anexos' in data) borrador.anexos = data.anexos || [];
    if ('firma' in data) borrador.firma = data.firma;
    if ('seccionesGuardadas' in data) borrador.seccionesGuardadas = data.seccionesGuardadas;

    const saved = await borrador.save();
    res.json(saved);
  } catch (error) {
    console.error('Error al actualizar el borrador:', error);
    res.status(400).json({
      message: 'Error al actualizar el borrador.',
      error: error.errors ? Object.values(error.errors).map(e => e.message) : error.message,
    });
  }
};

// DELETE /api/conciliaciones/borrador/:id
const deleteBorrador = async (req, res) => {
  try {
    const borrador = await Conciliacion.findById(req.params.id);
    if (!borrador) {
      return res.status(404).json({ message: 'Borrador no encontrado' });
    }
    const isOwner = borrador.user && borrador.user.toString() === req.user._id.toString();
    if (!isOwner && !req.user.isAdmin) {
      return res.status(404).json({ message: 'Borrador no encontrado' });
    }
    await borrador.deleteOne();
    res.json({ message: 'Borrador eliminado', id: req.params.id });
  } catch (error) {
    console.error('Error al eliminar el borrador:', error);
    res.status(500).json({ message: 'Error del servidor al eliminar el borrador.' });
  }
};

module.exports = { createConciliacion, getConciliacionDocumento, getConciliacionById, updateConciliacion, getMisConciliaciones, saveBorrador, updateBorrador, deleteBorrador };
