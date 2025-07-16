import React, { useState, useEffect } from "react";

interface EditNodeModalProps {
  node: Node;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (updated: { id: string; label: string; fields: string[] }) => void;
}

export default function EditNodeModal({ node, isOpen, onClose, onSubmit }: EditNodeModalProps) {
  const [label, setLabel] = useState(node?.data?.label || "");
  const [fields, setFields] = useState<string>((node?.data?.fields || []).join(","));

  useEffect(() => {
    if (node) {
      setLabel(node.data?.label || "");
      setFields((node.data?.fields || []).join(","));
    }
  }, [node]);

  if (!isOpen || !node) return null;

  const handleUpdate = () => {
    const fieldsArray = fields
      .split(",")
      .map((f) => f.trim())
      .filter((f) => f);
    onSubmit({ id: node.id, label, fields: fieldsArray });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1100]">
      <div className="bg-white rounded p-6 w-96 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold mb-4">Edit Node</h2>

        <div className="mb-4">
          <label className="text-sm font-medium">Label</label>
          <input
            className="w-full border rounded p-2 text-sm mt-1"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </div>

        <div className="mb-4">
          <label className="text-sm font-medium">Fields (comma separated)</label>
          <input
            className="w-full border rounded p-2 text-sm mt-1"
            value={fields}
            onChange={(e) => setFields(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2">
          <button
            className="px-4 py-2 text-sm rounded bg-gray-300 hover:bg-gray-400"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 text-sm rounded bg-green-500 text-white hover:bg-green-600"
            onClick={handleUpdate}
          >
            Update Node
          </button>
        </div>
      </div>
    </div>
  );
}
