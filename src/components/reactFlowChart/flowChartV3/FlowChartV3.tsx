"use client";

import React, { useEffect, useState, useCallback } from "react";
import ReactFlow, {
  Background,
  Controls,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  MiniMap,
  Node,
  Edge,
} from "reactflow";
import "reactflow/dist/style.css";
import TableNode from "../TableNode";
import UserNode from "../UserNode";
import { MdDeleteOutline, MdEdit } from "react-icons/md";
import AddEditNodeModal from "./AddEditNodeModal.tsx";
const nodeTypes = {
  tableNode: TableNode,
  userNode: UserNode,
};
const initialNodes: Node[] = [
  {
    id: "users",
    type: "userNode",
    position: { x: 344.4, y: 278.1 },
    data: { label: "Users", fields: ["id", "name", "email"] },
  },
  {
    id: "orders",
    type: "tableNode",
    position: { x: -264.2, y: 94.5 },
    data: { label: "Orders", fields: ["id", "user_id", "product_id", "test"] },
  },
  {
    id: "products",
    type: "tableNode",
    position: { x: 319.1, y: -108.1 },
    data: { label: "Products", fields: ["id", "name", "price"] },
  },
  {
    id: "categories",
    type: "tableNode",
    position: { x: 706.4, y: 56.6 },
    data: { label: "Categories", fields: ["id", "name", "description"] },
  },
  {
    id: "reviews",
    type: "tableNode",
    position: { x: -154.5, y: -146.2 },
    data: { label: "Reviews", fields: ["id", "product_id", "review_text", "rating"] },
  },
];

const initialEdges: Edge[] = [
  { id: "e-users-orders", source: "orders", target: "users", label: "user_id" },
  { id: "e-orders-products", source: "orders", target: "products", label: "product_id" },
  { id: "e-products-categories", source: "products", target: "categories", label: "category_id" },
  { id: "e-products-reviews", source: "reviews", target: "products", label: "product_id" },
];

export default function FlowChartV3() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedEdges, setSelectedEdges] = useState<Edge[]>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [modalNode, setModalNode] = useState<Node | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [layoutMode, setLayoutMode] = useState<'vertical' | 'horizontal' | 'grid'>('vertical');
  const [customPositions] = useState(new Set<string>());

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
    [setEdges]
  );

  const onEdgesDelete = useCallback(
    (deleted: Edge[]) => setEdges((eds) => eds.filter((e) => !deleted.find((d) => d.id === e.id))),
    [setEdges]
  );

  const onSelectionChange = useCallback(
    ({ nodes: selNodes = [], edges: selEdges = [] }: { nodes?: Node[]; edges?: Edge[] }) => {
      setSelectedEdges(selEdges);
      setSelectedNode(selNodes.length === 1 ? selNodes[0] : null);
    },
    []
  );

  const handleAddOrEditNode = useCallback(
    (nodeData: {
      id: string;
      type: string;
      position: { x: number; y: number };
      label: string;
      fields: string[];
    }) => {
      setNodes((nds) => {
        const idx = nds.findIndex((n) => n.id === nodeData.id);
        if (idx !== -1) {
          const updated = [...nds];
          updated[idx] = {
            ...updated[idx],
            type: nodeData.type,
            position: nodeData.position,
            data: { label: nodeData.label, fields: nodeData.fields },
          };
          return updated;
        }
        return nds.concat({
          id: nodeData.id,
          type: nodeData.type,
          position: nodeData.position,
          data: { label: nodeData.label, fields: nodeData.fields },
        });
      });
    },
    [setNodes]
  );

  const handleDeleteNode = useCallback(() => {
    if (selectedNode) {
      setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
      setSelectedNode(null);
    }
  }, [selectedNode, setNodes]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "Delete" || e.key === "Backspace") && selectedEdges.length) {
        setEdges((eds) => eds.filter((e) => !selectedEdges.find((sel) => sel.id === e.id)));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedEdges, setEdges]);

  return (
    <div className="relative w-full h-screen">
      <div className="absolute top-2 left-2 p-2 bg-white rounded shadow z-[1000]">
        {selectedNode && <span className="text-xs text-gray-600">{selectedNode.data.label}</span>}

        <div className="flex gap-2 mt-1">
          <button
            className="px-2 py-1 rounded bg-green-500 text-white text-xs hover:bg-green-600"
            onClick={() => {
              setModalNode(null);
              setIsModalOpen(true);
            }}
          >
            + Add Table
          </button>
          {selectedNode && (
            <>
              <button
                className="p-1 rounded hover:bg-blue-100 text-blue-500"
                onClick={() => {
                  setModalNode(selectedNode);
                  setIsModalOpen(true);
                }}
              >
                <MdEdit size={20} />
              </button>
              <button
                className="p-1 rounded hover:bg-red-100 text-red-500"
                onClick={handleDeleteNode}
              >
                <MdDeleteOutline size={20} />
              </button>
            </>
          )}
        </div>
        
        <div className="flex gap-1 mt-2">
          <span className="text-xs text-gray-600">Layout:</span>
          {(['vertical', 'horizontal', 'grid'] as const).map(mode => (
            <button
              key={mode}
              className={`px-2 py-1 rounded text-xs ${
                layoutMode === mode 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              onClick={() => setLayoutMode(mode)}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgesDelete={onEdgesDelete}
        onSelectionChange={onSelectionChange}
        nodeTypes={nodeTypes}
        fitView
        selectionOnDrag
      >
        <Background />
        <MiniMap />
        <Controls />
      </ReactFlow>

      <AddEditNodeModal
        isOpen={isModalOpen}
        node={modalNode}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAddOrEditNode}
      />
    </div>
  );
}
