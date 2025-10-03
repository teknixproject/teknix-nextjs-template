'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { XHubLogin } from 'xhub-auth';
import styleLogin from 'xhub-auth/dist/styles/style/login.module.css';

const Login = () => {
  const searchParams = useSearchParams();
  const [pathToNext, setPathToNext] = useState('/');

  const clientId = process.env.NEXT_PUBLIC_CLIENT_ID;
  const ssoApi = process.env.NEXT_PUBLIC_SSO_API;

  useEffect(() => {
    // Lấy callbackUrl từ URL params
    const callbackUrl = searchParams.get('callbackUrl');

    if (callbackUrl) {
      try {
        // Decode URL nếu nó bị encode
        const decodedUrl = decodeURIComponent(callbackUrl);
        // Chỉ lấy path, bỏ domain
        const url = new URL(decodedUrl);
        setPathToNext(url.pathname || '/');
      } catch (error) {
        console.error('Error parsing callback URL:', error);
        // Fallback về trang mặc định
        setPathToNext('/');
      }
    } else {
      // Không có callbackUrl, dùng mặc định
      setPathToNext('/');
    }
  }, [searchParams]);

  return (
    <div
      style={{
        width: '100dvw',
        height: '100dvh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <XHubLogin
        ssoApi={ssoApi as string}
        clientId={clientId as string}
        pathRegister="/register"
        pathToNext={pathToNext} // Sử dụng dynamic path
        name="Hii"
        title="Welcome Back!"
        content="Enter your email and password to login"
        pathForgotPassword="/forgot-password"
        style={styleLogin}
      />
    </div>
  );
};

export default Login;
