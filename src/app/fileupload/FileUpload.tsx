'use client';
import { Button, ProgressBar } from "@nmspl/nm-ui-lib";
import React, { useState, ChangeEvent } from "react";

const FileUpload: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string>("");
  const [progress, setProgress] = useState<number>(0);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setStatus(`Selected: ${file.name}`);
      setProgress(0);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      setStatus("Please select a file to upload.");
      return;
    }

    const chunkSize = 5 * 1024 * 1024; // 5MB
    const totalChunks = Math.ceil(selectedFile.size / chunkSize);
    const chunkProgress = 100 / totalChunks;
    let chunkNumber = 0;
    let start = 0;
    let end = chunkSize;

    const uploadNextChunk = async () => {
      if (end <= selectedFile.size || (chunkNumber === totalChunks - 1)) {
        const chunk = selectedFile.slice(start, end);
        const formData = new FormData();
        formData.append("file", chunk);
        formData.append("chunkNumber", chunkNumber.toString());
        formData.append("totalChunks", totalChunks.toString());
        formData.append("originalname", selectedFile.name);

        try {
          const response = await fetch("http://localhost:8000/upload", {
            method: "POST",
            body: formData,
          });
          const data = await response.json();
          const temp = `Chunk ${chunkNumber + 1}/${totalChunks} uploaded successfully`;
          setStatus(temp);
          setProgress(Number(((chunkNumber + 1) * chunkProgress).toFixed(2)));
          chunkNumber++;
          start = end;
          end = start + chunkSize;
          uploadNextChunk();
        } catch (error) {
          console.error("Error uploading chunk:", error);
          setStatus("Error uploading file. Please try again.");
        }
      } else {
        setProgress(100);
        setSelectedFile(null);
        setStatus("File upload completed successfully!");
      }
    };

    setStatus("Starting upload...");
    await uploadNextChunk();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">
          Resumable File Upload
        </h2>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select File
          </label>
          <input
            type="file"
            multiple
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-colors"
          />
        </div>
        {status && (
          <div className="mb-4 text-center text-sm text-gray-600">
            {status}
          </div>
        )}
        {progress > 0 && (
          <div className="mb-4">
            <ProgressBar
              progress={progress}
            />
            <div className="text-center text-sm text-gray-500 mt-2">
              {progress.toFixed(0)}%
            </div>
          </div>
        )}
        <Button
          onClick={handleFileUpload}
          disabled={!selectedFile}
          className={`w-full py-2 px-4 rounded-full text-white font-semibold transition-colors duration-200 ${
            selectedFile
              ? "bg-blue-600 hover:bg-blue-700"
              : "bg-gray-400 cursor-not-allowed"
          }`}
        >
          Upload File
        </Button>
      </div>
    </div>
  );
};

export default FileUpload;