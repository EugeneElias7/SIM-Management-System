export interface Country {
  iso: string;
  name: string;
  dialCode: string;
}

export const COUNTRIES: Country[] = [
  { iso: 'IN', name: 'India', dialCode: '91' },
  { iso: 'US', name: 'United States', dialCode: '1' },
  { iso: 'GB', name: 'United Kingdom', dialCode: '44' },
  { iso: 'AE', name: 'United Arab Emirates', dialCode: '971' },
  { iso: 'SA', name: 'Saudi Arabia', dialCode: '966' },
  { iso: 'QA', name: 'Qatar', dialCode: '974' },
  { iso: 'KW', name: 'Kuwait', dialCode: '965' },
  { iso: 'OM', name: 'Oman', dialCode: '968' },
  { iso: 'BH', name: 'Bahrain', dialCode: '973' },
  { iso: 'SG', name: 'Singapore', dialCode: '65' },
  { iso: 'MY', name: 'Malaysia', dialCode: '60' },
  { iso: 'AU', name: 'Australia', dialCode: '61' },
  { iso: 'CA', name: 'Canada', dialCode: '1' },
  { iso: 'DE', name: 'Germany', dialCode: '49' },
  { iso: 'FR', name: 'France', dialCode: '33' },
  { iso: 'IT', name: 'Italy', dialCode: '39' },
  { iso: 'ES', name: 'Spain', dialCode: '34' },
  { iso: 'NL', name: 'Netherlands', dialCode: '31' },
  { iso: 'BE', name: 'Belgium', dialCode: '32' },
  { iso: 'CH', name: 'Switzerland', dialCode: '41' },
  { iso: 'SE', name: 'Sweden', dialCode: '46' },
  { iso: 'NO', name: 'Norway', dialCode: '47' },
  { iso: 'DK', name: 'Denmark', dialCode: '45' },
  { iso: 'FI', name: 'Finland', dialCode: '358' },
  { iso: 'JP', name: 'Japan', dialCode: '81' },
  { iso: 'KR', name: 'South Korea', dialCode: '82' },
  { iso: 'CN', name: 'China', dialCode: '86' },
  { iso: 'HK', name: 'Hong Kong', dialCode: '852' },
  { iso: 'NZ', name: 'New Zealand', dialCode: '64' },
  { iso: 'ZA', name: 'South Africa', dialCode: '27' },
  { iso: 'BR', name: 'Brazil', dialCode: '55' },
  { iso: 'MX', name: 'Mexico', dialCode: '52' },
  { iso: 'RU', name: 'Russia', dialCode: '7' },
  { iso: 'TR', name: 'Turkey', dialCode: '90' },
  { iso: 'EG', name: 'Egypt', dialCode: '20' },
  { iso: 'NG', name: 'Nigeria', dialCode: '234' },
  { iso: 'KE', name: 'Kenya', dialCode: '254' },
  { iso: 'LK', name: 'Sri Lanka', dialCode: '94' },
  { iso: 'BD', name: 'Bangladesh', dialCode: '880' },
  { iso: 'PK', name: 'Pakistan', dialCode: '92' },
  { iso: 'NP', name: 'Nepal', dialCode: '977' },
];

export function flagEmoji(iso: string): string {
  return iso
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

export function findCountryByDialCode(value: string | null | undefined): Country | undefined {
  if (!value) return undefined;
  const digits = value.replace(/\D/g, '');
  return COUNTRIES.find((country) => digits.startsWith(country.dialCode));
}
