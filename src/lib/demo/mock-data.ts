import type { Project, FileNode, BuildLogEntry } from '@/types/pluto'
import type { UIMessage } from 'ai'

// Mock project
export const DEMO_PROJECT: Project = {
  id: 'demo',
  user_id: 'demo-user',
  name: 'Todo App Demo',
  description: 'A demo todo application built with React',
  prompt: 'Build a simple todo app with React',
  plan: {
    name: 'Todo App',
    description: 'A simple yet elegant todo application with add, complete, and delete functionality',
    features: [
      'Add new todos',
      'Mark todos as complete',
      'Delete todos',
      'Filter by status',
      'Persist to localStorage',
    ],
    techStack: ['React', 'TypeScript', 'Tailwind CSS', 'Vite'],
    steps: [
      { id: '1', title: 'Setup project', description: 'Initialize Vite with React and TypeScript', type: 'command' },
      { id: '2', title: 'Create Todo component', description: 'Build the main Todo component', type: 'file' },
      { id: '3', title: 'Add styling', description: 'Apply Tailwind CSS styles', type: 'file' },
      { id: '4', title: 'Implement state', description: 'Add state management with hooks', type: 'file' },
    ],
  },
  source: 'pluto',
  template: 'react-ts',
  daytona_sandbox_id: 'demo-sandbox',
  letta_agent_id: null,
  preview_url: 'https://demo.example.com',
  preview_expires_at: null,
  status: 'ready',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

// Mock messages showing AI conversation
export const DEMO_MESSAGES: UIMessage[] = [
  {
    id: '1',
    role: 'user',
    parts: [{ type: 'text', text: 'Build a simple todo app with React' }],
  },
  {
    id: '2',
    role: 'assistant',
    parts: [
      {
        type: 'text',
        text: "I'll create a clean, functional todo app with React and TypeScript. Setting up the project structure now.",
      },
    ],
  },
  {
    id: '3',
    role: 'assistant',
    parts: [
      {
        type: 'text',
        text: 'Created the main App component with todo state management, add/toggle/delete functionality, and a clean UI using Tailwind CSS.',
      },
    ],
  },
  {
    id: '4',
    role: 'user',
    parts: [{ type: 'text', text: 'Can you add a filter to show all, active, or completed todos?' }],
  },
  {
    id: '5',
    role: 'assistant',
    parts: [
      {
        type: 'text',
        text: 'Added filter functionality with three tabs: All, Active, and Completed. The filter state persists and the UI updates smoothly.',
      },
    ],
  },
]

// Mock file tree
export const DEMO_FILE_TREE: FileNode[] = [
  {
    name: 'src',
    path: '/app/src',
    isDir: true,
    children: [
      {
        name: 'components',
        path: '/app/src/components',
        isDir: true,
        children: [
          { name: 'TodoItem.tsx', path: '/app/src/components/TodoItem.tsx', isDir: false },
          { name: 'TodoList.tsx', path: '/app/src/components/TodoList.tsx', isDir: false },
          { name: 'TodoInput.tsx', path: '/app/src/components/TodoInput.tsx', isDir: false },
          { name: 'FilterTabs.tsx', path: '/app/src/components/FilterTabs.tsx', isDir: false },
        ],
      },
      {
        name: 'hooks',
        path: '/app/src/hooks',
        isDir: true,
        children: [
          { name: 'useTodos.ts', path: '/app/src/hooks/useTodos.ts', isDir: false },
          { name: 'useLocalStorage.ts', path: '/app/src/hooks/useLocalStorage.ts', isDir: false },
        ],
      },
      {
        name: 'types',
        path: '/app/src/types',
        isDir: true,
        children: [
          { name: 'todo.ts', path: '/app/src/types/todo.ts', isDir: false },
        ],
      },
      { name: 'App.tsx', path: '/app/src/App.tsx', isDir: false },
      { name: 'main.tsx', path: '/app/src/main.tsx', isDir: false },
      { name: 'index.css', path: '/app/src/index.css', isDir: false },
    ],
  },
  { name: 'index.html', path: '/app/index.html', isDir: false },
  { name: 'package.json', path: '/app/package.json', isDir: false },
  { name: 'tsconfig.json', path: '/app/tsconfig.json', isDir: false },
  { name: 'vite.config.ts', path: '/app/vite.config.ts', isDir: false },
  { name: 'tailwind.config.js', path: '/app/tailwind.config.js', isDir: false },
]

// Mock file contents
export const DEMO_FILE_CONTENTS: Record<string, string> = {
  '/app/src/App.tsx': `import { useState } from 'react'
import { TodoInput } from './components/TodoInput'
import { TodoList } from './components/TodoList'
import { FilterTabs } from './components/FilterTabs'
import { useTodos } from './hooks/useTodos'
import type { FilterType } from './types/todo'

export default function App() {
  const { todos, addTodo, toggleTodo, deleteTodo } = useTodos()
  const [filter, setFilter] = useState<FilterType>('all')

  const filteredTodos = todos.filter((todo) => {
    if (filter === 'active') return !todo.completed
    if (filter === 'completed') return todo.completed
    return true
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 py-12 px-4">
      <div className="mx-auto max-w-md">
        <h1 className="mb-8 text-center text-3xl font-bold text-gray-800">
          Todo App
        </h1>

        <div className="rounded-2xl bg-white p-6 shadow-xl">
          <TodoInput onAdd={addTodo} />
          <FilterTabs filter={filter} onFilterChange={setFilter} />
          <TodoList
            todos={filteredTodos}
            onToggle={toggleTodo}
            onDelete={deleteTodo}
          />
        </div>

        <p className="mt-4 text-center text-sm text-gray-500">
          {todos.filter((t) => !t.completed).length} items left
        </p>
      </div>
    </div>
  )
}`,

  '/app/src/main.tsx': `import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)`,

  '/app/src/index.css': `@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  font-family: 'Inter', system-ui, sans-serif;
}

.todo-item {
  @apply flex items-center gap-3 rounded-lg border border-gray-100
         bg-gray-50 p-3 transition-all hover:border-gray-200;
}

.todo-item.completed {
  @apply bg-green-50 border-green-100;
}`,

  '/app/src/components/TodoItem.tsx': `import { Check, Trash2 } from 'lucide-react'
import type { Todo } from '../types/todo'

interface TodoItemProps {
  todo: Todo
  onToggle: (id: string) => void
  onDelete: (id: string) => void
}

export function TodoItem({ todo, onToggle, onDelete }: TodoItemProps) {
  return (
    <div className={\`todo-item \${todo.completed ? 'completed' : ''}\`}>
      <button
        onClick={() => onToggle(todo.id)}
        className={\`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2
          \${todo.completed
            ? 'border-green-500 bg-green-500 text-white'
            : 'border-gray-300 hover:border-green-400'
          }\`}
      >
        {todo.completed && <Check className="h-4 w-4" />}
      </button>

      <span className={\`flex-1 \${todo.completed ? 'text-gray-400 line-through' : 'text-gray-700'}\`}>
        {todo.text}
      </span>

      <button
        onClick={() => onDelete(todo.id)}
        className="text-gray-400 hover:text-red-500 transition-colors"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )
}`,

  '/app/src/components/TodoList.tsx': `import { TodoItem } from './TodoItem'
import type { Todo } from '../types/todo'

interface TodoListProps {
  todos: Todo[]
  onToggle: (id: string) => void
  onDelete: (id: string) => void
}

export function TodoList({ todos, onToggle, onDelete }: TodoListProps) {
  if (todos.length === 0) {
    return (
      <div className="py-8 text-center text-gray-400">
        No todos yet. Add one above!
      </div>
    )
  }

  return (
    <div className="mt-4 space-y-2">
      {todos.map((todo) => (
        <TodoItem
          key={todo.id}
          todo={todo}
          onToggle={onToggle}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}`,

  '/app/src/components/TodoInput.tsx': `import { useState, FormEvent } from 'react'
import { Plus } from 'lucide-react'

interface TodoInputProps {
  onAdd: (text: string) => void
}

export function TodoInput({ onAdd }: TodoInputProps) {
  const [text, setText] = useState('')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (text.trim()) {
      onAdd(text.trim())
      setText('')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="What needs to be done?"
        className="flex-1 rounded-lg border border-gray-200 px-4 py-2
                   focus:border-purple-400 focus:outline-none focus:ring-2
                   focus:ring-purple-100"
      />
      <button
        type="submit"
        className="flex items-center gap-1 rounded-lg bg-purple-500 px-4 py-2
                   font-medium text-white transition-colors hover:bg-purple-600"
      >
        <Plus className="h-5 w-5" />
        Add
      </button>
    </form>
  )
}`,

  '/app/src/components/FilterTabs.tsx': `import type { FilterType } from '../types/todo'

interface FilterTabsProps {
  filter: FilterType
  onFilterChange: (filter: FilterType) => void
}

const filters: { label: string; value: FilterType }[] = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Completed', value: 'completed' },
]

export function FilterTabs({ filter, onFilterChange }: FilterTabsProps) {
  return (
    <div className="mt-4 flex gap-1 rounded-lg bg-gray-100 p-1">
      {filters.map(({ label, value }) => (
        <button
          key={value}
          onClick={() => onFilterChange(value)}
          className={\`flex-1 rounded-md py-1.5 text-sm font-medium transition-all
            \${filter === value
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
            }\`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}`,

  '/app/src/hooks/useTodos.ts': `import { useState, useCallback } from 'react'
import { useLocalStorage } from './useLocalStorage'
import type { Todo } from '../types/todo'

export function useTodos() {
  const [todos, setTodos] = useLocalStorage<Todo[]>('todos', [])

  const addTodo = useCallback((text: string) => {
    const newTodo: Todo = {
      id: crypto.randomUUID(),
      text,
      completed: false,
      createdAt: new Date().toISOString(),
    }
    setTodos((prev) => [...prev, newTodo])
  }, [setTodos])

  const toggleTodo = useCallback((id: string) => {
    setTodos((prev) =>
      prev.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    )
  }, [setTodos])

  const deleteTodo = useCallback((id: string) => {
    setTodos((prev) => prev.filter((todo) => todo.id !== id))
  }, [setTodos])

  return { todos, addTodo, toggleTodo, deleteTodo }
}`,

  '/app/src/hooks/useLocalStorage.ts': `import { useState, useEffect, useCallback } from 'react'

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch {
      return initialValue
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue))
    } catch {
      console.warn('Failed to save to localStorage')
    }
  }, [key, storedValue])

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    setStoredValue((prev) => {
      const nextValue = value instanceof Function ? value(prev) : value
      return nextValue
    })
  }, [])

  return [storedValue, setValue] as const
}`,

  '/app/src/types/todo.ts': `export interface Todo {
  id: string
  text: string
  completed: boolean
  createdAt: string
}

export type FilterType = 'all' | 'active' | 'completed'`,

  '/app/index.html': `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Todo App</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`,

  '/app/package.json': `{
  "name": "todo-app",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "lucide-react": "^0.400.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.4",
    "typescript": "^5.5.2",
    "vite": "^5.3.1"
  }
}`,

  '/app/tsconfig.json': `{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}`,

  '/app/vite.config.ts': `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})`,

  '/app/tailwind.config.js': `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}`,
}

// Mock build logs - use static timestamps to avoid hydration mismatch
export const DEMO_BUILD_LOGS: BuildLogEntry[] = [
  {
    id: '1',
    timestamp: '2024-01-15T10:00:00.000Z',
    type: 'info',
    message: 'Starting build process...',
  },
  {
    id: '2',
    timestamp: '2024-01-15T10:00:05.000Z',
    type: 'command',
    message: '$ bun create vite todo-app --template react-ts',
  },
  {
    id: '3',
    timestamp: '2024-01-15T10:00:10.000Z',
    type: 'output',
    message: 'Scaffolding project in /app...',
  },
  {
    id: '4',
    timestamp: '2024-01-15T10:00:15.000Z',
    type: 'success',
    message: 'Project scaffolded successfully',
  },
  {
    id: '5',
    timestamp: '2024-01-15T10:00:20.000Z',
    type: 'command',
    message: '$ bun install',
  },
  {
    id: '6',
    timestamp: '2024-01-15T10:00:30.000Z',
    type: 'output',
    message: 'bun install v1.1.0\nResolved 45 packages\nInstalled 45 packages',
  },
  {
    id: '7',
    timestamp: '2024-01-15T10:00:35.000Z',
    type: 'info',
    message: 'Writing file: src/App.tsx',
    step: 'Create Todo component',
  },
  {
    id: '8',
    timestamp: '2024-01-15T10:00:40.000Z',
    type: 'info',
    message: 'Writing file: src/components/TodoItem.tsx',
    step: 'Create Todo component',
  },
  {
    id: '9',
    timestamp: '2024-01-15T10:00:45.000Z',
    type: 'info',
    message: 'Writing file: src/components/TodoList.tsx',
    step: 'Create Todo component',
  },
  {
    id: '10',
    timestamp: '2024-01-15T10:00:50.000Z',
    type: 'info',
    message: 'Writing file: src/components/TodoInput.tsx',
    step: 'Create Todo component',
  },
  {
    id: '11',
    timestamp: '2024-01-15T10:00:55.000Z',
    type: 'info',
    message: 'Writing file: src/hooks/useTodos.ts',
    step: 'Implement state',
  },
  {
    id: '12',
    timestamp: '2024-01-15T10:01:00.000Z',
    type: 'command',
    message: '$ bun run build',
  },
  {
    id: '13',
    timestamp: '2024-01-15T10:01:10.000Z',
    type: 'output',
    message: 'vite v5.3.1 building for production...\n✓ 42 modules transformed.\ndist/index.html  0.45 kB\ndist/assets/index.js  142.35 kB',
  },
  {
    id: '14',
    timestamp: '2024-01-15T10:01:15.000Z',
    type: 'success',
    message: 'Build completed successfully!',
  },
  {
    id: '15',
    timestamp: '2024-01-15T10:01:20.000Z',
    type: 'command',
    message: '$ bun run dev',
  },
  {
    id: '16',
    timestamp: '2024-01-15T10:01:25.000Z',
    type: 'success',
    message: 'Development server running at http://localhost:5173',
  },
]
