import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSystemConfig, setSystemConfig } from '../lib/api';
import { SystemConfig } from '../lib/types';

export const useSystemConfig = () => {
  return useQuery({
    queryKey: ['systemConfig'],
    queryFn: getSystemConfig,
  });
};

export const useSetSystemConfig = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (config: SystemConfig) => setSystemConfig(config),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['systemConfig'] });
        },
    });
};