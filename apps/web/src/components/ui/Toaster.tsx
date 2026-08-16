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
      theme="dark"
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast: '!bg-card !text-text !border !border-border !rounded-none shadow-bento',
          title: '!text-text font-medium',
          description: '!text-text-muted',
          success: '!border-success',
          error: '!border-danger',
          warning: '!border-warning',
          info: '!border-team-b',
        },
      }}
    />
  )
}

export default Toaster
