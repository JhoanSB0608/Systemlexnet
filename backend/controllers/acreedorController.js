const Acreedor = require('../models/acreedorModel');

// @desc    Obtener todos los acreedores de un usuario (con filtros, paginación y ordenamiento)
// @route   GET /api/acreedores
// @access  Private
const getAcreedores = async (req, res) => {
  try {
    const { pageIndex = 0, pageSize = 10, filters = '[]', sorting = '[]' } = req.query;
    const query = {}; // Removed user-specific filter

    // Lógica de filtros por columna
    const parsedFilters = JSON.parse(filters);
    if (parsedFilters.length > 0) {
      query.$and = parsedFilters.map(filter => ({
        [filter.id]: { $regex: filter.value, $options: 'i' },
      }));
    }

    // Lógica de ordenamiento
    const parsedSorting = JSON.parse(sorting);
    const sortOptions = parsedSorting.length > 0
      ? parsedSorting.reduce((acc, sort) => {
          acc[sort.id] = sort.desc ? -1 : 1;
          return acc;
        }, {})
      : { createdAt: -1 }; // Orden por defecto

    const acreedores = await Acreedor.find(query)
      .sort(sortOptions)
      .skip(parseInt(pageIndex) * parseInt(pageSize))
      .limit(parseInt(pageSize));

    const totalAcreedores = await Acreedor.countDocuments(query);

    res.json({
      rows: acreedores,
      pageCount: Math.ceil(totalAcreedores / parseInt(pageSize)),
      totalRows: totalAcreedores, // Añadir el conteo total de filas
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener acreedores', error: error.message });
  }
};

// ... (resto de las funciones sin cambios)

// @desc    Obtener un acreedor por ID
// @route   GET /api/acreedores/:id
// @access  Private
const getAcreedorById = async (req, res) => {
  try {
    const acreedor = await Acreedor.findById(req.params.id);

    if (!acreedor) {
      return res.status(404).json({ message: 'Acreedor no encontrado' });
    }

    res.json(acreedor);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener acreedor', error: error.message });
  }
};

// @desc    Crear un acreedor
// @route   POST /api/acreedores
// @access  Private
const createAcreedor = async (req, res) => {
  try {
    const { nombre, tipoDoc, nitCc, direccion, email, telefono, pais, departamento, ciudad } = req.body;

    if (!nombre || !tipoDoc || !nitCc || !direccion || !email || !telefono) {
      return res.status(400).json({ message: 'Por favor, complete todos los campos obligatorios.' });
    }

    const acreedor = new Acreedor({
      user: req.user._id,
      nombre,
      tipoDoc, // Asegurándose de que se incluye
      nitCc,
      direccion,
      email,
      telefono,
      pais,
      departamento,
      ciudad,
    });

    const createdAcreedor = await acreedor.save();
    res.status(201).json(createdAcreedor);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Ya existe un acreedor con este No. de Documento para su usuario.' });
    }
    res.status(400).json({ message: error.message });
  }
};

// @desc    Actualizar un acreedor
// @route   PUT /api/acreedores/:id
// @access  Private
const updateAcreedor = async (req, res) => {
  try {
    const acreedor = await Acreedor.findById(req.params.id);

    if (!acreedor) {
      return res.status(404).json({ message: 'Acreedor no encontrado' });
    }

    const { nombre, tipoDoc, nitCc, direccion, email, telefono, pais, departamento, ciudad } = req.body;

    acreedor.nombre = nombre || acreedor.nombre;
    acreedor.tipoDoc = tipoDoc || acreedor.tipoDoc; // Asegurándose de que se actualiza
    acreedor.nitCc = nitCc || acreedor.nitCc;
    acreedor.direccion = direccion || acreedor.direccion;
    acreedor.email = email || acreedor.email;
    acreedor.telefono = telefono || acreedor.telefono;
    acreedor.pais = pais || acreedor.pais;
    acreedor.departamento = departamento || acreedor.departamento;
    acreedor.ciudad = ciudad || acreedor.ciudad;

    const updatedAcreedor = await acreedor.save();
    res.json(updatedAcreedor);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Conflicto: Ya existe otro acreedor con este No. de Documento.' });
    }
    res.status(400).json({ message: error.message });
  }
};

// @desc    Eliminar un acreedor
// @route   DELETE /api/acreedores/:id
// @access  Private
const deleteAcreedor = async (req, res) => {
  try {
    const acreedor = await Acreedor.findById(req.params.id);

    if (!acreedor) {
      return res.status(404).json({ message: 'Acreedor no encontrado' });
    }

    await acreedor.deleteOne();
    res.json({ message: 'Acreedor eliminado' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar acreedor', error: error.message });
  }
};

module.exports = { getAcreedores, getAcreedorById, createAcreedor, updateAcreedor, deleteAcreedor };
