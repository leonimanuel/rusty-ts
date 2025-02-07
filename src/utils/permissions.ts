import { UserRole } from '../types/common'

// Define granular permissions
export type Permission = 
  | 'create:lesson'
  | 'edit:lesson'
  | 'delete:lesson'
  | 'create:video'
  | 'edit:video'
  | 'delete:video'
  | 'manage:users'
  | 'manage:company'
  | 'view:analytics'

// Map roles to permissions
export const rolePermissions: Record<UserRole, Permission[]> = {
  admin: [
    'create:lesson',
    'edit:lesson', 
    'delete:lesson',
    'create:video',
    'edit:video',
    'delete:video',
    'manage:users',
    'manage:company',
    'view:analytics'
  ],
  company_admin: [
    'create:lesson',
    'edit:lesson',
    'delete:lesson', 
    'create:video',
    'edit:video',
    'delete:video',
    'manage:users',
    'view:analytics'
  ],
  content_creator: [
    'create:lesson',
    'edit:lesson',
    'create:video',
    'edit:video'
  ],
  student: []
}

// Helper to check if a role has a specific permission
export const hasPermission = (role: UserRole, permission: Permission): boolean => {
  return rolePermissions[role].includes(permission)
} 