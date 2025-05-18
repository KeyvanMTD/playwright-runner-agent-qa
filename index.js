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

// Crée le dossier scripts si non existant
if (!fs.existsSync(SCRIPT_DIR)) {
  fs.mkdirSync(SCRIPT_DIR);
}

app.post("/run", (req, res) => {
  const { script: scriptB64 } = req.body;
  if (!scriptB64) {
    return res.status(400).json({ error: "Missing script content (base64)" });
  }

  // 1. Décodage du script (depuis base64)
  let decodedScript = Buffer.from(scriptB64, "base64").toString("utf-8");

  // 2. Nettoyage Markdown : supprime les ```ts ou ```typescript
  decodedScript = decodedScript
    .replace(/```(typescript|ts)?/g, "")
    .replace(/```/g, "");

  // 3. Transformations légères pour JS
  const transformedScript = decodedScript
    .replace(/import\s+{([^}]+)}\s+from\s+['"]@playwright\/test['"]/g,
             "const { $1 } = require('@playwright/test')") // ESM → CJS
    .replace(/: [^=;]+/g, "")                             // Types TypeScript
    .replace(/export\s+{};/g, "")                         // Nettoyage inutile
    .replace(/\$\{([^}]+)\}/g, '"+$1+"');                 // Interpolation `${}` vers concat

  // 4. Écriture du script dans un fichier JS
  fs.writeFileSync(SCRIPT_PATH, transformedScript, "utf-8");

  // 5. Exécution Playwright
  const CMD = `npx playwright test ${SCRIPT_PATH} --timeout=30000`;

  exec(CMD, { env: { ...process.env, PW_TEST_DISABLE_SANDBOX: "1" } }, (err, stdout, stderr) => {
    console.log("----- CMD -----", CMD);
    console.log("----- STDOUT --\n", stdout);
    console.log("----- STDERR --\n", stderr);
    if (err) console.error("----- ERROR ----\n", err);

    res.json({
      success: !err,
      stdout,
      stderr,
      error: err ? err.message : null,
      script: transformedScript,
    });
  });
});

app.listen(PORT, () => {
  console.log(`✅ QA Runner démarré sur http://localhost:${PORT}`);
});
