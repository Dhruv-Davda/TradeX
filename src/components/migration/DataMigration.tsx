import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Database, Upload, CheckCircle, AlertCircle, Download } from 'lucide-react';
import { TradeService } from '../../services/tradeService';
import { storage, STORAGE_KEYS } from '../../utils/storage';
import { Trade } from '../../types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

export const DataMigration: React.FC = () => {
  const [localTrades, setLocalTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<'idle' | 'migrating' | 'completed' | 'error'>('idle');
  const [migrationResult, setMigrationResult] = useState<{ migrated: number; errors: string[] } | null>(null);
  const [showDebugInfo, setShowDebugInfo] = useState(false);

  useEffect(() => {
    // Load trades from localStorage
    const trades = storage.get<Trade[]>(STORAGE_KEYS.TRADES) || [];
    setLocalTrades(trades);
  }, []);

  const handleMigration = async () => {
    if (localTrades.length === 0) {
      setMigrationStatus('error');
      setMigrationResult({ migrated: 0, errors: ['No trades to migrate'] });
      return;
    }

    setIsLoading(true);
    setMigrationStatus('migrating');
    setMigrationResult(null);

    try {
      console.log('🔄 Starting migration of', localTrades.length, 'trades...');
      
      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Migration timed out after 30 seconds')), 30000);
      });
      
      const migrationPromise = TradeService.migrateTradesFromLocalStorage(localTrades);
      const result = await Promise.race([migrationPromise, timeoutPromise]) as any;
      
      console.log('✅ Migration completed:', result);
      setMigrationResult(result);
      
      if (result.errors.length === 0) {
        setMigrationStatus('completed');
        // Clear localStorage after successful migration
        storage.remove(STORAGE_KEYS.TRADES);
        setLocalTrades([]);
      } else {
        setMigrationStatus('error');
      }
    } catch (error) {
      console.error('❌ Migration error:', error);
      setMigrationStatus('error');
      setMigrationResult({ 
        migrated: 0, 
        errors: [`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`] 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const downloadBackup = () => {
    const dataStr = JSON.stringify(localTrades, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `trade-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (localTrades.length === 0 && migrationStatus === 'idle') {
    return (
      <div className="p-6">
        <Card className="p-6 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">No Data to Migrate</h2>
          <p className="text-gray-400">
            You don't have any trades stored locally. All your data is already in the cloud!
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Database className="w-8 h-8 text-blue-500" />
            <h2 className="text-2xl font-bold text-white">Data Migration</h2>
          </div>
          
          <p className="text-gray-400 mb-6">
            Migrate your existing trades from local storage to the cloud database. This will ensure your data is backed up and accessible from anywhere.
          </p>

          <div className="bg-gray-800 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-white mb-3">Migration Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">{localTrades.length}</div>
                <div className="text-sm text-gray-400">Trades to Migrate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">
                  {migrationResult?.migrated || 0}
                </div>
                <div className="text-sm text-gray-400">Successfully Migrated</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-400">
                  {migrationResult?.errors.length || 0}
                </div>
                <div className="text-sm text-gray-400">Errors</div>
              </div>
            </div>
          </div>

          {migrationStatus === 'idle' && (
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                onClick={handleMigration}
                className="flex-1"
                icon={<Upload className="w-4 h-4" />}
              >
                Start Migration
              </Button>
              <Button
                variant="outline"
                onClick={downloadBackup}
                className="flex-1"
                icon={<Download className="w-4 h-4" />}
              >
                Download Backup
              </Button>
            </div>
          )}

          {migrationStatus === 'migrating' && (
            <div className="text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"
              />
              <p className="text-gray-400">Migrating your trades to the cloud...</p>
            </div>
          )}

          {migrationStatus === 'completed' && (
            <div className="text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Migration Completed!</h3>
              <p className="text-gray-400 mb-4">
                All {migrationResult?.migrated} trades have been successfully migrated to the cloud.
              </p>
              <p className="text-sm text-gray-500">
                Your local data has been cleared and is now safely stored in the database.
              </p>
            </div>
          )}

          {migrationStatus === 'error' && migrationResult && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-red-500" />
                <h3 className="text-lg font-semibold text-white">Migration Issues</h3>
              </div>
              
              {migrationResult.migrated > 0 && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                  <p className="text-green-400">
                    ✅ {migrationResult.migrated} trades migrated successfully
                  </p>
                </div>
              )}

              {migrationResult.errors.length > 0 && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  <p className="text-red-400 mb-2">⚠️ {migrationResult.errors.length} trades had issues:</p>
                  <ul className="text-sm text-red-300 space-y-1 max-h-40 overflow-y-auto">
                    {migrationResult.errors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                  <p className="text-xs text-gray-400 mt-2">
                    Invalid trades were skipped to prevent data corruption. You can review them in your backup.
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <Button
                  onClick={handleMigration}
                  variant="outline"
                  className="w-full"
                >
                  Retry Migration
                </Button>
                
                <Button
                  onClick={() => setShowDebugInfo(!showDebugInfo)}
                  variant="outline"
                  className="w-full"
                >
                  {showDebugInfo ? 'Hide' : 'Show'} Debug Info
                </Button>
              </div>
            </div>
          )}
        </Card>

        {localTrades.length > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Local Trades Preview</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {localTrades.slice(0, 10).map((trade) => (
                <div key={trade.id} className="flex justify-between items-center p-2 bg-gray-800 rounded">
                  <div>
                    <span className="text-white font-medium">{trade.type.toUpperCase()}</span>
                    <span className="text-gray-400 ml-2">{trade.metalType}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-white">{trade.quantity || 0}g</div>
                    <div className="text-sm text-gray-400">₹{trade.amount || 0}</div>
                  </div>
                </div>
              ))}
              {localTrades.length > 10 && (
                <div className="text-center text-gray-400 text-sm">
                  ... and {localTrades.length - 10} more trades
                </div>
              )}
            </div>
          </Card>
        )}

        {showDebugInfo && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Debug Information</h3>
            <div className="space-y-4">
              <div>
                <h4 className="text-md font-medium text-white mb-2">Trade Data Analysis</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-400">Total Trades:</div>
                    <div className="text-white font-medium">{localTrades.length}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Trades with null quantity:</div>
                    <div className="text-white font-medium">
                      {localTrades.filter(t => t.quantity === null || t.quantity === undefined).length}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400">Trades with null amount:</div>
                    <div className="text-white font-medium">
                      {localTrades.filter(t => t.amount === null || t.amount === undefined).length}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400">Trades with null rate:</div>
                    <div className="text-white font-medium">
                      {localTrades.filter(t => t.rate === null || t.rate === undefined).length}
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="text-md font-medium text-white mb-2">Sample Problematic Trade</h4>
                <div className="bg-gray-800 rounded p-3 text-sm">
                  <pre className="text-gray-300">
                    {JSON.stringify(
                      localTrades.find(t => 
                        t.quantity === null || t.quantity === undefined || 
                        t.amount === null || t.amount === undefined
                      ), 
                      null, 
                      2
                    )}
                  </pre>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};
