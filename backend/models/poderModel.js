const mongoose = require('mongoose');

// Modelo para persistir cada PODER generado desde PoderPage/PoderForm.
// El esquema refleja la forma del payload enviado por el frontend
// (destinatario, poderdante, apoderado, siniestro y firma), de forma que
// el documento pueda regenerarse posteriormente desde la base de datos.
const poderSchema = mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    destinatario: {
      nombre: { type: String, default: '' },
      cargo: { type: String, default: '' },
      entidad: { type: String, default: '' },
      ciudad: { type: String, default: '' },
    },
    poderdante: {
      nombre: { type: String, default: '' },
      genero: { type: String, default: '' },
      cedula: { type: String, default: '' },
      ciudadExpedicion: { type: String, default: '' },
      departamentoExpedicion: { type: String, default: '' },
      ciudadResidencia: { type: String, default: '' },
    },
    apoderado: {
      nombre: { type: String, default: '' },
      cedula: { type: String, default: '' },
      ciudadExpedicion: { type: String, default: '' },
      tarjetaProfesional: { type: String, default: '' },
      cargo: { type: String, default: '' },
    },
    siniestro: {
      aseguradora: { type: String, default: '' },
      poliza: { type: String, default: '' },
      fecha: { type: String, default: '' },
      tipoProceso: { type: String, default: '' },
      ley: { type: String, default: '' },
    },
    firma: {
      source: { type: String, default: '' },
      data: { type: String, default: '' },
    },
  },
  {
    timestamps: true,
  }
);

const Poder = mongoose.model('Poder', poderSchema);

module.exports = Poder;