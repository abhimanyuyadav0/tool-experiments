"use client";

import React, { useEffect, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  Node,
  Edge,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  MiniMap,
} from "reactflow";
import "reactflow/dist/style.css";
import TableNode from "../TableNode";
import { MdDeleteOutline } from "react-icons/md";

const initialNodes: Node[] = [
  {
    id: "users",
    type: "tableNode",
    position: { x: 0, y: 0 },
    data: { label: "Users", fields: ["id", "name", "email"] },
  },
  {
    id: "orders",
    type: "tableNode",
    position: { x: 300, y: 100 },
    data: { label: "Orders", fields: ["id", "user_id", "product_id"] },
  },
  {
    id: "products",
    type: "tableNode",
    position: { x: 600, y: 0 },
    data: { label: "Products", fields: ["id", "name", "price"] },
  },
  {
    id: "categories",
    type: "tableNode",
    position: { x: 600, y: 250 },
    data: { label: "Categories", fields: ["id", "name", "description"] },
  },
  {
    id: "reviews",
    type: "tableNode",
    position: { x: 900, y: 100 },
    data: {
      label: "Reviews",
      fields: ["id", "product_id", "review_text", "rating"],
    },
  },
];

const initialEdges: Edge[] = [
  { id: "e-users-orders", source: "users", target: "orders", label: "user_id" },
  {
    id: "e-orders-products",
    source: "orders",
    target: "products",
    label: "product_id",
  },
  {
    id: "e-products-categories",
    source: "products",
    target: "categories",
    label: "category_id",
  },
  {
    id: "e-products-reviews",
    source: "products",
    target: "reviews",
    label: "product_id",
  },
];

export default function FlowChartV1() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const [selectedEdges, setSelectedEdges] = useState<Edge[]>([]);
  const [form, setForm] = useState({ nodes: initialNodes, edges: initialEdges });

  const onConnect = (params: Connection) =>
    setEdges((eds) => addEdge({ ...params, animated: true }, eds));

  const onEdgesDelete = (deleted: Edge[]) => {
    setEdges((eds) => eds.filter((e) => !deleted.find((d) => d.id === e.id)));
  };

  const onSelectionChange = ({ edges: selected }: { edges: Edge[] }) => {
    setSelectedEdges(selected ?? []);
  };

  // Delete selected edges when pressing Delete key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        (event.key === "Delete" || event.key === "Backspace") &&
        selectedEdges.length
      ) {
        setEdges((eds) =>
          eds.filter((e) => !selectedEdges.find((sel) => sel.id === e.id))
        );
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedEdges]);

  // Update form data whenever nodes or edges change
  useEffect(() => {
    setForm({ nodes, edges });
  }, [nodes, edges]);

  const handleDeleteClick = () => {
    if (selectedEdges.length) {
      setEdges((eds) =>
        eds.filter((e) => !selectedEdges.find((sel) => sel.id === e.id))
      );
    }
  };

  return (
    <div className="relative w-full h-screen">
      {/* Delete button toolbar */}
      {selectedEdges.length > 0 && (
        <div className="absolute top-2 left-2 flex items-center gap-2 p-2 bg-white rounded shadow z-[1000]">
          <button
            className="p-1 rounded hover:bg-red-100 text-red-500"
            onClick={handleDeleteClick}
          >
            <MdDeleteOutline size={24} />
          </button>
          <span className="text-xs text-gray-600">
            {selectedEdges.length} selected
          </span>
        </div>
      )}

      {/* Optional: Debug form state */}
      <div
        className="absolute top-0 bottom-0 right-0 w-100 h-[90vh] overflow-y-auto text-xs bg-white p-2 border z-[1000]"
      >
        <strong>Form Data</strong>
        <pre>{JSON.stringify(form, null, 2)}</pre>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgesDelete={onEdgesDelete}
        onSelectionChange={onSelectionChange}
        nodeTypes={{ tableNode: TableNode }}
        fitView
        selectionOnDrag
      >
        <Background />
        <MiniMap />
        <Controls />
      </ReactFlow>
    </div>
  );
}
