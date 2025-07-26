'use client';

import SystemConfig from '../../components/SystemConfig';
import withAuth from '@/components/withAuth';

function SettingsPage() {
  return (
    <div>
      <h1 className="text-4xl font-bold text-white tracking-tight mb-6">System Settings</h1>
      <SystemConfig />
    </div>
  );
}

export default withAuth(SettingsPage);
