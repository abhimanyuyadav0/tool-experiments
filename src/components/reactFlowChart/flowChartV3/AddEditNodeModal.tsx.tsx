import React, { useState, useEffect } from "react";
import { Node } from "reactflow";

interface AddEditNodeModalProps {
  isOpen: boolean;
  node?: Node | null;
  onClose: () => void;
  onSubmit: (node: { id: string; type: string; position: { x: number; y: number }; label: string; fields: string[] }) => void;
}

export default function AddEditNodeModal({ isOpen, node, onClose, onSubmit }: AddEditNodeModalProps) {
  const [id, setId] = useState("");
  const [type, setType] = useState("tableNode");
  const [label, setLabel] = useState("");
  const [fields, setFields] = useState<string>("");
  const [positionX, setPositionX] = useState<number>(0);
  const [positionY, setPositionY] = useState<number>(0);

  useEffect(() => {
    if (node) {
      setId(node.id);
      setType(node.type);
      setLabel(node.data.label || "");
      setFields((node.data.fields || []).join(","));
      setPositionX(node.position?.x ?? 0);
      setPositionY(node.position?.y ?? 0);
    } else {
      setId("");
      setType("tableNode");
      setLabel("");
      setFields("");
      setPositionX(0);
      setPositionY(0);
    }
  }, [node, isOpen]);

  const handleSubmit = () => {
    const fieldsArray = fields.split(",").map((f) => f.trim()).filter((f) => f);
    const nodeId = node ? node.id : id.trim() || `${label.toLowerCase()}-${Date.now()}`;

    onSubmit({
      id: nodeId,
      type,
      position: { x: positionX, y: positionY },
      label,
      fields: fieldsArray,
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0  flex items-center justify-center z-[1100]">
      <div className="bg-white rounded p-6 shadow-lg w-96 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold mb-4">{node ? "Edit Node" : "Add New Node"}</h2>

        {!node && (
          <div className="mb-4">
            <label className="text-sm font-medium">Node ID (optional)</label>
            <input
              className="w-full border rounded p-2 text-sm mt-1"
              placeholder="Leave empty for auto-generated ID"
              value={id}
              onChange={(e) => setId(e.target.value)}
            />
          </div>
        )}

        <div className="mb-4">
          <label className="text-sm font-medium">Node Type</label>
          <select
            className="w-full border rounded p-2 text-sm mt-1"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="tableNode">tableNode</option>
            <option value="userNode">userNode</option>
          </select>
        </div>

        <div className="mb-4">
          <label className="text-sm font-medium">Table Label</label>
          <input
            className="w-full border rounded p-2 text-sm mt-1"
            placeholder="e.g., Customers"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </div>

        <div className="mb-4">
          <label className="text-sm font-medium">Fields (comma separated)</label>
          <input
            className="w-full border rounded p-2 text-sm mt-1"
            placeholder="e.g., id,name,email"
            value={fields}
            onChange={(e) => setFields(e.target.value)}
          />
        </div>

        <div className="flex gap-2 mb-4">
          <div className="flex-1">
            <label className="text-sm font-medium">Position X</label>
            <input
              type="number"
              className="w-full border rounded p-2 text-sm mt-1"
              value={positionX}
              onChange={(e) => setPositionX(Number(e.target.value))}
            />
          </div>
          <div className="flex-1">
            <label className="text-sm font-medium">Position Y</label>
            <input
              type="number"
              className="w-full border rounded p-2 text-sm mt-1"
              value={positionY}
              onChange={(e) => setPositionY(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button className="px-4 py-2 text-sm rounded bg-gray-300 hover:bg-gray-400" onClick={onClose}>
            Cancel
          </button>
          <button
            className={`px-4 py-2 text-sm rounded ${node ? "bg-green-500 hover:bg-green-600" : "bg-blue-500 hover:bg-blue-600"} text-white`}
            onClick={handleSubmit}
          >
            {node ? "Update Node" : "Add Node"}
          </button>
        </div>
      </div>
    </div>
  );
}
