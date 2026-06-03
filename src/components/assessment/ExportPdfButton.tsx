import { FileDown, Loader2 } from 'lucide-react'
import { useState } from 'react'
import Button from '../ui/Button'

interface ExportPdfButtonProps {
  label?: string
  loadingLabel?: string
  errorMessage?: string
  disabled?: boolean
  onExport: () => void | Promise<void>
  variant?: 'primary' | 'secondary' | 'ghost'
}

export default function ExportPdfButton({
  label = 'Export PDF',
  loadingLabel = 'Generating PDF…',
  errorMessage = 'Export failed. Please try again.',
  disabled,
  onExport,
  variant = 'ghost',
}: ExportPdfButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    setLoading(true)
    try {
      await onExport()
    } catch (e) {
      console.error(e)
      window.alert(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant={variant} size="md" onClick={handleClick} disabled={disabled || loading}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
      {loading ? loadingLabel : label}
    </Button>
  )
}
