const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { S3Client, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
const S3_BUCKET = process.env.AWS_S3_BUCKET;

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

const updateDatasetStatus = (datasetName) => {
  if (!datasets[datasetName]) return;
  
  // Check if any files in the dataset are still processing
  const datasetFiles = datasets[datasetName].files;
  const hasProcessingFiles = datasetFiles.some(file => {
    const job = jobs[file.id];
    return job && job.status === "processing";
  });
  
  // Update dataset status
  datasets[datasetName].status = hasProcessingFiles ? "processing" : "complete";
  datasets[datasetName].lastUpdated = new Date();
};

const simulateProcessing = (fileId, fromS3 = false) => {
  jobs[fileId].status = "processing";
  const datasetName = jobs[fileId].folder;
  if (!datasets[datasetName]) {
    datasets[datasetName] = {
      name: datasetName,
      files: [],
      data: [],
      createdAt: new Date(),
      status: "processing",
      allowedFileTypes: [],
      lastUpdated: new Date(),
    };
  } else {
    datasets[datasetName].status = "processing";
    datasets[datasetName].lastUpdated = new Date();
  }
  const fileExtension = jobs[fileId].filename.split('.').pop()?.toLowerCase() || '';
  datasets[datasetName].files.push({
    id: fileId,
    name: jobs[fileId].filename,
    uploadedAt: new Date(),
    size: "1.2MB",
    type: fileExtension,
    s3Key: jobs[fileId].s3Key,
    status: jobs[fileId].status,
  });
  if (datasets[datasetName].allowedFileTypes.length === 0) {
    datasets[datasetName].allowedFileTypes = [fileExtension];
  } else if (!datasets[datasetName].allowedFileTypes.includes(fileExtension)) {
    datasets[datasetName].allowedFileTypes.push(fileExtension);
  }
  console.log(`🔄 Processing started for ${fileId} in dataset ${datasetName} (fromS3=${fromS3})`);
  setTimeout(() => {
    jobs[fileId].status = "complete";
    datasets[datasetName].status = "complete";
    datasets[datasetName].lastUpdated = new Date();
    // Update file status in dataset.files
    const fileObj = datasets[datasetName].files.find(f => f.id === fileId);
    if (fileObj) fileObj.status = "complete";
    console.log(`✅ Processing complete for ${fileId}`);
  }, 300000); // 5 minutes
};

/* ------------------ Get Dataset File Types ------------------ */
app.get("/api/datasets/:name/allowed-types", (req, res) => {
  const dataset = datasets[req.params.name];
  if (!dataset) return res.status(404).json({ error: "Dataset not found" });
  
  res.json({ allowedFileTypes: dataset.allowedFileTypes });
});

/* ------------------ Get Dataset Processing Status ------------------ */
app.get("/api/datasets/:name/status", (req, res) => {
  const dataset = datasets[req.params.name];
  if (!dataset) return res.status(404).json({ error: "Dataset not found" });
  
  // Check current processing status
  const datasetFiles = dataset.files;
  const processingFiles = datasetFiles.filter(file => {
    const job = jobs[file.id];
    return job && job.status === "processing";
  });
  
  res.json({
    status: dataset.status,
    processingFiles: processingFiles.length,
    totalFiles: datasetFiles.length,
    lastUpdated: dataset.lastUpdated
  });
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
    const { fileId, originalname, folder } = req.body;
    const buffer = req.file.buffer;

    if (!jobs[fileId]) {
      jobs[fileId] = {
        filename: originalname,
        folder: folder || getExtlessName(originalname),
        status: "initialized",
        progress: 0,
        startTime: Date.now(),
      };
    }

    // Save file directly to merged folder
    const outputDir = path.join(__dirname, "merged", jobs[fileId].folder);
    fs.mkdirSync(outputDir, { recursive: true });
    const finalPath = path.join(outputDir, originalname);
    fs.writeFileSync(finalPath, buffer);

    jobs[fileId].status = "uploaded";
    jobs[fileId].progress = 100;

    // Log upload time only
    if (jobs[fileId].startTime) {
      const uploadEndTime = Date.now();
      const uploadDurationSec = ((uploadEndTime - jobs[fileId].startTime) / 1000).toFixed(2);
      console.log(`📤 File ${fileId} (${jobs[fileId].filename}) upload time: ${uploadDurationSec} seconds`);
    }

    simulateProcessing(fileId);
    res.json({ message: "File uploaded" });
  } catch (error) {
    console.error("❌ Upload failed:", error);
    if (req.body.fileId) jobs[req.body.fileId].status = "error";
    res.status(500).json({ error: "Upload failed" });
  }
});

// Endpoint to get a presigned URL for S3 upload
app.post('/get-presigned-url', async (req, res) => {
  try {
    const { filename, folder, contentType } = req.body;
    const key = `${folder}/${filename}`;
    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      ContentType: contentType,
    });
    const url = await getSignedUrl(s3, command, { expiresIn: 300 }); // 5 min
    res.json({ url, key });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get presigned URL' });
  }
});

// Endpoint to trigger processing after S3 upload
app.post('/process-s3-file', async (req, res) => {
  try {
    const { fileId, originalname, folder, s3Key } = req.body;

    // Check if file exists in S3
    try {
      await s3.send(new HeadObjectCommand({
        Bucket: S3_BUCKET,
        Key: s3Key,
      }));
    } catch (err) {
      // File does not exist
      return res.status(400).json({ error: 'File not uploaded to S3' });
    }

    // Register job and process
    jobs[fileId] = {
      filename: originalname,
      folder: folder,
      status: 'uploaded',
      progress: 100,
      s3Key,
      startTime: Date.now(),
    };
    simulateProcessing(fileId, true);
    res.json({ message: 'Processing started' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to start processing' });
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
  const datasetList = Object.values(datasets).map((dataset) => {
    // Update status before sending
    updateDatasetStatus(dataset.name);
    
    return {
      name: dataset.name,
      fileCount: dataset.files.length,
      recordCount: dataset.data.length,
      createdAt: dataset.createdAt,
      status: dataset.status,
      lastUpdated: dataset.lastUpdated,
    };
  });

  res.json({ datasets: datasetList });
});

/* ------------------ Get Dataset Details ------------------ */
app.get("/api/datasets/:name", (req, res) => {
  const dataset = datasets[req.params.name];
  if (!dataset) return res.status(404).json({ error: "Dataset not found" });

  // Update status before sending
  updateDatasetStatus(req.params.name);

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