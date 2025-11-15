'use client'

import React, { useState, useEffect } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

interface DraggableActionCardsProps {
  children: React.ReactNode[]
  storageKey: string
}

interface SortableItemProps {
  id: string
  children: React.ReactNode
  colorScheme: any
}

const SortableItem: React.FC<SortableItemProps> = ({ id, children, colorScheme }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group"
    >
      {/* Drag Handle - visible on hover */}
      <div
        {...attributes}
        {...listeners}
        className="absolute -top-1 left-1/2 -translate-x-1/2 z-10 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-1"
        style={{ color: colorScheme.textSecondary }}
      >
        <GripVertical className="h-3 w-3 rotate-90" />
      </div>
      {children}
    </div>
  )
}

const DraggableActionCards: React.FC<DraggableActionCardsProps> = ({ children, storageKey }) => {
  const { colorScheme } = useTheme()
  const [items, setItems] = useState<string[]>([])
  const [isClient, setIsClient] = useState(false)

  // Initialize items order
  useEffect(() => {
    setIsClient(true)
    const savedOrder = localStorage.getItem(storageKey)
    if (savedOrder) {
      try {
        const parsed = JSON.parse(savedOrder)
        if (Array.isArray(parsed) && parsed.length === children.length) {
          setItems(parsed)
          return
        }
      } catch (e) {
        console.error('Error parsing saved order:', e)
      }
    }
    // Default order
    setItems(children.map((_, index) => `item-${index}`))
  }, [children.length, storageKey])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.indexOf(active.id as string)
        const newIndex = items.indexOf(over.id as string)
        const newItems = arrayMove(items, oldIndex, newIndex)
        
        // Save to localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem(storageKey, JSON.stringify(newItems))
        }
        
        return newItems
      })
    }
  }

  if (!isClient || items.length === 0) {
    // Render without drag & drop during SSR or before initialization
    return <>{children}</>
  }

  // Create ordered children based on items order
  const orderedChildren = items.map((itemId) => {
    const index = parseInt(itemId.replace('item-', ''))
    return children[index]
  })

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items} strategy={horizontalListSortingStrategy}>
        <div className="flex gap-2 sm:gap-3 md:gap-4 overflow-x-auto md:overflow-x-visible pb-2 scrollbar-hide">
          {items.map((itemId, index) => {
            return (
              <SortableItem key={itemId} id={itemId} colorScheme={colorScheme}>
                {orderedChildren[index]}
              </SortableItem>
            )
          })}
        </div>
      </SortableContext>
    </DndContext>
  )
}

export default DraggableActionCards

