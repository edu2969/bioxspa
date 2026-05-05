import { ChangeEvent, useEffect, useState } from 'react';

type InputMontoProps = {
  name: string;
  symbol?: string;
  placeholder?: string;
  className?: string;
  value?: number | string;
  defaultValue?: number | string;
  onChange?: (value: number) => void;
  register?: any;
  disabled?: boolean;
  required?: boolean;
};

const formatInteger = (value: number | string | undefined): string => {
  if (value === undefined || value === null || value === '') {
    return '';
  }

  const digits = String(value).replace(/\D/g, '');
  if (!digits) {
    return '';
  }

  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

const parseInteger = (value: string): number => {
  const digits = value.replace(/\D/g, '');
  return digits ? parseInt(digits, 10) : 0;
};

export default function InputMonto({
  name,
  symbol = '$',
  placeholder = '',
  className = '',
  value,
  defaultValue,
  onChange,
  register,
  disabled = false,
  required = false,
}: InputMontoProps) {
  const [displayValue, setDisplayValue] = useState(formatInteger(defaultValue ?? value));

  useEffect(() => {
    if (value !== undefined) {
      setDisplayValue(formatInteger(value));
    }
  }, [value]);

  const registration = register
    ? typeof register === 'function'
      ? register(name)
      : register
    : null;

  const { ref: registerRef, onChange: registerOnChange, onBlur: registerOnBlur, ...restRegister } = registration || {};

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const rawValue = event.target.value.replace(/\D/g, '');
    const nextDisplayValue = formatInteger(rawValue);
    setDisplayValue(nextDisplayValue);

    const numericValue = parseInteger(rawValue);

    if (registerOnChange) {
      const syntheticEvent = {
        ...event,
        target: {
          ...event.target,
          value: rawValue,
        },
      } as ChangeEvent<HTMLInputElement>;

      registerOnChange(syntheticEvent);
    }

    if (onChange) {
      onChange(numericValue);
    }
  };

  return (
    <div className={`relative ${className}`.trim()}>
      <span className="pointer-events-none absolute left-3 top-0 bottom-0 flex items-center text-sm text-gray-400">
        {symbol}
      </span>
      <input
        type="text"
        inputMode="numeric"
        pattern="\d*"
        name={name}
        ref={registerRef}
        value={displayValue}
        onChange={handleChange}
        onBlur={registerOnBlur}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        autoComplete="off"
        className="w-full rounded border border-gray-300 bg-white py-2 pl-10 pr-3 text-right text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-200 disabled:bg-gray-100 disabled:text-gray-400"
        {...restRegister}
      />
    </div>
  );
}
