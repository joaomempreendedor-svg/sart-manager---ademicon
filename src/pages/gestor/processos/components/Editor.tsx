import React from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { Block as BlockComponent } from './Block';
import { DragHandle } from './DragHandle';
import { Block, BlockType } from '@/types';

interface EditorProps {
  blocks: Block[];
  onBlocksChange: (blocks: Block[]) => void;
  onBlockUpdate: (id: string, updates: Partial<Block>) => void;
  onBlockAdd: (currentBlockId: string) => void;
  onBlockDelete: (id: string) => void;
  onUploadFile: (id: string, file: File) => void;
  focusedBlockId: string | null;
  setFocusedBlockId: (id: string | null) => void;
  uploadingBlockId: string | null;
}

export const Editor: React.FC<EditorProps> = ({
  blocks,
  onBlocksChange,
  onBlockUpdate,
  onBlockAdd,
  onBlockDelete,
  onUploadFile,
  focusedBlockId,
  setFocusedBlockId,
  uploadingBlockId,
}) => {
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(blocks);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    onBlocksChange(items);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>, id: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onBlockAdd(id);
    } else if (e.key === 'Backspace' && e.currentTarget.innerHTML === '') {
      e.preventDefault();
      onBlockDelete(id);
    }
  };

  const handlePaste = (e: React.ClipboardEvent, id: string) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          onUploadFile(id, file);
          return;
        }
      }
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="editor">
        {(provided) => (
          <div {...provided.droppableProps} ref={provided.innerRef}>
            {blocks.map((block, index) => (
              <Draggable key={block.id} draggableId={block.id} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    className={`flex items-start space-x-2 group py-1 ${snapshot.isDragging ? 'bg-gray-100 dark:bg-slate-700 rounded' : ''}`}
                    onPaste={(e) => handlePaste(e, block.id)}
                  >
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <DragHandle dragHandleProps={provided.dragHandleProps} />
                    </div>
                    <div className="flex-1">
                      <BlockComponent
                        block={block}
                        onChange={(id, content) => onBlockUpdate(id, { content })}
                        onToggleCheck={(id) => onBlockUpdate(id, { checked: !block.checked })}
                        onKeyDown={handleKeyDown}
                        onFocus={() => setFocusedBlockId(block.id)}
                        isUploading={uploadingBlockId === block.id}
                      />
                    </div>
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
};