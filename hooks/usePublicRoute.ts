import { useState } from 'react';

interface PublicRouteState {
    isTestRoute: boolean;
    testToken: string | null;
}

export const usePublicRoute = (): PublicRouteState => {
    // Evaluate synchronously to prevent premature redirects in App.tsx
    const searchParams = new URLSearchParams(window.location.search);
    const isTestRoute = searchParams.get('test') === 'true';
    const testToken = searchParams.get('token');

    const [state] = useState<PublicRouteState>({
        isTestRoute,
        testToken,
    });

    return state;
};
