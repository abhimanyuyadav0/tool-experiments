const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 8000;

app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

const jobs = {}; // in-memory file status: { [fileId]: { status, filename, folder, progress } }
const datasets = {}; // store processed data: { [datasetName]: { files: [], data: [], createdAt: Date } }

/* ------------------ Helpers ------------------ */
const getExtlessName = (filename) => filename.replace(/\.[^/.]+$/, "");

const mergeChunks = async ({ fileId, folderName, fileName, totalChunks }) => {
  const chunkDir = path.join(__dirname, "chunks", fileId);
  const outputDir = path.join(__dirname, "merged", folderName);
  const finalPath = path.join(outputDir, fileName);

  fs.mkdirSync(outputDir, { recursive: true });
  const writeStream = fs.createWriteStream(finalPath);

  for (let i = 0; i < totalChunks; i++) {
    const chunkPath = path.join(chunkDir, `part_${i}`);
    const buffer = fs.readFileSync(chunkPath);
    writeStream.write(buffer);
    fs.unlinkSync(chunkPath);
  }

  writeStream.end();
  fs.rmSync(chunkDir, { recursive: true, force: true });
  console.log(`✅ Merged: ${finalPath}`);
};

const simulateProcessing = (fileId) => {
  jobs[fileId].status = "processing";

  // Simulate processing time
  setTimeout(() => {
    jobs[fileId].status = "complete";

    // Create dataset entry if it doesn't exist
    const datasetName = jobs[fileId].folder;
    if (!datasets[datasetName]) {
      datasets[datasetName] = {
        name: datasetName,
        files: [],
        data: [],
        createdAt: new Date(),
        status: "complete",
        allowedFileTypes: [],
      };
    }

    // Add file to dataset
    const fileExtension = path.extname(jobs[fileId].filename).toLowerCase();
    datasets[datasetName].files.push({
      id: fileId,
      name: jobs[fileId].filename,
      uploadedAt: new Date(),
      size: "1.2MB", // You can calculate actual size
      type: fileExtension,
    });
    if (datasets[datasetName].allowedFileTypes.length === 0) {
      datasets[datasetName].allowedFileTypes = [fileExtension];
    } else if (
      !datasets[datasetName].allowedFileTypes.includes(fileExtension)
    ) {
      datasets[datasetName].allowedFileTypes.push(fileExtension);
    }
    // Simulate parsed data (replace with actual file parsing logic)
    const mockData = generateMockData(jobs[fileId].filename);
    datasets[datasetName].data.push(...mockData);

    console.log(`✅ Processing complete for ${fileId}`);
  }, 3000);
};
/* ------------------ Get Dataset File Types ------------------ */
app.get("/api/datasets/:name/allowed-types", (req, res) => {
  const dataset = datasets[req.params.name];
  if (!dataset) return res.status(404).json({ error: "Dataset not found" });
  
  res.json({ allowedFileTypes: dataset.allowedFileTypes });
});
const generateMockData = (filename) => {
  // Generate mock table data based on filename
  const mockData = [];
  const recordCount = Math.floor(Math.random() * 50) + 10; // 10-60 records

  for (let i = 0; i < recordCount; i++) {
    mockData.push({
      id: i + 1,
      name: `Record ${i + 1}`,
      value: Math.floor(Math.random() * 1000),
      status: ["Active", "Inactive", "Pending"][Math.floor(Math.random() * 3)],
      date: new Date(Date.now() - Math.random() * 10000000000)
        .toISOString()
        .split("T")[0],
      source: filename,
    });
  }

  return mockData;
};

/* ------------------ Upload Endpoint ------------------ */
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const { fileId, chunkNumber, totalChunks, originalname, folder } = req.body;
    const buffer = req.file.buffer;

    if (!jobs[fileId]) {
      jobs[fileId] = {
        filename: originalname,
        folder: folder || getExtlessName(originalname),
        status: "initialized",
        progress: 0,
      };
    }

    const chunkDir = path.join(__dirname, "chunks", fileId);
    fs.mkdirSync(chunkDir, { recursive: true });
    const chunkPath = path.join(chunkDir, `part_${chunkNumber}`);
    fs.writeFileSync(chunkPath, buffer);

    jobs[fileId].status = "uploading";
    jobs[fileId].progress = ((+chunkNumber + 1) / +totalChunks) * 100;

    if (+chunkNumber === +totalChunks - 1) {
      await mergeChunks({
        fileId,
        folderName: jobs[fileId].folder,
        fileName: originalname,
        totalChunks: +totalChunks,
      });
      jobs[fileId].status = "uploaded";
      jobs[fileId].progress = 100;
      simulateProcessing(fileId);
    }

    res.json({ message: "Chunk received" });
  } catch (error) {
    console.error("❌ Upload failed:", error);
    if (req.body.fileId) jobs[req.body.fileId].status = "error";
    res.status(500).json({ error: "Upload failed" });
  }
});

/* ------------------ Polling Status ------------------ */
app.get("/status/:fileId", (req, res) => {
  const job = jobs[req.params.fileId];
  if (!job) return res.status(404).json({ error: "Not found" });
  res.json(job);
});

/* ------------------ Get All Datasets ------------------ */
app.get("/api/datasets", (req, res) => {
  const datasetList = Object.values(datasets).map((dataset) => ({
    name: dataset.name,
    fileCount: dataset.files.length,
    recordCount: dataset.data.length,
    createdAt: dataset.createdAt,
    status: dataset.status,
  }));

  res.json({ datasets: datasetList });
});

/* ------------------ Get Dataset Details ------------------ */
app.get("/api/datasets/:name", (req, res) => {
  const dataset = datasets[req.params.name];
  if (!dataset) return res.status(404).json({ error: "Dataset not found" });

  res.json(dataset);
});

/* ------------------ Get Dataset Table Data ------------------ */
app.get("/api/datasets/:name/data", (req, res) => {
  const dataset = datasets[req.params.name];
  if (!dataset) return res.status(404).json({ error: "Dataset not found" });

  const { page = 1, limit = 10, search = "" } = req.query;
  let filteredData = dataset.data;

  // Apply search filter
  if (search) {
    filteredData = dataset.data.filter((row) =>
      Object.values(row).some((val) =>
        val.toString().toLowerCase().includes(search.toLowerCase())
      )
    );
  }

  // Apply pagination
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + parseInt(limit);
  const paginatedData = filteredData.slice(startIndex, endIndex);

  res.json({
    data: paginatedData,
    totalRecords: filteredData.length,
    totalPages: Math.ceil(filteredData.length / limit),
    currentPage: parseInt(page),
  });
});

/* ------------------ Update File Name ------------------ */
app.post("/api/datasets/:name/rename-file", (req, res) => {
  const { fileId, newName } = req.body;
  const dataset = datasets[req.params.name];

  if (!dataset) return res.status(404).json({ error: "Dataset not found" });

  const file = dataset.files.find((f) => f.id === fileId);
  if (!file) return res.status(404).json({ error: "File not found" });

  file.name = newName;

  // Update job if it exists
  if (jobs[fileId]) {
    jobs[fileId].filename = newName;
  }

  res.json({ message: "File renamed successfully" });
});

/* ------------------ Delete Dataset ------------------ */
app.delete("/api/datasets/:name", (req, res) => {
  const datasetName = req.params.name;
  if (!datasets[datasetName])
    return res.status(404).json({ error: "Dataset not found" });

  // Clean up files
  const folderPath = path.join(__dirname, "merged", datasetName);
  if (fs.existsSync(folderPath)) {
    fs.rmSync(folderPath, { recursive: true, force: true });
  }

  delete datasets[datasetName];
  res.json({ message: "Dataset deleted successfully" });
});

/* ------------------ Start Server ------------------ */
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
