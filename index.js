const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const app = express();
app.use(bodyParser.json());

const PORT = 10000;

app.post("/run", async (req, res) => {
  const script = req.body.script;

  if (!script || typeof script !== "string") {
    return res.status(400).json({ error: "Missing script content" });
  }

  const tempFilePath = path.join(__dirname, "scripts", "temp.spec.ts");

  try {
    // Écrit le script dans un fichier temporaire TypeScript
    fs.writeFileSync(tempFilePath, script, "utf-8");

    const command = `npx playwright test /app/scripts/temp.spec.ts --timeout=30000`;

    exec(command, (error, stdout, stderr) => {
      const response = {
        success: !error,
        stdout,
        stderr: stderr || null,
        error: error ? error.message : null,
        script,
      };

      return res.json(response);
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ QA Runner Server démarré sur http://localhost:${PORT}`);
});
