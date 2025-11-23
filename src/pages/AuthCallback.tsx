import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('🔗 AuthCallback: Processing email verification...');
        
        // Get URL parameters
        const tokenHash = searchParams.get('token_hash');
        const type = searchParams.get('type');
        const accessToken = searchParams.get('access_token');
        const refreshToken = searchParams.get('refresh_token');

        console.log('🔗 AuthCallback: URL params:', { 
          hasTokenHash: !!tokenHash, 
          hasType: !!type, 
          hasAccessToken: !!accessToken 
        });

        // Handle email verification with access token (Supabase default flow)
        if (accessToken && refreshToken) {
          console.log('🔗 AuthCallback: Setting session with tokens...');
          
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });

          if (sessionError) {
            console.error('❌ AuthCallback: Session error:', sessionError);
            navigate('/login?error=session_error');
            return;
          }

          if (sessionData.session && sessionData.user) {
            console.log('✅ AuthCallback: Email verified successfully!');
            // Email verified and user is now logged in
            navigate('/login?verified=true');
            return;
          }
        }

        // Handle email verification with access_token only (alternative flow)
        if (accessToken && !refreshToken) {
          console.log('🔗 AuthCallback: Handling access_token only flow...');
          
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: ''
          });

          if (sessionError) {
            console.error('❌ AuthCallback: Session error:', sessionError);
            navigate('/login?error=session_error');
            return;
          }

          if (sessionData.session && sessionData.user) {
            console.log('✅ AuthCallback: Email verified successfully via access_token!');
            navigate('/login?verified=true');
            return;
          }
        }

        // Fallback: Handle with token_hash if available
        if (tokenHash && type === 'signup') {
          console.log('🔗 AuthCallback: Trying verifyOtp with token_hash...');
          
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'signup'
          });

          if (error) {
            console.error('❌ AuthCallback: Email verification error:', error);
            navigate('/login?error=verification_failed');
            return;
          }

          if (data.user) {
            console.log('✅ AuthCallback: Email verified via verifyOtp!');
            navigate('/login?verified=true');
            return;
          }
        }

        // Alternative: Try to verify with just the type parameter
        if (type === 'signup' && !tokenHash && !accessToken) {
          console.log('🔗 AuthCallback: Trying to verify with type only...');
          
          // Get the current URL and try to extract tokens from hash
          const hash = window.location.hash;
          const urlParams = new URLSearchParams(hash.substring(1));
          const hashAccessToken = urlParams.get('access_token');
          const hashRefreshToken = urlParams.get('refresh_token');
          
          if (hashAccessToken) {
            console.log('🔗 AuthCallback: Found tokens in hash, setting session...');
            const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
              access_token: hashAccessToken,
              refresh_token: hashRefreshToken || ''
            });

            if (sessionData.session && sessionData.user) {
              console.log('✅ AuthCallback: Email verified via hash tokens!');
              navigate('/login?verified=true');
              return;
            }
          }
        }

        // Check for existing session (for other auth flows)
        console.log('🔗 AuthCallback: Checking existing session...');
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('❌ AuthCallback: Session check error:', sessionError);
          navigate('/login?error=session_error');
          return;
        }

        if (sessionData.session) {
          console.log('✅ AuthCallback: User already logged in, going to dashboard');
          navigate('/dashboard');
        } else {
          console.log('⚠️ AuthCallback: No session found, redirecting to login');
          navigate('/login');
        }
      } catch (error) {
        console.error('❌ AuthCallback: Unexpected error:', error);
        navigate('/login?error=unexpected_error');
      }
    };

    handleAuthCallback();
  }, [navigate, searchParams]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Verifying your email...</p>
        <div className="mt-4 p-4 bg-gray-100 rounded text-sm">
          <p className="font-semibold">Debug Info:</p>
          <p>URL: {window.location.href}</p>
          <p>Token Hash: {searchParams.get('token_hash') ? 'Present' : 'Missing'}</p>
          <p>Type: {searchParams.get('type') || 'Missing'}</p>
          <p>Access Token: {searchParams.get('access_token') ? 'Present' : 'Missing'}</p>
          <p>Refresh Token: {searchParams.get('refresh_token') ? 'Present' : 'Missing'}</p>
        </div>
      </div>
    </div>
  );
};
