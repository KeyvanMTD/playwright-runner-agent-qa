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

// Crée le dossier "scripts" s’il n’existe pas
if (!fs.existsSync(SCRIPT_DIR)) {
  fs.mkdirSync(SCRIPT_DIR);
}

app.post("/run", (req, res) => {
  const { script_b64 } = req.body;

  if (!script_b64) {
    return res.status(400).json({ error: "Missing script_b64" });
  }

  // Décodage base64 → texte brut
  const decodedScript = Buffer.from(script_b64, "base64").toString("utf-8");

  // Transformation TypeScript → JavaScript minimaliste et safe
  const transformedScript = decodedScript
    .replace(/import\s+{([^}]+)}\s+from\s+['"]@playwright\/test['"]/g,
             "const { $1 } = require('@playwright/test')") // ESM → CJS
    .replace(/:\s*[^=;\)\}\{]+(?=[=;\)\}\{])/g, "")        // Supprime types TS sans casser ${}
    .replace(/export\s+{};/g, "");                         // Supprime "export {}"

  // Log du script pour debug Render
  console.log("----- SCRIPT FINAL ----\n", transformedScript);

  // Sauvegarde dans fichier
  fs.writeFileSync(SCRIPT_PATH, transformedScript, "utf-8");

  // Exécution avec Playwright
  const CMD = `npx playwright test ${SCRIPT_PATH} --timeout=30000`;

  exec(CMD, { env: { ...process.env, PW_TEST_DISABLE_SANDBOX: "1" } }, (err, stdout, stderr) => {
    console.log("----- CMD -------->", CMD);
    console.log("----- STDOUT -----\n", stdout);
    console.log("----- STDERR -----\n", stderr);
    if (err) console.error("----- ERROR ------\n", err);

    res.json({
      success: !err,
      stdout,
      stderr,
      script: decodedScript,
      error: err ? err.message : null,
    });
  });
});

app.listen(PORT, () => {
  console.log(`✅ Playwright Runner prêt sur http://localhost:${PORT}`);
});
