import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/display/requests?department=xxx&site_id=xxx (site_id optional)
// Public endpoint for service request display - no authentication required
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const department = searchParams.get('department')
    const siteId = searchParams.get('site_id')

    if (!department) {
      return NextResponse.json({ items: [], error: 'department parameter required' }, { status: 400 })
    }

    // Use admin client for public access (bypasses RLS)
    const supabase = createAdminClient()

    // Get today's start time (00:00:00)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayISO = today.toISOString()

    // Map department names to service types
    const departmentTypeMap: Record<string, string> = {
      'Housekeeping': 'housekeeping',
      'Maintenance': 'maintenance',
      'Transportation': 'transportation',
      'Medical': 'medical',
      'Laundry': 'laundry',
      'Home Care': 'home_care'
    }

    const serviceType = departmentTypeMap[department]
    if (!serviceType) {
      return NextResponse.json({ items: [], error: 'invalid department' }, { status: 400 })
    }

    // Build query for service requests
    let query = supabase
      .from('service_requests')
      .select('*')
      .gte('created_at', todayISO)
      .in('status', ['assigned', 'processing', 'in_progress'])
      .eq('type', serviceType)
      .order('created_at', { ascending: false })

    // Optional site filtering
    if (siteId) {
      query = query.eq('site_id', siteId)
    }

    const { data: requestsData, error } = await query.limit(100)

    if (error) {
      console.error('[display/requests] Query error:', error)
      return NextResponse.json({ items: [], error: error.message }, { status: 500 })
    }

    // Format response
    const items = (requestsData || []).map((request) => ({
      id: request.id,
      request_number: `REQ-${request.id.slice(0, 6).toUpperCase()}`,
      type: request.type,
      title: request.title,
      description: request.description,
      status: request.status,
      priority: request.priority || 'medium',
      created_at: request.created_at
    }))

    return NextResponse.json({ items })
  } catch (e: any) {
    console.error('[display/requests] Error:', e)
    return NextResponse.json({ items: [], error: e?.message ?? 'unavailable' }, { status: 500 })
  }
}

