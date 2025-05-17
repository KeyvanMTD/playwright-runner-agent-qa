const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;
const SCRIPT_PATH = path.join(__dirname, "scripts", "temp.spec.js");

// Assure-toi que le dossier /scripts existe
if (!fs.existsSync(path.join(__dirname, "scripts"))) {
  fs.mkdirSync(path.join(__dirname, "scripts"));
}

app.post("/run", async (req, res) => {
  const { script } = req.body;
  if (!script) {
    return res.status(400).json({ error: "Missing script content" });
  }

  // Conversion TypeScript → JavaScript simple
  const transformedScript = script
    .replace(/import\s+{([^}]+)}\s+from\s+['"]@playwright\/test['"]/g, "const { $1 } = require('@playwright/test')")
    .replace(/: [^=;]+/g, "") // remove types like ": string"
    .replace(/export\s+{};/g, ""); // optional cleanup

  fs.writeFileSync(SCRIPT_PATH, transformedScript, "utf-8");

  exec(`npx playwright test ${SCRIPT_PATH}`, { timeout: 20000 }, (err, stdout, stderr) => {
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
