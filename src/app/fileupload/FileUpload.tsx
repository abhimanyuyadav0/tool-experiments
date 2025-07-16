"use client";

import { Button, ProgressBar } from "@nmspl/nm-ui-lib";
import React, { ChangeEvent, useEffect, useState } from "react";
import { v4 as uuid } from "uuid";

type FileStatus =
  | "initialized"
  | "uploading"
  | "uploaded"
  | "processing"
  | "complete"
  | "error";

interface UploadFile {
  id: string;
  file: File;
  status: FileStatus;
  progress: number;
}

const FileUpload: React.FC = () => {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []).map((file) => ({
      id: uuid(),
      file,
      status: "initialized" as FileStatus,
      progress: 0,
    }));
    setFiles((prev) => [...prev, ...selected]);
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const uploadChunks = async (uploadFile: UploadFile) => {
    const { file, id } = uploadFile;
    const chunkSize = 5 * 1024 * 1024;
    const totalChunks = Math.ceil(file.size / chunkSize);

    for (let i = 0; i < totalChunks; i++) {
      const chunk = file.slice(i * chunkSize, (i + 1) * chunkSize);
      const formData = new FormData();
      formData.append("file", chunk);
      formData.append("fileId", id);
      formData.append("chunkNumber", i.toString());
      formData.append("totalChunks", totalChunks.toString());
      formData.append("originalname", file.name);

      await fetch("http://localhost:8000/upload", {
        method: "POST",
        body: formData,
      });

      setFiles((prev) =>
        prev.map((f) =>
          f.id === id
            ? {
                ...f,
                status: "uploading",
                progress: ((i + 1) / totalChunks) * 100,
              }
            : f
        )
      );
    }
  };

  const startUploadAll = async () => {
    setIsUploading(true);
    const pending = files.filter((f) => f.status === "initialized");
    for (const file of pending) {
      await uploadChunks(file);
    }
  };

  const pollStatus = () => {
    files.forEach(async (file) => {
      if (["complete", "error"].includes(file.status)) return;
      const res = await fetch(`http://localhost:8000/status/${file.id}`);
      if (res.ok) {
        const data = await res.json();
        setFiles((prev) =>
          prev.map((f) =>
            f.id === file.id
              ? { ...f, status: data.status, progress: data.progress }
              : f
          )
        );
      }
    });
  };

  useEffect(() => {
    const interval = setInterval(pollStatus, 5000);
    return () => clearInterval(interval);
  }, [files]);

  const hasInitializedFiles = files.some((f) => f.status === "initialized");

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-xl">
        <h2 className="text-2xl font-bold mb-4 text-center">Multi File Upload</h2>

        <input
          type="file"
          multiple
          onChange={handleFileChange}
          className="mb-4 block w-full"
          disabled={isUploading}
        />

        {hasInitializedFiles && !isUploading && (
          <Button
            className="w-full mb-4"
            onClick={startUploadAll}
            disabled={!hasInitializedFiles}
          >
            Upload All
          </Button>
        )}

        <div className="space-y-4 max-h-80 overflow-y-auto">
          {files.map((f) => (
            <div
              key={f.id}
              className="border rounded p-3 relative bg-white shadow-sm"
            >
              <div className="flex justify-between items-center mb-1">
                <span className="font-medium">{f.file.name}</span>
                <span className="text-sm text-gray-500">{f.status}</span>
              </div>

              <ProgressBar progress={f.progress} />

              {f.status === "initialized" && !isUploading && (
                <button
                  onClick={() => removeFile(f.id)}
                  className="text-red-500 text-sm mt-2 underline"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FileUpload;
