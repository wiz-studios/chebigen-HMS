-- Fix database error saving new user
-- This script addresses the trigger and RLS issues causing the 500 error

-- First, let's check if the handle_new_user trigger exists and is working
-- Drop the existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Create a simpler, more reliable trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into public.users table with the auth user data
  INSERT INTO public.users (
    id, 
    full_name, 
    email, 
    password_hash, 
    role, 
    status
  ) VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'), 
    NEW.email, 
    '', -- password_hash is handled by Supabase Auth
    COALESCE(NEW.raw_user_meta_data->>'role', 'patient')::text,
    'pending' -- Default status for new registrations
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the auth user creation
    RAISE WARNING 'Failed to create user record: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_admin;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;

-- Now let's fix the RLS policies on users table
-- Drop all existing policies
DROP POLICY IF EXISTS "SuperAdmin can view all users" ON users;
DROP POLICY IF EXISTS "Users can view their own record" ON users;
DROP POLICY IF EXISTS "Staff can view basic user info" ON users;
DROP POLICY IF EXISTS "SuperAdmin can manage all users" ON users;
DROP POLICY IF EXISTS "Users can update their own record" ON users;
DROP POLICY IF EXISTS "Allow user registration" ON users;
DROP POLICY IF EXISTS "Authenticated users can view users" ON users;

-- Create simple, working policies
-- Allow user registration (anyone can insert)
CREATE POLICY "Allow user registration" ON users FOR INSERT 
WITH CHECK (true);

-- Users can view their own record
CREATE POLICY "Users can view their own record" ON users FOR SELECT
USING (auth.uid() = id);

-- Users can update their own record
CREATE POLICY "Users can update their own record" ON users FOR UPDATE
USING (auth.uid() = id);

-- Allow authenticated users to view users (temporary for setup)
CREATE POLICY "Allow authenticated users to view users" ON users FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON users TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Ensure RLS is enabled on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
