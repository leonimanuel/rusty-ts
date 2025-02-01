import { Request, Response, NextFunction, RequestHandler } from 'express';
import { supabase } from '../../lib/supabase';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    role?: string;
  };
}

export const requireAuth: RequestHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get JWT from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing authorization header' });
      return;
    }

    const token = authHeader.split(' ')[1];
    
    // Verify the JWT using admin API
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(token);
    
    if (userError || !user) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    // Get user profile with role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      res.status(500).json({ error: 'Error fetching user profile' });
      return;
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      role: profile?.role
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
    return;
  }
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