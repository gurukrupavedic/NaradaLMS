import { useQuery } from '@tanstack/react-query';
import { StudentProgressData } from '@narada/types';
import { apiRequest } from '@/lib/api';
import { getCurrentTenantSlug } from '@/lib/tenant';

export const useMyTrackProgress = () => {
  const tenantSlug = getCurrentTenantSlug();
  return useQuery({
    queryKey: ['myTrackProgress', tenantSlug],
    queryFn: async () => {
      return apiRequest<StudentProgressData>('/learning/my-progress');
    },
  });
};
