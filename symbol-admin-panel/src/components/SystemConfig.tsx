'use client';

import React, { useState, useEffect } from 'react';
import { Input, Button, Card, CardBody, Divider } from '@nextui-org/react';
import { useSystemConfig, useSetSystemConfig } from '../hooks/useConfig';
import toast from 'react-hot-toast';
import { Save, Settings } from 'lucide-react';
import { SystemConfig as SystemConfigType } from '../lib/types';

const SystemConfig: React.FC = () => {
  const { data: config, isLoading } = useSystemConfig();
  const setConfigMutation = useSetSystemConfig();
  const [localConfig, setLocalConfig] = useState<SystemConfigType | null>(null);

  useEffect(() => {
    if (config) {
      setLocalConfig(config);
    }
  }, [config]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (localConfig) {
      setLocalConfig({ ...localConfig, [name]: Number(value) });
    }
  };

  const handleTimeframeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (localConfig) {
      setLocalConfig({
        ...localConfig,
        timeframes_to_fetch: {
          ...localConfig.timeframes_to_fetch,
          [name]: Number(value),
        },
      });
    }
  };

  const handleSubmit = () => {
    if (localConfig) {
      toast.promise(
        setConfigMutation.mutateAsync(localConfig),
        {
          loading: 'Saving configuration...',
          success: 'Configuration saved successfully!',
          error: 'Error saving configuration',
        }
      );
    }
  };

  if (isLoading || !localConfig) {
    return <div>Loading configuration...</div>;
  }

  return (
    <Card className="bg-slate-800/60 backdrop-blur-xl border border-slate-700/80 shadow-lg">
      <CardBody className="p-6 space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-slate-100 flex items-center gap-3">
            <Settings className="text-blue-400" />
            System Configuration
          </h2>
          <p className="text-slate-400 text-sm mt-1">Manage data ingestion settings.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            type="number"
            label="Schedule Hour (ET)"
            name="schedule_hour"
            value={localConfig.schedule_hour.toString()}
            onChange={handleInputChange}
          />
          <Input
            type="number"
            label="Schedule Minute"
            name="schedule_minute"
            value={localConfig.schedule_minute.toString()}
            onChange={handleInputChange}
          />
        </div>
        <Divider className="my-2 bg-slate-700"/>
        <div>
          <h3 className="text-lg font-semibold text-slate-200 mb-2">Timeframe Depths (in days)</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(localConfig.timeframes_to_fetch).map(([tf, days]) => (
              <Input
                key={tf}
                type="number"
                label={tf}
                name={tf}
                value={days.toString()}
                onChange={handleTimeframeChange}
              />
            ))}
          </div>
        </div>
        <div className="flex justify-end">
          <Button color="primary" variant="solid" onPress={handleSubmit} startContent={<Save size={16} />}>
            Save Configuration
          </Button>
        </div>
      </CardBody>
    </Card>
  );
};

export default SystemConfig;