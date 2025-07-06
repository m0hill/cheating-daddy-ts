import { Github } from 'lucide-react'
import { useEffect } from 'react'
import { useIpc, useKeybinds, useWindowResize } from '../../hooks'

export default function HelpView() {
  const electronAPI = useIpc()
  const { resizeForCurrentView } = useWindowResize()
  const { keybinds } = useKeybinds()

  useEffect(() => {
    resizeForCurrentView()
  }, [resizeForCurrentView])

  const handleExternalLinkClick = async (url: string) => {
    try {
      await electronAPI.invoke.openExternal(url)
    } catch (error) {
      console.error('Error opening external URL:', error)
    }
  }

  const formatKeybind = (keybind: string) => {
    return keybind.split('+').map((key, index) => (
      <span
        key={index}
        className="mx-px inline-block whitespace-nowrap rounded border px-1.5 py-0.5 font-mono text-xs font-medium border-[--key-border] bg-[--key-background] text-[--text-color]"
      >
        {key}
      </span>
    ))
  }

  const OptionGroup = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="rounded-md border border-[--card-border] bg-[--card-background] p-4 backdrop-blur-sm">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[--text-color]">
        <span className="h-[14px] w-[3px] rounded-full bg-[--accent-color]"></span>
        <span>{title}</span>
      </div>
      {children}
    </div>
  )

  return (
    <div className="select-none p-3 font-sans">
      <div className="grid gap-3 pb-5">
        <OptionGroup title="Community & Support">
          <div className="flex flex-wrap gap-3">
            <div
              className="flex cursor-pointer items-center gap-1.5 rounded border border-[--input-border] bg-[--input-background] px-2.5 py-1.5 text-xs font-medium text-[--link-color] transition-all hover:border-[--link-color] hover:bg-[--input-hover-background]"
              onClick={() => handleExternalLinkClick('https://github.com/m0hill/hope')}
            >
              <Github size={14} /> GitHub Repository
            </div>
          </div>
        </OptionGroup>

        <OptionGroup title="Keyboard Shortcuts">
          <div className="mt-2 grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3">
            {/* Window Movement */}
            <div className="rounded border border-[--input-border] bg-[--input-background] p-2.5">
              <div className="mb-1.5 border-b-0 pb-0.5 text-xs font-semibold text-[--text-color]">
                Window Movement
              </div>
              <div className="flex items-center justify-between py-0.5 text-xs">
                <span className="text-[--description-color]">Move window up</span>
                <div className="flex gap-0.5">{formatKeybind(keybinds.moveUp)}</div>
              </div>
              <div className="flex items-center justify-between py-0.5 text-xs">
                <span className="text-[--description-color]">Move window down</span>
                <div className="flex gap-0.5">{formatKeybind(keybinds.moveDown)}</div>
              </div>
              <div className="flex items-center justify-between py-0.5 text-xs">
                <span className="text-[--description-color]">Move window left</span>
                <div className="flex gap-0.5">{formatKeybind(keybinds.moveLeft)}</div>
              </div>
              <div className="flex items-center justify-between py-0.5 text-xs">
                <span className="text-[--description-color]">Move window right</span>
                <div className="flex gap-0.5">{formatKeybind(keybinds.moveRight)}</div>
              </div>
            </div>
            {/* Window Control */}
            <div className="rounded border border-[--input-border] bg-[--input-background] p-2.5">
              <div className="mb-1.5 border-b-0 pb-0.5 text-xs font-semibold text-[--text-color]">
                Window Control
              </div>
              <div className="flex items-center justify-between py-0.5 text-xs">
                <span className="text-[--description-color]">Toggle click-through mode</span>
                <div className="flex gap-0.5">{formatKeybind(keybinds.toggleClickThrough)}</div>
              </div>
              <div className="flex items-center justify-between py-0.5 text-xs">
                <span className="text-[--description-color]">Toggle window visibility</span>
                <div className="flex gap-0.5">{formatKeybind(keybinds.toggleVisibility)}</div>
              </div>
            </div>
            {/* AI Actions */}
            <div className="rounded border border-[--input-border] bg-[--input-background] p-2.5">
              <div className="mb-1.5 border-b-0 pb-0.5 text-xs font-semibold text-[--text-color]">
                AI Actions
              </div>
              <div className="flex items-center justify-between py-0.5 text-xs">
                <span className="text-[--description-color]">Ask for next step</span>
                <div className="flex gap-0.5">{formatKeybind(keybinds.nextStep)}</div>
              </div>
            </div>
            {/* Response Navigation */}
            <div className="rounded border border-[--input-border] bg-[--input-background] p-2.5">
              <div className="mb-1.5 border-b-0 pb-0.5 text-xs font-semibold text-[--text-color]">
                Response Navigation
              </div>
              <div className="flex items-center justify-between py-0.5 text-xs">
                <span className="text-[--description-color]">Previous response</span>
                <div className="flex gap-0.5">{formatKeybind(keybinds.previousResponse)}</div>
              </div>
              <div className="flex items-center justify-between py-0.5 text-xs">
                <span className="text-[--description-color]">Next response</span>
                <div className="flex gap-0.5">{formatKeybind(keybinds.nextResponse)}</div>
              </div>
              <div className="flex items-center justify-between py-0.5 text-xs">
                <span className="text-[--description-color]">Scroll response up</span>
                <div className="flex gap-0.5">{formatKeybind(keybinds.scrollUp)}</div>
              </div>
              <div className="flex items-center justify-between py-0.5 text-xs">
                <span className="text-[--description-color]">Scroll response down</span>
                <div className="flex gap-0.5">{formatKeybind(keybinds.scrollDown)}</div>
              </div>
            </div>
          </div>
          <div className="mt-3 text-center text-xs italic text-[--description-color]">
            💡 You can customize these shortcuts in the Settings page!
          </div>
        </OptionGroup>

        <OptionGroup title="How to Use">
          <div className="usage-steps text-[--description-color]">
            <div className="usage-step">
              <strong className="font-medium text-[--text-color]">Start a Session:</strong> Enter
              your Gemini API key and click "Start Session"
            </div>
            <div className="usage-step">
              <strong className="font-medium text-[--text-color]">Customize:</strong> Choose your
              profile and language in the settings
            </div>
            <div className="usage-step">
              <strong className="font-medium text-[--text-color]">Position Window:</strong> Use
              keyboard shortcuts to move the window
            </div>
            <div className="usage-step">
              <strong className="font-medium text-[--text-color]">Click-through Mode:</strong> Use{' '}
              {formatKeybind(keybinds.toggleClickThrough)} to make the window click-through
            </div>
            <div className="usage-step">
              <strong className="font-medium text-[--text-color]">Get AI Help:</strong> The AI will
              analyze your screen and audio to provide assistance
            </div>
            <div className="usage-step">
              <strong className="font-medium text-[--text-color]">Text Messages:</strong> Type
              questions or requests to the AI using the text input
            </div>
            <div className="usage-step">
              <strong className="font-medium text-[--text-color]">Navigate Responses:</strong> Use{' '}
              {formatKeybind(keybinds.previousResponse)} and {formatKeybind(keybinds.nextResponse)}{' '}
              to browse through responses
            </div>
          </div>
        </OptionGroup>

        <OptionGroup title="Supported Profiles">
          <div className="mt-2 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-2.5">
            <div className="rounded border border-[--input-border] bg-[--input-background] p-2">
              <div className="mb-1 text-xs font-semibold text-[--text-color]">Job Interview</div>
              <div className="text-[10px] leading-tight text-[--description-color]">
                Get help with interview questions and responses
              </div>
            </div>
            <div className="rounded border border-[--input-border] bg-[--input-background] p-2">
              <div className="mb-1 text-xs font-semibold text-[--text-color]">Sales Call</div>
              <div className="text-[10px] leading-tight text-[--description-color]">
                Assistance with sales conversations and objection handling
              </div>
            </div>
            <div className="rounded border border-[--input-border] bg-[--input-background] p-2">
              <div className="mb-1 text-xs font-semibold text-[--text-color]">Business Meeting</div>
              <div className="text-[10px] leading-tight text-[--description-color]">
                Support for professional meetings and discussions
              </div>
            </div>
            <div className="rounded border border-[--input-border] bg-[--input-background] p-2">
              <div className="mb-1 text-xs font-semibold text-[--text-color]">Presentation</div>
              <div className="text-[10px] leading-tight text-[--description-color]">
                Help with presentations and public speaking
              </div>
            </div>
            <div className="rounded border border-[--input-border] bg-[--input-background] p-2">
              <div className="mb-1 text-xs font-semibold text-[--text-color]">Negotiation</div>
              <div className="text-[10px] leading-tight text-[--description-color]">
                Guidance for business negotiations and deals
              </div>
            </div>
          </div>
        </OptionGroup>
      </div>
    </div>
  )
}
