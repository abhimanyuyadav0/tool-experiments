import { Handle, NodeProps, Position } from 'reactflow';

export default function TableNode({ data }: NodeProps) {
  return (
    <div className="bg-black rounded shadow-lg border border-gray-300 w-56 relative">
      {/* Target handle: allows connections to come into this node */}
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        style={{ background: '#555' }}
      />
      
      {/* Node header */}
      <div className="bg-gray-800 text-white text-sm font-semibold rounded-t p-2">
        {data.label}
      </div>

      {/* Fields */}
      <ul className="p-2 text-xs">
        {data.fields.map((field: string) => (
          <li key={field} className="border-b last:border-0 py-1 text-gray-100">
            {field}
          </li>
        ))}
      </ul>

      {/* Source handle: allows connections from this node to others */}
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        style={{ background: '#555' }}
      />
    </div>
  );
}
