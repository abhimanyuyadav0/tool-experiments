'use client'; // required for Next.js app directory if you use it

import React from 'react';
import ReactFlow, { Background, Controls, Node, Edge } from 'reactflow';
import 'reactflow/dist/style.css';

const nodes: Node[] = [
  {
    id: '1',
    position: { x: 0, y: 0 },
    data: { label: 'Start' },
    type: 'input',
  },
  {
    id: '2',
    position: { x: 250, y: 0 },
    data: { label: 'End' },
  },
];

const edges: Edge[] = [
  {
    id: 'e1-2',
    source: '1',
    target: '2',
  },
];

export default function FlowChart() {
  return (
    <div style={{ width: '100%', height: '500px' }}>
      <ReactFlow nodes={nodes} edges={edges} fitView>
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
