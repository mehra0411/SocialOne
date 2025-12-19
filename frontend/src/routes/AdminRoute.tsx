import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/auth';

export function AdminRoute() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'super_admin') return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}


