const mongoose = require('mongoose');

// -------------------- Schemas comunes --------------------
const sedeSchema = new mongoose.Schema({
  departamento: { type: String },
  ciudad: { type: String },
  juzgado: { type: String },
});

const anexoSchema = new mongoose.Schema({
  name: { type: String },
  url: { type: String },
  descripcion: { type: String },
  size: { type: Number },
});

const firmaSchema = new mongoose.Schema({
  source: { type: String, enum: ['draw', 'upload'] },
  data: { type: String },
  name: { type: String },
  url: { type: String },
});

// -------------------- Schemas para Liquidación --------------------
const deudorSchema = new mongoose.Schema({
  primerNombre: { type: String },
  segundoNombre: { type: String },
  primerApellido: { type: String },
  segundoApellido: { type: String },
  nombreCompleto: { type: String },
  cedula: { type: String },
  ciudadExpedicion: { type: String },
  telefono: { type: String },
  email: { type: String },
  departamento: { type: String },
  ciudad: { type: String },
  direccion: { type: String },
  noComerciante: { type: Boolean, default: true },
  sociedadConyugalActiva: { type: Boolean, default: false },
  nombreConyuge: { type: String },
  cedulaConyuge: { type: String },
  ciudadExpedicionConyuge: { type: String },
});

const apoderadoSchema = new mongoose.Schema({
  nombreCompleto: { type: String },
  cedula: { type: String },
  ciudadExpedicion: { type: String },
  tp: { type: String },
  direccion: { type: String },
  email: { type: String },
  telefono: { type: String },
});

// Esquema replicado del de insolvencia (solicitudModel.js) con la información
// de mora persistida, ya que en la liquidación las "obligaciones" se derivan de
// las acreencias marcadas con ¿crédito en mora? y ¿mora por más de 90 días?.
const acreenciaSchema = new mongoose.Schema({
  acreedor: { type: mongoose.Schema.Types.ObjectId, ref: 'Acreedor' },
  nombreAcreedor: { type: String },
  tipoAcreedor: { type: String },
  tipoAcreencia: { type: String },
  otroTipoAcreencia: { type: String },
  naturalezaCredito: { type: String },
  naturaleza: { type: String },
  descripcionCredito: { type: String },
  capital: { type: Number, default: 0 },
  valorTotalInteresCorriente: { type: Number, default: 0 },
  tasaInteresCorriente: { type: String },
  tipoInteresCorriente: { type: String },
  pagoPorLibranza: { type: Boolean, default: false },
  creditoPostergado: { type: Boolean, default: false },
  creditoEnMora: { type: Boolean, default: false },
  moraMas90Dias: { type: Boolean, default: false },
  diasDeMora: { type: Number },
  valorTotalInteresMoratorio: { type: Number, default: 0 },
  tasaInteresMoratorio: { type: String },
  tipoInteresMoratorio: { type: String },
  fechaOtorgamiento: { type: Date },
  fechaVencimiento: { type: Date },
});

const procesoSchema = new mongoose.Schema({
  tipoProceso: { type: String },
  juzgado: { type: String },
  radicado: { type: String },
  estado: { type: String },
  demandante: { type: String },
  demandado: { type: String },
  valor: { type: Number, default: 0 },
  departamento: { type: String },
  ciudad: { type: String },
  direccionJuzgado: { type: String },
  emailJuzgado: { type: String },
});

const infoFinancieraSchema = new mongoose.Schema({
  cuantiaTotal: { type: Number, default: 0 },
  numeroObligaciones: { type: Number, default: 0 },
  numeroAcreedores: { type: Number, default: 0 },
  porcentajePasivo: { type: Number, default: 100 },
  ingresosMensuales: { type: Number, default: 0 },
  ingresosActividadPrincipal: { type: Number, default: 0 },
  descripcionActividadEconomica: { type: String },
  tieneEmpleo: { type: Boolean, default: false },
  tipoEmpleo: { type: String },
  ingresosOtrasActividades: { type: Number, default: 0 },
  gastosPersonales: { type: mongoose.Schema.Types.Mixed },
  obligacionesAlimentarias: { type: [mongoose.Schema.Types.Mixed], default: [] },
  entidadEmpleadora: { type: String },
  cargoEmpleo: { type: String },
  gastosMensuales: { type: Number, default: 0 },
  capacidadPago: { type: Number, default: 0 },
  tieneBienesEmbargables: { type: Boolean, default: false },
});

const entidadFinancieraSchema = new mongoose.Schema({
  nombre: { type: String },
});

// -------------------- Esquema principal --------------------
const liquidacionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    tipoSolicitud: {
      type: String,
      required: true,
      default: 'Solicitud de Liquidación Patrimonial Directa de Persona Natural No Comerciante',
    },
    estado: { type: String, enum: ['borrador', 'completa'], default: 'completa' },
    seccionesGuardadas: { type: mongoose.Schema.Types.Mixed },

    sede: sedeSchema,
    deudor: deudorSchema,
    apoderado: apoderadoSchema,
    acreencias: [acreenciaSchema],
    procesosJudiciales: [procesoSchema],
    informacionFinanciera: infoFinancieraSchema,
    entidadesFinancieras: [entidadFinancieraSchema],
    pruebas: [String],
    anexos: [anexoSchema],
    firma: firmaSchema,
    firmaDeudor: firmaSchema,
    bienesInventarioImagen: anexoSchema,
    certificacionLaboralImagen: anexoSchema,
  },
  { timestamps: true }
);

const Liquidacion = mongoose.model('Liquidacion', liquidacionSchema);

module.exports = Liquidacion;