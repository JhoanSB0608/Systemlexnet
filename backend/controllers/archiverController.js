const ArchiverEntry = require('../models/archiverEntryModel');

// @desc    Create a new Archiver Entry (Insolvencia or Conciliacion)
// @route   POST /api/archiver
// @access  Private
const createArchiverEntry = async (req, res) => {
  const { tipoSolicitud, insolvenciaData, conciliacionData } = req.body;
  const user = req.user._id;

  try {
    let newEntry;
    if (tipoSolicitud === 'Solicitud de Insolvencia Económica' && insolvenciaData) {
      newEntry = new ArchiverEntry({
        user,
        tipoSolicitud,
        insolvenciaData,
      });
    } else if (tipoSolicitud === 'Solicitud de Conciliación Unificada' && conciliacionData) {
      newEntry = new ArchiverEntry({
        user,
        tipoSolicitud,
        conciliacionData,
      });
    } else {
      return res.status(400).json({ message: 'Invalid tipoSolicitud or missing data.' });
    }

    const createdEntry = await newEntry.save();
    res.status(201).json(createdEntry);
  } catch (error) {
    console.error('Error creating archiver entry:', error);
    res.status(400).json({
      message: 'Error creating archiver entry.',
      error: error.message,
    });
  }
};

// @desc    Get all Archiver Entries for the authenticated user
// @route   GET /api/archiver
// @access  Private
const getArchiverEntries = async (req, res) => {
  const user = req.user._id;
  try {
    const entries = await ArchiverEntry.find({ user }).sort({ createdAt: -1 });
    res.json(entries);
  } catch (error) {
    console.error('Error fetching archiver entries:', error);
    res.status(500).json({ message: 'Error fetching archiver entries.', error: error.message });
  }
};

// @desc    Get a single Archiver Entry by ID for the authenticated user
// @route   GET /api/archiver/:id
// @access  Private
const getArchiverEntryById = async (req, res) => {
  const { id } = req.params;
  const user = req.user._id;

  try {
    const entry = await ArchiverEntry.findOne({ _id: id, user });
    if (!entry) {
      return res.status(404).json({ message: 'Archiver Entry not found or unauthorized.' });
    }
    res.json(entry);
  } catch (error) {
    console.error('Error fetching archiver entry by ID:', error);
    res.status(500).json({ message: 'Error fetching archiver entry.', error: error.message });
  }
};

// @desc    Upload an anexo to an existing Archiver Entry
// @route   POST /api/archiver/:id/anexos
// @access  Private
const uploadArchiverAnexo = async (req, res) => {
  const { id } = req.params;
  const { name, url, descripcion, size } = req.body; // Expect name, url, description, and size
  const user = req.user._id;

  if (!descripcion && (!name || !url)) {
    return res.status(400).json({ message: 'File name and URL are required if no description is provided.' });
  }

  try {
    const entry = await ArchiverEntry.findOne({ _id: id, user });
    if (!entry) {
      return res.status(404).json({ message: 'Archiver Entry not found or unauthorized.' });
    }

    const newAnexo = { 
      name: name || ' ', 
      url: url || '', 
      descripcion: descripcion || '', 
      size: size || 0 
    };

    // Determine which anexos array to push to based on tipoSolicitud
    if (entry.tipoSolicitud === 'Solicitud de Insolvencia Económica') {
      // Ensure insolvenciaData and its anexos array exist
      if (!entry.insolvenciaData) {
        entry.insolvenciaData = {}; // Initialize if undefined
      }
      if (!entry.insolvenciaData.anexos) {
        entry.insolvenciaData.anexos = []; // Initialize if undefined (though schema default should handle this)
      }
      entry.insolvenciaData.anexos.push(newAnexo);
    } else if (entry.tipoSolicitud === 'Solicitud de Conciliación Unificada') {
      // Ensure conciliacionData and its anexos array exist
      if (!entry.conciliacionData) {
        entry.conciliacionData = {}; // Initialize if undefined
      }
      if (!entry.conciliacionData.anexos) {
        entry.conciliacionData.anexos = []; // Initialize if undefined
      }
      entry.conciliacionData.anexos.push(newAnexo);
    } else {
      return res.status(400).json({ message: 'Unknown tipoSolicitud for this entry.' });
    }

    await entry.save();

    res.status(200).json(entry);
  } catch (error) {
    console.error('Error uploading anexo to archiver entry:', error);
    res.status(500).json({ message: 'Error uploading anexo.', error: error.message });
  }
};

module.exports = {
  createArchiverEntry,
  getArchiverEntries,
  getArchiverEntryById,
  uploadArchiverAnexo,
};
