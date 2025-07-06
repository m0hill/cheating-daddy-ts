import { useEffect } from 'react';
import { useIpc, useWindowResize, useKeybinds } from '../../hooks';
import './HelpView.css';

export default function HelpView() {
  const electronAPI = useIpc();
  const { resizeForCurrentView } = useWindowResize();
  const { keybinds } = useKeybinds();

  // Resize window when component mounts
  useEffect(() => {
    resizeForCurrentView();
  }, [resizeForCurrentView]);

  const handleExternalLinkClick = async (url: string) => {
    try {
      await electronAPI.invoke.openExternal(url);
    } catch (error) {
      console.error('Error opening external URL:', error);
    }
  };

  const formatKeybind = (keybind: string) => {
    return keybind.split('+').map((key, index) => (
      <span key={index} className="key">
        {key}
      </span>
    ));
  };

  return (
    <div className="help-view">
      <div className="help-container">
        {/* Community & Support */}
        <div className="option-group">
          <div className="option-label">
            <span>Community & Support</span>
          </div>
          <div className="community-links">
            <div
              className="community-link"
              onClick={() => handleExternalLinkClick('https://cheatingdaddy.com')}
            >
              🌐 Official Website
            </div>
            <div
              className="community-link"
              onClick={() => handleExternalLinkClick('https://github.com/sohzm/cheating-daddy')}
            >
              📂 GitHub Repository
            </div>
            <div
              className="community-link"
              onClick={() => handleExternalLinkClick('https://discord.gg/GCBdubnXfJ')}
            >
              💬 Discord Community
            </div>
          </div>
        </div>

        {/* Keyboard Shortcuts */}
        <div className="option-group">
          <div className="option-label">
            <span>Keyboard Shortcuts</span>
          </div>
          <div className="keyboard-section">
            <div className="keyboard-group">
              <div className="keyboard-group-title">Window Movement</div>
              <div className="shortcut-item">
                <span className="shortcut-description">Move window up</span>
                <div className="shortcut-keys">{formatKeybind(keybinds.moveUp)}</div>
              </div>
              <div className="shortcut-item">
                <span className="shortcut-description">Move window down</span>
                <div className="shortcut-keys">{formatKeybind(keybinds.moveDown)}</div>
              </div>
              <div className="shortcut-item">
                <span className="shortcut-description">Move window left</span>
                <div className="shortcut-keys">{formatKeybind(keybinds.moveLeft)}</div>
              </div>
              <div className="shortcut-item">
                <span className="shortcut-description">Move window right</span>
                <div className="shortcut-keys">{formatKeybind(keybinds.moveRight)}</div>
              </div>
            </div>

            <div className="keyboard-group">
              <div className="keyboard-group-title">Window Control</div>
              <div className="shortcut-item">
                <span className="shortcut-description">Toggle click-through mode</span>
                <div className="shortcut-keys">{formatKeybind(keybinds.toggleClickThrough)}</div>
              </div>
              <div className="shortcut-item">
                <span className="shortcut-description">Toggle window visibility</span>
                <div className="shortcut-keys">{formatKeybind(keybinds.toggleVisibility)}</div>
              </div>
            </div>

            <div className="keyboard-group">
              <div className="keyboard-group-title">AI Actions</div>
              <div className="shortcut-item">
                <span className="shortcut-description">Take screenshot and ask for next step</span>
                <div className="shortcut-keys">{formatKeybind(keybinds.nextStep)}</div>
              </div>
            </div>

            <div className="keyboard-group">
              <div className="keyboard-group-title">Response Navigation</div>
              <div className="shortcut-item">
                <span className="shortcut-description">Previous response</span>
                <div className="shortcut-keys">{formatKeybind(keybinds.previousResponse)}</div>
              </div>
              <div className="shortcut-item">
                <span className="shortcut-description">Next response</span>
                <div className="shortcut-keys">{formatKeybind(keybinds.nextResponse)}</div>
              </div>
              <div className="shortcut-item">
                <span className="shortcut-description">Scroll response up</span>
                <div className="shortcut-keys">{formatKeybind(keybinds.scrollUp)}</div>
              </div>
              <div className="shortcut-item">
                <span className="shortcut-description">Scroll response down</span>
                <div className="shortcut-keys">{formatKeybind(keybinds.scrollDown)}</div>
              </div>
            </div>

            <div className="keyboard-group">
              <div className="keyboard-group-title">Text Input</div>
              <div className="shortcut-item">
                <span className="shortcut-description">Send message to AI</span>
                <div className="shortcut-keys">
                  <span className="key">Enter</span>
                </div>
              </div>
              <div className="shortcut-item">
                <span className="shortcut-description">New line in text input</span>
                <div className="shortcut-keys">
                  <span className="key">Shift</span>
                  <span className="key">Enter</span>
                </div>
              </div>
            </div>
          </div>
          <div className="description" style={{ marginTop: '12px', fontStyle: 'italic', textAlign: 'center' }}>
            💡 You can customize these shortcuts in the Settings page!
          </div>
        </div>

        {/* How to Use */}
        <div className="option-group">
          <div className="option-label">
            <span>How to Use</span>
          </div>
          <div className="usage-steps">
            <div className="usage-step">
              <strong>Start a Session:</strong> Enter your Gemini API key and click "Start Session"
            </div>
            <div className="usage-step">
              <strong>Customize:</strong> Choose your profile and language in the settings
            </div>
            <div className="usage-step">
              <strong>Position Window:</strong> Use keyboard shortcuts to move the window to your desired location
            </div>
            <div className="usage-step">
              <strong>Click-through Mode:</strong> Use {formatKeybind(keybinds.toggleClickThrough)} to make the window click-through
            </div>
            <div className="usage-step">
              <strong>Get AI Help:</strong> The AI will analyze your screen and audio to provide assistance
            </div>
            <div className="usage-step">
              <strong>Text Messages:</strong> Type questions or requests to the AI using the text input
            </div>
            <div className="usage-step">
              <strong>Navigate Responses:</strong> Use {formatKeybind(keybinds.previousResponse)} and {formatKeybind(keybinds.nextResponse)} to browse through AI responses
            </div>
          </div>
        </div>

        {/* Supported Profiles */}
        <div className="option-group">
          <div className="option-label">
            <span>Supported Profiles</span>
          </div>
          <div className="profiles-grid">
            <div className="profile-item">
              <div className="profile-name">Job Interview</div>
              <div className="profile-description">Get help with interview questions and responses</div>
            </div>
            <div className="profile-item">
              <div className="profile-name">Sales Call</div>
              <div className="profile-description">Assistance with sales conversations and objection handling</div>
            </div>
            <div className="profile-item">
              <div className="profile-name">Business Meeting</div>
              <div className="profile-description">Support for professional meetings and discussions</div>
            </div>
            <div className="profile-item">
              <div className="profile-name">Presentation</div>
              <div className="profile-description">Help with presentations and public speaking</div>
            </div>
            <div className="profile-item">
              <div className="profile-name">Negotiation</div>
              <div className="profile-description">Guidance for business negotiations and deals</div>
            </div>
          </div>
        </div>

        {/* Audio Input */}
        <div className="option-group">
          <div className="option-label">
            <span>Audio Input</span>
          </div>
          <div className="description">
            The AI listens to conversations and provides contextual assistance based on what it hears.
          </div>
        </div>
      </div>
    </div>
  );
}