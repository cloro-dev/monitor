// Comprehensive country code to name mapping
export const COUNTRY_NAME_MAP: Record<string, string> = {
  AF: 'Afghanistan',
  AL: 'Albania',
  DZ: 'Algeria',
  AD: 'Andorra',
  AO: 'Angola',
  AG: 'Antigua and Barbuda',
  AR: 'Argentina',
  AM: 'Armenia',
  AU: 'Australia',
  AT: 'Austria',
  AZ: 'Azerbaijan',
  BS: 'Bahamas',
  BH: 'Bahrain',
  BD: 'Bangladesh',
  BB: 'Barbados',
  BY: 'Belarus',
  BE: 'Belgium',
  BZ: 'Belize',
  BJ: 'Benin',
  BT: 'Bhutan',
  BO: 'Bolivia',
  BA: 'Bosnia and Herzegovina',
  BW: 'Botswana',
  BR: 'Brazil',
  BN: 'Brunei',
  BG: 'Bulgaria',
  BF: 'Burkina Faso',
  BI: 'Burundi',
  KH: 'Cambodia',
  CM: 'Cameroon',
  CA: 'Canada',
  CV: 'Cape Verde',
  CF: 'Central African Republic',
  TD: 'Chad',
  CL: 'Chile',
  CN: 'China',
  CO: 'Colombia',
  KM: 'Comoros',
  CG: 'Congo',
  CD: 'Congo, Democratic Republic',
  CR: 'Costa Rica',
  CI: "Côte d'Ivoire",
  HR: 'Croatia',
  CU: 'Cuba',
  CY: 'Cyprus',
  CZ: 'Czech Republic',
  DK: 'Denmark',
  DJ: 'Djibouti',
  DM: 'Dominica',
  DO: 'Dominican Republic',
  EC: 'Ecuador',
  EG: 'Egypt',
  SV: 'El Salvador',
  GQ: 'Equatorial Guinea',
  ER: 'Eritrea',
  EE: 'Estonia',
  SZ: 'Eswatini',
  ET: 'Ethiopia',
  FJ: 'Fiji',
  FI: 'Finland',
  FR: 'France',
  GA: 'Gabon',
  GM: 'Gambia',
  GE: 'Georgia',
  DE: 'Germany',
  GH: 'Ghana',
  GR: 'Greece',
  GD: 'Grenada',
  GT: 'Guatemala',
  GN: 'Guinea',
  GW: 'Guinea-Bissau',
  GY: 'Guyana',
  HT: 'Haiti',
  HN: 'Honduras',
  HU: 'Hungary',
  IS: 'Iceland',
  IN: 'India',
  ID: 'Indonesia',
  IR: 'Iran',
  IQ: 'Iraq',
  IE: 'Ireland',
  IL: 'Israel',
  IT: 'Italy',
  JM: 'Jamaica',
  JP: 'Japan',
  JO: 'Jordan',
  KZ: 'Kazakhstan',
  KE: 'Kenya',
  KI: 'Kiribati',
  KP: 'Korea, North',
  KR: 'Korea, South',
  KW: 'Kuwait',
  KG: 'Kyrgyzstan',
  LA: 'Laos',
  LV: 'Latvia',
  LB: 'Lebanon',
  LS: 'Lesotho',
  LR: 'Liberia',
  LY: 'Libya',
  LI: 'Liechtenstein',
  LT: 'Lithuania',
  LU: 'Luxembourg',
  MG: 'Madagascar',
  MW: 'Malawi',
  MY: 'Malaysia',
  MV: 'Maldives',
  ML: 'Mali',
  MT: 'Malta',
  MH: 'Marshall Islands',
  MR: 'Mauritania',
  MU: 'Mauritius',
  MX: 'Mexico',
  FM: 'Micronesia',
  MD: 'Moldova',
  MC: 'Monaco',
  MN: 'Mongolia',
  ME: 'Montenegro',
  MA: 'Morocco',
  MZ: 'Mozambique',
  MM: 'Myanmar',
  NA: 'Namibia',
  NR: 'Nauru',
  NP: 'Nepal',
  NL: 'Netherlands',
  NZ: 'New Zealand',
  NI: 'Nicaragua',
  NE: 'Niger',
  NG: 'Nigeria',
  MK: 'North Macedonia',
  NO: 'Norway',
  OM: 'Oman',
  PK: 'Pakistan',
  PW: 'Palau',
  PA: 'Panama',
  PG: 'Papua New Guinea',
  PY: 'Paraguay',
  PE: 'Peru',
  PH: 'Philippines',
  PL: 'Poland',
  PT: 'Portugal',
  QA: 'Qatar',
  RO: 'Romania',
  RU: 'Russia',
  RW: 'Rwanda',
  WS: 'Samoa',
  SM: 'San Marino',
  ST: 'São Tomé and Príncipe',
  SA: 'Saudi Arabia',
  SN: 'Senegal',
  RS: 'Serbia',
  SC: 'Seychelles',
  SL: 'Sierra Leone',
  SG: 'Singapore',
  SK: 'Slovakia',
  SI: 'Slovenia',
  SB: 'Solomon Islands',
  SO: 'Somalia',
  ZA: 'South Africa',
  SS: 'South Sudan',
  ES: 'Spain',
  LK: 'Sri Lanka',
  SD: 'Sudan',
  SR: 'Suriname',
  SE: 'Sweden',
  CH: 'Switzerland',
  SY: 'Syria',
  TW: 'Taiwan',
  TJ: 'Tajikistan',
  TZ: 'Tanzania',
  TH: 'Thailand',
  TL: 'Timor-Leste',
  TG: 'Togo',
  TO: 'Tonga',
  TT: 'Trinidad and Tobago',
  TN: 'Tunisia',
  TR: 'Turkey',
  TM: 'Turkmenistan',
  TV: 'Tuvalu',
  UG: 'Uganda',
  UA: 'Ukraine',
  AE: 'United Arab Emirates',
  GB: 'United Kingdom',
  US: 'United States',
  UY: 'Uruguay',
  UZ: 'Uzbekistan',
  VU: 'Vanuatu',
  VA: 'Vatican City',
  VE: 'Venezuela',
  VN: 'Vietnam',
  YE: 'Yemen',
  ZM: 'Zambia',
  ZW: 'Zimbabwe',
};

// Cache countries to avoid repeated API calls
let cachedCountries: Array<{ code: string; name: string }> | null = null;
let cacheExpiry: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function getCountries(): Promise<
  Array<{ code: string; name: string }>
> {
  const now = Date.now();

  // Return cached data if still valid
  if (cachedCountries && now < cacheExpiry) {
    return cachedCountries;
  }

  try {
    const response = await fetch('/api/countries', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (response.ok) {
      const apiCountries = await response.json();

      if (!Array.isArray(apiCountries) || apiCountries.length === 0) {
        throw new Error('Invalid or empty countries list from API');
      }

      // API returns array of country codes: ["AU", "BR", "CA", "DK", ...]
      const formattedCountries = apiCountries
        .map((code) => {
          const upperCode = code.toString().toUpperCase();
          const name = COUNTRY_NAME_MAP[upperCode];
          // Only include countries that exist in our mapping
          return name ? { code: upperCode, name } : null;
        })
        .filter(
          (country): country is { code: string; name: string } =>
            country !== null,
        )
        .sort((a, b) => a.name.localeCompare(b.name));

      // Update cache
      cachedCountries = formattedCountries;
      cacheExpiry = now + CACHE_DURATION;

      return formattedCountries;
    } else {
      throw new Error(`API response: ${response.status}`);
    }
  } catch (error) {
    console.warn('Failed to fetch countries from API, using fallback:', error);

    // Use fallback countries from the mapping (common ones)
    if (!cachedCountries) {
      const fallbackCodes = [
        'US',
        'GB',
        'CA',
        'AU',
        'DE',
        'FR',
        'JP',
        'BR',
        'IN',
        'CN',
        'MX',
        'ES',
        'IT',
        'NL',
      ];
      cachedCountries = fallbackCodes
        .map((code) => ({ code, name: COUNTRY_NAME_MAP[code] || code }))
        .sort((a, b) => a.name.localeCompare(b.name));
      cacheExpiry = now + CACHE_DURATION;
    }

    return cachedCountries;
  }
}

// Helper function to get countries in format needed by Select components
export async function getCountriesForSelect() {
  const countries = await getCountries();
  return countries.map((country) => ({
    value: country.code,
    label: country.name,
  }));
}

// Helper function to find country by code
export async function getCountryByCode(code: string) {
  const countries = await getCountries();
  return countries.find((country) => country.code === code);
}

// Helper function to find country by name
export async function getCountryByName(name: string) {
  const countries = await getCountries();
  return countries.find((country) => country.name === name);
}
