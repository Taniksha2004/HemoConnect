import { AlertCircle } from 'lucide-react';
import HealthScreeningForm from './HealthScreeningForm';

interface User {
  name: string;
  role: 'donor' | 'requestor' | 'hospital' | null;
  verified: boolean;
  bloodType?: string;
}

interface DonorDashboardProps {
  user: User | null;
}

export function DonorDashboard({ user }: DonorDashboardProps) {
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-orange-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Please Login</h2>
          <p className="text-gray-600">You need to be logged in to access the donor dashboard.</p>
        </div>
      </div>
    );
  }

  return <HealthScreeningForm />;
}
