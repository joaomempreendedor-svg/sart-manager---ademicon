import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  addEdge,
  Controls,
  Background,
  Connection,
  Edge,
  Node,
  MiniMap,
} from 'reactflow';

import { Process } from '@/types';
import { useApp } from '@/context/AppContext';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface MindMapProcessEditorProps {
  process: Process;
}

const initialNodes: Node[] = [{ id: '1', type: 'input', data: { label: 'Nó Central' }, position: { x: 250, y: 5 } }];

const MindMapEditor: React.FC<MindMapProcessEditorProps> = ({ process }) => {
  const { updateProcess } = useApp();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const isInitialLoadRef = useRef(true);

  useEffect(() => {
    isInitialLoadRef.current = true; // Reset on process change
    if (process.content && process.content.nodes && process.content.nodes.length > 0) {
      setNodes(process.content.nodes);
      setEdges(process.content.edges || []);
    } else {
      setNodes(initialNodes);
      setEdges([]);
    }
    // Set timeout to mark initial load as false after the first render
    setTimeout(() => {
        isInitialLoadRef.current = false;
    }, 100);
  }, [process, setNodes, setEdges]);

  const debouncedUpdate = useDebouncedCallback((updatedNodes: Node[], updatedEdges: Edge[]) => {
    updateProcess(process.id, { content: { nodes: updatedNodes, edges: updatedEdges } })
      .then(() => toast.success('Alterações salvas automaticamente!'))
      .catch(err => toast.error(`Erro ao salvar: ${err.message}`));
  }, 1000);

  useEffect(() => {
    if (isInitialLoadRef.current) return;
    debouncedUpdate(nodes, edges);
  }, [nodes, edges, debouncedUpdate]);

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeDoubleClick = useCallback((event: React.MouseEvent, node: Node) => {
    const newLabel = prompt('Editar nome do nó:', node.data.label);
    if (newLabel !== null && newLabel.trim() !== '') {
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id === node.id) {
            return { ...n, data: { ...n.data, label: newLabel } };
          }
          return n;
        })
      );
    }
  }, [setNodes]);

  const onAddNode = useCallback(() => {
    const newNode = {
      id: crypto.randomUUID(),
      data: { label: 'Novo Nó' },
      position: {
        x: Math.random() * 400 + 50,
        y: Math.random() * 200 + 50,
      },
    };
    setNodes((nds) => [...nds, newNode]);
  }, [setNodes]);

  return (
    <div className="mt-8 w-full h-[600px] bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDoubleClick={onNodeDoubleClick}
        fitView
        className="bg-gray-50 dark:bg-slate-800/50"
      >
        <Controls />
        <Background />
        <MiniMap />
      </ReactFlow>
      <div className="absolute top-4 right-4 z-10">
        <Button onClick={onAddNode} className="flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>Adicionar Nó</span>
        </Button>
      </div>
    </div>
  );
};

export const MindMapProcessEditor: React.FC<MindMapProcessEditorProps> = (props) => (
  <ReactFlowProvider>
    <MindMapEditor {...props} />
  </ReactFlowProvider>
);