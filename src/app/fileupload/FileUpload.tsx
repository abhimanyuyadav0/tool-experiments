'use client'
import { Button, Card, CardContent, DataTable, Dialog, ProgressBar, Spinner } from "@nmspl/nm-ui-lib";
import React, { useEffect, useState } from "react";

type FileStatus = "initialized" | "uploading" | "uploaded" | "processing" | "complete" | "error";

interface UploadFile {
  id: string;
  file: File;
  status: FileStatus;
  progress: number;
  name: string;
}

interface Dataset {
  name: string;
  fileCount: number;
  recordCount: number;
  createdAt: string;
  status: string;
  lastUpdated?: string;
}

interface DatasetStatus {
  status: string;
  processingFiles: number;
  totalFiles: number;
  lastUpdated: string;
}

export default function ImportPage() {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<string | null>(null);
  const [datasetStatus, setDatasetStatus] = useState<DatasetStatus | null>(null);
  const [tableData, setTableData] = useState([]);
  const [tableMeta, setTableMeta] = useState({ totalRecords: 0, totalPages: 0, currentPage: 1 });
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [datasetName, setDatasetName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [allowedFileTypes, setAllowedFileTypes] = useState<string[]>([]);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const selectedFiles = Array.from(files);
    
    // Check file types if dataset exists
    if (selectedDataset && allowedFileTypes.length > 0) {
      const invalidFiles = selectedFiles.filter((file) => {
        const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
        return !allowedFileTypes.includes(fileExt);
      });
      
      if (invalidFiles.length > 0) {
        alert(`Only ${allowedFileTypes.join(', ')} files are allowed for this dataset.`);
        return;
      }
    }
    
    // For new datasets, only allow single file
    const filesToProcess = selectedDataset ? selectedFiles : selectedFiles.slice(0, 1);
    
    const selected = filesToProcess.map((file) => ({
      id: generateId(),
      file,
      name: file.name,
      status: "initialized" as FileStatus,
      progress: 0,
    }));
    
    setFiles(selected);
    
    // Set default dataset name from first file (only if no dataset selected)
    if (selected.length > 0 && !selectedDataset) {
      setDatasetName(selected[0].name.replace(/\.[^/.]+$/, ""));
    }
  };

  const removeFile = (id:any) => {
    setFiles((prev) => prev ? prev.filter((f) => f.id !== id) : []);
  };

  const uploadChunks = async (uploadFile:any) => {
    const { file, id, name } = uploadFile;
    const chunkSize = 5 * 1024 * 1024;
    const totalChunks = Math.ceil(file.size / chunkSize);

    for (let i = 0; i < totalChunks; i++) {
      const chunk = file.slice(i * chunkSize, (i + 1) * chunkSize);
      const formData = new FormData();
      formData.append("file", chunk);
      formData.append("fileId", id);
      formData.append("chunkNumber", i.toString());
      formData.append("totalChunks", totalChunks.toString());
      formData.append("originalname", name);
      formData.append("folder", datasetName);

      await fetch("http://localhost:8000/upload", {
        method: "POST",
        body: formData,
      });

      setFiles((prev) =>
        prev ? prev.map((f) =>
          f.id === id
            ? {
                ...f,
                status: "uploading",
                progress: ((i + 1) / totalChunks) * 100,
              }
            : f
        ) : []
      );
    }

    setFiles((prev) =>
      prev ? prev.map((f) => (f.id === id ? { ...f, status: "uploaded" } : f)) : []
    );
  };

  const startUploadAll = async () => {
    setIsUploading(true);
    const pending = files ? files.filter((f) => f.status === "initialized") : [];
    
    for (const file of pending) {
      await uploadChunks(file);
    }
    
    setIsUploading(false);
    setShowUploadDialog(false);
    
    // Clear files and refresh datasets immediately
    setFiles([]);
    await loadDatasets();
    
    // Automatically select the dataset after upload
    setSelectedDataset(datasetName);
  };

  const pollStatus = () => {
    if (!files || files.length === 0) return;
    
    files.forEach(async (file) => {
      if (["complete", "error"].includes(file.status)) return;
      try {
        const res = await fetch(`http://localhost:8000/status/${file.id}`);
        if (res.ok) {
          const data = await res.json();
          setFiles((prev) =>
            prev ? prev.map((f) =>
              f.id === file.id
                ? { ...f, status: data.status, progress: data.progress }
                : f
            ) : []
          );
        }
      } catch (error) {
        console.error("Error polling status:", error);
      }
    });
  };

  const loadDatasets = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/datasets");
      const data = await res.json();
      setDatasets(data.datasets || []);
    } catch (error) {
      console.error("Error loading datasets:", error);
      setDatasets([]);
    }
  };

  const loadDatasetStatus = async (datasetName: string) => {
    try {
      const res = await fetch(`http://localhost:8000/api/datasets/${datasetName}/status`);
      const data = await res.json();
      setDatasetStatus(data || null);
    } catch (error) {
      console.error("Error loading dataset status:", error);
      setDatasetStatus(null);
    }
  };

  const loadTableData = async (datasetName:any, page = 1, search = "") => {
    try {
      const res = await fetch(
        `http://localhost:8000/api/datasets/${datasetName}/data?page=${page}&limit=10&search=${search}`
      );
      const data = await res.json();
      setTableData(data.data || []);
      setTableMeta({
        totalRecords: data.totalRecords || 0,
        totalPages: data.totalPages || 0,
        currentPage: data.currentPage || 1
      });
    } catch (error) {
      console.error("Error loading table data:", error);
      setTableData([]);
      setTableMeta({ totalRecords: 0, totalPages: 0, currentPage: 1 });
    }
  };

  useEffect(() => {
    if (files && files.length > 0) {
      const interval = setInterval(pollStatus, 2000);
      return () => clearInterval(interval);
    }
  }, [files]);

  useEffect(() => {
    loadDatasets();
    // Set up interval to refresh datasets every 5 seconds to update processing status
    const interval = setInterval(loadDatasets, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedDataset) {
      loadTableData(selectedDataset, currentPage, searchQuery);
      loadDatasetStatus(selectedDataset);
      
      // Set up interval to refresh dataset status every 10 seconds
      const interval = setInterval(() => {
        loadDatasetStatus(selectedDataset);
      }, 10000);
      
      return () => clearInterval(interval);
    }
  }, [selectedDataset, currentPage, searchQuery]);

  // Modify the import button click handler:
  const handleImportClick = async () => {
    if (selectedDataset) {
      // Load allowed file types for existing dataset
      try {
        const res = await fetch(`http://localhost:8000/api/datasets/${selectedDataset}/allowed-types`);
        const data = await res.json();
        setAllowedFileTypes(data.allowedFileTypes || []);
        setDatasetName(selectedDataset);
      } catch (error) {
        console.error("Error loading allowed file types:", error);
        setAllowedFileTypes([]);
      }
    } else {
      setAllowedFileTypes([]);
      setDatasetName("");
    }
    setShowUploadDialog(true);
  };

  const handleSearch = (e:any) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const tableColumns = [
    { key: 'id', title: 'ID' },
    { key: 'name', title: 'Name' },
    { key: 'value', title: 'Value' },
    { key: 'status', title: 'Status', render: (value:any) => (
      <span className={`px-2 py-1 rounded text-xs ${
        value === 'Active' ? 'bg-green-600' : 
        value === 'Inactive' ? 'bg-red-600' : 'bg-yellow-600'
      }`}>
        {value}
      </span>
    )},
    { key: 'date', title: 'Date' },
    { key: 'source', title: 'Source File' }
  ];

  const hasProcessingFiles = files && files.some(f => f.status === "processing");

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete': return 'bg-green-600';
      case 'processing': return 'bg-yellow-600';
      case 'error': return 'bg-red-600';
      default: return 'bg-gray-600';
    }
  };

  return (
    <div className="relative p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          {selectedDataset ? `Dataset: ${selectedDataset}` : "Data Import System"}
        </h1>
        <div className="flex gap-2">
          {selectedDataset && (
            <Button onClick={() => setSelectedDataset(null)}>
              Back to Datasets
            </Button>
          )}
          <Button onClick={handleImportClick}>
            {selectedDataset ? "Import More" : "Import"}
          </Button>
        </div>
      </div>

      

      {/* Status Banner for Upload Files */}
      {hasProcessingFiles && (
        <div className="bg-yellow-600 text-black p-3 rounded mb-4">
          Processing files... Please wait for completion.
        </div>
      )}

      {/* Main Content */}
      {selectedDataset ? (
        <div className="space-y-4">
          {/* Dataset Info Card */}
          <Card shadow="sm">
            <div className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold">{selectedDataset}</h3>
                  <p className="text-gray-400">
                    {datasetStatus ? datasetStatus.totalFiles : 0} files • {tableMeta.totalRecords} records
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {datasetStatus?.status === 'processing' && <Spinner size="xs" />}
                  <span className={`px-3 py-1 rounded text-sm ${getStatusColor(datasetStatus?.status || 'complete')}`}>
                    {datasetStatus?.status || 'complete'}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Search and Pagination Controls */}
          <div className="flex justify-between items-center">
            <input
              type="text"
              placeholder="Search records..."
              value={searchQuery}
              onChange={handleSearch}
              className="px-3 py-2 bg-gray-800 rounded border border-gray-600"
            />
            <div className="text-sm text-gray-400">
              Showing {tableMeta.currentPage} of {tableMeta.totalPages} pages 
              ({tableMeta.totalRecords} records)
            </div>
          </div>

          {/* Data Table */}
          <DataTable 
            data={tableData} 
            columns={tableColumns}
            onRowClick={(row:any) => console.log("Row clicked:", row)}
          />

          {/* Pagination */}
          <div className="flex justify-center space-x-2 mt-4">
            <Button 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span className="px-4 py-2">
              Page {currentPage} of {tableMeta.totalPages}
            </span>
            <Button 
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, tableMeta.totalPages))}
              disabled={currentPage === tableMeta.totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-full">
          {!datasets || datasets.length === 0 ? (
            <div className="text-center">
              <p className="text-xl mb-4">No data yet</p>
              <p className="text-gray-400">Click "Import" to upload your first dataset</p>
            </div>
          ) : (
            <div className="space-y-4 w-full max-w-4xl">
              <div className="flex justify-between items-center">
                <h2 className="text-xl mb-4">Your Datasets</h2>
              </div>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {datasets.map((dataset) => (
                  <Card 
                    key={dataset.name}
                    onClick={() => setSelectedDataset(dataset.name)}
                    shadow="md" 
                    hoverEffect
                  >
                    <CardContent className="overflow-hidden">
                      <div className="flex justify-between flex-wrap items-start mb-3">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold">{dataset.name}</h3>
                          <p className="text-gray-400">
                            {dataset.fileCount} files • {dataset.recordCount} records
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-xs ${getStatusColor(dataset.status)}`}>
                            {dataset.status}
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-sm text-gray-500">
                        <p>Created: {new Date(dataset.createdAt).toLocaleDateString()}</p>
                        {dataset.lastUpdated && (
                          <p>Updated: {new Date(dataset.lastUpdated).toLocaleString()}</p>
                        )}
                      </div>
                      
                      {dataset.status === 'processing' && (
                        <div className="mt-3 p-2 bg-yellow-100 rounded text-yellow-800 text-sm">
                          <Spinner size="xs" /> Processing files... This may take up to 5 minutes per file.
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog isOpenDialog={showUploadDialog} onCloseDialog={() => {
        setShowUploadDialog(false);
        // Refresh datasets when dialog closes to show any new datasets
        loadDatasets();
      }}>
        <div className="p-6 space-y-4">
          <h2 className="text-xl font-semibold text-black">Upload Files</h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dataset Name
            </label>
            <input
              type="text"
              value={datasetName}
              onChange={(e) => setDatasetName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-black"
              placeholder="Enter dataset name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Files
            </label>
            <input 
              type="file" 
              multiple={!!selectedDataset}
              onChange={handleFileChange}
              accept={allowedFileTypes.length > 0 ? allowedFileTypes.join(',') : undefined}
              className="w-full text-black"
            />
            {!selectedDataset && (
              <p className="text-sm text-gray-600">
                Only one file can be selected for new datasets.
              </p>
            )}
            {allowedFileTypes.length > 0 && (
              <p className="text-sm text-gray-600">
                Only {allowedFileTypes.join(', ')} files are allowed for this dataset.
              </p>
            )}
          </div>

          {files && files.map((f) => (
            <div key={f.id} className="border rounded p-3 bg-gray-50">
              <div className="flex justify-between items-center mb-2">
                <span className="text-black font-medium">{f.name}</span>
                {f.status === "initialized" && (
                  <button 
                    onClick={() => removeFile(f.id)} 
                    className="text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                )}
                <span className="text-sm text-gray-600 capitalize">{f.status}</span>
              </div>
              <ProgressBar progress={f.progress} />
            </div>
          ))}

          <div className="flex justify-end space-x-2">
            <Button onClick={() => setShowUploadDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={startUploadAll} 
              disabled={files.length === 0 || !datasetName.trim()}
            >
              Upload All
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}