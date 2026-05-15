import { useQuery } from '@tanstack/react-query';
import { StudentDetail } from '@narada/types';
import { apiRequest } from '@/lib/api';
import { getCurrentTenantSlug } from '@/lib/tenant';

export const useMyDetails = () => {
  const tenantSlug = getCurrentTenantSlug();
  return useQuery({
    queryKey: ['myDetails', tenantSlug],
    queryFn: async () => {
      return apiRequest<StudentDetail>('/learning/my-details');
    },
  });
};
