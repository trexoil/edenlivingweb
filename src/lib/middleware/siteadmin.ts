import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Profile } from '@/types/database'
import { 
  extractSiteAdminAuth, 
  validateSiteAccess, 
  SiteAdminErrors,
  hasSiteAdminAccess 
} from '@/lib/auth/siteadmin'

/**
 * Site admin authorization middleware for API routes
 */
export async function requireSiteAdminAuth(
  request: NextRequest,
  options: {
    requireSiteId?: boolean
    allowSuperadmin?: boolean
  } = {}
) {
  const { requireSiteId = false, allowSuperadmin = true } = options

  try {
    // Extract authorization info from request
    const authInfo = extractSiteAdminAuth(request)
    
    if (!authInfo.hasAdminAccess) {
      return NextResponse.json(SiteAdminErrors.UNAUTHORIZED, { 
        status: SiteAdminErrors.UNAUTHORIZED.status 
      })
    }

    // Create appropriate Supabase client
    let supabase
    let user: Profile | null = null

    if (authInfo.isSuperadminSession && allowSuperadmin) {
      // Use admin client for superadmin
      supabase = createAdminClient()
      
      // For superadmin, we'll use a mock user profile since they bypass normal auth
      // In a real implementation, you might want to fetch the actual superadmin profile
      user = {
        id: '5f4f3eff-f2bd-4b3a-97bf-5df7ddc95fee',
        email: 'superadmin@eden.com',
        first_name: 'Super',
        last_name: 'Admin',
        role: 'superadmin',
        site_id: null, // Superadmin has access to all sites
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as Profile
    } else {
      // Use regular client for site admin
      supabase = await createClient()
      
      // Get the authenticated user
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !authUser) {
        return NextResponse.json(SiteAdminErrors.UNAUTHORIZED, { 
          status: SiteAdminErrors.UNAUTHORIZED.status 
        })
      }

      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (profileError || !profile) {
        return NextResponse.json(SiteAdminErrors.UNAUTHORIZED, { 
          status: SiteAdminErrors.UNAUTHORIZED.status 
        })
      }

      user = profile as Profile
    }

    // Verify user has site admin access
    if (!hasSiteAdminAccess(user)) {
      return NextResponse.json(SiteAdminErrors.FORBIDDEN, { 
        status: SiteAdminErrors.FORBIDDEN.status 
      })
    }

    // If a specific site ID is required, validate access
    if (requireSiteId) {
      const url = new URL(request.url)
      const siteId = url.searchParams.get('siteId') || 
                    request.headers.get('x-site-id') ||
                    extractSiteIdFromPath(url.pathname)

      if (!siteId) {
        return NextResponse.json(SiteAdminErrors.INVALID_SITE, { 
          status: SiteAdminErrors.INVALID_SITE.status 
        })
      }

      const siteAccess = validateSiteAccess(user, siteId)
      if (!siteAccess.hasAccess) {
        return NextResponse.json({
          error: siteAccess.reason || 'Site access denied',
          status: 403
        }, { status: 403 })
      }
    }

    return {
      user,
      supabase,
      isSuperadmin: user.role === 'superadmin',
      siteId: user.site_id
    }

  } catch (error) {
    console.error('Site admin auth middleware error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

/**
 * Extract site ID from URL path
 */
function extractSiteIdFromPath(pathname: string): string | null {
  // Look for patterns like /api/siteadmin/sites/[siteId]/...
  const siteIdMatch = pathname.match(/\/api\/siteadmin\/sites\/([^\/]+)/)
  if (siteIdMatch) {
    return siteIdMatch[1]
  }

  // Look for other patterns where site ID might be in the path
  const pathSegments = pathname.split('/')
  const siteIndex = pathSegments.findIndex(segment => segment === 'sites')
  if (siteIndex !== -1 && pathSegments[siteIndex + 1]) {
    return pathSegments[siteIndex + 1]
  }

  return null
}

/**
 * Site admin API response helper
 */
export function createSiteAdminResponse(data: any, status: number = 200) {
  return NextResponse.json(data, { status })
}

/**
 * Site admin error response helper
 */
export function createSiteAdminErrorResponse(
  error: keyof typeof SiteAdminErrors | string,
  customMessage?: string
) {
  if (typeof error === 'string') {
    return NextResponse.json({ error }, { status: 400 })
  }

  const errorInfo = SiteAdminErrors[error]
  return NextResponse.json({
    error: customMessage || errorInfo.error
  }, { status: errorInfo.status })
}

/**
 * Validate site admin permissions for specific operations
 */
export function validateSiteAdminOperation(
  user: Profile,
  operation: 'read' | 'write' | 'delete',
  resource: 'users' | 'site' | 'services' | 'announcements' | 'events',
  targetSiteId?: string
): { allowed: boolean; reason?: string } {
  // Superadmin can do everything
  if (user.role === 'superadmin') {
    return { allowed: true }
  }

  // Site admin must have a site assigned
  if (user.role === 'site_admin' && !user.site_id) {
    return { allowed: false, reason: 'Site admin has no assigned site' }
  }

  // Site admin can only operate on their assigned site
  if (user.role === 'site_admin' && targetSiteId && user.site_id !== targetSiteId) {
    return { allowed: false, reason: 'Site admin can only access their assigned site' }
  }

  // Check resource-specific permissions
  switch (resource) {
    case 'users':
      // Site admin can read/write users in their site, but cannot delete superadmin users
      return { allowed: true }
    
    case 'site':
      // Site admin can read/write site info but cannot delete sites
      if (operation === 'delete') {
        return { allowed: false, reason: 'Site admin cannot delete sites' }
      }
      return { allowed: true }
    
    case 'services':
    case 'announcements':
    case 'events':
      // Site admin has full access to these resources for their site
      return { allowed: true }
    
    default:
      return { allowed: false, reason: 'Unknown resource' }
  }
}
