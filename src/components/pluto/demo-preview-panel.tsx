'use client'

import { Check, Trash2, Plus } from 'lucide-react'
import { StatusCard } from './status-card'
import { cn } from '@/lib/utils'

interface DemoPreviewPanelProps {
  isBuilding?: boolean
}

// Static HTML mockup of a todo app - no sandbox needed
export function DemoPreviewPanel({ isBuilding = false }: DemoPreviewPanelProps) {
  if (isBuilding) {
    return (
      <div className="flex h-full flex-col">
        <div
          className={cn(
            'flex items-center justify-center bg-card',
            'h-full min-h-[400px]'
          )}
        >
          <StatusCard label="Starting preview…" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="h-full overflow-auto bg-card">
        <div className="min-h-full bg-gradient-to-br from-purple-50 to-blue-50 py-12 px-4">
          <div className="mx-auto max-w-md">
            {/* Header */}
            <h1 className="mb-8 text-center text-3xl font-bold text-gray-800">
              Todo App
            </h1>

            {/* Main card */}
            <div className="rounded-2xl bg-white p-6 shadow-xl border border-gray-100">
              {/* Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="What needs to be done?"
                  className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
                  readOnly
                />
                <button className="flex items-center gap-1 rounded-lg bg-purple-500 px-4 py-2 text-sm font-medium text-white">
                  <Plus className="h-4 w-4" />
                  Add
                </button>
              </div>

              {/* Filter tabs */}
              <div className="mt-4 flex gap-1 rounded-lg bg-gray-100 p-1">
                <button className="flex-1 rounded-md bg-white py-1.5 text-sm font-medium text-gray-900 shadow-sm">
                  All
                </button>
                <button className="flex-1 rounded-md py-1.5 text-sm font-medium text-gray-500">
                  Active
                </button>
                <button className="flex-1 rounded-md py-1.5 text-sm font-medium text-gray-500">
                  Completed
                </button>
              </div>

              {/* Todo list */}
              <div className="mt-4 space-y-2">
                {/* Completed todo */}
                <div className="flex items-center gap-3 rounded-lg border border-green-100 bg-green-50 p-3">
                  <button className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-green-500 bg-green-500 text-white">
                    <Check className="h-4 w-4" />
                  </button>
                  <span className="flex-1 text-gray-400 line-through text-sm">
                    Set up project with Vite
                  </span>
                  <button className="text-gray-400 hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Completed todo */}
                <div className="flex items-center gap-3 rounded-lg border border-green-100 bg-green-50 p-3">
                  <button className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-green-500 bg-green-500 text-white">
                    <Check className="h-4 w-4" />
                  </button>
                  <span className="flex-1 text-gray-400 line-through text-sm">
                    Create TodoItem component
                  </span>
                  <button className="text-gray-400 hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Active todo */}
                <div className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <button className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-gray-300">
                  </button>
                  <span className="flex-1 text-gray-700 text-sm">
                    Add filter functionality
                  </span>
                  <button className="text-gray-400 hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Active todo */}
                <div className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <button className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-gray-300">
                  </button>
                  <span className="flex-1 text-gray-700 text-sm">
                    Implement localStorage persistence
                  </span>
                  <button className="text-gray-400 hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Active todo */}
                <div className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <button className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-gray-300">
                  </button>
                  <span className="flex-1 text-gray-700 text-sm">
                    Add animations and polish
                  </span>
                  <button className="text-gray-400 hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Items left counter */}
            <p className="mt-4 text-center text-sm text-gray-500">
              3 items left
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Variant for non-demo pages that need their own wrapper
export function DemoPreviewPanelWithWrapper({ isBuilding = false }: DemoPreviewPanelProps) {
  return (
    <div className="flex h-full flex-col px-3 pb-3">
      <div className="h-full rounded-2xl shadow-lg shadow-black/5 ring-1 ring-border/50 overflow-hidden">
        <DemoPreviewPanel isBuilding={isBuilding} />
      </div>
    </div>
  )
}
