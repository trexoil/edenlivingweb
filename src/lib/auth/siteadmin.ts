import { Profile } from '@/types/database'
import { NextRequest } from 'next/server'

/**
 * Check if a user is a site admin
 */
export function isSiteAdmin(user: Profile | null): boolean {
  return user?.role === 'site_admin'
}

/**
 * Check if a user is a site admin for a specific site
 */
export function isSiteAdminForSite(user: Profile | null, siteId: string): boolean {
  return user?.role === 'site_admin' && user?.site_id === siteId
}

/**
 * Check if a user has site admin or higher privileges
 */
export function hasSiteAdminAccess(user: Profile | null): boolean {
  return user?.role === 'site_admin' || user?.role === 'superadmin'
}

/**
 * Check if a user has site admin or higher privileges for a specific site
 */
export function hasSiteAdminAccessForSite(user: Profile | null, siteId: string): boolean {
  if (!user) return false
  
  // Superadmin has access to all sites
  if (user.role === 'superadmin') return true
  
  // Site admin only has access to their assigned site
  if (user.role === 'site_admin') return user.site_id === siteId
  
  return false
}

/**
 * Get the site ID that a user has admin access to
 * Returns null if user is not a site admin or if superadmin (has access to all)
 */
export function getUserAdminSiteId(user: Profile | null): string | null {
  if (!user) return null
  
  if (user.role === 'site_admin') {
    return user.site_id || null
  }
  
  // Superadmin has access to all sites, so return null to indicate no restriction
  if (user.role === 'superadmin') {
    return null
  }
  
  return null
}

/**
 * Extract site admin authorization from request headers
 */
export function extractSiteAdminAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cookies = request.headers.get('cookie')
  
  // Check for site admin session
  const isSiteAdminSession = cookies?.includes('site_admin_session') ||
                            authHeader?.includes('site_admin') ||
                            request.headers.get('x-site-admin') === 'true'
  
  // Check for superadmin session (superadmin has site admin privileges)
  const isSuperadminSession = cookies?.includes('superadmin_session') ||
                             authHeader?.includes('superadmin') ||
                             request.headers.get('x-superadmin') === 'true'
  
  return {
    isSiteAdminSession,
    isSuperadminSession,
    hasAdminAccess: isSiteAdminSession || isSuperadminSession
  }
}

/**
 * Validate that a site admin can access a specific site
 */
export function validateSiteAccess(user: Profile | null, requestedSiteId: string): {
  hasAccess: boolean
  reason?: string
} {
  if (!user) {
    return { hasAccess: false, reason: 'User not authenticated' }
  }
  
  // Superadmin has access to all sites
  if (user.role === 'superadmin') {
    return { hasAccess: true }
  }
  
  // Site admin can only access their assigned site
  if (user.role === 'site_admin') {
    if (!user.site_id) {
      return { hasAccess: false, reason: 'Site admin has no assigned site' }
    }
    
    if (user.site_id !== requestedSiteId) {
      return { hasAccess: false, reason: 'Site admin can only access their assigned site' }
    }
    
    return { hasAccess: true }
  }
  
  return { hasAccess: false, reason: 'User does not have site admin privileges' }
}

/**
 * Site admin authorization error responses
 */
export const SiteAdminErrors = {
  UNAUTHORIZED: { error: 'Unauthorized - Site admin access required', status: 401 },
  FORBIDDEN: { error: 'Forbidden - Insufficient site admin privileges', status: 403 },
  SITE_ACCESS_DENIED: { error: 'Access denied - Cannot access this site', status: 403 },
  INVALID_SITE: { error: 'Invalid site ID provided', status: 400 },
  NO_SITE_ASSIGNED: { error: 'Site admin has no assigned site', status: 400 }
} as const

/**
 * Site admin role hierarchy for permission checking
 */
export const RoleHierarchy = {
  resident: 0,
  staff: 1,
  admin: 2,
  site_admin: 3,
  superadmin: 4
} as const

/**
 * Check if user has sufficient role level
 */
export function hasMinimumRole(user: Profile | null, minimumRole: keyof typeof RoleHierarchy): boolean {
  if (!user || !user.role) return false
  
  const userLevel = RoleHierarchy[user.role as keyof typeof RoleHierarchy]
  const requiredLevel = RoleHierarchy[minimumRole]
  
  return userLevel >= requiredLevel
}
