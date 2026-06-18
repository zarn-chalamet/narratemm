import React, { useState } from 'react';
import { 
  User, 
  Mail, 
  Lock, 
  Bell, 
  Palette, 
  Globe, 
  Key,
  Shield,
  Trash2,
  Save,
  Check
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';

type SettingsTab = 'profile' | 'account' | 'notifications' | 'api';

export const SettingsPage: React.FC = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [saved, setSaved] = useState(false);
  
  // Profile state
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  
  // Notification state
  const [notifications, setNotifications] = useState({
    exportComplete: true,
    weeklyDigest: false,
    productUpdates: true,
    tips: true,
  });

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'account', label: 'Account', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'api', label: 'API Keys', icon: Key },
  ] as const;

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Profile Information</h3>
              <p className="text-gray-400 text-sm mb-6">
                Update your account profile information and email address.
              </p>
            </div>

            {/* Avatar */}
            <div className="flex items-center gap-6">
              <img
                src={user?.avatar}
                alt={user?.name}
                className="w-20 h-20 rounded-2xl"
              />
              <div>
                <Button variant="secondary" size="sm">Change Photo</Button>
                <p className="text-xs text-gray-500 mt-2">JPG, PNG. Max 2MB</p>
              </div>
            </div>

            {/* Form */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                leftIcon={<User className="w-5 h-5" />}
              />
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail className="w-5 h-5" />}
              />
            </div>

            {/* Language */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Language
              </label>
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-gray-500" />
                <select className="flex-1 bg-[#1a1a24] border border-[#2a2a3e] rounded-xl px-4 py-2.5 text-white">
                  <option value="en">English</option>
                  <option value="my">မြန်မာ (Myanmar)</option>
                </select>
              </div>
            </div>

            {/* Theme */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Theme
              </label>
              <div className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-gray-500" />
                <select className="flex-1 bg-[#1a1a24] border border-[#2a2a3e] rounded-xl px-4 py-2.5 text-white">
                  <option value="dark">Dark (Default)</option>
                  <option value="light">Light</option>
                  <option value="system">System</option>
                </select>
              </div>
            </div>
          </div>
        );

      case 'account':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Account Security</h3>
              <p className="text-gray-400 text-sm mb-6">
                Manage your password and account security settings.
              </p>
            </div>

            {/* Connected accounts */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-300">Connected Accounts</h4>
              
              <div className="flex items-center justify-between p-4 bg-[#1a1a24] rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center">
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-white font-medium">Google</p>
                    <p className="text-sm text-gray-500">{user?.email}</p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-green-500/10 text-green-400 text-sm rounded-lg">Connected</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-[#1a1a24] rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#1877f2] flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-white font-medium">Facebook</p>
                    <p className="text-sm text-gray-500">Not connected</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">Connect</Button>
              </div>
            </div>

            {/* Change Password */}
            <div className="space-y-4 pt-4 border-t border-[#2a2a3e]">
              <h4 className="text-sm font-medium text-gray-300">Change Password</h4>
              <Input
                label="Current Password"
                type="password"
                placeholder="••••••••"
                leftIcon={<Lock className="w-5 h-5" />}
              />
              <Input
                label="New Password"
                type="password"
                placeholder="••••••••"
                leftIcon={<Lock className="w-5 h-5" />}
              />
              <Input
                label="Confirm New Password"
                type="password"
                placeholder="••••••••"
                leftIcon={<Lock className="w-5 h-5" />}
              />
            </div>

            {/* Danger Zone */}
            <div className="pt-4 border-t border-[#2a2a3e]">
              <h4 className="text-sm font-medium text-red-400 mb-4">Danger Zone</h4>
              <Button variant="outline" className="border-red-500/50 text-red-400 hover:bg-red-500/10">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Account
              </Button>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Notification Preferences</h3>
              <p className="text-gray-400 text-sm mb-6">
                Choose what notifications you want to receive.
              </p>
            </div>

            <div className="space-y-4">
              {[
                { key: 'exportComplete', label: 'Export Complete', desc: 'Get notified when your video is ready to download' },
                { key: 'weeklyDigest', label: 'Weekly Digest', desc: 'Summary of your activity and trending drama content' },
                { key: 'productUpdates', label: 'Product Updates', desc: 'New features and improvements to NarrateMM' },
                { key: 'tips', label: 'Tips & Tutorials', desc: 'Helpful tips for creating better recaps' },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between p-4 bg-[#1a1a24] rounded-xl">
                  <div>
                    <p className="text-white font-medium">{item.label}</p>
                    <p className="text-sm text-gray-500">{item.desc}</p>
                  </div>
                  <button
                    onClick={() => setNotifications(prev => ({ ...prev, [item.key]: !prev[item.key as keyof typeof notifications] }))}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      notifications[item.key as keyof typeof notifications] ? 'bg-violet-500' : 'bg-[#2a2a3e]'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      notifications[item.key as keyof typeof notifications] ? 'translate-x-6' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        );

      case 'api':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">API Configuration</h3>
              <p className="text-gray-400 text-sm mb-6">
                Configure your API keys for external services. These are stored securely and used for your projects.
              </p>
            </div>

            <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
              <p className="text-sm text-yellow-400">
                🔒 <strong>Demo Mode:</strong> In the test version, API keys are pre-configured on the server. 
                In production, you'll be able to add your own keys here.
              </p>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-[#1a1a24] rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-medium">Google Gemini API</span>
                  <span className="px-2 py-1 bg-green-500/10 text-green-400 text-xs rounded">Active</span>
                </div>
                <p className="text-sm text-gray-500">Used for script generation and TTS</p>
              </div>

              <div className="p-4 bg-[#1a1a24] rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-medium">Groq Whisper API</span>
                  <span className="px-2 py-1 bg-green-500/10 text-green-400 text-xs rounded">Active</span>
                </div>
                <p className="text-sm text-gray-500">Used for audio transcription</p>
              </div>

              <div className="p-4 bg-[#1a1a24] rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-medium">Supadata API</span>
                  <span className="px-2 py-1 bg-green-500/10 text-green-400 text-xs rounded">Active</span>
                </div>
                <p className="text-sm text-gray-500">Used for YouTube caption extraction</p>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-gray-400 mt-1">Manage your account and preferences</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Tabs */}
        <Card className="lg:w-56 p-2 h-fit">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-violet-500/10 text-violet-400 border border-violet-500/30'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </button>
            ))}
          </nav>
        </Card>

        {/* Content */}
        <Card className="flex-1 p-6">
          {renderContent()}
          
          {/* Save Button */}
          <div className="flex items-center justify-end gap-4 mt-8 pt-6 border-t border-[#2a2a3e]">
            {saved && (
              <span className="flex items-center gap-2 text-green-400 text-sm">
                <Check className="w-4 h-4" />
                Saved successfully
              </span>
            )}
            <Button onClick={handleSave} leftIcon={<Save className="w-4 h-4" />}>
              Save Changes
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};
