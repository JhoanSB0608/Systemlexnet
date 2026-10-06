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
  type: { type: String },
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
  genero: { type: String },
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
  genero: { type: String },
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

// Esquemas replicados del de insolvencia (solicitudModel.js) para el Anexo 3.
const bienMuebleSchema = new mongoose.Schema({
  tipoBienMueble: { type: String },
  clasificacion: { type: String },
  descripcion: { type: String },
  marca: { type: String },
  modelo: { type: String },
  placa: { type: String },
  tarjetaPropiedad: { type: String },
  oficinaTransito: { type: String },
  avaluoComercial: { type: Number, default: 0 },
  tipoComplemento: { type: String },
  categoria: { type: String },
  descripcionComplemento: { type: String },
  leasing: { type: Boolean },
  prenda: { type: Boolean },
  garantiaMobiliaria: { type: Boolean },
  pactoRetroventa: { type: Boolean },
  acreedores: { type: Map, of: Boolean },
});

const bienInmuebleSchema = new mongoose.Schema({
  descripcion: { type: String },
  matricula: { type: String },
  escrituraPublica: { type: String },
  avaluoCatastral: { type: Number, default: 0 },
  direccion: { type: String },
  ciudad: { type: String },
  departamento: { type: String },
  pais: { type: String },
  porcentajeParticipacion: { type: String },
  avaluoComercial: { type: Number, default: 0 },
  afectadoViviendaFamiliar: { type: Boolean, default: false },
  tipoComplemento: { type: String },
  categoria: { type: String },
  descripcionComplemento: { type: String },
  leasing: { type: Boolean },
  prenda: { type: Boolean },
  garantiaMobiliaria: { type: Boolean },
  pactoRetroventa: { type: Boolean },
  acreedores: { type: Map, of: Boolean },
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
    bienesMuebles: [bienMuebleSchema],
    bienesInmuebles: [bienInmuebleSchema],
    noPoseeBienes: { type: Boolean, default: false },
    informacionFinanciera: infoFinancieraSchema,
    pruebas: [String],
    anexos: [anexoSchema],
    firma: firmaSchema,
    firmaDeudor: firmaSchema,
    bienesInventarioImagen: anexoSchema,
    certificacionLaboralImagen: anexoSchema,
    redamArchivo: anexoSchema,
  },
  { timestamps: true }
);

const Liquidacion = mongoose.model('Liquidacion', liquidacionSchema);

module.exports = Liquidacion;