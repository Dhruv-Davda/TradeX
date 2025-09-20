import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Coins, Mail, Building, Phone, Lock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext-simple';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useSearchParams } from 'react-router-dom';

export const Login: React.FC = () => {
  const { signUp, signIn } = useAuth();
  const [searchParams] = useSearchParams();
  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    businessName: '',
    phoneNumber: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Handle URL parameters for verification status
  useEffect(() => {
    const verified = searchParams.get('verified');
    const errorParam = searchParams.get('error');

    if (verified === 'true') {
      setSuccessMessage('✅ Email verified successfully! You can now sign in.');
    } else if (errorParam === 'verification_failed') {
      setError('❌ Email verification failed. Please try again.');
    } else if (errorParam === 'no_session') {
      setError('❌ No active session found. Please sign in.');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      if (isSignUp) {
        const result = await signUp(
          formData.email,
          formData.password,
          formData.businessName,
          formData.phoneNumber
        );
        
        if (!result.success) {
          setError(result.error || 'Sign up failed');
        } else {
          // Check if there's a success message with error (email confirmation case)
          if (result.error && result.error.includes('check your email')) {
            setSuccessMessage(result.error);
          } else {
            setSuccessMessage('Account created successfully! Please check your email for a welcome message and confirmation link.');
          }
        }
      } else {
        console.log('🔐 Login: Starting sign in process...');
        const result = await signIn(formData.email, formData.password);
        console.log('🔐 Login: Sign in result:', result);
        
        if (!result.success) {
          console.error('❌ Login: Sign in failed:', result.error);
          setError(result.error || 'Sign in failed');
        } else {
          console.log('✅ Login: Sign in successful');
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
    }
    
    setIsLoading(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Coins className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">TradeManager</h2>
            <p className="text-gray-400">Manage your gold & silver trades</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {successMessage && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                <p className="text-green-400 text-sm">{successMessage}</p>
              </div>
            )}

            <Input
              type="email"
              name="email"
              label="Email Address"
              placeholder="Enter your email"
              icon={<Mail className="w-4 h-4" />}
              value={formData.email}
              onChange={handleInputChange}
              required
            />

            <Input
              type="password"
              name="password"
              label="Password"
              placeholder="Enter your password"
              icon={<Lock className="w-4 h-4" />}
              value={formData.password}
              onChange={handleInputChange}
              required
            />

            {isSignUp && (
              <>
                <Input
                  type="text"
                  name="businessName"
                  label="Business Name"
                  placeholder="Enter your business name"
                  icon={<Building className="w-4 h-4" />}
                  value={formData.businessName}
                  onChange={handleInputChange}
                  required
                />
                
                <Input
                  type="tel"
                  name="phoneNumber"
                  label="Phone Number"
                  placeholder="Enter your phone number"
                  icon={<Phone className="w-4 h-4" />}
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                />
              </>
            )}

            <Button
              type="submit"
              className="w-full"
              isLoading={isLoading}
            >
              {isSignUp ? 'Create Account' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-4">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-center text-sm text-gray-400 hover:text-white transition-colors w-full"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};