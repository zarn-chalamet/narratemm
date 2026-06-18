import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Logo } from '../components/Logo';
import { GoogleIcon } from '../components/icons/GoogleIcon';
import { FacebookIcon } from '../components/icons/FacebookIcon';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, loginWithGoogle, loginWithFacebook, isLoading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
      navigate('/dashboard');
    } catch (err: any) {
      setLocalError(err.message || 'Google login failed');
    }
  };

  const handleFacebookLogin = async () => {
    try {
      await loginWithFacebook();
      navigate('/dashboard');
    } catch (err: any) {
      setLocalError(err.message || 'Facebook login failed');
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    clearError();

    if (!email || !password) {
      setLocalError('Please fill in all fields');
      return;
    }

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setLocalError(err.message || 'Invalid email or password');
    }
  };

  const displayError = localError || error;

  return (
    <div className="min-h-screen bg-[#0f0f14] flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-violet-600/20 via-purple-600/10 to-[#0f0f14] p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl" />
        <div className="relative z-10">
          <Logo size="lg" />
        </div>
        <div className="relative z-10 space-y-6">
          <h2 className="text-4xl font-bold text-white leading-tight">
            Transform Hours of<br />
            Editing into <span className="text-violet-400">Minutes</span>
          </h2>
          <p className="text-gray-400 text-lg max-w-md">
            AI-powered drama recap automation for Myanmar content creators.
            Upload, transcribe, script, voice-over, and export — all in one platform.
          </p>
        </div>
        <div className="relative z-10 text-sm text-gray-500">
          © 2024 NarrateMM. All rights reserved.
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          <div className="lg:hidden flex justify-center mb-8">
            <Logo size="md" />
          </div>

          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-bold text-white">Welcome back</h2>
            <p className="mt-2 text-gray-400">Sign in to continue your creative journey</p>
          </div>

          {displayError && (
            <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-400">{displayError}</p>
            </div>
          )}

          <div className="space-y-3">
            <Button
              variant="google"
              size="lg"
              className="w-full"
              onClick={handleGoogleLogin}
              isLoading={isLoading}
              leftIcon={<GoogleIcon />}
            >
              Continue with Google
            </Button>
            <Button
              variant="facebook"
              size="lg"
              className="w-full"
              onClick={handleFacebookLogin}
              isLoading={isLoading}
              leftIcon={<FacebookIcon className="w-5 h-5" />}
            >
              Continue with Facebook
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#2a2a3e]" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-[#0f0f14] text-gray-500">or sign in with email</span>
            </div>
          </div>

          <form onSubmit={handleEmailLogin} className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="w-5 h-5" />}
            />
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="w-5 h-5" />}
              rightIcon={
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="hover:text-white transition-colors">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              }
            />

            <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={isLoading}>
              Sign In
            </Button>
          </form>

          <p className="text-center text-gray-400">
            Don't have an account?{' '}
            <Link to="/register" className="text-violet-400 hover:text-violet-300 font-medium transition-colors">
              Sign up free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
