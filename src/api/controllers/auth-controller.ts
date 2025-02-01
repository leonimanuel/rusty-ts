import { Request, Response } from 'express';
import { supabase } from '../../lib/supabase';

export class AuthController {
  async signUp(req: Request, res: Response) {
    try {
      const { email, password, firstName, lastName } = req.body;
      console.log('signUp', req.body);
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      if (!firstName || !lastName) {
        return res.status(400).json({ error: 'First name and last name are required' });
      }

      // Create user in Supabase Auth with metadata
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm the email for server-side signup
        user_metadata: {
          first_name: firstName,
          last_name: lastName,
        }
      });

      if (authError) {
        return res.status(400).json({ error: authError.message });
      }

      if (authData.user) {
        // Create profile for the user
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            first_name: firstName,
            last_name: lastName
          });

        if (profileError) {
          console.error('Error creating profile:', profileError);
          // Clean up: delete the user if profile creation failed
          await supabase.auth.admin.deleteUser(authData.user.id);
          return res.status(500).json({ error: 'Error creating user profile' });
        }
      }

      return res.status(201).json({ 
        message: 'Signup successful',
        user: authData.user 
      });
    } catch (error) {
      console.error('Signup error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async signIn(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return res.status(401).json({ error: error.message });
      }

      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
      }

      return res.json({
        user: data.user,
        session: data.session,
        profile
      });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async signOut(req: Request, res: Response) {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing authorization header' });
      }

      const token = authHeader.split(' ')[1];
      
      // Invalidate the session server-side
      const { error } = await supabase.auth.admin.signOut(token);

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      return res.json({ message: 'Signed out successfully' });
    } catch (error) {
      console.error('Signout error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async resetPassword(req: Request, res: Response) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.SITE_URL}/reset-password`
      });

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      return res.json({ message: 'Password reset email sent' });
    } catch (error) {
      console.error('Password reset error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getProfile(req: Request, res: Response) {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing authorization header' });
      }

      const token = authHeader.split(' ')[1];
      
      // Get user using the admin API
      const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(token);

      if (userError || !user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) {
        return res.status(500).json({ error: profileError.message });
      }

      return res.json({
        user,
        profile
      });
    } catch (error) {
      console.error('Get profile error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
} 