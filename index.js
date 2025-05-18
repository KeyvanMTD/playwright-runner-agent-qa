const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const app = express();
app.use(bodyParser.json({ limit: "2mb" }));

const PORT = process.env.PORT || 3000;
const SCRIPT_DIR = path.join(__dirname, "scripts");
const SCRIPT_PATH = path.join(SCRIPT_DIR, "temp.spec.js");

// Dossier scripts s'il n’existe pas
if (!fs.existsSync(SCRIPT_DIR)) {
  fs.mkdirSync(SCRIPT_DIR);
}

app.post("/run", (req, res) => {
  const { script_b64 } = req.body;

  if (!script_b64) {
    return res.status(400).json({ error: "Missing script_b64 in request body" });
  }

  // Décodage base64 → UTF-8
  const decodedScript = Buffer.from(script_b64, "base64").toString("utf-8");

  // 🔁 Transformation TS > JS (ESM to CommonJS)
  const transformedScript = decodedScript
    .replace(/import\s+{([^}]+)}\s+from\s+['"]@playwright\/test['"]/g,
             "const { $1 } = require('@playwright/test')") // ESM → CJS
    .replace(/: [^=;]+/g, "")                             // Types TS
    .replace(/export\s+{};/g, "");                        // export {}

  fs.writeFileSync(SCRIPT_PATH, transformedScript, "utf-8");

  const CMD = `npx playwright test ${SCRIPT_PATH} --timeout=30000`;

  exec(CMD, { env: { ...process.env, PW_TEST_DISABLE_SANDBOX: "1" } },
    (err, stdout, stderr) => {
      console.log("----- CMD ----->", CMD);
      console.log("----- STDOUT ---\n", stdout);
      console.log("----- STDERR ---\n", stderr);
      if (err) console.error("----- ERROR ----\n", err);

      res.json({
        success: !err,
        stdout,
        stderr,
        error: err ? err.message : null,
        script: decodedScript // pour debugging si besoin
      });
    });
});

app.listen(PORT, () => {
  console.log(`✅ Playwright Runner prêt sur http://localhost:${PORT}`);
});
