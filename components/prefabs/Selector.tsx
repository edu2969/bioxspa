import { UseFormRegisterReturn } from "react-hook-form";

type SelectorProps<T> = {
  options: T[];
  label?: string;
  placeholder?: string;
  getLabel: (item: T) => string;
  getValue: (item: T) => string;
  register: UseFormRegisterReturn;
  isLoading?: boolean;
  onChange?: (value: string) => void;
};

export function Selector<T>({
  options,
  label,
  placeholder,
  getLabel,
  getValue,
  register,
  isLoading,
  onChange,
}: SelectorProps<T>) {
  return (
    <div className="w-full">
      <label htmlFor="cliente" className="block text-sm font-medium text-gray-700">
        {label ?? "Seleccione..."}
      </label>
      <select
        {...register}
        onChange={e => {
          register.onChange(e);
          onChange?.(e.target.value);
        }}
        disabled={isLoading}
        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm"
      >
        <option value="">{isLoading ? `Cargando${label ? " " + label : ""}...` : (placeholder || `Seleccione${label ? " " + label : ""}...`)}</option>
        {options?.map((item, idx) => (
          <option key={idx} value={getValue(item)}>
            {getLabel(item)}
          </option>
        ))}
      </select>
    </div>
  );
}