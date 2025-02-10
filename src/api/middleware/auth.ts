import { Request, Response, NextFunction, RequestHandler } from 'express';
import { supabase } from '../../lib/supabase';
import { Permission, hasPermission } from '../../utils/permissions';
import { UserRole } from '../../types/common';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    role?: UserRole;
  };
}

// Basic authentication middleware
export const requireAuth: RequestHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing authorization header' });
    return;
  }

  try {
    // Set auth header for Supabase client
    const token = authHeader.split(' ')[1];
    
    // Create authenticated client and verify token
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email
    };

    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({ error: 'Authentication failed' });
    return;
  }
};

// Permission check middleware
export const requirePermission = (permission: Permission): RequestHandler => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user?.id) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Extract companyId from URL path parameters
    const companyId = req.params.companyId;
    if (!companyId) {
      res.status(400).json({ error: 'Company ID not found in URL path' });
      return;
    }

    try {
      const { data: userCompany, error } = await supabase
        .from('user_companies')
        .select('role')
        .eq('user_id', req.user.id)
        .eq('company_id', companyId)
        .single();

      if (error || !userCompany) {
        res.status(403).json({ error: 'No access to this company' });
        return;
      }

      if (!hasPermission(userCompany.role, permission)) {
        res.status(403).json({ error: 'Insufficient permissions' });
        return;
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ error: 'Permission check failed' });
      return;
    }
  };
};

// Middleware to check if user has required role
export const requireRole = (allowedRoles: string[]): RequestHandler => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user?.role) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
};