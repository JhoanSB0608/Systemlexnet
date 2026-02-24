const mongoose = require('mongoose');

// Schemas copied from solicitudModel.js
const sedeSchema = new mongoose.Schema({
  departamento: { type: String },
  ciudad: { type: String },
  entidadPromotora: { type: String },
  sedeCentro: { type: String },
});

const anexoSchema = new mongoose.Schema({
  name: { type: String },
  url: { type: String },
  descripcion: { type: String },
  size: { type: Number }, // Added size field
});

const firmaSchema = new mongoose.Schema({
  source: { type: String, enum: ['draw', 'upload'] },
  data: { type: String }, // This will store the base64 data URL
  name: { type: String }, // For uploaded file's original name
  url: { type: String }, // For uploaded file's path
});


// Schemas for Conciliacion
const partyMemberSchema = new mongoose.Schema({
    tipoInvolucrado: String,
    tipoIdentificacion: String,
    numeroIdentificacion: String,
    razonSocial: String,
    primerNombre: String,
    segundoNombre: String,
    primerApellido: String,
    segundoApellido: String,
    departamentoExpedicion: String,
    ciudadExpedicion: String,
    telefono: String,
    email: String,
    paisOrigen: String,
    fechaNacimiento: Date,
    genero: String,
    estadoCivil: String,
    departamento: String,
    ciudad: String,
    domicilio: String,
});

const infoGeneralConciliacionSchema = new mongoose.Schema({
    solicitanteServicio: String,
    finalidadServicio: String,
    tiempoConflicto: String,
    asuntoJuridicoDefinible: Boolean,
    areaDerecho: String,
    tema: String,
    cuantiaDetallada: Boolean,
    cuantiaIndeterminada: Boolean,
    cuantiaTexto: String,
    cuantiaTotal: Number,
});

const hechoSchema = new mongoose.Schema({
    descripcion: String,
});

const pretensionSchema = new mongoose.Schema({
    descripcion: String,
});

const conciliacionSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    tipoSolicitud: {
        type: String,
        required: true,
        default: 'Solicitud de Conciliación Unificada',
    },
    sede: sedeSchema,
    infoGeneral: infoGeneralConciliacionSchema,
    convocantes: [partyMemberSchema],
    convocados: [partyMemberSchema],
    hechos: [hechoSchema],
    pretensiones: [pretensionSchema],
    anexos: [anexoSchema],
    firma: firmaSchema,
}, { timestamps: true });

const Conciliacion = mongoose.model('Conciliacion', conciliacionSchema);

module.exports = Conciliacion;