import { useMyDetails } from './useMyDetails';

export function useAuth() {
    const { data: user, isLoading } = useMyDetails();
    return { user, isLoading };
}
