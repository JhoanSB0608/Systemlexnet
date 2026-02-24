const mongoose = require('mongoose');

// ====================
// SCHEMAS REUSABLES
// ====================

const anexoSchema = new mongoose.Schema({
  name: { type: String },
  url: { type: String },
  descripcion: { type: String },
  size: { type: Number }, // To store file size for display
});

const contactInfoSchema = new mongoose.Schema({
  tipoIdentificacion: { type: String, required: true },
  numeroIdentificacion: { type: String, required: true },
  telefono: { type: String, required: true },
  email: { type: String, required: true },
  pais: { type: String, required: true },
  departamento: { type: String, required: true },
  ciudad: { type: String, required: true },
  domicilio: { type: String, required: true },
});

// ====================
// ARCHIVER INSOLVENCIA SCHEMA
// ====================

const archiverDeudorSchema = new mongoose.Schema({
  nombreCompleto: { type: String, required: true },
  ...contactInfoSchema.obj, // Embed contact info fields
});

const archiverInsolvenciaSchema = new mongoose.Schema({
  deudor: { type: archiverDeudorSchema, required: true },
  anexos: { type: [anexoSchema], default: [] }, // Add default: []
}, { _id: false }); // Do not create _id for subdocument

// ====================
// ARCHIVER CONCILIACION SCHEMA
// ====================

const archiverConvocanteSchema = new mongoose.Schema({
  nombreCompleto: { type: String, required: true },
  ...contactInfoSchema.obj, // Embed contact info fields
});

const archiverConvocadoSchema = new mongoose.Schema({
  nombreCompleto: { type: String, required: true },
  ...contactInfoSchema.obj, // Embed contact info fields
});

const archiverConciliacionSchema = new mongoose.Schema({
  convocante: { type: archiverConvocanteSchema, required: true },
  convocado: { type: archiverConvocadoSchema, required: true },
  anexos: { type: [anexoSchema], default: [] }, // Add default: []
}, { _id: false }); // Do not create _id for subdocument

// ====================
// MAIN ARCHIVER ENTRY MODEL
// ====================

const archiverEntrySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tipoSolicitud: {
    type: String,
    required: true,
    enum: [
      'Solicitud de Insolvencia Económica',
      'Solicitud de Conciliación Unificada',
    ],
  },
  insolvenciaData: archiverInsolvenciaSchema,
  conciliacionData: archiverConciliacionSchema,
}, { timestamps: true });

const ArchiverEntry = mongoose.model('ArchiverEntry', archiverEntrySchema);

module.exports = ArchiverEntry;
