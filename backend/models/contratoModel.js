const mongoose = require('mongoose');

// Modelo para persistir cada CONTRATO DE PRESTACIÓN DE SERVICIOS PROFESIONALES
// DE ABOGADO generado desde ContratoPage/ContratoForm.
// El esquema refleja la forma del payload enviado por el frontend
// (comitente, abogado, siniestro, ciudadFirma, fechaFirma y firmas), de forma
// que el documento pueda regenerarse posteriormente desde la base de datos.
const contratoSchema = mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    comitente: {
      nombre: { type: String, default: '' },
      cedula: { type: String, default: '' },
      ciudad: { type: String, default: '' },
    },
    abogado: {
      nombre: { type: String, default: '' },
      cedula: { type: String, default: '' },
      tarjetaProfesional: { type: String, default: '' },
    },
    siniestro: {
      fecha: { type: String, default: '' },
      victimaNombre: { type: String, default: '' },
      porcentaje: { type: String, default: '' },
      porcentajeLetras: { type: String, default: '' },
    },
    ciudadFirma: { type: String, default: '' },
    fechaFirma: { type: String, default: '' },
    firma: {
      source: { type: String, default: '' },
      data: { type: String, default: '' },
      name: { type: String, default: '' },
      url: { type: String, default: '' },
    },
    firmaContractual: {
      source: { type: String, default: '' },
      data: { type: String, default: '' },
      name: { type: String, default: '' },
      url: { type: String, default: '' },
    },
    estado: { type: String, enum: ['borrador', 'completa'], default: 'completa' },
    seccionesGuardadas: { type: mongoose.Schema.Types.Mixed },
  },
  {
    timestamps: true,
  }
);

const Contrato = mongoose.model('Contrato', contratoSchema);

module.exports = Contrato;