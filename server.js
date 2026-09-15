require("dotenv").config();

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const express = require("express");
const session = require("express-session");
const multer = require("multer");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const nodemailer = require("nodemailer");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const ROOT_DIR = __dirname;
const DB_DIR = path.join(ROOT_DIR, "db");
const UPLOAD_DIR = path.join(ROOT_DIR, "uploads");
const DB_PATH = process.env.DB_PATH || path.join(DB_DIR, "kairu.sqlite");
const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "kairu-admin";
const SESSION_SECRET =
  process.env.SESSION_SECRET || "troque-este-segredo-em-producao";

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASSWORD = process.env.SMTP_PASSWORD;
const CONTACT_TO = process.env.CONTACT_TO || "contato@kairuarquitetura.com.br";
const CONTACT_FROM = process.env.CONTACT_FROM || SMTP_USER;

fs.mkdirSync(DB_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

let db;
let httpServer;
let keepAliveTimer;
let mailer;

if (SMTP_HOST && SMTP_USER && SMTP_PASSWORD) {
  mailer = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
  });
} else {
  console.warn(
    "SMTP não configurado (defina SMTP_HOST, SMTP_USER, SMTP_PASSWORD no .env). O formulário de contato não enviará e-mails."
  );
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, savedHash) {
  const [salt, hash] = savedHash.split(":");
  if (!salt || !hash) return false;

  const testHash = crypto.scryptSync(password, salt, 64);
  const savedBuffer = Buffer.from(hash, "hex");

  return (
    savedBuffer.length === testHash.length &&
    crypto.timingSafeEqual(savedBuffer, testHash)
  );
}

function normalizeSection(section) {
  return ["hero_background", "hero", "portfolio"].includes(section)
    ? section
    : null;
}

function isUploadedFile(url) {
  return typeof url === "string" && url.startsWith("/uploads/");
}

function uploadedFilePath(url) {
  const fileName = path.basename(url);
  return path.join(UPLOAD_DIR, fileName);
}

async function removeExtraHeroBackgrounds(keepId = null) {
  const rows = keepId
    ? await db.all(
        "SELECT id, url FROM images WHERE section = 'hero_background' AND id != ?",
        keepId
      )
    : await db.all("SELECT id, url FROM images WHERE section = 'hero_background'");

  for (const image of rows) {
    await db.run("DELETE FROM images WHERE id = ?", image.id);

    if (isUploadedFile(image.url)) {
      fs.rm(uploadedFilePath(image.url), { force: true }, () => {});
    }
  }
}

async function migrate() {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      section TEXT NOT NULL CHECK(section IN ('hero_background', 'hero', 'portfolio')),
      url TEXT NOT NULL,
      alt TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const table = await db.get(
    "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'images'"
  );

  if (table.sql && !table.sql.includes("hero_background")) {
    await db.exec(`
      PRAGMA foreign_keys = OFF;
      CREATE TABLE images_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        section TEXT NOT NULL CHECK(section IN ('hero_background', 'hero', 'portfolio')),
        url TEXT NOT NULL,
        alt TEXT NOT NULL DEFAULT '',
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      INSERT INTO images_new (id, section, url, alt, sort_order, created_at)
      SELECT id, section, url, alt, sort_order, created_at FROM images;
      DROP TABLE images;
      ALTER TABLE images_new RENAME TO images;
      PRAGMA foreign_keys = ON;
    `);
  }
}

async function seedAdmin() {
  const userCount = await db.get("SELECT COUNT(*) AS total FROM users");
  if (userCount.total > 0) return;

  await db.run(
    "INSERT INTO users (username, password_hash) VALUES (?, ?)",
    ADMIN_USER,
    hashPassword(ADMIN_PASSWORD)
  );
}

async function seedImages() {
  const imageCount = await db.get("SELECT COUNT(*) AS total FROM images");
  if (imageCount.total > 0) {
    const backgroundCount = await db.get(
      "SELECT COUNT(*) AS total FROM images WHERE section = 'hero_background'"
    );

    if (backgroundCount.total === 0) {
      await db.run(
        "INSERT INTO images (section, url, alt, sort_order) VALUES (?, ?, ?, ?)",
        "hero_background",
        "/imagens/hero-fundo.jpg",
        "Ambiente interno residencial",
        1
      );
    }

    return;
  }

  const defaults = [
    ["hero_background", "/imagens/hero-fundo.jpg", "Ambiente interno residencial", 1],
    ["hero", "/imagens/hero-colagem-1-patio-piscina.jpg", "Área externa com piscina", 1],
    ["hero", "/imagens/hero-colagem-2-entrada.jpg", "Entrada de casa contemporânea", 2],
    ["hero", "/imagens/hero-colagem-3-fachada.jpg", "Fachada residencial", 3],
    ["portfolio", "/imagens/portfolio-1-casa-piscina-vista.jpg", "Casa com piscina e vista", 1],
    ["portfolio", "/imagens/portfolio-2-casa-madeira.jpg", "Casa com madeira aparente", 2],
    ["portfolio", "/imagens/portfolio-3-casa-entardecer.jpg", "Casa ao entardecer", 3],
    ["portfolio", "/imagens/portfolio-4-area-piscina.jpg", "Área de lazer com piscina", 4],
    ["portfolio", "/imagens/portfolio-5-fachada-concreto.jpg", "Fachada em concreto", 5],
  ];

  const statement = await db.prepare(
    "INSERT INTO images (section, url, alt, sort_order) VALUES (?, ?, ?, ?)"
  );

  try {
    for (const image of defaults) {
      await statement.run(image);
    }
  } finally {
    await statement.finalize();
  }
}

function requireAuth(req, res, next) {
  if (req.session.userId) {
    next();
    return;
  }

  if (req.path.startsWith("/api/")) {
    res.status(401).json({ error: "Login necessário." });
    return;
  }

  res.redirect("/admin/login.html");
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`);
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    cb(null, allowed.includes(file.mimetype));
  },
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    name: "kairu.sid",
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 8,
    },
  })
);

app.get("/api/images", async (_req, res) => {
  const rows = await db.all(
    "SELECT id, section, url, alt, sort_order FROM images ORDER BY section, sort_order, id"
  );

  res.set("Cache-Control", "no-store");
  res.json({
    heroBackground:
      rows.find((image) => image.section === "hero_background") || null,
    hero: rows.filter((image) => image.section === "hero"),
    portfolio: rows.filter((image) => image.section === "portfolio"),
  });
});

app.post("/api/contact", async (req, res) => {
  const nome = String(req.body.nome || "").trim();
  const email = String(req.body.email || "").trim();
  const telefone = String(req.body.telefone || "").trim();
  const mensagem = String(req.body.mensagem || "").trim();

  const emailValida = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  if (!nome || !emailValida || !mensagem) {
    res.status(400).json({ error: "Preencha nome, e-mail válido e mensagem." });
    return;
  }

  if (!mailer) {
    res.status(503).json({ error: "Envio de e-mail indisponível no momento." });
    return;
  }

  try {
    await mailer.sendMail({
      from: CONTACT_FROM,
      to: CONTACT_TO,
      replyTo: email,
      subject: nome,
      text: `Nome: ${nome}\nE-mail: ${email}\nTelefone: ${telefone}\n\nMensagem:\n${mensagem}`,
      html: `
        <p><strong>Nome:</strong> ${escapeHtml(nome)}</p>
        <p><strong>E-mail:</strong> ${escapeHtml(email)}</p>
        <p><strong>Telefone:</strong> ${escapeHtml(telefone)}</p>
        <p><strong>Mensagem:</strong><br>${escapeHtml(mensagem).replace(/\n/g, "<br>")}</p>
      `,
    });

    res.json({ ok: true });
  } catch (error) {
    console.error("Falha ao enviar e-mail de contato:", error);
    res.status(502).json({ error: "Não foi possível enviar sua mensagem. Tente novamente mais tarde." });
  }
});

app.post("/api/admin/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await db.get("SELECT * FROM users WHERE username = ?", username);

  if (!user || !verifyPassword(password || "", user.password_hash)) {
    res.status(401).json({ error: "Usuário ou senha inválidos." });
    return;
  }

  req.session.userId = user.id;
  req.session.username = user.username;
  res.json({ ok: true, username: user.username });
});

app.post("/api/admin/logout", requireAuth, (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("kairu.sid");
    res.json({ ok: true });
  });
});

app.get("/api/admin/me", requireAuth, (req, res) => {
  res.json({ username: req.session.username });
});

app.get("/api/admin/images", requireAuth, async (_req, res) => {
  const rows = await db.all(
    "SELECT id, section, url, alt, sort_order, created_at FROM images ORDER BY section, sort_order, id"
  );
  res.json(rows);
});

app.post("/api/admin/images", requireAuth, upload.single("image"), async (req, res) => {
  const section = normalizeSection(req.body.section);
  if (!section || !req.file) {
    res.status(400).json({ error: "Informe a seção e selecione uma imagem." });
    return;
  }

  const lastOrder = await db.get(
    "SELECT COALESCE(MAX(sort_order), 0) AS last FROM images WHERE section = ?",
    section
  );
  const url = `/uploads/${req.file.filename}`;
  const alt = String(req.body.alt || "").trim();
  const sortOrder =
    section === "hero_background"
      ? 1
      : Number(req.body.sort_order || lastOrder.last + 1);

  if (section === "hero_background") {
    await removeExtraHeroBackgrounds();
  }

  const result = await db.run(
    "INSERT INTO images (section, url, alt, sort_order) VALUES (?, ?, ?, ?)",
    section,
    url,
    alt,
    Number.isFinite(sortOrder) ? sortOrder : lastOrder.last + 1
  );

  const image = await db.get("SELECT * FROM images WHERE id = ?", result.lastID);
  res.status(201).json(image);
});

app.put("/api/admin/images/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const section = normalizeSection(req.body.section);
  const sortOrder = Number(req.body.sort_order);
  const alt = String(req.body.alt || "").trim();

  if (!id || !section || !Number.isFinite(sortOrder)) {
    res.status(400).json({ error: "Dados inválidos." });
    return;
  }

  const result = await db.run(
    "UPDATE images SET section = ?, alt = ?, sort_order = ? WHERE id = ?",
    section,
    alt,
    section === "hero_background" ? 1 : sortOrder,
    id
  );

  if (result.changes === 0) {
    res.status(404).json({ error: "Imagem não encontrada." });
    return;
  }

  const image = await db.get("SELECT * FROM images WHERE id = ?", id);

  if (section === "hero_background") {
    await removeExtraHeroBackgrounds(id);
  }

  res.json(image);
});

app.delete("/api/admin/images/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const image = await db.get("SELECT * FROM images WHERE id = ?", id);

  if (!image) {
    res.status(404).json({ error: "Imagem não encontrada." });
    return;
  }

  await db.run("DELETE FROM images WHERE id = ?", id);

  if (isUploadedFile(image.url)) {
    fs.rm(uploadedFilePath(image.url), { force: true }, () => {});
  }

  res.json({ ok: true });
});

app.get("/admin", requireAuth, (_req, res) => {
  res.sendFile(path.join(ROOT_DIR, "admin", "index.html"));
});

app.get("/admin/", requireAuth, (_req, res) => {
  res.sendFile(path.join(ROOT_DIR, "admin", "index.html"));
});

app.get("/admin/index.html", requireAuth, (_req, res) => {
  res.sendFile(path.join(ROOT_DIR, "admin", "index.html"));
});

app.use("/uploads", express.static(UPLOAD_DIR));
app.use("/admin", express.static(path.join(ROOT_DIR, "admin"), { index: false }));
app.use("/assets", express.static(path.join(ROOT_DIR, "assets")));
app.use("/css", express.static(path.join(ROOT_DIR, "css")));
app.use("/imagens", express.static(path.join(ROOT_DIR, "imagens")));
app.use("/js", express.static(path.join(ROOT_DIR, "js")));

app.get("/", (_req, res) => {
  res.sendFile(path.join(ROOT_DIR, "index.html"));
});

app.get("/index.html", (_req, res) => {
  res.sendFile(path.join(ROOT_DIR, "index.html"));
});

async function start() {
  db = await open({
    filename: DB_PATH,
    driver: sqlite3.Database,
  });

  await migrate();
  await seedAdmin();
  await seedImages();

  httpServer = app.listen(PORT, () => {
    console.log(`Kairu rodando em http://localhost:${PORT}`);
    console.log(`Painel admin: http://localhost:${PORT}/admin`);
    console.log(`Login inicial: ${ADMIN_USER} / ${ADMIN_PASSWORD}`);
    console.log(`Processo: ${process.pid}`);
  });

  httpServer.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.error(`A porta ${PORT} ja esta em uso.`);
      console.error(`O painel provavelmente ja esta aberto em http://localhost:${PORT}/admin`);
      console.error("Para reiniciar, pare o outro terminal com Ctrl + C e rode npm start de novo.");
    } else {
      console.error(error);
    }

    process.exit(1);
  });

  keepAliveTimer = setInterval(() => {}, 60 * 60 * 1000);
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
