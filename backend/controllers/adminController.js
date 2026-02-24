const Conciliacion = require('../models/conciliacionModel');
const Solicitud = require('../models/solicitudModel');
const User = require('../models/userModel');
const Acreedor = require('../models/acreedorModel');

// @desc    Obtener estadísticas para el dashboard
// @route   GET /api/admin/stats
// @access  Private/Admin
const getStats = async (req, res) => {
  try {
    const totalSolicitudesInsolvencia = await Solicitud.countDocuments({});
    const totalSolicitudesConciliacion = await Conciliacion.countDocuments({});
    const totalSolicitudes = totalSolicitudesInsolvencia + totalSolicitudesConciliacion;

    const totalUsuarios = await User.countDocuments({});
    const totalAcreedores = await Acreedor.countDocuments({});

    const solicitudesPorTipoInsolvencia = await Solicitud.aggregate([
      { $group: { _id: '$tipoSolicitud', count: { $sum: 1 } } },
    ]);
    const solicitudesPorTipoConciliacion = await Conciliacion.aggregate([
      { $group: { _id: '$tipoSolicitud', count: { $sum: 1 } } },
    ]);

    // Merge solicitudesPorTipo results
    const solicitudesPorTipoMap = new Map();
    [...solicitudesPorTipoInsolvencia, ...solicitudesPorTipoConciliacion].forEach(item => {
      solicitudesPorTipoMap.set(item._id, (solicitudesPorTipoMap.get(item._id) || 0) + item.count);
    });
    const solicitudesPorTipo = Array.from(solicitudesPorTipoMap, ([_id, count]) => ({ _id, count }))
      .sort((a, b) => b.count - a.count);


    const solicitudesPorMesInsolvencia = await Solicitud.aggregate([
        { $group: { 
            _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } }, 
            count: { $sum: 1 } 
        }},
    ]);
    const solicitudesPorMesConciliacion = await Conciliacion.aggregate([
        { $group: { 
            _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } }, 
            count: { $sum: 1 } 
        }},
    ]);

    // Merge solicitudesPorMes results
    const solicitudesPorMesMap = new Map();
    [...solicitudesPorMesInsolvencia, ...solicitudesPorMesConciliacion].forEach(item => {
      const key = `${item._id.year}-${item._id.month}`;
      const existing = solicitudesPorMesMap.get(key) || { _id: item._id, count: 0 };
      existing.count += item.count;
      solicitudesPorMesMap.set(key, existing);
    });
    const solicitudesPorMes = Array.from(solicitudesPorMesMap.values())
      .sort((a, b) => (a._id.year - b._id.year) || (a._id.month - b._id.month));


    res.json({ 
      totalSolicitudes, 
      totalUsuarios,
      totalAcreedores,
      solicitudesPorTipo, 
      solicitudesPorMes 
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener estadísticas', error: error.message });
  }
};

// @desc    Obtener historial de solicitudes con paginación
// @route   GET /api/admin/solicitudes
// @access  Private/Admin
const getSolicitudes = async (req, res) => {
  try {
    const { page = 1, limit = 10, filters = '[]', sorting = '[]' } = req.query;
    
    // Build query and sort options from request
    const parsedFilters = JSON.parse(filters);
    const query = {};
    if (parsedFilters.length > 0) {
      query.$and = parsedFilters.map(filter => {
        if (filter.id === 'user.name') { // Corrected filter id
          return { 'user.name': { $regex: filter.value, $options: 'i' } };
        }
        return { [filter.id]: { $regex: filter.value, $options: 'i' } };
      });
    }

    const parsedSorting = JSON.parse(sorting);
    const sortOptions = parsedSorting.length > 0
      ? parsedSorting.reduce((acc, sort) => {
          acc[sort.id] = sort.desc ? -1 : 1;
          return acc;
        }, {})
      : { createdAt: -1 };

    // Perform parallel queries
    const [solicitudesInsolvencia, solicitudesConciliacion, countInsolvencia, countConciliacion] = await Promise.all([
      Solicitud.find(query).populate('user', 'name email').populate('acreencias.acreedor').lean(),
      Conciliacion.find(query).populate('user', 'name email').lean(),
      Solicitud.countDocuments(query),
      Conciliacion.countDocuments(query)
    ]);
    
    // Combine, sort, and paginate in memory
    const combinedResults = [...solicitudesInsolvencia, ...solicitudesConciliacion];

    // In-memory sort
    combinedResults.sort((a, b) => {
      for (const sort of parsedSorting) {
        const fieldA = a[sort.id];
        const fieldB = b[sort.id];
        if (fieldA < fieldB) return sort.desc ? 1 : -1;
        if (fieldA > fieldB) return sort.desc ? -1 : 1;
      }
      // Default sort if no sorting is provided or values are equal
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    
    const totalRows = countInsolvencia + countConciliacion;
    const pageIndex = parseInt(page) - 1;
    const pageSize = parseInt(limit);
    const pagedResults = combinedResults.slice(
      pageIndex * pageSize,
      (pageIndex + 1) * pageSize
    );

    res.json({ 
      rows: pagedResults, 
      pageCount: Math.ceil(totalRows / pageSize),
      totalRows: totalRows,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener solicitudes', error: error.message });
  }
};

const uploadAnexo = async (req, res) => {
  try {
    const { tipo, id } = req.params;
    const { filename, fileUrl, descripcion, size } = req.body; // Expect filename, fileUrl, description, and size

    if (!descripcion && (!filename || !fileUrl)) {
      return res.status(400).json({ message: 'El nombre del archivo y la URL son requeridos si no hay una descripción.' });
    }

    let DocumentModel;
    if (tipo === 'insolvencia') {
      DocumentModel = Solicitud;
    } else if (tipo === 'conciliacion') {
      DocumentModel = Conciliacion;
    } else {
      return res.status(400).json({ message: 'Tipo de documento no válido.' });
    }

    const document = await DocumentModel.findById(id);

    if (!document) {
      return res.status(404).json({ message: 'Documento no encontrado.' });
    }

    const newAnexo = {
      name: filename || 'Nota de Texto', // Store the GCS object name or placeholder
      url: fileUrl || '',   // Store the GCS public URL or empty
      descripcion: descripcion || '',
      size: size || 0, // Store the size of the file
    };

    document.anexos.push(newAnexo);
    await document.save();

    res.status(200).json(document);
  } catch (error) {
    console.error('Error al subir anexo:', error);
    res.status(500).json({ message: 'Error en el servidor al subir el anexo.', error: error.message });
  }
};


module.exports = { getStats, getSolicitudes, uploadAnexo };