/** Chunky pixel on/off switch. */
export function PixelSwitch({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`px-switch px-focus ${checked ? 'px-switch-on' : ''}`}
    >
      <span className="px-switch-knob" />
    </button>
  );
}
