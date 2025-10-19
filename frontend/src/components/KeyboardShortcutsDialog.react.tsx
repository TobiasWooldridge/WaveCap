import Dialog from "./primitives/Dialog.react";
import "./KeyboardShortcutsDialog.scss";

type Shortcut = {
  keys: string[];
  description: string;
};

type ShortcutSection = {
  title: string;
  shortcuts: Shortcut[];
};

const SECTIONS: ShortcutSection[] = [
  {
    title: "Navigation",
    shortcuts: [
      {
        keys: ["Ctrl / ⌘", "↑ / ↓"],
        description: "Select the previous or next stream in the sidebar.",
      },
      {
        keys: ["Alt", "↑ / ↓"],
        description: "Alternate shortcut to move through the stream list.",
      },
    ],
  },
  {
    title: "Stream actions",
    shortcuts: [
      {
        keys: ["Shift", "Esc"],
        description: "Mark the active stream as read.",
      },
      {
        keys: ["Ctrl / ⌘", "Shift", "A"],
        description: "Mark all sidebar streams as read.",
      },
      {
        keys: ["Ctrl / ⌘", "Shift", "M"],
        description: "Toggle live listening for the selected stream (when available).",
      },
    ],
  },
  {
    title: "Tools & settings",
    shortcuts: [
      {
        keys: ["Ctrl / ⌘", "F"],
        description: "Open the transcript search dialog for the current stream.",
      },
      {
        keys: ["Ctrl / ⌘", "K"],
        description: "Open the transcript search dialog (Discord-style quick switcher).",
      },
      {
        keys: ["Ctrl / ⌘", ","],
        description: "Open application settings.",
      },
    ],
  },
  {
    title: "Help",
    shortcuts: [
      {
        keys: ["Ctrl / ⌘", "/"],
        description: "Show or hide this keyboard shortcut guide.",
      },
    ],
  },
];

export interface KeyboardShortcutsDialogProps {
  open: boolean;
  onClose: () => void;
}

const renderKeys = (keys: string[]) => (
  <span className="keyboard-shortcuts-dialog__keys">
    {keys.map((key, index) => (
      <kbd key={`${key}-${index}`}>{key}</kbd>
    ))}
  </span>
);

const KeyboardShortcutsDialog = ({ open, onClose }: KeyboardShortcutsDialogProps) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Keyboard shortcuts"
      dialogClassName="keyboard-shortcuts-dialog"
      bodyClassName="keyboard-shortcuts-dialog__body"
      closeAriaLabel="Close keyboard shortcut guide"
    >
      <p className="text-body-secondary mb-0">
        Navigate WaveCap with familiar Discord-inspired shortcuts. Use these combinations to move through streams and manage
        activity without taking your hands off the keyboard.
      </p>
      <div className="keyboard-shortcuts-dialog__sections">
        {SECTIONS.map((section) => (
          <section key={section.title} className="keyboard-shortcuts-dialog__section">
            <h3 className="h6 text-body mb-2">{section.title}</h3>
            <ul className="keyboard-shortcuts-dialog__list">
              {section.shortcuts.map((shortcut) => (
                <li key={`${section.title}-${shortcut.description}`} className="keyboard-shortcuts-dialog__item">
                  {renderKeys(shortcut.keys)}
                  <span className="keyboard-shortcuts-dialog__description">{shortcut.description}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Dialog>
  );
};

export default KeyboardShortcutsDialog;
