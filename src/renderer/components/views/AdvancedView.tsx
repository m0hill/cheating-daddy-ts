import clsx from 'clsx'
import { AlertTriangle, CheckCircle2, LoaderCircle, Timer, Trash2, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useRateLimit, useWindowResize } from '../../hooks'

const AdvancedView = () => {
  const { resizeForCurrentView } = useWindowResize()
  const {
    throttleTokens,
    setThrottleTokens,
    maxTokensPerMin,
    setMaxTokensPerMin,
    throttleAtPercent,
    setThrottleAtPercent,
    resetToDefaults,
  } = useRateLimit()

  const [isClearing, setIsClearing] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [statusType, setStatusType] = useState<'success' | 'error' | ''>('')

  useEffect(() => {
    resizeForCurrentView()
  }, [resizeForCurrentView])

  const clearLocalData = async () => {
    if (isClearing) return

    setIsClearing(true)
    setStatusMessage('')
    setStatusType('')

    try {
      // Clear localStorage and sessionStorage
      localStorage.clear()
      sessionStorage.clear()

      // Clear IndexedDB databases
      const databases = await indexedDB.databases()
      const clearPromises = databases.map(db => {
        return new Promise<void>((resolve, reject) => {
          if (!db.name) return resolve()
          const deleteReq = indexedDB.deleteDatabase(db.name)
          deleteReq.onsuccess = () => resolve()
          deleteReq.onerror = () => reject(deleteReq.error)
          deleteReq.onblocked = () => {
            console.warn(`Deletion of database ${db.name} was blocked`)
            resolve() // Continue anyway
          }
        })
      })
      await Promise.all(clearPromises)

      // Clear caches
      if ('caches' in window) {
        const cacheNames = await caches.keys()
        await Promise.all(cacheNames.map(name => caches.delete(name)))
      }

      setStatusMessage(
        `Successfully cleared all local data (${databases.length} databases, localStorage, sessionStorage, and caches).`
      )
      setStatusType('success')

      // Notify user that app will close
      setTimeout(() => {
        setStatusMessage('Closing application...')
        setTimeout(async () => {
          // Close the entire application via IPC
          if (window.electronAPI) {
            await window.electronAPI.invoke.quitApplication()
          }
        }, 1000)
      }, 2000)
    } catch (error) {
      console.error('Error clearing data:', error)
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.'
      setStatusMessage(`Error clearing data: ${errorMessage}`)
      setStatusType('error')
    } finally {
      setIsClearing(false)
    }
  }

  const Section = ({
    title,
    titleIcon,
    isDanger,
    children,
  }: {
    title: string
    titleIcon: React.ReactNode
    isDanger?: boolean
    children: React.ReactNode
  }) => (
    <div
      className={clsx(
        'rounded-md border p-4 backdrop-blur-sm',
        isDanger
          ? 'border-[--danger-border] bg-[--danger-background]'
          : 'border-[--card-border] bg-[--card-background]'
      )}
    >
      <div
        className={clsx(
          'mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider',
          isDanger ? 'text-[--danger-color]' : 'text-[--text-color]'
        )}
      >
        <span
          className={clsx(
            'h-[14px] w-[3px] rounded-full',
            isDanger ? 'bg-[--danger-color]' : 'bg-[--accent-color]'
          )}
        ></span>
        {titleIcon}
        <span>{title}</span>
      </div>
      {children}
    </div>
  )

  const actionButtonClasses =
    'flex w-fit cursor-pointer items-center gap-1.5 rounded border border-[--button-border] bg-[--button-background] px-3 py-2 text-xs font-medium text-[--text-color] transition-all duration-150 ease-in-out hover:border-[--button-hover-border] hover:bg-[--button-hover-background] active:translate-y-px disabled:opacity-50'
  const formControlClasses =
    'min-h-[16px] rounded border border-[--input-border] bg-[--input-background] p-2 text-xs font-normal text-[--text-color] transition-all duration-150 ease-in-out focus:border-[--focus-border-color] focus:bg-[--input-focus-background] focus:shadow-[0_0_0_2px_var(--focus-shadow)] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed'

  return (
    <div className="select-none p-3 font-sans">
      <div className="grid gap-3 pb-5">
        <Section title="Rate Limiting" titleIcon={<Timer size={16} />}>
          <div className="mb-4 flex items-start gap-2 rounded-md border border-[rgba(251,191,36,0.2)] bg-[rgba(251,191,36,0.08)] p-3 text-xs leading-snug text-[#fbbf24]">
            <AlertTriangle size={14} className="mt-px shrink-0" />
            <span>
              <strong>Warning:</strong> Don't mess with these settings if you don't know what this
              is about. Incorrect settings may cause the application to stop working properly.
            </span>
          </div>

          <div className="grid gap-3">
            <div className="flex items-center gap-2 rounded border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-2">
              <input
                type="checkbox"
                id="throttle-tokens"
                checked={throttleTokens}
                onChange={e => setThrottleTokens(e.target.checked)}
                className="h-3.5 w-3.5 cursor-pointer accent-[--focus-border-color]"
              />
              <label
                htmlFor="throttle-tokens"
                className="cursor-pointer text-xs font-medium text-[--label-color]"
              >
                Throttle tokens when close to rate limit
              </label>
            </div>

            <div
              className={clsx(
                'grid grid-cols-2 gap-3 pl-5 transition-opacity',
                throttleTokens ? 'opacity-100' : 'opacity-50'
              )}
            >
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[--label-color]">Max Tokens/Min</label>
                <input
                  type="number"
                  className={formControlClasses}
                  value={maxTokensPerMin}
                  min="1000"
                  max="10000000"
                  step="1000"
                  onChange={e => setMaxTokensPerMin(parseInt(e.target.value, 10))}
                  disabled={!throttleTokens}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[--label-color]">Throttle At %</label>
                <input
                  type="number"
                  className={formControlClasses}
                  value={throttleAtPercent}
                  min="1"
                  max="99"
                  step="1"
                  onChange={e => setThrottleAtPercent(parseInt(e.target.value, 10))}
                  disabled={!throttleTokens}
                />
              </div>
            </div>

            <div className="mt-2.5 border-t border-[rgba(255,255,255,0.08)] pt-2.5 pl-5">
              <button
                className={actionButtonClasses}
                onClick={resetToDefaults}
                disabled={!throttleTokens}
              >
                Reset to Defaults
              </button>
            </div>
          </div>
        </Section>

        <Section title="Data Management" titleIcon={<Trash2 size={16} />} isDanger>
          <div className="mb-4 flex items-start gap-2 rounded-md border border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.08)] p-3 text-xs leading-snug text-[#ef4444]">
            <AlertTriangle size={14} className="mt-px shrink-0" />
            <span>
              <strong>Important:</strong> This action will permanently delete all local data and
              cannot be undone.
            </span>
          </div>
          <div>
            <button
              className={`${actionButtonClasses} border-[--danger-border] bg-[rgba(239,68,68,0.1)] text-[--danger-color] hover:border-[rgba(239,68,68,0.4)] hover:bg-[rgba(239,68,68,0.15)]`}
              onClick={clearLocalData}
              disabled={isClearing}
            >
              {isClearing ? (
                <>
                  <LoaderCircle size={14} className="animate-spin" /> Clearing...
                </>
              ) : (
                <>
                  <Trash2 size={14} /> Clear All Local Data
                </>
              )}
            </button>

            {statusMessage && (
              <div
                className={clsx(
                  'mt-3 flex items-center gap-2 rounded-md border p-2 text-xs font-medium',
                  statusType === 'success' &&
                    'border-[rgba(34,197,94,0.2)] bg-[rgba(34,197,94,0.1)] text-[#22c55e]',
                  statusType === 'error' &&
                    'border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.1)] text-[#ef4444]'
                )}
              >
                {statusType === 'success' && <CheckCircle2 size={14} />}
                {statusType === 'error' && <XCircle size={14} />}
                {isClearing && statusType !== 'error' && (
                  <LoaderCircle size={14} className="animate-spin" />
                )}
                <span>{statusMessage}</span>
              </div>
            )}
          </div>
        </Section>
      </div>
    </div>
  )
}

export default AdvancedView
