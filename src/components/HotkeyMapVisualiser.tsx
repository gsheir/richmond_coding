// Renders a Mac keyboard layout with each key coloured to show which
// coding button (if any) its hotkey triggers.
import { ButtonConfig } from "@/lib/types";

interface HotkeyMapVisualiserProps {
  buttons: ButtonConfig[];
}

export function HotkeyMapVisualiser({ buttons }: HotkeyMapVisualiserProps) {
  const hotkeyMap = new Map<string, ButtonConfig[]>();
  buttons.forEach((btn) => {
    if (btn.hotkey) {
      // Normalize space character to 'SPACE' for matching
      const normalizedHotkey = btn.hotkey === ' ' ? 'SPACE' : btn.hotkey.toUpperCase();
      const existing = hotkeyMap.get(normalizedHotkey) || [];
      hotkeyMap.set(normalizedHotkey, [...existing, btn]);
    }
  });

  const renderKey = (key: string, label?: string, width: string = "w-10", extraClasses: string = "", uniqueId?: string) => {
    const normalizedKey = key.toUpperCase();
    const buttonList = hotkeyMap.get(normalizedKey) || [];
    const displayLabel = label || key;
    const reactKey = uniqueId || key;

    // Handle multiple buttons with diagonal split
    if (buttonList.length > 1) {
      const buttonTitles = buttonList.map(b => `${b.label} (${b.code})`).join(', ');
      return (
        <div
          key={reactKey}
          className={`${width} h-10 rounded border-2 flex items-center justify-center text-xs font-medium transition-all overflow-hidden relative ${extraClasses}`}
          style={{
            borderColor: buttonList[0].style.colour,
          }}
          title={buttonTitles}
        >
          {/* Diagonal split background */}
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(to bottom right, ${buttonList[0].style.colour} 0%, ${buttonList[0].style.colour} 50%, ${buttonList[1].style.colour} 50%, ${buttonList[1].style.colour} 100%)`,
            }}
          />
          <span className="relative z-10 text-white font-bold">{displayLabel}</span>
        </div>
      );
    }

    // Single button or no button
    const button = buttonList[0];
    return (
      <div
        key={reactKey}
        className={`${width} h-10 rounded border-2 flex items-center justify-center text-xs font-medium transition-all ${extraClasses}`}
        style={{
          backgroundColor: button ? button.style.colour : 'transparent',
          borderColor: button ? button.style.colour : 'hsl(var(--border))',
          color: button ? 'white' : 'hsl(var(--muted-foreground))',
          fontWeight: button ? 'bold' : 'normal',
        }}
        title={button ? `${button.label} (${button.code})` : undefined}
      >
        {displayLabel}
      </div>
    );
  };

  const renderArrowKey = (key: string, label: string, uniqueId?: string) => {
    const normalizedKey = key.toUpperCase();
    const buttonList = hotkeyMap.get(normalizedKey) || [];
    const reactKey = uniqueId || key;

    // Handle multiple buttons with diagonal split
    if (buttonList.length > 1) {
      const buttonTitles = buttonList.map(b => `${b.label} (${b.code})`).join(', ');
      return (
        <div
          key={reactKey}
          className="w-10 h-[18px] rounded border-2 flex items-center justify-center text-xs font-medium transition-all overflow-hidden relative"
          style={{
            borderColor: buttonList[0].style.colour,
          }}
          title={buttonTitles}
        >
          {/* Diagonal split background */}
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(to bottom right, ${buttonList[0].style.colour} 0%, ${buttonList[0].style.colour} 50%, ${buttonList[1].style.colour} 50%, ${buttonList[1].style.colour} 100%)`,
            }}
          />
          <span className="relative z-10 text-white font-bold">{label}</span>
        </div>
      );
    }

    // Single button or no button
    const button = buttonList[0];
    return (
      <div
        key={reactKey}
        className="w-10 h-[18px] rounded border-2 flex items-center justify-center text-xs font-medium transition-all"
        style={{
          backgroundColor: button ? button.style.colour : 'transparent',
          borderColor: button ? button.style.colour : 'hsl(var(--border))',
          color: button ? 'white' : 'hsl(var(--muted-foreground))',
          fontWeight: button ? 'bold' : 'normal',
        }}
        title={button ? `${button.label} (${button.code})` : undefined}
      >
        {label}
      </div>
    );
  };

  return (
    <div className="space-y-1.5 font-mono">
      {/* Number row */}
      <div className="flex gap-1">
        {renderKey('`', '`')}
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map(k => renderKey(k, k, 'w-10', '', k))}
        {renderKey('-', '-')}
        {renderKey('=', '=')}
        {renderKey('Backspace', 'delete', 'w-20', 'text-[10px]')}
      </div>

      {/* QWERTY row */}
      <div className="flex gap-1">
        {renderKey('Tab', 'tab', 'w-16', 'text-[10px]')}
        {['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'].map(k => renderKey(k, k, 'w-10', '', k))}
        {renderKey('[', '[')}
        {renderKey(']', ']')}
        {renderKey('\\', '\\')}
      </div>

      {/* ASDF row */}
      <div className="flex gap-1">
        {renderKey('CapsLock', 'caps lock', 'w-20', 'text-[10px]')}
        {['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'].map(k => renderKey(k, k, 'w-10', '', k))}
        {renderKey(';', ';')}
        {renderKey("'", "'")}
        {renderKey('Enter', 'return', 'w-20', 'text-[10px]')}
      </div>

      {/* ZXCV row */}
      <div className="flex gap-1">
        {renderKey('Shift', 'shift', 'w-24', 'text-[10px]', 'left-shift')}
        {['Z', 'X', 'C', 'V', 'B', 'N', 'M'].map(k => renderKey(k, k, 'w-10', '', k))}
        {renderKey(',', ',')}
        {renderKey('.', '.')}
        {renderKey('/', '/')}
        {renderKey('Shift', 'shift', 'w-24', 'text-[10px]', 'right-shift')}
      </div>

      {/* Space row */}
      <div className="flex gap-1 items-center">
        {renderKey('Fn', 'fn', 'w-10', 'text-[10px]')}
        {renderKey('Ctrl', '⌃', 'w-10')}
        {renderKey('Alt', '⌥', 'w-10', '', 'left-alt')}
        {renderKey('Cmd', '⌘', 'w-10', '', 'left-cmd')}
        {renderKey('Space', '', 'w-[216px]')}
        {renderKey('Cmd', '⌘', 'w-10', '', 'right-cmd')}
        {renderKey('Alt', '⌥', 'w-10', '', 'right-alt')}

        {/* Arrow keys */}
        <div className="flex flex-col gap-1 ml-2">
          <div className="flex justify-center">
            {renderArrowKey('ArrowUp', '↑')}
          </div>
          <div className="flex gap-1">
            {renderArrowKey('ArrowLeft', '←')}
            {renderArrowKey('ArrowDown', '↓')}
            {renderArrowKey('ArrowRight', '→')}
          </div>
        </div>
      </div>
    </div>
  );
}
