'use client'

import React, { useState, useEffect, useMemo } from 'react'
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

interface ActionCard {
  id: string
  element: React.ReactNode
  shouldShow: boolean
}

interface DraggableActionCardsWrapperProps {
  cards: ActionCard[]
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
    width: '100%',
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group flex-shrink-0 min-w-[120px] sm:min-w-[140px] md:min-w-[180px] md:flex-1"
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

const DraggableActionCardsWrapper: React.FC<DraggableActionCardsWrapperProps> = ({ cards, storageKey }) => {
  const { colorScheme } = useTheme()
  const [items, setItems] = useState<string[]>([])
  const [isClient, setIsClient] = useState(false)

  // Filter visible cards
  const visibleCards = useMemo(() => {
    return cards.filter(card => card.shouldShow)
  }, [cards])

  // Initialize items order
  useEffect(() => {
    setIsClient(true)
    const savedOrder = localStorage.getItem(storageKey)
    if (savedOrder) {
      try {
        const parsed = JSON.parse(savedOrder)
        if (Array.isArray(parsed) && parsed.length === visibleCards.length) {
          // Validate that all saved IDs exist in visible cards
          const validOrder = parsed.filter(id => visibleCards.some(card => card.id === id))
          if (validOrder.length === visibleCards.length) {
            setItems(validOrder)
            return
          }
        }
      } catch (e) {
        console.error('Error parsing saved order:', e)
      }
    }
    // Default order - use visible cards IDs
    setItems(visibleCards.map(card => card.id))
  }, [visibleCards.length, storageKey, visibleCards])

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

  if (!isClient || items.length === 0 || visibleCards.length === 0) {
    // Render without drag & drop during SSR or before initialization
    return (
      <div className="flex gap-2 sm:gap-3 md:gap-4 overflow-x-auto md:overflow-x-visible pb-2 scrollbar-hide">
        {visibleCards.map(card => (
          <div key={card.id} className="flex-shrink-0 min-w-[120px] sm:min-w-[140px] md:min-w-[180px] md:flex-1">
            {card.element}
          </div>
        ))}
      </div>
    )
  }

  // Create ordered cards based on items order
  const orderedCards = items
    .map(itemId => visibleCards.find(card => card.id === itemId))
    .filter((card): card is ActionCard => card !== undefined)

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items} strategy={horizontalListSortingStrategy}>
        <div className="flex gap-2 sm:gap-3 md:gap-4 overflow-x-auto md:overflow-x-visible pb-2 scrollbar-hide">
          {orderedCards.map((card) => (
            <SortableItem key={card.id} id={card.id} colorScheme={colorScheme}>
              <div className="w-full h-full">
                {card.element}
              </div>
            </SortableItem>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}

export default DraggableActionCardsWrapper

