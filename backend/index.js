// Polyfill para replaceAll en Node < 15
if (!String.prototype.replaceAll) {
  String.prototype.replaceAll = function (search, replacement) {
    return this.split(search).join(replacement);
  };
}

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const passport = require("passport");
const connectDB = require("./config/db");
const acreedorRoutes = require("./routes/acreedorRoutes");
const solicitudRoutes = require("./routes/solicitudRoutes");
const conciliacionRoutes = require("./routes/conciliacionRoutes");
const adminRoutes = require("./routes/adminRoutes");
const userRoutes = require("./routes/userRoutes");
const authRoutes = require("./routes/authRoutes");
const archiverRoutes = require("./routes/archiverRoutes");
const poderRoutes = require("./routes/poderRoutes");
const contratoRoutes = require("./routes/contratoRoutes");
const liquidacionRoutes = require("./routes/liquidacionRoutes");
const fileRoutes = require("./routes/fileRoutes");
const path = require("path");

// Passport config
require("./config/passport")(passport);

// Conectar a la base de datos
connectDB();

const app = express();

// Necesario en Render para que las cookies SameSite=None funcionen
app.set("trust proxy", 1);

const port = process.env.PORT || 3000;

//
// =============================
//   🔥 CONFIGURACIÓN DE CORS
// =============================
//
const allowedOrigins = [
  process.env.FRONTEND_URL,           // https://systemlex.com.co
  "https://www.systemlex.com.co",     // versión con www
  "https://systemlex.vercel.app",     // dominio vercel
];

console.log("Activando CORS para:", allowedOrigins);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // para Postman / servidores internos

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        console.log("❌ CORS bloqueado:", origin);
        return callback(new Error("No permitido por CORS"));
      }
    },
    credentials: true,
    exposedHeaders: ["Content-Disposition", "Content-Length", "Content-Type"],
  })
);

app.use(express.json({ limit: '10mb' }));

//
// =============================
//   📁 ARCHIVOS ESTÁTICOS
// =============================
//  Esto es lo que permite que el logo cargue en los correos
//
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Inicializar Passport
app.use(passport.initialize());

//
// =============================
//        🔗 RUTAS API
// =============================
//
app.get("/", (req, res) => {
  res.send("API is running...");
});

app.use("/api/acreedores", acreedorRoutes);
app.use("/api/solicitudes", solicitudRoutes);
app.use("/api/conciliaciones", conciliacionRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/archiver", archiverRoutes);
app.use("/api/poder", poderRoutes);
app.use("/api/contrato", contratoRoutes);
app.use("/api/liquidaciones", liquidacionRoutes);
app.use("/api/files", fileRoutes);

//
// =============================
//     🛑 MIDDLEWARE ERRORES
// =============================
//
app.use((err, req, res, next) => {
  console.error("Error global:", err);
  res.status(500).json({ message: err.message || "Error interno del servidor" });
});

// Iniciar servidor
app.listen(port, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${port}`);
});
