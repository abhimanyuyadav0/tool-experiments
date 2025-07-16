const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const dummyfileRouter = require("./routes");

const app = express();
const PORT = 8000;

app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });
const jobs = {}; // in-memory status

// Helper: Merge all chunks
async function mergeChunks(fileId, originalName, totalChunks) {
  const chunkDir = path.join(__dirname, "chunks", fileId);
  const finalPath = path.join(__dirname, "merged", originalName);

  fs.mkdirSync(path.join(__dirname, "merged"), { recursive: true });
  const writeStream = fs.createWriteStream(finalPath);

  for (let i = 0; i < totalChunks; i++) {
    const chunkPath = path.join(chunkDir, `part_${i}`);
    const data = fs.readFileSync(chunkPath);
    writeStream.write(data);
    fs.unlinkSync(chunkPath);
  }

  writeStream.end();
  fs.rmSync(chunkDir, { recursive: true, force: true });
  console.log(`✅ Merged: ${originalName}`);
}

// Fake processing delay (2 minutes)
function simulateProcessing(fileId) {
  jobs[fileId].status = "processing";
  setTimeout(() => {
    jobs[fileId].status = "complete";
    console.log(`✅ Processing complete for ${fileId}`);
  }, 2 * 60 * 1000); // 2 minutes
}

// Upload route
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const { fileId, chunkNumber, totalChunks, originalname } = req.body;
    const buffer = req.file.buffer;

    if (!jobs[fileId]) {
      jobs[fileId] = {
        filename: originalname,
        status: "initialized",
        progress: 0,
      };
    }

    jobs[fileId].status = "uploading";
    jobs[fileId].progress = ((+chunkNumber + 1) / +totalChunks) * 100;

    const chunkDir = path.join(__dirname, "chunks", fileId);
    fs.mkdirSync(chunkDir, { recursive: true });

    fs.writeFileSync(path.join(chunkDir, `part_${chunkNumber}`), buffer);
    console.log(`📦 Saved chunk ${chunkNumber}/${totalChunks} for ${originalname}`);

    if (+chunkNumber === +totalChunks - 1) {
      await mergeChunks(fileId, originalname, +totalChunks);
      jobs[fileId].status = "uploaded";
      simulateProcessing(fileId);
    }

    res.json({ message: "Chunk received" });
  } catch (err) {
    console.error("❌ Upload failed:", err);
    if (req.body.fileId) jobs[req.body.fileId].status = "error";
    res.status(500).json({ error: "Upload failed" });
  }
});

// Polling status
app.get("/status/:fileId", (req, res) => {
  const job = jobs[req.params.fileId];
  if (!job) return res.status(404).json({ error: "Not found" });
  res.json(job);
});
app.use("/api",        dummyfileRouter);
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
