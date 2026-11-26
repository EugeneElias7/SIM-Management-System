import * as React from 'react';
import { COUNTRIES, findCountryByDialCode } from '@/lib/countries';
import { Input } from './input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import ReactCountryFlag from 'react-country-flag';
import { cn } from '@/lib/utils';

export interface PhoneFieldProps {
  value?: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  error?: string;
  defaultCountryIso?: string;
}

export function PhoneField({
  value,
  onChange,
  placeholder = 'Phone number',
  className,
  error,
  defaultCountryIso = 'IN',
}: PhoneFieldProps) {
  const initialCountry =
    findCountryByDialCode(value ?? '') ?? COUNTRIES.find((country) => country.iso === defaultCountryIso) ?? COUNTRIES[0]!;
  const [countryIso, setCountryIso] = React.useState(initialCountry.iso);
  const [number, setNumber] = React.useState(
    value ? value.replace(/^\+\d+\s*/, '').replace(/\D/g, '') : '',
  );

  React.useEffect(() => {
    const detected = findCountryByDialCode(value ?? '');
    if (detected && detected.iso !== countryIso) setCountryIso(detected.iso);
    const cleaned = value ? value.replace(/^\+\d+\s*/, '').replace(/\D/g, '') : '';
    if (cleaned !== number) setNumber(cleaned);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const country = COUNTRIES.find((item) => item.iso === countryIso) ?? COUNTRIES[0]!;

  const emit = (nextCountry: string, nextNumber: string) => {
    const selected = COUNTRIES.find((item) => item.iso === nextCountry) ?? COUNTRIES[0]!;
    const digits = nextNumber.replace(/\D/g, '');
    onChange(digits ? `+${selected.dialCode}${digits}` : '');
  };

  return (
    <div className={cn('flex gap-2', className)}>
      <Select
        value={country.iso}
        onValueChange={(next) => {
          setCountryIso(next);
          emit(next, number);
        }}
      >
        <SelectTrigger className="w-[118px] shrink-0">
          <SelectValue>
            <span className="flex items-center gap-1.5">
              <ReactCountryFlag countryCode={country.iso} svg style={{ width: 20, height: 15 }} />
              <span className="text-xs">+{country.dialCode}</span>
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {COUNTRIES.map((item) => (
            <SelectItem key={item.iso} value={item.iso}>
              <span className="flex items-center gap-2">
                <ReactCountryFlag countryCode={item.iso} svg style={{ width: 20, height: 15 }} />
                <span>{item.name}</span>
                <span className="text-ink-500">+{item.dialCode}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        value={number}
        onChange={(event) => {
          const next = event.target.value.replace(/\D/g, '');
          setNumber(next);
          emit(country.iso, next);
        }}
        placeholder={placeholder}
        className={error ? 'border-red-400' : ''}
      />
    </div>
  );
}
export default PhoneField;
