const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const app = express();
const PORT = 10000;

app.use(bodyParser.json({ limit: '1mb' }));

app.post("/run", async (req, res) => {
  const scriptContent = req.body.script;

  if (!scriptContent) {
    return res.status(400).json({ error: "Missing script content" });
  }

  const scriptPath = path.join(__dirname, "scripts", "temp.spec.ts");
  fs.writeFileSync(scriptPath, scriptContent, "utf8");

  const command = `npx playwright test ${scriptPath} --timeout=30000`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
        stderr,
        stdout,
      });
    }

    res.json({
      success: true,
      stdout,
      stderr,
    });
  });
});

app.listen(PORT, () => {
  console.log(`✅ QA Runner Server démarré sur http://localhost:${PORT}`);
});
