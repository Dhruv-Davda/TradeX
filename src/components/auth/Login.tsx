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
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-blue-900/90 to-purple-900">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-20"></div>
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        {/* Geometric shapes */}
        <div className="absolute top-20 right-20 w-72 h-72 bg-blue-500/10 rounded-full blur-2xl"></div>
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-purple-500/10 rounded-full blur-2xl"></div>
      </div>

      {/* Split Layout Container */}
      <div className="relative w-full max-w-6xl mx-auto grid md:grid-cols-2 gap-8 items-center z-10">
        {/* Left Side - Branding */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="hidden md:block text-center md:text-left space-y-8"
        >
          <div className="space-y-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
              className="w-24 h-24 bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 rounded-3xl flex items-center justify-center mx-auto md:mx-0 shadow-2xl shadow-blue-500/50"
            >
              <Coins className="w-12 h-12 text-white" />
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-white via-blue-200 to-purple-200 bg-clip-text text-transparent leading-tight"
            >
              TradeManager
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-xl text-gray-300 max-w-md"
            >
              Streamline your gold & silver trading operations with powerful analytics and insights
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex flex-wrap gap-4 justify-center md:justify-start"
            >
              <div className="flex items-center gap-2 text-gray-400">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>Real-time Analytics</span>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                <span>Secure & Reliable</span>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Right Side - Login Form */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="w-full"
        >
          {/* Asymmetric Card Design */}
          <div className="relative">
            {/* Decorative elements */}
            <div className="absolute -top-4 -right-4 w-32 h-32 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full blur-2xl"></div>
            <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-full blur-2xl"></div>
            
            {/* Main Card - Asymmetric Design */}
            <div className="backdrop-blur-xl bg-gradient-to-br from-gray-800/95 via-gray-800/90 to-gray-900/95 border border-white/10 rounded-3xl shadow-2xl p-8 md:p-10 relative overflow-hidden">
              {/* Shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 animate-shimmer"></div>
              
              {/* Corner accent */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-transparent rounded-bl-full"></div>
              
              {/* Mobile Header (only on small screens) */}
              <div className="md:hidden text-center mb-8 relative z-10">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="w-16 h-16 bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/50"
                >
                  <Coins className="w-8 h-8 text-white" />
                </motion.div>
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-2xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent mb-2"
                >
                  TradeManager
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-gray-400 text-sm"
                >
                  Manage your gold & silver trades
                </motion.p>
              </div>

          <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
            {error && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-red-500/10 backdrop-blur-sm border border-red-500/30 rounded-xl p-4 shadow-lg shadow-red-500/10"
              >
                <p className="text-red-300 text-sm font-medium">{error}</p>
              </motion.div>
            )}

            {successMessage && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-green-500/10 backdrop-blur-sm border border-green-500/30 rounded-xl p-4 shadow-lg shadow-green-500/10"
              >
                <p className="text-green-300 text-sm font-medium">{successMessage}</p>
              </motion.div>
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

            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 via-blue-500 to-purple-600 hover:from-blue-500 hover:via-blue-400 hover:to-purple-500 text-white font-semibold py-3 rounded-xl shadow-lg shadow-blue-500/30 transition-all duration-300"
                isLoading={isLoading}
              >
                {isSignUp ? 'Create Account' : 'Sign In'}
              </Button>
            </motion.div>
          </form>

          <div className="mt-8 pt-6 border-t border-white/10 relative z-10">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-center text-sm text-gray-400 hover:text-white transition-all duration-200 w-full group"
            >
              <span className="group-hover:underline">
                {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
                <span className="text-blue-400 font-medium group-hover:text-blue-300">
                  {isSignUp ? 'Sign in' : 'Sign up'}
                </span>
              </span>
            </button>
          </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};