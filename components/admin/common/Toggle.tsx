'use client';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export default function Toggle({ checked, onChange, disabled = false }: ToggleProps) {
  return (
    <label className={`cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
      <div className="relative inline-block w-14 h-8">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => !disabled && onChange(e.target.checked)}
          disabled={disabled}
          className="sr-only"
        />
        <div 
          className={`absolute inset-0 rounded-full transition-colors pointer-events-none ${
            checked ? 'bg-blue-600' : 'bg-gray-400'
          }`}
        >
          <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-0'
          }`}></div>
        </div>
      </div>
    </label>
  );
}
