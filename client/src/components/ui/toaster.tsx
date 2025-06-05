import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  ToastAction,
} from "@/components/ui/toast"
import { Copy } from "lucide-react"

export function Toaster() {
  const { toasts } = useToast()

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = text
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
    }
  }

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        const isError = variant === 'destructive'
        const copyText = `${title || ''}${title && description ? '\n' : ''}${description || ''}`
        
        return (
          <Toast key={id} variant={variant} {...props}>
            <div className="grid gap-1 flex-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isError && copyText.trim() && (
                <ToastAction
                  onClick={() => copyToClipboard(copyText)}
                  className="h-8 w-8 p-0"
                  title="Copy error message"
                >
                  <Copy className="h-4 w-4" />
                </ToastAction>
              )}
              {action}
            </div>
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
