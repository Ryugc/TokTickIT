import React from 'react';
import { useAuth } from '../context/AuthContext';
import StaffDashboard from '../components/StaffDashboard';
import RequesterDashboard from '../components/RequesterDashboard';

interface DashboardProps {
  onSelectTicket?: (ticketId: number) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onSelectTicket }) => {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  const isStaffOrAdmin = user.role === 'IT_STAFF' || user.role === 'ADMIN';

  return (
    <div className="dashboard-page">
      {isStaffOrAdmin ? (
        <StaffDashboard onSelectTicket={onSelectTicket} />
      ) : (
        <RequesterDashboard onSelectTicket={onSelectTicket} />
      )}
    </div>
  );
};

export default Dashboard;
