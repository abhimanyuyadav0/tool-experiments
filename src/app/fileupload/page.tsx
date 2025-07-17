import React from "react";
import FileUpload from "./FileUpload";

const FileUploadPage = () => {
  return (
    <div className="min-h-screen overflow-hidden">
      <h1 className="text-xl font-semibold mb-4">
        data processing...
      </h1>
      <div className="">
        <div>
          <FileUpload />
        </div>
      </div>
    </div>
  );
};

export default FileUploadPage;
