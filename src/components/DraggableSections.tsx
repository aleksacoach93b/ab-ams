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
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

interface Section {
  id: string
  element: React.ReactNode
  shouldShow: boolean
}

interface DraggableSectionsProps {
  sections: Section[]
  storageKey: string
}

interface SortableSectionProps {
  id: string
  children: React.ReactNode
  colorScheme: any
}

const SortableSection: React.FC<SortableSectionProps> = ({ id, children, colorScheme }) => {
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
      {/* Drag Handle - visible on hover, positioned on the left */}
      <div
        {...attributes}
        {...listeners}
        className="absolute -left-8 sm:-left-10 top-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-1.5 rounded hover:bg-opacity-20"
        style={{ 
          color: colorScheme.textSecondary,
          backgroundColor: `${colorScheme.border}40`
        }}
      >
        <GripVertical className="h-5 w-5" />
      </div>
      {children}
    </div>
  )
}

const DraggableSections: React.FC<DraggableSectionsProps> = ({ sections, storageKey }) => {
  const { colorScheme } = useTheme()
  const [items, setItems] = useState<string[]>([])
  const [isClient, setIsClient] = useState(false)

  // Filter visible sections
  const visibleSections = React.useMemo(() => {
    return sections.filter(section => section.shouldShow)
  }, [sections])

  // Initialize items order
  useEffect(() => {
    setIsClient(true)
    const savedOrder = localStorage.getItem(storageKey)
    if (savedOrder) {
      try {
        const parsed = JSON.parse(savedOrder)
        if (Array.isArray(parsed) && parsed.length === visibleSections.length) {
          // Validate that all saved IDs exist in visible sections
          const validOrder = parsed.filter(id => visibleSections.some(section => section.id === id))
          if (validOrder.length === visibleSections.length) {
            setItems(validOrder)
            return
          }
        }
      } catch (e) {
        console.error('Error parsing saved order:', e)
      }
    }
    // Default order - use visible sections IDs
    setItems(visibleSections.map(section => section.id))
  }, [visibleSections.length, storageKey, visibleSections])

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

  if (!isClient || items.length === 0 || visibleSections.length === 0) {
    // Render without drag & drop during SSR or before initialization
    return (
      <div className="space-y-2 sm:space-y-6">
        {visibleSections.map(section => (
          <div key={section.id}>{section.element}</div>
        ))}
      </div>
    )
  }

  // Create ordered sections based on items order
  const orderedSections = items
    .map(itemId => visibleSections.find(section => section.id === itemId))
    .filter((section): section is Section => section !== undefined)

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <div className="space-y-2 sm:space-y-6">
          {orderedSections.map((section) => (
            <SortableSection key={section.id} id={section.id} colorScheme={colorScheme}>
              {section.element}
            </SortableSection>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}

export default DraggableSections

