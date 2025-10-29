// ===============================
// 🚀 Backend SRM-QK v2.3 — Integrado, Seguro y Limpieza Global
// ===============================

import express from "express";
import cors from "cors";
import pkg from "pg";
import path from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";

const { Pool } = pkg;

// =====================================================
// 📍 Configuración inicial
// =====================================================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;
const ADMIN_KEY = process.env.ADMIN_KEY || "SRM2025ADMIN";

app.use(cors());
app.use(express.json());
app.use("/videos", express.static(path.join(__dirname, "videos")));

// =====================================================
// 💾 Conexión a PostgreSQL
// =====================================================
const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error("❌ ERROR: Falta la variable DATABASE_URL en el entorno.");
  process.exit(1);
}

const sslConfig =
  dbUrl.includes("localhost") || dbUrl.includes("127.0.0.1")
    ? false
    : { rejectUnauthorized: false };

const pool = new Pool({
  connectionString: dbUrl,
  ssl: sslConfig,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// 🔍 Probar conexión inicial
(async () => {
  try {
    const result = await pool.query("SELECT current_database(), current_user");
    console.log(
      `📦 Conectado a BD: ${result.rows[0].current_database}, Usuario: ${result.rows[0].current_user}`
    );
  } catch (err) {
    console.error("❌ Error al conectar con PostgreSQL:", err.message);
  }
})();

// =====================================================
// 🧱 Crear tabla si no existe
// =====================================================
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS empresas (
        id SERIAL PRIMARY KEY,
        session_id TEXT,
        nombre TEXT,
        correo TEXT,
        whatsapp TEXT,
        tipo_empresa TEXT,
        herramientas TEXT,
        meta_6m TEXT,
        area_critica TEXT,
        empleados TEXT,
        fecha TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ Tabla 'empresas' verificada o creada.");
  } catch (err) {
    console.error("❌ Error creando tabla 'empresas':", err.message);
  }
})();

// =====================================================
// 🌐 Servir frontend (dashboard desde C:\srmweb)
// =====================================================
const dashboardPath = "C:\\srmweb";

if (existsSync(dashboardPath)) {
  app.use(express.static(dashboardPath));
  console.log(`🧭 Frontend servido desde: ${dashboardPath}`);

  app.get("/", (req, res) => {
    res.sendFile(path.join(dashboardPath, "dashboard.html"));
  });
} else {
  console.warn("⚠️  No se encontró la carpeta del dashboard (C:\\srmweb)");
}

// =====================================================
// 🧠 Endpoints API
// =====================================================

// Estado básico
app.get("/ping", (req, res) => res.send("OK"));

// Listar empresas
app.get("/api/empresas", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM empresas ORDER BY fecha DESC");
    res.json(result.rows);
  } catch (error) {
    console.error("❌ Error al listar empresas:", error.message);
    res.status(500).json({ success: false, message: "Error al obtener empresas" });
  }
});

// Insertar nueva empresa
app.post("/api/empresas", async (req, res) => {
  try {
    const {
      session_id,
      nombre,
      correo,
      whatsapp,
      tipo_empresa,
      herramientas,
      meta_6m,
      area_critica,
      empleados,
    } = req.body;

    if (!session_id || !nombre || !correo) {
      return res.status(400).json({ success: false, message: "Datos incompletos" });
    }

    const query = `
      INSERT INTO empresas (session_id, nombre, correo, whatsapp, tipo_empresa, herramientas, meta_6m, area_critica, empleados)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    `;

    await pool.query(query, [
      session_id,
      nombre,
      correo,
      whatsapp,
      tipo_empresa,
      herramientas,
      meta_6m,
      area_critica,
      empleados,
    ]);

    console.log(`✅ Empresa registrada: ${nombre} (${tipo_empresa || "sin tipo"})`);
    res.status(201).json({ success: true, message: "Empresa guardada correctamente" });
  } catch (error) {
    console.error("❌ Error al guardar empresa:", error.message);
    res.status(500).json({ success: false, message: "Error interno del servidor" });
  }
});

// 🔒 Limpiar toda la tabla (solo admin)
app.delete("/api/limpiar", async (req, res) => {
  try {
    const { key } = req.body;

    if (key !== ADMIN_KEY) {
      return res.status(403).json({ success: false, error: "Clave incorrecta" });
    }

    await pool.query("TRUNCATE TABLE empresas RESTART IDENTITY");
    console.log("🗑️  Base de datos 'empresas' vaciada por administrador.");
    res.json({ success: true, message: "Base de datos vaciada correctamente." });
  } catch (error) {
    console.error("❌ Error al limpiar base de datos:", error.message);
    res.status(500).json({ success: false, error: "Error interno del servidor" });
  }
});

// =====================================================
// 🚀 Inicialización del servidor
// =====================================================
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Backend SRM-QK v2.3 corriendo en puerto ${PORT}`);
  console.log(`🌐 API disponible en: http://localhost:${PORT}/api/empresas`);
  console.log(`🧭 Frontend: http://localhost:${PORT}/dashboard.html`);
  console.log(`🔒 Clave admin: ${ADMIN_KEY}`);
  console.log("⚙️ Configuración SSL:", sslConfig === false ? "Desactivada" : "Activada");
});
