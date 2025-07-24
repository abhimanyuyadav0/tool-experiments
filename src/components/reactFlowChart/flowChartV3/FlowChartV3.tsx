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

  // Auto-fit group size to children
  useEffect(() => {
    let changed = false;
    const newNodes = nodes.map((group) => {
      if (group.type !== "group") return group;
      const children = nodes.filter((n) => n.parentId === group.id);
      if (!children.length) return group;
      const xs = children.map((n) => n.position.x);
      const ys = children.map((n) => n.position.y);
      const ws = children.map((n) => n.width || 180);
      const hs = children.map((n) => n.height || 80);
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      const maxX = Math.max(...xs.map((x, i) => x + ws[i]));
      const maxY = Math.max(...ys.map((y, i) => y + hs[i]));
      const pad = 40;
      const minWidth = Math.max(...ws) + pad * 2;
      const minHeight = Math.max(...hs) + pad * 2;
      const neededWidth = Math.max(maxX - minX + pad * 2, minWidth);
      const neededHeight = Math.max(maxY - minY + pad * 2, minHeight);
      let style = { ...group.style };
      let groupChanged = false;
      if (Number(style.width ?? 400) !== neededWidth) {
        style.width = neededWidth;
        groupChanged = true;
      }
      if (Number(style.height ?? 400) !== neededHeight) {
        style.height = neededHeight;
        groupChanged = true;
      }
      if (groupChanged) {
        changed = true;
        return { ...group, style };
      }
      return group;
    });
    if (changed) setNodes(newNodes);
  }, [nodes, setNodes]);

  // Smart auto-align to minimize edge crossings and avoid overlaps
  useEffect(() => {
    setNodes(nds => {
      let changed = false;
      let newNodes = [...nds];
      // Build a map of table id to connection count (degree)
      const degree: Record<string, number> = {};
      edges.forEach(edge => {
        degree[edge.source] = (degree[edge.source] || 0) + 1;
        degree[edge.target] = (degree[edge.target] || 0) + 1;
      });
      // For each group node
      nds.filter(n => n.type === 'group').forEach(group => {
        // Only auto-align tables that are not custom positioned
        const children = newNodes.filter(n => n.parentId === group.id && !customPositions.has(n.id));
        if (children.length > 0) {
          // Build a set of occupied positions (stringified)
          const occupied = new Set<string>();
          // Sort by degree (most connected first)
          const sorted = [...children].sort((a, b) => (degree[b.id] || 0) - (degree[a.id] || 0));
          // Try to align cross-group edges: for each cross-group edge, align y of source and target
          const crossEdges = edges.filter(e => {
            const src = nds.find(n => n.id === e.source);
            const tgt = nds.find(n => n.id === e.target);
            return src && tgt && src.parentId !== tgt.parentId && (src.parentId === group.id || tgt.parentId === group.id);
          });
          // Map: table id -> y to align
          const alignY: Record<string, number> = {};
          crossEdges.forEach(e => {
            const src = nds.find(n => n.id === e.source);
            const tgt = nds.find(n => n.id === e.target);
            if (src && tgt) {
              if (src.parentId === group.id) alignY[src.id] = tgt.position.y;
              if (tgt.parentId === group.id) alignY[tgt.id] = src.position.y;
            }
          });
          // Layout with collision detection
          if (layoutMode === 'vertical') {
            const startY = 40;
            const gap = 180;
            sorted.forEach((child, i) => {
              let newY = startY + i * gap;
              if (alignY[child.id] !== undefined) newY = alignY[child.id];
              // Find next free slot if needed
              while (occupied.has(`40,${newY}`)) newY += gap;
              occupied.add(`40,${newY}`);
              if (child.position.y !== newY) {
                changed = true;
                child.position = { ...child.position, y: newY };
              }
              if (child.position.x !== 40) {
                changed = true;
                child.position = { ...child.position, x: 40 };
              }
            });
          } else if (layoutMode === 'horizontal') {
            const startX = 40;
            const gap = 260;
            sorted.forEach((child, i) => {
              let newX = startX + i * gap;
              if (alignY[child.id] !== undefined) newX = alignY[child.id];
              while (occupied.has(`${newX},40`)) newX += gap;
              occupied.add(`${newX},40`);
              if (child.position.x !== newX) {
                changed = true;
                child.position = { ...child.position, x: newX };
              }
              if (child.position.y !== 40) {
                changed = true;
                child.position = { ...child.position, y: 40 };
              }
            });
          } else if (layoutMode === 'grid') {
            const cols = 2;
            const gapX = 260;
            const gapY = 180;
            sorted.forEach((child, i) => {
              let col = i % cols;
              let row = Math.floor(i / cols);
              let newX = 40 + col * gapX;
              let newY = 40 + row * gapY;
              if (alignY[child.id] !== undefined) newY = alignY[child.id];
              // Find next free slot if needed
              while (occupied.has(`${newX},${newY}`)) {
                col++;
                if (col >= cols) { col = 0; row++; }
                newX = 40 + col * gapX;
                newY = 40 + row * gapY;
              }
              occupied.add(`${newX},${newY}`);
              if (child.position.x !== newX) {
                changed = true;
                child.position = { ...child.position, x: newX };
              }
              if (child.position.y !== newY) {
                changed = true;
                child.position = { ...child.position, y: newY };
              }
            });
          }
        }
      });
      return changed ? [...newNodes] : nds;
    });
  }, [nodes, edges, layoutMode, customPositions]);

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
