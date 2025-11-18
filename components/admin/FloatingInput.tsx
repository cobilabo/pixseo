'use client';

interface FloatingInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  rows?: number;
  multiline?: boolean;
  disabled?: boolean;
  list?: string; // datalist の id
}

export default function FloatingInput({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  required = false,
  rows = 3,
  multiline = false,
  disabled = false,
  list,
}: FloatingInputProps) {
  const hasValue = value.length > 0;

  if (multiline) {
    return (
      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          rows={rows}
          disabled={disabled}
          className={`w-full px-4 pt-6 pb-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 peer ${
            disabled ? 'bg-gray-100 cursor-not-allowed' : ''
          }`}
        />
        <label
          className={`absolute left-2 transition-all pointer-events-none ${
            hasValue
              ? 'text-xs -top-2.5 bg-white px-2 text-gray-700'
              : 'text-sm top-1/2 -translate-y-1/2 text-gray-500 px-2'
          } peer-focus:text-xs peer-focus:-top-2.5 peer-focus:translate-y-0 peer-focus:bg-white peer-focus:px-2 peer-focus:text-gray-700`}
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        list={list}
        className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 peer ${
          disabled ? 'bg-white text-gray-400 cursor-not-allowed' : 'text-gray-900'
        }`}
      />
      <label
        className={`absolute left-2 transition-all pointer-events-none ${
          hasValue
            ? 'text-xs -top-2.5 bg-white px-2 text-gray-700'
            : 'text-sm top-1/2 -translate-y-1/2 text-gray-500 px-2'
        } peer-focus:text-xs peer-focus:-top-2.5 peer-focus:translate-y-0 peer-focus:bg-white peer-focus:px-2 peer-focus:text-gray-700`}
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
    </div>
  );
}

