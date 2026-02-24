const mongoose = require('mongoose');

// ====================
// SCHEMAS COMUNES
// ====================
const personaSchema = new mongoose.Schema({
  nombre: { type: String },
  cedula: { type: String },
  direccion: { type: String },
  telefono: { type: String },
  email: { type: String },
});

const hijoSchema = new mongoose.Schema({
  nombre: { type: String },
  fechaNacimiento: { type: Date },
});

// ====================
// SCHEMAS PARA INSOLVENCIA
// ====================

const deudorSchema = new mongoose.Schema({
  primerNombre: { type: String },
  segundoNombre: { type: String },
  primerApellido: { type: String },
  segundoApellido: { type: String },
  nombreCompleto: { type: String, required: true },
  tipoIdentificacion: { type: String },
  cedula: { type: String, required: true },
  departamentoExpedicion: { type: String },
  ciudadExpedicion: { type: String },
  telefono: { type: String },
  email: { type: String },
  paisOrigen: { type: String },
  departamentoNacimiento: { type: String },
  ciudadNacimiento: { type: String },
  fechaNacimiento: { type: Date },
  genero: { type: String },
  estadoCivil: { type: String },
  etnia: { type: String },
  discapacidad: { type: String },
  otraDiscapacidad: { type: String },
  departamento: { type: String },
  ciudad: { type: String },
  domicilio: { type: String },
  tipoPersonaNatural: { type: String },
  nivelEscolar: { type: String },
  profesion: { type: String },
  institucion: { type: String },
  entidadEmisora: { type: String },
  fechaGraduacion: { type: Date },
  actividadEconomica: { type: String },
  procedimientosCobro: { type: String },
});

const acreenciaInsolvenciaSchema = new mongoose.Schema({
  acreedor: { type: mongoose.Schema.Types.ObjectId, ref: 'Acreedor', required: true },
  tipoAcreencia: { type: String },
  otroTipoAcreencia: { type: String },
  naturalezaCredito: { type: String },
  descripcionCredito: { type: String },
  capital: { type: Number, default: 0 },
  valorTotalInteresCorriente: { type: Number, default: 0 },
  tasaInteresCorriente: { type: String },
  tipoInteresCorriente: { type: String },
  pagoPorLibranza: { type: Boolean, default: false },
  creditoPostergado: { type: Boolean, default: false },
  creditoEnMora: { type: Boolean, default: false },
  valorTotalInteresMoratorio: { type: Number, default: 0 },
  tasaInteresMoratorio: { type: String },
  tipoInteresMoratorio: { type: String },
  fechaOtorgamiento: { type: Date },
  fechaVencimiento: { type: Date },
});

const bienMuebleSchema = new mongoose.Schema({
  descripcion: { type: String },
  clasificacion: { type: String },
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

const procesoJudicialSchema = new mongoose.Schema({
  tipoProceso: { type: String },
  proceso: { type: String },
  demandante: { type: String },
  demandado: { type: String },
  valor: { type: Number },
  juzgado: { type: String },
  radicado: { type: String },
  emailJuzgado: { type: String },
  pais: { type: String },
  departamento: { type: String },
  ciudad: { type: String },
  direccionJuzgado: { type: String },
  estadoProceso: { type: String },
});

const obligacionAlimentariaSchema = new mongoose.Schema({
  beneficiario: { type: String },
  tipoIdentificacion: { type: String },
  numeroIdentificacion: { type: String },
  parentesco: { type: String },
  cuantia: { type: Number, default: 0 },
  periodoPago: { type: String },
  estadoObligacion: { type: String },
  obligacionDemandada: { type: Boolean },
  paisResidencia: { type: String },
  departamento: { type: String },
  ciudad: { type: String },
  direccion: { type: String },
  emailBeneficiario: { type: String },
});

const gastosPersonalesSchema = new mongoose.Schema({
    alimentacion: { type: Number, default: 0 },
    salud: { type: Number, default: 0 },
    arriendo: { type: Number, default: 0 },
    serviciosPublicos: { type: Number, default: 0 },
    educacion: { type: Number, default: 0 },
    transporte: { type: Number, default: 0 },
    conservacionBienes: { type: Number, default: 0 },
    cuotaLeasingHabitacional: { type: Number, default: 0 },
    arriendoOficina: { type: Number, default: 0 },
    cuotaSeguridadSocial: { type: Number, default: 0 },
    cuotaAdminPropiedadHorizontal: { type: Number, default: 0 },
    cuotaLeasingVehiculo: { type: Number, default: 0 },
    cuotaLeasingOficina: { type: Number, default: 0 },
    seguros: { type: Number, default: 0 },
    vestuario: { type: Number, default: 0 },
    recreacion: { type: Number, default: 0 },
    gastosPersonasCargo: { type: Number, default: 0 },
    gastosProcedimientoInsolvencia: { type: Number, default: 0 },
    otros: { type: Number, default: 0 },
});

const infoFinancieraSchema = new mongoose.Schema({
  ingresosActividadPrincipal: { type: Number, default: 0 },
  descripcionActividadEconomica: { type: String },
  tieneEmpleo: { type: Boolean },
  tipoEmpleo: { type: String },
  ingresosOtrasActividades: { type: String },
  gastosPersonales: gastosPersonalesSchema,
  obligacionesAlimentarias: [obligacionAlimentariaSchema],
  procesosJudiciales: [procesoJudicialSchema],
});

const propuestaPagoSchema = new mongoose.Schema({
  tipoNegociacion: { type: String },
  descripcion: { type: String },
  plazo: { type: String },
  interesEA: { type: Number },
  fechaInicioPago: { type: Date },
  formaPago: { type: String },
  diaPago: { type: Number },
  postergarInteresesEspera: { type: Boolean },
  postergarInteresesCausados: { type: Boolean },
  postergarOtrosValores: { type: Boolean },
  descripcionProyeccion: { type: String },
});

const sociedadConyugalSchema = new mongoose.Schema({
    activa: { type: Boolean },
    disuelta: { type: Boolean },
    nombreConyuge: { type: String },
    tipoDocConyuge: { type: String },
    numDocConyuge: { type: String },
    bienesSociales: [bienMuebleSchema.add(bienInmuebleSchema)]
});

const sedeSchema = new mongoose.Schema({
  departamento: { type: String },
  ciudad: { type: String },
  entidadPromotora: { type: String },
  sedeCentro: { type: String },
});

const causaItemSchema = new mongoose.Schema({
    tipoCausa: { type: String },
    descripcionCausa: { type: String },
});

const causasSchema = new mongoose.Schema({
  departamentoHechos: { type: String },
  ciudadHechos: { type: String },
  lista: [causaItemSchema],
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


// ====================
// ESQUEMA PRINCIPAL DE SOLICITUD
// ====================

const solicitudSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tipoSolicitud: {
    type: String,
    required: true,
    enum: [
      'Solicitud de Insolvencia Económica de Persona Natural No Comerciante',
    ]
  },
  
  // --- CAMPOS PARA INSOLVENCIA ---
  deudor: deudorSchema,
  sede: sedeSchema,
  causas: causasSchema,
  acreencias: [acreenciaInsolvenciaSchema],
  bienesMuebles: [bienMuebleSchema],
  bienesInmuebles: [bienInmuebleSchema],
  noPoseeBienes: { type: Boolean, default: false },
  informacionFinanciera: infoFinancieraSchema,
  sociedadConyugal: sociedadConyugalSchema,
  propuestaPago: propuestaPagoSchema,
  projectionData: { type: mongoose.Schema.Types.Mixed },
  anexos: [anexoSchema],
  firma: firmaSchema,

  // --- CAMPOS PARA FIJACIÓN DE ALIMENTOS ---
  convocante: personaSchema,
  convocado: personaSchema,
  hijos: [hijoSchema],
  hechos: { type: String },
  pretensiones: { type: String },
  pruebas: [String],
  notificaciones: { type: String },

}, { timestamps: true });

const Solicitud = mongoose.model('Solicitud', solicitudSchema);

module.exports = Solicitud;
