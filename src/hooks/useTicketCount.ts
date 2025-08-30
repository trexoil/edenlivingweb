import { useState, useEffect } from 'react'

interface TicketCounts {
  total: number
  open: number
  in_progress: number
  resolved: number
  closed: number
}

export function useTicketCount() {
  const [counts, setCounts] = useState<TicketCounts>({
    total: 0,
    open: 0,
    in_progress: 0,
    resolved: 0,
    closed: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCounts = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/helpdesk/tickets')
      
      if (!response.ok) {
        throw new Error('Failed to fetch tickets')
      }

      const data = await response.json()
      const tickets = data.tickets || []
      
      // Calculate counts
      const newCounts = {
        total: tickets.length,
        open: tickets.filter((t: any) => t.status === 'open').length,
        in_progress: tickets.filter((t: any) => t.status === 'in_progress').length,
        resolved: tickets.filter((t: any) => t.status === 'resolved').length,
        closed: tickets.filter((t: any) => t.status === 'closed').length,
      }
      
      setCounts(newCounts)
    } catch (err) {
      console.error('Error fetching ticket counts:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch ticket counts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCounts()
  }, [])

  return {
    counts,
    loading,
    error,
    refetch: fetchCounts
  }
}
