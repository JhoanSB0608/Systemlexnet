const Liquidacion = require('../models/liquidacionModel');
const fs = require('fs');
const path = require('path');

const { generateLiquidacionPdf } = require('../utils/LiquidacionDocumentGenerator');
const { generateLiquidacionAnexosPdf } = require('../utils/AnexosLiquidacionDocumentGenerator');

const TIPO_LIQUIDACION = 'Solicitud de Liquidación Patrimonial Directa de Persona Natural No Comerciante';

const buildDeudorNombreCompleto = (deudor) => {
  if (!deudor) return;
  deudor.nombreCompleto = [
    deudor.primerNombre,
    deudor.segundoNombre,
    deudor.primerApellido,
    deudor.segundoApellido,
  ].filter(Boolean).join(' ');
};

// El formulario envía el acreedor completo (objeto del listado); el modelo solo
// persiste la referencia (ObjectId). Aquí se normaliza y se conserva el nombre
// denormalizado para el documento sin necesidad de hacer populate siempre.
const normalizeAcreedores = (data) => {
  if (!data || !Array.isArray(data.acreencias)) return data;
  data.acreencias = data.acreencias.map((a) => {
    const acreencia = { ...a };
    const ac = acreencia.acreedor;
    if (ac && typeof ac === 'object' && !Array.isArray(ac) && ac._id) {
      acreencia.nombreAcreedor = ac.nombre || acreencia.nombreAcreedor;
      acreencia.tipoAcreedor = ac.tipoDoc || acreencia.tipoAcreedor;
      acreencia.acreedor = ac._id;
    }
    return acreencia;
  });
  return data;
};

const createLiquidacion = async (req, res) => {
  console.log('[liquidacionController] createLiquidacion - received body:', JSON.stringify(req.body, null, 2));
  try {
    const dataToSave = req.body;
    dataToSave.user = req.user._id;

    if (!dataToSave.tipoSolicitud) {
      dataToSave.tipoSolicitud = TIPO_LIQUIDACION;
    }

    buildDeudorNombreCompleto(dataToSave.deudor);
    normalizeAcreedores(dataToSave);

    const liquidacion = new Liquidacion(dataToSave);
    const createdLiquidacion = await liquidacion.save();
    res.status(201).json(createdLiquidacion);
  } catch (error) {
    console.error('Error al crear la liquidación:', error);
    res.status(400).json({
      message: 'Error de validación al guardar la solicitud.',
      error: error.errors ? Object.values(error.errors).map(e => e.message) : error.message,
      details: error.errors,
    });
  }
};

const getLiquidacionDocumento = async (req, res) => {
  try {
    const liquidacion = await Liquidacion.findById(req.params.id).populate('user').populate('acreencias.acreedor');

    if (!liquidacion) {
      return res.status(404).json({ message: 'Solicitud de liquidación no encontrada' });
    }

    if (!liquidacion.user || (liquidacion.user._id.toString() !== req.user._id.toString() && !req.user.isAdmin)) {
      return res.status(401).json({ message: 'No autorizado para ver este documento' });
    }

    const format = req.query.format || 'pdf';

    if (format === 'pdf') {
      const baseUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3000}`;
      const buffer = await generateLiquidacionPdf(liquidacion, baseUrl);
      const filename = `liquidacion-${liquidacion._id}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
      res.send(buffer);
    } else if (format === 'anexo') {
      try {
        const { filename } = req.query;
        if (!filename) {
          return res.status(400).json({ message: 'Nombre de archivo del anexo no especificado.' });
        }

        const anexo = liquidacion.anexos.find(a => a.filename === filename);
        if (!anexo) {
          return res.status(404).json({ message: 'Anexo no encontrado.' });
        }

        const filePath = path.resolve(anexo.path);
        const uploadsDir = path.resolve('uploads');
        if (!filePath.startsWith(uploadsDir)) {
          return res.status(403).json({ message: 'Acceso a archivo no permitido.' });
        }

        res.download(filePath, anexo.filename, (err) => {
          if (err) {
            console.error('Error al descargar el anexo:', err);
            if (!res.headersSent) {
              if (err.code === 'ENOENT') {
                return res.status(404).send({ message: 'El archivo del anexo no existe en el servidor.' });
              }
              res.status(500).send({ message: 'No se pudo descargar el archivo.' });
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
    console.error('Error al generar el documento de liquidación:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Error en el servidor al generar el documento.', error: error.message });
    }
  }
};

const getLiquidacionAnexos = async (req, res) => {
  try {
    const liquidacion = await Liquidacion.findById(req.params.id).populate('user').populate('acreencias.acreedor');

    if (!liquidacion) {
      return res.status(404).json({ message: 'Solicitud de liquidación no encontrada' });
    }

    if (!liquidacion.user || (liquidacion.user._id.toString() !== req.user._id.toString() && !req.user.isAdmin)) {
      return res.status(401).json({ message: 'No autorizado para ver este documento' });
    }

    const baseUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3000}`;
    const buffer = await generateLiquidacionAnexosPdf(liquidacion, baseUrl);
    const filename = `anexos-liquidacion-${liquidacion._id}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.send(buffer);
  } catch (error) {
    console.error('Error al generar los anexos de liquidación:', error);
    res.status(500).json({ message: 'Error en el servidor al generar los anexos.', error: error.message });
  }
};

const getLiquidacionById = async (req, res) => {
  try {
    const liquidacion = await Liquidacion.findById(req.params.id).populate('user', 'name email');
    if (liquidacion) {
      if (liquidacion.user && liquidacion.user._id.toString() !== req.user._id.toString() && !req.user.isAdmin) {
        return res.status(401).json({ message: 'No autorizado para ver esta solicitud' });
      }
      res.json(liquidacion);
    } else {
      res.status(404).json({ message: 'Solicitud de liquidación no encontrada' });
    }
  } catch (error) {
    console.error('Error al obtener la liquidación:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
};

const updateLiquidacion = async (req, res) => {
  try {
    const liquidacion = await Liquidacion.findById(req.params.id);

    if (!liquidacion) {
      return res.status(404).json({ message: 'Solicitud de liquidación no encontrada' });
    }

    if (liquidacion.user.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(401).json({ message: 'No autorizado para actualizar esta solicitud' });
    }

    const dataToUpdate = { ...req.body };
    delete dataToUpdate.user;
    delete dataToUpdate._id;

    if (dataToUpdate.estado === 'borrador' || dataToUpdate.estado === 'completa') {
      liquidacion.estado = dataToUpdate.estado;
    }
    delete dataToUpdate.estado;

    if (dataToUpdate.seccionesGuardadas) {
      liquidacion.seccionesGuardadas = dataToUpdate.seccionesGuardadas;
    }
    delete dataToUpdate.seccionesGuardadas;

    buildDeudorNombreCompleto(dataToUpdate.deudor);
    normalizeAcreedores(dataToUpdate);
    liquidacion.set(dataToUpdate);

    if ('anexos' in dataToUpdate) {
      liquidacion.anexos = dataToUpdate.anexos || [];
    }
    if ('firma' in dataToUpdate) {
      liquidacion.firma = dataToUpdate.firma;
    }
    if ('firmaDeudor' in dataToUpdate) {
      liquidacion.firmaDeudor = dataToUpdate.firmaDeudor;
    }
    if ('bienesInventarioImagen' in dataToUpdate) {
      liquidacion.bienesInventarioImagen = dataToUpdate.bienesInventarioImagen;
    }
    if ('certificacionLaboralImagen' in dataToUpdate) {
      liquidacion.certificacionLaboralImagen = dataToUpdate.certificacionLaboralImagen;
    }

    const updatedLiquidacion = await liquidacion.save();
    res.json(updatedLiquidacion);
  } catch (error) {
    console.error('Error al actualizar la liquidación:', error);
    res.status(400).json({
      message: 'Error de validación al actualizar la solicitud.',
      error: error.errors ? Object.values(error.errors).map(e => e.message) : error.message,
      details: error.errors,
    });
  }
};

const getMisLiquidaciones = async (req, res) => {
  try {
    const query = { user: req.user._id };
    if (req.query.estado) {
      query.estado = req.query.estado;
    }
    const liquidaciones = await Liquidacion.find(query).sort({ updatedAt: -1 });
    res.json(liquidaciones);
  } catch (error) {
    console.error('Error al obtener las liquidaciones del usuario:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
};

const saveBorrador = async (req, res) => {
  try {
    const data = { ...req.body };

    let borrador = await Liquidacion.findOne({
      user: req.user._id,
      estado: 'borrador',
    }).sort({ updatedAt: -1 });

    if (!borrador) {
      borrador = new Liquidacion({
        user: req.user._id,
        estado: 'borrador',
        tipoSolicitud: data.tipoSolicitud || TIPO_LIQUIDACION,
      });
    }

    delete data.user;
    delete data._id;
    delete data.estado;

    buildDeudorNombreCompleto(data.deudor);
    normalizeAcreedores(data);
    borrador.set(data);

    if ('anexos' in data) borrador.anexos = data.anexos || [];
    if ('firma' in data) borrador.firma = data.firma;
    if ('firmaDeudor' in data) borrador.firmaDeudor = data.firmaDeudor;
    if ('bienesInventarioImagen' in data) borrador.bienesInventarioImagen = data.bienesInventarioImagen;
    if ('certificacionLaboralImagen' in data) borrador.certificacionLaboralImagen = data.certificacionLaboralImagen;
    if ('seccionesGuardadas' in data) borrador.seccionesGuardadas = data.seccionesGuardadas;

    const saved = await borrador.save();
    res.json(saved);
  } catch (error) {
    res.status(400).json({
      message: 'Error al guardar el borrador.',
      error: error.errors ? Object.values(error.errors).map(e => e.message) : error.message,
    });
  }
};

const updateBorrador = async (req, res) => {
  try {
    const borrador = await Liquidacion.findById(req.params.id);

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

    buildDeudorNombreCompleto(data.deudor);
    normalizeAcreedores(data);
    borrador.set(data);

    if ('anexos' in data) borrador.anexos = data.anexos || [];
    if ('firma' in data) borrador.firma = data.firma;
    if ('firmaDeudor' in data) borrador.firmaDeudor = data.firmaDeudor;
    if ('bienesInventarioImagen' in data) borrador.bienesInventarioImagen = data.bienesInventarioImagen;
    if ('certificacionLaboralImagen' in data) borrador.certificacionLaboralImagen = data.certificacionLaboralImagen;
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

const deleteBorrador = async (req, res) => {
  try {
    const borrador = await Liquidacion.findById(req.params.id);
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

module.exports = {
  createLiquidacion,
  getLiquidacionDocumento,
  getLiquidacionAnexos,
  getLiquidacionById,
  updateLiquidacion,
  getMisLiquidaciones,
  saveBorrador,
  updateBorrador,
  deleteBorrador,
};