'use client'

import * as React from 'react'

// Define types locally as they are specific to this custom toast implementation.

// Properties that can be passed to the custom toast() function.
interface CustomToastProps {
  title?: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactElement // Simplified: A react element for the action
  duration?: number
  // Allow any other properties that might be needed by the specific toast rendering logic
  [key: string]: any
}

// The internal representation of a toast object in the state, including generated/managed fields.
type ToasterToast = CustomToastProps & {
  id: string
  open?: boolean // Managed internally for display state
  onOpenChange?: (open: boolean) => void // Managed internally
}

const TOAST_LIMIT = 3
const TOAST_REMOVE_DELAY = 5000

const actionTypes = {
  ADD_TOAST: 'ADD_TOAST',
  UPDATE_TOAST: 'UPDATE_TOAST',
  DISMISS_TOAST: 'DISMISS_TOAST',
  REMOVE_TOAST: 'REMOVE_TOAST',
} as const

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

type ActionType = typeof actionTypes

type Action =
  | {
      type: ActionType['ADD_TOAST']
      toast: ToasterToast // This is our internal ToasterToast type
    }
  | {
      type: ActionType['UPDATE_TOAST']
      toast: Partial<ToasterToast>
    }
  | {
      type: ActionType['DISMISS_TOAST']
      toastId?: ToasterToast['id']
    }
  | {
      type: ActionType['REMOVE_TOAST']
      toastId?: ToasterToast['id']
    }

interface State {
  toasts: ToasterToast[]
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) {
    return
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId)
    dispatch({
      type: 'REMOVE_TOAST',
      toastId: toastId,
    })
  }, TOAST_REMOVE_DELAY)

  toastTimeouts.set(toastId, timeout)
}

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'ADD_TOAST':
      return {
        ...state,
        // Add new toast and ensure limit is respected
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }

    case 'UPDATE_TOAST':
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }

    case 'DISMISS_TOAST': {
      const { toastId } = action

      if (toastId) {
        addToRemoveQueue(toastId)
      } else {
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id)
        })
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? { ...t, open: false } // Mark as not open before removal queue
            : t
        ),
      }
    }
    case 'REMOVE_TOAST':
      if (action.toastId === undefined) {
        return { ...state, toasts: [] } // Clear all toasts
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }
  }
}

const listeners: Array<(state: State) => void> = []

let memoryState: State = { toasts: [] }

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => {
    listener(memoryState)
  })
}

// Type for the props accepted by the exported toast() function.
// Excludes internally managed properties like id, open, onOpenChange.
type ToastFunctionProps = Omit<ToasterToast, 'id' | 'open' | 'onOpenChange'>

function toast({ ...props }: ToastFunctionProps) {
  const id = genId()

  const update = (updatedProps: Partial<ToastFunctionProps>) =>
    dispatch({
      type: 'UPDATE_TOAST',
      // Ensure only valid properties for ToasterToast are passed, merging with existing state for this id might be safer.
      toast: {
        ...memoryState.toasts.find((t) => t.id === id),
        ...updatedProps,
        id,
      } as ToasterToast,
    })
  const dismiss = () => dispatch({ type: 'DISMISS_TOAST', toastId: id })

  // Construct the full ToasterToast object for internal state
  const newToast: ToasterToast = {
    ...props, // User-provided properties (title, description, action, etc.)
    id,
    open: true, // Default to open
    onOpenChange: (openState: boolean) => {
      if (!openState) {
        dismiss() // Or directly dispatch REMOVE_TOAST if dismiss also queues removal
      }
    },
  }

  dispatch({
    type: 'ADD_TOAST',
    toast: newToast,
  })

  return {
    id: id,
    dismiss,
    update,
  }
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [state])

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: 'DISMISS_TOAST', toastId }),
  }
}

export { useToast, toast }
