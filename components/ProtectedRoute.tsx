
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { UserRole } from '../types';

interface ProtectedRouteProps {
    allowedRoles: UserRole[];
    userRole: UserRole | null;
    isAuthenticated: boolean;
    status: string;
    isPlanPage?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
    allowedRoles,
    userRole,
    isAuthenticated,
    status,
    isPlanPage = false
}) => {
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // Se estiver Pendente de Pagamento, bloqueia tudo EXCETO a página de Planos
    // Status pode ser 'Pendente', 'Suspenso', 'Inativo' etc. 
    // Vamos considerar que só 'Ativo' libera.
    // ADMIN sempre livre.
    const isPending = status && status !== 'Ativo';

    if (userRole !== 'ADMIN' && isPending && !isPlanPage) {
        // Redireciona para atualização de plano
        return <Navigate to="/broker/plan" replace />; // Caminho unificado para plano
    }

    if (userRole && !allowedRoles.includes(userRole)) {
        // Redireciona para a home do papel do usuário se ele tentar acessar algo proibido
        const defaultPath = userRole === 'ADMIN' ? '/admin' : userRole === 'BROKER' ? '/broker' : '/pj';
        return <Navigate to={defaultPath} replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;
