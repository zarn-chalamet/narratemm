import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Eye, EyeOff, AlertCircle, Check } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Logo } from '../components/Logo';
import { GoogleIcon } from '../components/icons/GoogleIcon';
import { FacebookIcon } from '../components/icons/FacebookIcon';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register, loginWithGoogle, loginWithFacebook, isLoading, error, clearError } = useAuthStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [localError, setLocalError] = useState('');

  const passwordRequirements = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'One uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'One number', met: /[0-9]/.test(password) },
  ];

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    clearError();

    if (!name || !email || !password || !confirmPassword) {
      setLocalError('Please fill in all fields');
      return;
    }
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }
    if (!passwordRequirements.every((req) => req.met)) {
      setLocalError('Password does not meet requirements');
      return;
    }
    if (!agreedToTerms) {
      setLocalError('Please agree to the terms and conditions');
      return;
    }

    try {
      await register(name, email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setLocalError(err.message || 'Registration failed');
    }
  };

  const displayError = localError || error;

  return (
    <div className="min-h-screen bg-[#0f0f14] flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-purple-600/20 via-violet-600/10 to-[#0f0f14] p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 left-1/4 w-72 h-72 bg-violet-500/20 rounded-full blur-3xl" />
        <div className="relative z-10">
          <Logo size="lg" />
        </div>
        <div className="relative z-10 space-y-8">
          <h2 className="text-4xl font-bold text-white leading-tight">
            Start Creating<br />
            <span className="text-purple-400">Professional Recaps</span><br />
            in Minutes
          </h2>
          <div className="space-y-4">
            {[
              'AI-powered transcription in Myanmar & English',
              'Multiple voice options with natural delivery',
              'Auto subtitles with Burmese font support',
              'Export ready for TikTok, YouTube, Instagram',
            ].map((feature, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <Check className="w-4 h-4 text-purple-400" />
                </div>
                <span className="text-gray-300">{feature}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10 text-sm text-gray-500">
          © 2024 NarrateMM. All rights reserved.
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
        <div className="w-full max-w-md space-y-6 animate-fade-in py-8">
          <div className="lg:hidden flex justify-center mb-6">
            <Logo size="md" />
          </div>

          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-bold text-white">Create your account</h2>
            <p className="mt-2 text-gray-400">Join thousands of Myanmar drama creators</p>
          </div>

          {displayError && (
            <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <p className="text-sm text-red-400">{displayError}</p>
            </div>
          )}

          <div className="space-y-3">
            <Button variant="google" size="lg" className="w-full" onClick={() => loginWithGoogle().then(() => navigate('/dashboard')).catch(() => {})} isLoading={isLoading} leftIcon={<GoogleIcon />}>
              Sign up with Google
            </Button>
            <Button variant="facebook" size="lg" className="w-full" onClick={() => loginWithFacebook().then(() => navigate('/dashboard')).catch(() => {})} isLoading={isLoading} leftIcon={<FacebookIcon className="w-5 h-5" />}>
              Sign up with Facebook
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#2a2a3e]" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-[#0f0f14] text-gray-500">or sign up with email</span>
            </div>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <Input label="Full Name" type="text" placeholder="Aung Myat Thu" value={name} onChange={(e) => setName(e.target.value)} leftIcon={<User className="w-5 h-5" />} />
            <Input label="Email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} leftIcon={<Mail className="w-5 h-5" />} />
            
            <div className="space-y-2">
              <Input label="Password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} leftIcon={<Lock className="w-5 h-5" />}
                rightIcon={
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="hover:text-white transition-colors">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                }
              />
              {password && (
                <div className="space-y-1 pt-1">
                  {passwordRequirements.map((req, index) => (
                    <div key={index} className="flex items-center gap-2 text-xs">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center ${req.met ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-500'}`}>
                        <Check className="w-3 h-3" />
                      </div>
                      <span className={req.met ? 'text-green-400' : 'text-gray-500'}>{req.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Input label="Confirm Password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} leftIcon={<Lock className="w-5 h-5" />}
              error={confirmPassword && password !== confirmPassword ? 'Passwords do not match' : ''}
            />

            <label className="flex items-start gap-3 cursor-pointer pt-2">
              <input type="checkbox" checked={agreedToTerms} onChange={(e) => setAgreedToTerms(e.target.checked)} className="mt-0.5 w-4 h-4 rounded border-[#2a2a3e] bg-[#1a1a24] text-violet-500 focus:ring-violet-500 focus:ring-offset-0" />
              <span className="text-sm text-gray-400">
                I agree to the{' '}
                <a href="#" className="text-violet-400 hover:text-violet-300">Terms of Service</a> and{' '}
                <a href="#" className="text-violet-400 hover:text-violet-300">Privacy Policy</a>
              </span>
            </label>

            <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={isLoading}>
              Create Account
            </Button>
          </form>

          <p className="text-center text-gray-400">
            Already have an account?{' '}
            <Link to="/login" className="text-violet-400 hover:text-violet-300 font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
