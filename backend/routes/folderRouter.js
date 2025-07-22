/* ─────────────────────────────────────────────────────────────
   routes/folderRouter.js
───────────────────────────────────────────────────────────── */
const express = require("express");
const fs      = require("fs");
const path    = require("path");

const router = express.Router();
const MERGED_ROOT = path.join(__dirname, "..", "merged");

/* GET /api/folders
   →  ["Invoices2024", "Reports", "demo"]                        */
router.get("/folders", (_req, res) => {
  if (!fs.existsSync(MERGED_ROOT)) return res.json({ folders: [] });

  const all = fs
    .readdirSync(MERGED_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  res.json({ folders: all });
});

/* GET /api/folders/:folder/files
   →  { files: ["jan.xlsx", "feb.xlsx"] }                       */
router.get("/folders/:folder/files", (req, res) => {
  const dir = path.join(MERGED_ROOT, req.params.folder);
  if (!fs.existsSync(dir)) return res.status(404).json({ error: "folder not found" });

  const files = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isFile())
    .map((d) => d.name);

  res.json({ files });
});

/* POST /api/rename-file
   { "folder": "Reports", "oldName": "old.csv", "newName": "new.csv" } */
router.post("/rename-file", express.json(), (req, res) => {
  const { folder, oldName, newName } = req.body || {};
  if (!folder || !oldName || !newName)
    return res.status(400).json({ error: "missing params" });

  const oldPath = path.join(MERGED_ROOT, folder, oldName);
  const newPath = path.join(MERGED_ROOT, folder, newName);

  if (!fs.existsSync(oldPath))
    return res.status(404).json({ error: "file not found" });

  fs.renameSync(oldPath, newPath);
  res.json({ ok: true });
});

module.exports = router;
