
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { UserRole } from '../types';

interface ProtectedRouteProps {
    allowedRoles: UserRole[];
    userRole: UserRole | null;
    isAuthenticated: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
    allowedRoles,
    userRole,
    isAuthenticated
}) => {
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (userRole && !allowedRoles.includes(userRole)) {
        // Redireciona para a home do papel do usuário se ele tentar acessar algo proibido
        const defaultPath = userRole === 'ADMIN' ? '/admin' : userRole === 'BROKER' ? '/broker' : '/pj';
        return <Navigate to={defaultPath} replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;
