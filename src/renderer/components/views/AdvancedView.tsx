import { useState, useEffect } from 'react';
import { useWindowResize, useRateLimit } from '../../hooks';
import './AdvancedView.css';

export default function AdvancedView() {
  const { resizeForCurrentView } = useWindowResize();
  const {
    throttleTokens,
    setThrottleTokens,
    maxTokensPerMin,
    setMaxTokensPerMin,
    throttleAtPercent,
    setThrottleAtPercent,
    resetToDefaults,
  } = useRateLimit();

  const [isClearing, setIsClearing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState<'success' | 'error' | ''>('');

  useEffect(() => {
    resizeForCurrentView();
  }, [resizeForCurrentView]);

  const clearLocalData = async () => {
    if (isClearing) return;

    setIsClearing(true);
    setStatusMessage('');
    setStatusType('');

    try {
      // Clear localStorage and sessionStorage
      localStorage.clear();
      sessionStorage.clear();

      // Clear IndexedDB databases
      const databases = await indexedDB.databases();
      const clearPromises = databases.map(db => {
        return new Promise<void>((resolve, reject) => {
          if (!db.name) return resolve();
          const deleteReq = indexedDB.deleteDatabase(db.name);
          deleteReq.onsuccess = () => resolve();
          deleteReq.onerror = () => reject(deleteReq.error);
          deleteReq.onblocked = () => {
            console.warn(`Deletion of database ${db.name} was blocked`);
            resolve(); // Continue anyway
          };
        });
      });
      await Promise.all(clearPromises);

      // Clear caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      setStatusMessage(`✅ Successfully cleared all local data (${databases.length} databases, localStorage, sessionStorage, and caches).`);
      setStatusType('success');

      // Notify user that app will close
      setTimeout(() => {
        setStatusMessage('🔄 Closing application...');
        setTimeout(async () => {
          // Close the entire application via IPC
          if (window.electronAPI) {
            await window.electronAPI.invoke.quitApplication();
          }
        }, 1000);
      }, 2000);
    } catch (error) {
      console.error('Error clearing data:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      setStatusMessage(`❌ Error clearing data: ${errorMessage}`);
      setStatusType('error');
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="advanced-view">
      <div className="advanced-container">
        {/* Rate Limiting Section */}
        <div className="advanced-section">
          <div className="section-title">
            <span>⏱️ Rate Limiting</span>
          </div>
          <div className="rate-limit-warning">
            <span className="rate-limit-warning-icon">⚠️</span>
            <span>
              <strong>Warning:</strong> Don't mess with these settings if you don't know what this is about. Incorrect rate limiting settings may cause the application to stop working properly or hit API limits unexpectedly.
            </span>
          </div>
          <div className="form-grid">
            <div className="checkbox-group">
              <input
                type="checkbox"
                className="checkbox-input"
                id="throttle-tokens"
                checked={throttleTokens}
                onChange={(e) => setThrottleTokens(e.target.checked)}
              />
              <label htmlFor="throttle-tokens" className="checkbox-label">
                Throttle tokens when close to rate limit
              </label>
            </div>
            <div className={`rate-limit-controls ${throttleTokens ? 'enabled' : ''}`}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Max Allowed Tokens Per Minute</label>
                  <input
                    type="number"
                    className="form-control"
                    value={maxTokensPerMin}
                    min="1000"
                    max="10000000"
                    step="1000"
                    onChange={(e) => setMaxTokensPerMin(parseInt(e.target.value, 10))}
                    disabled={!throttleTokens}
                  />
                  <div className="form-description">Maximum number of tokens allowed per minute before throttling kicks in</div>
                </div>
                <div className="form-group">
                  <label className="form-label">Throttle At Percent</label>
                  <input
                    type="number"
                    className="form-control"
                    value={throttleAtPercent}
                    min="1"
                    max="99"
                    step="1"
                    onChange={(e) => setThrottleAtPercent(parseInt(e.target.value, 10))}
                    disabled={!throttleTokens}
                  />
                  <div className="form-description">
                    Start throttling when this percentage of the limit is reached ({throttleAtPercent}% = {Math.floor((maxTokensPerMin * throttleAtPercent) / 100)} tokens)
                  </div>
                </div>
              </div>
              <div className="rate-limit-reset">
                <button className="action-button" onClick={resetToDefaults} disabled={!throttleTokens}>
                  Reset to Defaults
                </button>
                <div className="form-description" style={{ marginTop: '8px' }}>Reset rate limiting settings to default values</div>
              </div>
            </div>
          </div>
        </div>

        {/* Data Management Section */}
        <div className="advanced-section danger-section">
          <div className="section-title danger">
            <span>🗑️ Data Management</span>
          </div>
          <div className="danger-box">
            <span className="danger-icon">⚠️</span>
            <span><strong>Important:</strong> This action will permanently delete all local data and cannot be undone.</span>
          </div>
          <div>
            <button className="action-button danger-button" onClick={clearLocalData} disabled={isClearing}>
              {isClearing ? '🔄 Clearing...' : '🗑️ Clear All Local Data'}
            </button>
            {statusMessage && (
              <div className={`status-message ${statusType === 'success' ? 'status-success' : 'status-error'}`}>
                {statusMessage}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}