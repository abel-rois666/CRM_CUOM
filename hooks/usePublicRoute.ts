import { useState, useEffect } from 'react';

interface PublicRouteState {
    isTestRoute: boolean;
    testToken: string | null;
}

export const usePublicRoute = (): PublicRouteState => {
    const [state, setState] = useState<PublicRouteState>({
        isTestRoute: false,
        testToken: null,
    });

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const isTestMode = urlParams.get('test') === 'true';
        const testToken = urlParams.get('token');

        if (isTestMode && testToken) {
            setState({
                isTestRoute: true,
                testToken: testToken,
            });
        }
    }, []);

    return state;
};
