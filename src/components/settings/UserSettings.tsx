import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Save,
  Camera,
  Bell,
  Globe,
  Palette
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { supabase } from '../../lib/supabase';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  bio?: string;
  avatar_url?: string;
}

interface UserSettingsFormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  bio: string;
}

interface PreferencesFormData {
  theme: 'light' | 'dark' | 'auto';
  language: 'en' | 'hi';
  currency: 'INR' | 'USD';
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  notifications: boolean;
  emailNotifications: boolean;
}

export const UserSettings: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences'>('profile');

  // Form setup
  const profileForm = useForm<UserSettingsFormData>();
  const preferencesForm = useForm<PreferencesFormData>();

  // Load user profile
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get user profile from users table
        const { data: userProfile, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error loading profile:', error);
          return;
        }

        setProfile(userProfile);
        
        // Set form values
        profileForm.setValue('name', userProfile.name || '');
        profileForm.setValue('email', userProfile.email || '');
        profileForm.setValue('phone', userProfile.phone || '');
        profileForm.setValue('address', userProfile.address || '');
        profileForm.setValue('bio', userProfile.bio || '');

        // Set preferences (from localStorage for now)
        const preferences = JSON.parse(localStorage.getItem('user_preferences') || '{}');
        preferencesForm.setValue('theme', preferences.theme || 'dark');
        preferencesForm.setValue('language', preferences.language || 'en');
        preferencesForm.setValue('currency', preferences.currency || 'INR');
        preferencesForm.setValue('dateFormat', preferences.dateFormat || 'DD/MM/YYYY');
        preferencesForm.setValue('notifications', preferences.notifications !== false);
        preferencesForm.setValue('emailNotifications', preferences.emailNotifications !== false);

      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [profileForm, preferencesForm]);

  // Save profile
  const handleSaveProfile = async (data: UserSettingsFormData) => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('users')
        .update({
          name: data.name,
          phone: data.phone || null,
          address: data.address || null,
          bio: data.bio || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) {
        console.error('Error updating profile:', error);
        alert('Error updating profile: ' + error.message);
        return;
      }

      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Error saving profile');
    } finally {
      setIsSaving(false);
    }
  };

  // Save preferences
  const handleSavePreferences = async (data: PreferencesFormData) => {
    setIsSaving(true);
    try {
      // Save preferences to localStorage for now
      localStorage.setItem('user_preferences', JSON.stringify(data));
      
      // Apply theme immediately
      if (data.theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else if (data.theme === 'light') {
        document.documentElement.classList.remove('dark');
      } else {
        // Auto theme - follow system preference
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }

      alert('Preferences saved successfully!');
    } catch (error) {
      console.error('Error saving preferences:', error);
      alert('Error saving preferences');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <User className="w-8 h-8 text-blue-500" />
        <h1 className="text-3xl font-bold font-display text-white text-shadow">User Settings</h1>
      </motion.div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-800/50 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'profile'
              ? 'bg-blue-500 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Profile Information
        </button>
        <button
          onClick={() => setActiveTab('preferences')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'preferences'
              ? 'bg-blue-500 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Preferences
        </button>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <User className="w-6 h-6 text-blue-500" />
              <h2 className="text-xl font-semibold text-white">Profile Information</h2>
            </div>

            <form onSubmit={profileForm.handleSubmit(handleSaveProfile)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Full Name
                  </label>
                  <Input
                    {...profileForm.register('name', { required: 'Name is required' })}
                    placeholder="Enter your full name"
                    className="w-full"
                  />
                  {profileForm.formState.errors.name && (
                    <p className="text-red-400 text-sm mt-1">
                      {profileForm.formState.errors.name.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email Address
                  </label>
                  <Input
                    {...profileForm.register('email')}
                    type="email"
                    placeholder="Enter your email"
                    className="w-full"
                    disabled
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Email cannot be changed. Contact support if needed.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Phone Number
                  </label>
                  <Input
                    {...profileForm.register('phone')}
                    placeholder="Enter your phone number"
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Address
                  </label>
                  <Input
                    {...profileForm.register('address')}
                    placeholder="Enter your address"
                    className="w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Bio
                </label>
                <textarea
                  {...profileForm.register('bio')}
                  placeholder="Tell us about yourself..."
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Saving...' : 'Save Profile'}
                </Button>
              </div>
            </form>
          </Card>
        </motion.div>
      )}

      {/* Preferences Tab */}
      {activeTab === 'preferences' && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <Palette className="w-6 h-6 text-blue-500" />
              <h2 className="text-xl font-semibold text-white">Preferences</h2>
            </div>

            <form onSubmit={preferencesForm.handleSubmit(handleSavePreferences)} className="space-y-6">
              {/* Theme Settings */}
              <div>
                <h3 className="text-lg font-medium text-white mb-4">Appearance</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Theme
                    </label>
                    <Select
                      {...preferencesForm.register('theme')}
                      options={[
                        { value: 'dark', label: 'Dark' },
                        { value: 'light', label: 'Light' },
                        { value: 'auto', label: 'Auto (System)' }
                      ]}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Language
                    </label>
                    <Select
                      {...preferencesForm.register('language')}
                      options={[
                        { value: 'en', label: 'English' },
                        { value: 'hi', label: 'Hindi' }
                      ]}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Format Settings */}
              <div>
                <h3 className="text-lg font-medium text-white mb-4">Format</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Currency
                    </label>
                    <Select
                      {...preferencesForm.register('currency')}
                      options={[
                        { value: 'INR', label: 'Indian Rupee (₹)' },
                        { value: 'USD', label: 'US Dollar ($)' }
                      ]}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Date Format
                    </label>
                    <Select
                      {...preferencesForm.register('dateFormat')}
                      options={[
                        { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
                        { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
                        { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' }
                      ]}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Notification Settings */}
              <div>
                <h3 className="text-lg font-medium text-white mb-4">Notifications</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Bell className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-white font-medium">Push Notifications</p>
                        <p className="text-sm text-gray-400">Receive notifications in the app</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        {...preferencesForm.register('notifications')}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-white font-medium">Email Notifications</p>
                        <p className="text-sm text-gray-400">Receive notifications via email</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        {...preferencesForm.register('emailNotifications')}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Saving...' : 'Save Preferences'}
                </Button>
              </div>
            </form>
          </Card>
        </motion.div>
      )}
    </div>
  );
};
