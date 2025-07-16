import { Handle, NodeProps, Position } from "reactflow";
import { FaUserCircle } from "react-icons/fa";

export default function UserNode({ data }: NodeProps) {
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-300 w-64 relative overflow-hidden">
      {/* Target handle: connections coming in */}
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        style={{ background: "#555" }}
      />

      {/* Profile Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 flex items-center gap-3">
        <FaUserCircle className="text-white text-4xl flex-shrink-0" />
        <div>
          <h2 className="text-white text-base font-bold">{data.label}</h2>
          <p className="text-indigo-200 text-xs">Profile Overview</p>
        </div>
      </div>

      {/* User Details Section */}
      <div className="p-4 bg-white">
        <ul className="text-sm text-gray-700">
          {data.fields.map((field: string) => (
            <li
              key={field}
              className="flex justify-between items-center py-1 border-b last:border-b-0"
            >
              <span className="font-medium capitalize">{field}</span>
              <span className="text-gray-500">—</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Source handle: connections going out */}
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        style={{ background: "#555" }}
      />
    </div>
  );
}
