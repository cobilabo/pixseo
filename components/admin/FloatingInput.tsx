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
}: FloatingInputProps) {
  const hasValue = value.length > 0;

  if (multiline) {
    return (
      <div className="relative bg-white rounded-lg p-6">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          rows={rows}
          className="w-full px-4 pt-8 pb-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 peer"
        />
        <label
          className={`absolute left-10 transition-all pointer-events-none ${
            hasValue
              ? 'text-xs top-2 bg-white px-2 text-gray-700'
              : 'text-sm top-8 text-gray-500'
          } peer-focus:text-xs peer-focus:top-2 peer-focus:bg-white peer-focus:px-2 peer-focus:text-gray-700`}
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      </div>
    );
  }

  return (
    <div className="relative bg-white rounded-lg p-6">
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full px-4 pt-8 pb-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 peer"
      />
      <label
        className={`absolute left-10 transition-all pointer-events-none ${
          hasValue
            ? 'text-xs top-2 bg-white px-2 text-gray-700'
            : 'text-sm top-8 text-gray-500'
          } peer-focus:text-xs peer-focus:top-2 peer-focus:bg-white peer-focus:px-2 peer-focus:text-gray-700`}
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
    </div>
  );
}

