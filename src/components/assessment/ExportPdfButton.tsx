import { FileDown, Loader2 } from 'lucide-react'
import { useState } from 'react'
import Button from '../ui/Button'

interface ExportPdfButtonProps {
  label?: string
  disabled?: boolean
  onExport: () => void | Promise<void>
  variant?: 'primary' | 'ghost'
}

export default function ExportPdfButton({
  label = 'Export PDF',
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
      window.alert('PDF export failed. Please try again or use Export as .txt.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant={variant} size="md" onClick={handleClick} disabled={disabled || loading}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
      {loading ? 'Generating PDF…' : label}
    </Button>
  )
}
