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
import UserNode from "../UserNode";

const initialNodes: Node[] = [
  {
    id: "users",
    type: "userNode",
    position: { x: 344.4293252250363, y: 278.10975613298007 },
    data: { label: "Users", fields: ["id", "name", "email"] },
  },
  {
    id: "orders",
    type: "tableNode",
    position: { x: -264.2458918809783, y: 94.55455389940177 },
    data: { label: "Orders", fields: ["id", "user_id", "product_id", "test"] },
  },
  {
    id: "products",
    type: "tableNode",
    position: { x: 319.1425499430009, y: -108.07865224706511 },
    data: { label: "Products", fields: ["id", "name", "price"] },
  },
  {
    id: "categories",
    type: "tableNode",
    position: { x: 706.4140890020838, y: 56.59661602002234 },
    data: { label: "Categories", fields: ["id", "name", "description"] },
  },
  {
    id: "reviews",
    type: "tableNode",
    position: { x: -154.5284286237619, y: -146.16751961564157 },
    data: {
      label: "Reviews",
      fields: ["id", "product_id", "review_text", "rating"],
    },
  },
];

const initialEdges: Edge[] = [
  { id: "e-users-orders", source: "orders", target: "users", label: "user_id" },
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
    source: "reviews",
    target: "products",
    label: "product_id",
  },
];

export default function FlowChartV2() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const [selectedEdges, setSelectedEdges] = useState<Edge[]>([]);
  const [form, setForm] = useState({
    nodes: initialNodes,
    edges: initialEdges,
  });
  const [generatedSQL, setGeneratedSQL] = useState<string>("");
  const [generatedMongo, setGeneratedMongo] = useState<string>("");

  const onConnect = (params: Connection) =>
    setEdges((eds) => addEdge({ ...params, animated: true }, eds));

  const onEdgesDelete = (deleted: Edge[]) => {
    setEdges((eds) => eds.filter((e) => !deleted.find((d) => d.id === e.id)));
  };

  const onSelectionChange = ({ edges: selected }: { edges: Edge[] }) => {
    setSelectedEdges(selected ?? []);
  };

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

  const generateSQL = () => {
    const sqlStatements: string[] = [];

    const updatedNodes = [...nodes];

    for (const edge of form.edges) {
      const sourceNode = updatedNodes.find((n) => n.id === edge.source);
      if (sourceNode && !sourceNode.data.fields.includes(edge.label)) {
        sourceNode.data.fields.push(edge.label);
      }
    }
    setNodes(updatedNodes);

    for (const node of updatedNodes) {
      const tableName = node.data.label.toLowerCase();
      const fieldsSQL = node.data.fields
        .map((field) => {
          if (field === "id") return `${field} SERIAL PRIMARY KEY`;
          return `${field} TEXT`;
        })
        .join(",\n  ");
      sqlStatements.push(`CREATE TABLE ${tableName} (\n  ${fieldsSQL}\n);`);
    }

    for (const edge of form.edges) {
      const source = updatedNodes.find((n) => n.id === edge.source);
      const target = updatedNodes.find((n) => n.id === edge.target);

      if (!source || !target) continue;

      const sourceTable = source.data.label.toLowerCase();
      const targetTable = target.data.label.toLowerCase();

      sqlStatements.push(
        `ALTER TABLE ${sourceTable}\n  ADD CONSTRAINT fk_${sourceTable}_${edge.label} FOREIGN KEY (${edge.label}) REFERENCES ${targetTable}(id);`
      );
    }

    setGeneratedSQL(sqlStatements.join("\n\n"));
  };

  const generateMongo = () => {
    const mongoSchemas: string[] = [];

    const updatedNodes = nodes.map((node) => {
      const nodeCopy = {
        ...node,
        data: { ...node.data, fields: [...node.data.fields] },
      };
      return nodeCopy;
    });

    // Build a lookup of edges by source & label
    const fkMap: Record<string, { ref: string; field: string }[]> = {};
    for (const edge of edges) {
      if (!fkMap[edge.source]) fkMap[edge.source] = [];
      const targetNode = nodes.find((n) => n.id === edge.target);
      if (targetNode) {
        fkMap[edge.source].push({
          field: edge.label,
          ref: targetNode.data.label,
        });
      }
    }

    for (const node of updatedNodes) {
      const modelName = node.data.label;
      const fields: string[] = [];

      for (const field of node.data.fields) {
        if (field === "id") {
          fields.push(`  ${field}: { type: Number, required: true }`);
          continue;
        }

        const fkInfo = fkMap[node.id]?.find((fk) => fk.field === field);
        if (fkInfo) {
          // Field is a foreign key
          fields.push(
            `  ${field}: { type: mongoose.Schema.Types.ObjectId, ref: "${fkInfo.ref}" }`
          );
        } else {
          fields.push(`  ${field}: { type: String }`);
        }
      }

      const schema = `const ${modelName}Schema = new mongoose.Schema({\n${fields.join(
        ",\n"
      )}\n});\n\nmodule.exports = mongoose.model("${modelName}", ${modelName}Schema);`;
      mongoSchemas.push(schema);
    }

    setGeneratedMongo(mongoSchemas.join("\n\n"));
  };

  return (
    <div className="relative w-full h-screen">
      {selectedEdges.length > 0 && (
        <div className="absolute top-15 left-2 flex items-center gap-2 p-2 bg-white rounded shadow z-[1000]">
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

      <div className="absolute top-2 left-2 flex items-center gap-2 p-2 bg-white rounded shadow z-[1000]">
        <button
          className="p-1 rounded bg-blue-500 text-white text-xs hover:bg-blue-600"
          onClick={generateSQL}
        >
          Generate SQL
        </button>
        <button
          className="p-1 rounded bg-green-500 text-white text-xs hover:bg-green-600"
          onClick={generateMongo}
        >
          Generate Mongo
        </button>
      </div>

      <div className="absolute top-0 bottom-0 right-0 w-100 h-[90vh] overflow-y-auto text-xs bg-white p-2 border z-[1000]">
        <strong>Form Data</strong>
        <pre>{JSON.stringify(form, null, 2)}</pre>

        {generatedSQL && (
          <>
            <strong className="block mt-2">Generated SQL</strong>
            <pre className="text-green-800">{generatedSQL}</pre>
          </>
        )}

        {generatedMongo && (
          <>
            <strong className="block mt-2">Generated Mongo Schema</strong>
            <pre className="text-purple-800">{generatedMongo}</pre>
          </>
        )}
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgesDelete={onEdgesDelete}
        onSelectionChange={onSelectionChange}
        nodeTypes={{ tableNode: TableNode, userNode:UserNode }}
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
