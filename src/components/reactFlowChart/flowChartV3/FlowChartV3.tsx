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
  // DB1 tables
  {
    id: "db1-users",
    type: "userNode",
    position: { x: 344.4, y: 278.1 },
    data: { db: "DB1", label: "Users", fields: ["id", "name", "email"] },
  },
  {
    id: "db1-orders",
    type: "tableNode",
    position: { x: 144.4, y: 378.1 },
    data: { db: "DB1", label: "Orders", fields: ["id", "user_id", "product_id", "test"] },
  },
  {
    id: "db1-products",
    type: "tableNode",
    position: { x: 319.1, y: 108.1 },
    data: { db: "DB1", label: "Products", fields: ["id", "name", "price"] },
  },
  // DB2 tables
  {
    id: "db2-customers",
    type: "userNode",
    position: { x: 800, y: 278.1 },
    data: { db: "DB2", label: "Customers", fields: ["id", "full_name", "email"] },
  },
  {
    id: "db2-sales",
    type: "tableNode",
    position: { x: 1000, y: 378.1 },
    data: { db: "DB2", label: "Sales", fields: ["id", "customer_id", "item_id", "amount"] },
  },
  {
    id: "db2-inventory",
    type: "tableNode",
    position: { x: 900, y: 108.1 },
    data: { db: "DB2", label: "Inventory", fields: ["id", "item_name", "stock"] },
  },
];

const initialEdges: Edge[] = [
  { id: "e-db1-users-orders", source: "db1-orders", target: "db1-users", label: "user_id" },
  { id: "e-db1-orders-products", source: "db1-orders", target: "db1-products", label: "product_id" },
  { id: "e-db2-customers-sales", source: "db2-sales", target: "db2-customers", label: "customer_id" },
  { id: "e-db2-sales-inventory", source: "db2-sales", target: "db2-inventory", label: "item_id" },
];

export default function FlowChartV3() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedEdges, setSelectedEdges] = useState<Edge[]>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [modalNode, setModalNode] = useState<Node | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Helper to get unique DBs and their nodes
  const dbMap = nodes.reduce((acc, node) => {
    const db = node.data.db;
    if (!acc[db]) acc[db] = [];
    acc[db].push(node);
    return acc;
  }, {} as Record<string, Node[]>);

  // Generate colors for each DB (simple color generation without external library)
  const dbNames = Object.keys(dbMap);
  const getDbColor = (index: number) => {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
    return colors[index % colors.length];
  };

  // Compute card positions and sizes dynamically
  const dbCards = dbNames.map((db, i) => {
    const dbNodes = dbMap[db];
    if (dbNodes.length === 0) return null;
    
    // Calculate bounds based on node positions and estimated node sizes
    const nodeWidth = 250; // Estimated table node width
    const nodeHeight = 100; // Estimated table node height
    const padding = 30;
    
    const xs = dbNodes.map((n) => n.position.x);
    const ys = dbNodes.map((n) => n.position.y);
    
    const minX = Math.min(...xs) - padding;
    const maxX = Math.max(...xs) + nodeWidth + padding;
    const minY = Math.min(...ys) - padding;
    const maxY = Math.max(...ys) + nodeHeight + padding;
    
    const color = getDbColor(i);
    
    return {
      db,
      color,
      left: minX,
      top: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }).filter(Boolean);

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
      {/* Dynamic DB cards */}
      {dbCards.map((card) => (
        <div
          key={card.db}
          className="absolute z-0 rounded-xl border-2 bg-opacity-20 flex items-start justify-start pointer-events-none"
          style={{
            left: card.left,
            top: card.top,
            width: card.width,
            height: card.height,
            borderColor: card.color,
            backgroundColor: `${card.color}20`, // Adding transparency
          }}
        >
          <span
            className="m-2 px-2 py-1 rounded font-bold text-sm shadow bg-white bg-opacity-80"
            style={{
              color: card.color,
            }}
          >
            {card.db}
          </span>
        </div>
      ))}
      
      {/* Controls */}
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
