import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { 
  Shield, 
  Key, 
  Download, 
  Trash2, 
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { supabase } from '../../lib/supabase';
import { AuthService } from '../../services/authService';

interface ChangePasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface DeleteAccountFormData {
  password: string;
  confirmText: string;
}

export const AccountSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'security' | 'data' | 'danger'>('security');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isExportingData, setIsExportingData] = useState(false);

  // Forms
  const passwordForm = useForm<ChangePasswordFormData>();
  const deleteForm = useForm<DeleteAccountFormData>();

  // Change password
  const handleChangePassword = async (data: ChangePasswordFormData) => {
    if (data.newPassword !== data.confirmPassword) {
      alert('New passwords do not match');
      return;
    }

    if (data.newPassword.length < 6) {
      alert('Password must be at least 6 characters long');
      return;
    }

    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: data.newPassword
      });

      if (error) {
        console.error('Error changing password:', error);
        alert('Error changing password: ' + error.message);
        return;
      }

      alert('Password changed successfully!');
      passwordForm.reset();
    } catch (error) {
      console.error('Error changing password:', error);
      alert('Error changing password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Export data
  const handleExportData = async () => {
    setIsExportingData(true);
    try {
      // Get all user data
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get trades
      const { data: trades } = await supabase
        .from('trades')
        .select('*')
        .eq('user_email', user.email);

      // Get merchants
      const { data: merchants } = await supabase
        .from('merchants')
        .select('*')
        .eq('user_email', user.email);

      // Get income
      const { data: income } = await supabase
        .from('income')
        .select('*')
        .eq('user_email', user.email);

      // Get expenses
      const { data: expenses } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_email', user.email);

      // Get stock
      const { data: stock } = await supabase
        .from('stock')
        .select('*')
        .eq('user_email', user.email);

      const exportData = {
        exportDate: new Date().toISOString(),
        user: {
          id: user.id,
          email: user.email,
          createdAt: user.created_at
        },
        data: {
          trades: trades || [],
          merchants: merchants || [],
          income: income || [],
          expenses: expenses || [],
          stock: stock || []
        }
      };

      // Download as JSON file
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `trade-manager-export-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);

      alert('Data exported successfully!');
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Error exporting data');
    } finally {
      setIsExportingData(false);
    }
  };

  // Delete account
  const handleDeleteAccount = async (data: DeleteAccountFormData) => {
    if (data.confirmText !== 'DELETE') {
      alert('Please type DELETE to confirm');
      return;
    }

    setIsDeletingAccount(true);
    try {
      // First, delete all user data
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Delete all user data
      await supabase.from('trades').delete().eq('user_id', user.id);
      await supabase.from('merchants').delete().eq('user_id', user.id);
      await supabase.from('income').delete().eq('user_id', user.id);
      await supabase.from('expenses').delete().eq('user_id', user.id);
      await supabase.from('stock').delete().eq('user_id', user.id);
      await supabase.from('users').delete().eq('id', user.id);

      // Sign out and redirect to login
      await supabase.auth.signOut();
      window.location.href = '/login';
    } catch (error) {
      console.error('Error deleting account:', error);
      alert('Error deleting account');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <Shield className="w-8 h-8 text-blue-500" />
        <h1 className="text-3xl font-bold font-display text-white text-shadow">Account Settings</h1>
      </motion.div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-800/50 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('security')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'security'
              ? 'bg-blue-500 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Security
        </button>
        <button
          onClick={() => setActiveTab('data')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'data'
              ? 'bg-blue-500 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Data Management
        </button>
        <button
          onClick={() => setActiveTab('danger')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'danger'
              ? 'bg-red-500 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Danger Zone
        </button>
      </div>

      {/* Security Tab */}
      {activeTab === 'security' && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <Key className="w-6 h-6 text-blue-500" />
              <h2 className="text-xl font-semibold text-white">Change Password</h2>
            </div>

            <form onSubmit={passwordForm.handleSubmit(handleChangePassword)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Current Password
                </label>
                <div className="relative">
                  <Input
                    {...passwordForm.register('currentPassword', { required: 'Current password is required' })}
                    type={showCurrentPassword ? 'text' : 'password'}
                    placeholder="Enter current password"
                    className="w-full pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordForm.formState.errors.currentPassword && (
                  <p className="text-red-400 text-sm mt-1">
                    {passwordForm.formState.errors.currentPassword.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <Input
                    {...passwordForm.register('newPassword', { 
                      required: 'New password is required',
                      minLength: { value: 6, message: 'Password must be at least 6 characters' }
                    })}
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="Enter new password"
                    className="w-full pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordForm.formState.errors.newPassword && (
                  <p className="text-red-400 text-sm mt-1">
                    {passwordForm.formState.errors.newPassword.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Input
                    {...passwordForm.register('confirmPassword', { required: 'Please confirm your password' })}
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm new password"
                    className="w-full pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordForm.formState.errors.confirmPassword && (
                  <p className="text-red-400 text-sm mt-1">
                    {passwordForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  type="submit"
                  disabled={isChangingPassword}
                  className="flex items-center gap-2"
                >
                  <Key className="w-4 h-4" />
                  {isChangingPassword ? 'Changing...' : 'Change Password'}
                </Button>
              </div>
            </form>
          </Card>
        </motion.div>
      )}

      {/* Data Management Tab */}
      {activeTab === 'data' && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <Download className="w-6 h-6 text-blue-500" />
              <h2 className="text-xl font-semibold text-white">Data Management</h2>
            </div>

            <div className="space-y-6">
              <div className="bg-gray-800/50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-white">Export Data</h3>
                    <p className="text-sm text-gray-400 mt-1">
                      Download all your data as a JSON file for backup or migration
                    </p>
                  </div>
                  <Button
                    onClick={handleExportData}
                    disabled={isExportingData}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    {isExportingData ? 'Exporting...' : 'Export Data'}
                  </Button>
                </div>
              </div>

              <div className="bg-gray-800/50 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <h3 className="text-lg font-medium text-white">Data Security</h3>
                </div>
                <p className="text-sm text-gray-400">
                  Your data is encrypted and stored securely in Supabase. We use industry-standard 
                  security practices to protect your information.
                </p>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Danger Zone Tab */}
      {activeTab === 'danger' && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="p-6 border-red-500/20">
            <div className="flex items-center gap-3 mb-6">
              <AlertTriangle className="w-6 h-6 text-red-500" />
              <h2 className="text-xl font-semibold text-white">Danger Zone</h2>
            </div>

            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-red-400">Delete Account</h3>
                  <p className="text-sm text-red-300 mt-1">
                    Permanently delete your account and all associated data. This action cannot be undone.
                  </p>
                </div>
                <Button
                  onClick={() => setShowDeleteModal(true)}
                  variant="outline"
                  className="border-red-500 text-red-400 hover:bg-red-500 hover:text-white flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Account
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Delete Account Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Account"
      >
        <div className="space-y-4">
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <h3 className="text-lg font-medium text-red-400">Warning</h3>
            </div>
            <p className="text-sm text-red-300">
              This action will permanently delete your account and all associated data including:
            </p>
            <ul className="text-sm text-red-300 mt-2 ml-4 list-disc">
              <li>All trades and transaction history</li>
              <li>All merchants and customer data</li>
              <li>All income and expense records</li>
              <li>All stock and inventory data</li>
              <li>Your user profile and settings</li>
            </ul>
            <p className="text-sm text-red-300 mt-2 font-medium">
              This action cannot be undone!
            </p>
          </div>

          <form onSubmit={deleteForm.handleSubmit(handleDeleteAccount)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Type DELETE to confirm
              </label>
              <Input
                {...deleteForm.register('confirmText', { 
                  required: 'Please type DELETE to confirm',
                  validate: (value) => value === 'DELETE' || 'Please type DELETE exactly'
                })}
                placeholder="Type DELETE"
                className="w-full"
              />
              {deleteForm.formState.errors.confirmText && (
                <p className="text-red-400 text-sm mt-1">
                  {deleteForm.formState.errors.confirmText.message}
                </p>
              )}
            </div>

            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDeleteModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isDeletingAccount}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                {isDeletingAccount ? 'Deleting...' : 'Delete Account'}
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
};
