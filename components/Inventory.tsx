import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import type { InventoryItem, Stat } from '../types';

interface InventoryProps {
    items: InventoryItem[];
    setItems: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
    maxWeight: number;
    totalWeight: number;
    stats: {
        life: Stat;
        sanity: Stat;
        occultism: Stat;
    };
    onMaskClick: () => void;
}

const GRID_SIZE = 10;
const BACKPACK_GRID_WIDTH = 6;
const BACKPACK_GRID_HEIGHT = 10;
const CELL_SIZE = 40; // in pixels

const isBackpack = (item: InventoryItem) => 
    item.name.toLowerCase() === 'mochila' && item.weight === 3 && item.width === 6 && item.height === 10;
    
const isMysteriousMask = (item: InventoryItem) => 
    item.name.toLowerCase() === 'mascara misteriosa' && item.weight === 1 && item.width === 3 && item.height === 3;

export const Inventory: React.FC<InventoryProps> = ({ items, setItems, maxWeight, totalWeight, stats, onMaskClick }) => {
    const [newItem, setNewItem] = useState({ name: '', width: 1, height: 1, weight: 0.5, description: '' });
    const [draggedItem, setDraggedItem] = useState<{
        item: InventoryItem; // The live, manipulated item during drag
        initialItem: InventoryItem; // A pristine copy of the item at the start of the drag
        offsetX: number;
        offsetY: number;
    } | null>(null);
    const [isDropValid, setIsDropValid] = useState<boolean>(true);
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, item: InventoryItem } | null>(null);
    const gridRef = useRef<HTMLDivElement>(null);
    const backpackGridRefs = useRef<Record<string, HTMLDivElement | null>>({});

    const backpacks = useMemo(() => items.filter(isBackpack), [items]);
    const mainInventoryItems = useMemo(() => items.filter(item => !item.containerId && !isBackpack(item)), [items]);
    
    const itemsByContainer = useMemo(() => {
        const grouped: Record<string, InventoryItem[]> = {};
        for (const backpack of backpacks) {
            grouped[backpack.id] = items.filter(i => i.containerId === backpack.id);
        }
        return grouped;
    }, [items, backpacks]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'r' && draggedItem) {
                e.preventDefault();
                setDraggedItem(prev => {
                    if (!prev) return null;
                    return { ...prev, item: { ...prev.item, rotated: !prev.item.rotated } };
                });
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [draggedItem]);

    const isOccupied = useCallback((x: number, y: number, width: number, height: number, excludeId: string, containerId?: string): boolean => {
        const itemsToCheck = containerId 
            ? items.filter(i => i.containerId === containerId) 
            : items.filter(i => !i.containerId && !isBackpack(i));

        for (const item of itemsToCheck) {
            if (item.id === excludeId) continue;
            const itemWidth = item.rotated ? item.height : item.width;
            const itemHeight = item.rotated ? item.width : item.height;
            if (x < item.x + itemWidth && x + width > item.x && y < item.y + itemHeight && y + height > item.y) {
                return true;
            }
        }
        return false;
    }, [items]);

    const handleAddItem = (e: React.FormEvent) => {
        e.preventDefault();
        const newItemWithId: InventoryItem = { ...newItem, id: Date.now().toString(), x: 0, y: 0, rotated: false };
        
        for (let y = 0; y <= GRID_SIZE - newItem.height; y++) {
            for (let x = 0; x <= GRID_SIZE - newItem.width; x++) {
                if (!isOccupied(x, y, newItem.width, newItem.height, '', undefined)) {
                    setItems(prev => [...prev, { ...newItemWithId, x, y }]);
                    setNewItem({ name: '', width: 1, height: 1, weight: 0.5, description: '' });
                    return;
                }
            }
        }
        alert("Não há espaço suficiente para este item no inventário principal.");
    };

    const handleMouseDown = (e: React.MouseEvent, item: InventoryItem, containerId?: string) => {
        if (e.button === 2) return; // Right click
        const rect = e.currentTarget.getBoundingClientRect();
        const fullItemState = { ...item, containerId };
        setDraggedItem({
            item: fullItemState,
            initialItem: fullItemState,
            offsetX: e.clientX - rect.left,
            offsetY: e.clientY - rect.top
        });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!draggedItem) return;
        
        let targetContainerId: string | undefined = undefined;
        let gridRect: DOMRect | undefined;
        let containerGridSize = { width: GRID_SIZE, height: GRID_SIZE };

        for (const bp of backpacks) {
            const bpRect = backpackGridRefs.current[bp.id]?.getBoundingClientRect();
            if (bpRect && e.clientX >= bpRect.left && e.clientX <= bpRect.right && e.clientY >= bpRect.top && e.clientY <= bpRect.bottom) {
                targetContainerId = bp.id;
                gridRect = bpRect;
                containerGridSize = { width: BACKPACK_GRID_WIDTH, height: BACKPACK_GRID_HEIGHT };
                break;
            }
        }

        if (!gridRect) {
            const mainRect = gridRef.current?.getBoundingClientRect();
            if (mainRect && e.clientX >= mainRect.left && e.clientX <= mainRect.right && e.clientY >= mainRect.top && e.clientY <= mainRect.bottom) {
                gridRect = mainRect;
                targetContainerId = undefined;
                containerGridSize = { width: GRID_SIZE, height: GRID_SIZE };
            }
        }
        
        if (!gridRect) return; // Outside all grids

        const x = Math.round((e.clientX - gridRect.left - draggedItem.offsetX) / CELL_SIZE);
        const y = Math.round((e.clientY - gridRect.top - draggedItem.offsetY) / CELL_SIZE);
        
        const currentWidth = draggedItem.item.rotated ? draggedItem.item.height : draggedItem.item.width;
        const currentHeight = draggedItem.item.rotated ? draggedItem.item.width : draggedItem.item.height;

        const clampedX = Math.max(0, Math.min(x, containerGridSize.width - currentWidth));
        const clampedY = Math.max(0, Math.min(y, containerGridSize.height - currentHeight));
        
        const isValid = !isOccupied(clampedX, clampedY, currentWidth, currentHeight, draggedItem.item.id, targetContainerId);
        setIsDropValid(isValid);
        
        setItems(items => items.map(i => i.id === draggedItem.item.id ? { ...i, x: clampedX, y: clampedY, containerId: targetContainerId, rotated: draggedItem.item.rotated } : i));
    };

    const handleMouseUp = () => {
        if (!draggedItem) return;

        if (!isDropValid) {
            // If the drop is invalid, revert the item to its initial state.
            setItems(items => items.map(i => 
                i.id === draggedItem.initialItem.id 
                ? draggedItem.initialItem 
                : i
            ));
        }
        // If drop is valid, the state is already correct from the last handleMouseMove. No 'else' block needed.
        
        setDraggedItem(null);
    };

    const handleContextMenu = (e: React.MouseEvent, item: InventoryItem) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY, item });
    };

    const rotateItem = (itemToRotate: InventoryItem) => {
        const newWidth = itemToRotate.rotated ? itemToRotate.width : itemToRotate.height;
        const newHeight = itemToRotate.rotated ? itemToRotate.height : itemToRotate.width;
        const gridSize = itemToRotate.containerId 
            ? { width: BACKPACK_GRID_WIDTH, height: BACKPACK_GRID_HEIGHT }
            : { width: GRID_SIZE, height: GRID_SIZE };
        
        if (itemToRotate.x + newWidth > gridSize.width || itemToRotate.y + newHeight > gridSize.height || isOccupied(itemToRotate.x, itemToRotate.y, newWidth, newHeight, itemToRotate.id, itemToRotate.containerId)) {
            alert("Não é possível rotacionar: espaço insuficiente ou colisão.");
        } else {
            setItems(items => items.map(i => i.id === itemToRotate.id ? { ...i, rotated: !i.rotated } : i));
        }
        setContextMenu(null);
    };
    
    const deleteItem = (itemToDelete: InventoryItem) => {
        if (isBackpack(itemToDelete) && items.some(i => i.containerId === itemToDelete.id)) {
            alert("Não é possível excluir uma mochila que contém itens.");
            if (contextMenu) setContextMenu(null);
            return;
        }
        setItems(items => items.filter(i => i.id !== itemToDelete.id));
        if (contextMenu) setContextMenu(null);
    };

    useEffect(() => {
        const handleClickOutside = () => setContextMenu(null);
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);
    
    const getItemClasses = (item: InventoryItem, canUseMask: boolean) => {
        let classes = 'absolute border flex items-center justify-center p-1 group ';
        if (draggedItem?.item.id === item.id) {
            classes += 'z-10 transition-none ';
            if (isDropValid) {
                classes += 'border-cyan-400 bg-cyan-900/50 shadow-lg shadow-cyan-400/20';
            } else {
                classes += 'border-red-500 bg-red-900/50 border-dashed';
            }
        } else {
            classes += 'border-gray-600/40 bg-black/70 transition-all duration-100 ease-out';
        }
        
        if(canUseMask) {
            classes += ' animate-pulse-purple cursor-pointer';
        } else {
            classes += ' cursor-grab';
        }
        return classes;
    };
    
    const renderGrid = (containerId?: string) => {
        const gridItems = containerId ? itemsByContainer[containerId] : [...mainInventoryItems, ...backpacks];
        const gridSize = containerId ? { width: BACKPACK_GRID_WIDTH, height: BACKPACK_GRID_HEIGHT } : { width: GRID_SIZE, height: GRID_SIZE };
        
        return (
            <div
                ref={containerId ? (el => { backpackGridRefs.current[containerId] = el; }) : gridRef}
                className="relative bg-black/60 border border-gray-700/50"
                style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${gridSize.width}, ${CELL_SIZE}px)`,
                    gridTemplateRows: `repeat(${gridSize.height}, ${CELL_SIZE}px)`,
                    width: gridSize.width * CELL_SIZE,
                    height: gridSize.height * CELL_SIZE,
                    backgroundImage: `linear-gradient(to right, rgba(156, 163, 175, 0.1) 1px, transparent 1px), 
                                    linear-gradient(to bottom, rgba(156, 163, 175, 0.1) 1px, transparent 1px)`,
                    backgroundSize: `${CELL_SIZE}px ${CELL_SIZE}px`,
                }}
            >
                {gridItems.map(item => {
                    const width = item.rotated ? item.height : item.width;
                    const height = item.rotated ? item.width : item.height;
                    const isMask = isMysteriousMask(item);
                    const canUseMask = isMask && stats.occultism.current >= stats.occultism.max;
                    return (
                        <div
                            key={item.id}
                            className={getItemClasses(item, canUseMask)}
                            style={{
                                left: item.x * CELL_SIZE,
                                top: item.y * CELL_SIZE,
                                width: width * CELL_SIZE,
                                height: height * CELL_SIZE,
                            }}
                            onClick={canUseMask ? (e) => { e.stopPropagation(); onMaskClick(); } : undefined}
                            onMouseDown={!canUseMask ? (e) => handleMouseDown(e, item, containerId) : undefined}
                            onContextMenu={(e) => handleContextMenu(e, item)}
                        >
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    deleteItem(item);
                                }}
                                className="absolute top-0 right-0 w-5 h-5 bg-red-800/80 text-white flex items-center justify-center rounded-bl-md opacity-0 group-hover:opacity-100 transition-opacity z-20 hover:bg-red-600"
                                aria-label={`Excluir ${item.name}`}
                            >
                                &times;
                            </button>
                            <span className="text-gray-200 text-xs text-center select-none pointer-events-none">{item.name}</span>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full text-gray-200" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
            <div className="mb-4">
                <p className="text-lg uppercase">Carga</p>
                <div className="w-full bg-black/50 border border-gray-700 h-4">
                    <div 
                        className="bg-gray-400 h-full transition-all" 
                        style={{ width: `${Math.min((totalWeight / maxWeight) * 100, 100)}%` }}
                    ></div>
                </div>
                <p className="text-right text-gray-400">{totalWeight.toFixed(1)} / {maxWeight.toFixed(1)} kg</p>
            </div>
            <div className="flex-grow flex gap-4 overflow-y-auto">
                <div className="flex flex-col gap-4">
                    {renderGrid(undefined)}
                     {backpacks.map(bp => (
                        <div key={bp.id}>
                            <h3 className="text-md uppercase text-gray-400 mb-2">{bp.name}</h3>
                            {renderGrid(bp.id)}
                        </div>
                    ))}
                </div>

                <div className="w-48 flex-shrink-0">
                    <form onSubmit={handleAddItem} className="flex flex-col gap-3">
                        <p className="text-md uppercase">Adicionar Item</p>
                        <input type="text" placeholder="Nome" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} className="bg-black/50 border border-gray-700/80 px-2 py-1 text-sm text-gray-200 focus:outline-none focus:border-gray-400" required/>
                        <textarea 
                            placeholder="Descrição" 
                            value={newItem.description} 
                            onChange={e => setNewItem({...newItem, description: e.target.value})} 
                            className="bg-black/50 border border-gray-700/80 px-2 py-1 text-sm text-gray-200 focus:outline-none focus:border-gray-400 h-16 resize-none"
                        ></textarea>
                        <input type="number" placeholder="Peso (kg)" step="0.1" min="0" value={newItem.weight} onChange={e => setNewItem({...newItem, weight: parseFloat(e.target.value) || 0})} className="bg-black/50 border border-gray-700/80 px-2 py-1 text-sm text-gray-200 focus:outline-none focus:border-gray-400" required/>
                        <div className="flex gap-2">
                           <label className="flex-1">
                                <span className="text-xs text-gray-400">Largura</span>
                                <input type="number" placeholder="L" min="1" max="10" value={newItem.width} onChange={e => setNewItem({...newItem, width: parseInt(e.target.value) || 1})} className="bg-black/50 border border-gray-700/80 px-2 py-1 text-sm w-full text-gray-200 focus:outline-none focus:border-gray-400" required/>
                           </label>
                           <label className="flex-1">
                                <span className="text-xs text-gray-400">Altura</span>
                                <input type="number" placeholder="A" min="1" max="10" value={newItem.height} onChange={e => setNewItem({...newItem, height: parseInt(e.target.value) || 1})} className="bg-black/50 border border-gray-700/80 px-2 py-1 text-sm w-full text-gray-200 focus:outline-none focus:border-gray-400" required/>
                           </label>
                        </div>
                        <button type="submit" className="border border-gray-600 hover:bg-gray-800 p-2 text-sm transition-colors uppercase">Adicionar</button>
                    </form>
                </div>
            </div>
            {contextMenu && (
                <div
                    className="absolute z-50 bg-black/90 border border-gray-700 py-1 text-sm w-48"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                >
                    <div className="px-4 pt-2 pb-1 border-b border-gray-700">
                        <p className="font-bold text-white">{contextMenu.item.name}</p>
                        <p className="text-gray-400 text-xs mt-1 italic whitespace-normal">
                            {contextMenu.item.description || "Nenhuma descrição."}
                        </p>
                    </div>
                    <button onClick={() => rotateItem(contextMenu.item)} className="block w-full text-left px-4 py-2 hover:bg-gray-800">Rotacionar</button>
                </div>
            )}
        </div>
    );
};