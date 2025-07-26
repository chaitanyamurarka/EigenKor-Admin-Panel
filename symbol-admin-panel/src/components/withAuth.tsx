'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

import { getToken, removeToken } from '@/lib/auth';
import { getCurrentUser } from '@/lib/api';

const withAuth = <P extends object>(WrappedComponent: React.ComponentType<P>) => {
  const Wrapper = (props: P) => {
    const router = useRouter();
    const pathname = usePathname();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      const verifyToken = async () => {
        // If we're on the login page, don't do anything. This prevents redirect loops.
        if (pathname === '/login') {
          setIsLoading(false);
          return;
        }
        const token = getToken();
        if (!token) {
          router.push('/login');
          return;
        }

        try {
          // This API call will verify the token on the backend.
          // If it fails, the catch block will be executed.
          await getCurrentUser();
          setIsLoading(false); // Token is valid, stop loading
        } catch (error) {
          console.error('Authentication failed:', error);
          removeToken(); // Remove invalid token
          router.push('/login');
        }
      };

      verifyToken();
    }, [router, pathname]);


    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-slate-900">
          <div className="text-white text-xl">Authenticating...</div>
        </div>
      );
    }

    return <WrappedComponent {...props} />;
  };

  return Wrapper;
};

export default withAuth;
