"use client"

import * as React from "react"

type ToastActionElement = React.ReactElement<any>

interface Toast {
  id: string
  title?: string
  description?: string
  action?: ToastActionElement
  variant?: "default" | "destructive"
}

interface ToastState {
  toasts: Toast[]
}

const TOAST_LIMIT = 3
const TOAST_DURATION = 5000

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

const toastTimeouts = new Map<string, NodeJS.Timeout>()

const listeners: Array<(state: ToastState) => void> = []

let memoryState: ToastState = { toasts: [] }

function dispatch(action: { type: "ADD"; toast: Toast } | { type: "REMOVE"; toastId: string }) {
  switch (action.type) {
    case "ADD":
      memoryState = {
        toasts: [action.toast, ...memoryState.toasts].slice(0, TOAST_LIMIT),
      }
      break
    case "REMOVE":
      memoryState = {
        toasts: memoryState.toasts.filter((t) => t.id !== action.toastId),
      }
      break
  }

  listeners.forEach((listener) => {
    listener(memoryState)
  })
}

type ToastOptions = Omit<Toast, "id">

function toast({ ...props }: ToastOptions) {
  const id = genId()

  const newToast: Toast = {
    ...props,
    id,
  }

  dispatch({ type: "ADD", toast: newToast })

  const timeout = setTimeout(() => {
    dispatch({ type: "REMOVE", toastId: id })
  }, TOAST_DURATION)

  toastTimeouts.set(id, timeout)

  return {
    id,
    dismiss: () => dispatch({ type: "REMOVE", toastId: id }),
  }
}

function useToast() {
  const [state, setState] = React.useState<ToastState>(memoryState)

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
    dismiss: (toastId: string) => dispatch({ type: "REMOVE", toastId }),
  }
}

export { useToast, toast }