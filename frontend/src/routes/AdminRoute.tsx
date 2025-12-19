import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/auth';

export function AdminRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'super_admin') return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}


