'use client'
import { useEffect } from 'react'
import { Toaster as SonnerToaster, toast } from 'sonner'
import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { removeToast } from '@/store/slices/uiSlice'

export function Toaster() {
  const toasts = useAppSelector((state) => state.ui.toasts)
  const dispatch = useAppDispatch()

  useEffect(() => {
    toasts.forEach((t) => {
      const toastFn = {
        success: toast.success,
        error: toast.error,
        info: toast.info,
        warning: toast.warning,
      }[t.type]

      toastFn(t.message, {
        id: t.id,
        duration: t.duration || 4000,
        onDismiss: () => dispatch(removeToast(t.id)),
        onAutoClose: () => dispatch(removeToast(t.id)),
      })
    })
  }, [toasts, dispatch])

  return (
    <SonnerToaster
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast: 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800',
          title: 'text-gray-900 dark:text-gray-50',
          description: 'text-gray-500 dark:text-gray-400',
          success: 'border-green-500',
          error: 'border-red-500',
          warning: 'border-yellow-500',
          info: 'border-blue-500',
        },
      }}
    />
  )
}

export default Toaster
