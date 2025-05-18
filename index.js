const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;
const SCRIPT_DIR = path.join(__dirname, "scripts");
const SCRIPT_PATH = path.join(SCRIPT_DIR, "temp.spec.js");

// Dossier scripts s'il n’existe pas
if (!fs.existsSync(SCRIPT_DIR)) {
  fs.mkdirSync(SCRIPT_DIR);
}

app.post("/run", (req, res) => {
  const { script } = req.body;
  if (!script) {
    return res.status(400).json({ error: "Missing script content" });
  }

  /* --- 1. Transformation minimale TS → JS (imports / exports / types) --- */
  const transformedScript = script
    .replace(/import\s+{([^}]+)}\s+from\s+['"]@playwright\/test['"]/g,
             "const { $1 } = require('@playwright/test')")   // ESM → CJS
    .replace(/: [^=;]+/g, "")                                 // supprime les types
    .replace(/export\s+{};/g, "");                            // supprime "export {}"

  fs.writeFileSync(SCRIPT_PATH, transformedScript, "utf-8");

  /* --- 2. Exécution Playwright --- */
  const CMD = `npx playwright test ${SCRIPT_PATH} --timeout=30000`;

  exec(CMD, { env: { ...process.env, PW_TEST_DISABLE_SANDBOX: "1" } },
    (err, stdout, stderr) => {

      // 👉 Logs détaillés dans Render (Events > Live tail)
      console.log("----- CMD ----->", CMD);
      console.log("----- STDOUT ---\n", stdout);
      console.log("----- STDERR ---\n", stderr);
      if (err) console.error("----- ERROR ----\n", err);

      res.json({
        success: !err,
        stdout,
        stderr,
        error: err ? err.message : null,
      });
    });
});

app.listen(PORT, () => {
  console.log(`✅ Playwright Runner prêt sur http://localhost:${PORT}`);
});
