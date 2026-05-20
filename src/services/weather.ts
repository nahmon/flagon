import { Lang } from '../i18n/strings';

export interface WeatherData {
  temperature: number;
  windspeed: number;
  weathercode: number;
}

interface Condition {
  emoji: string;
  ko: string;
  en: string;
  ja: string;
}

function getCondition(code: number): Condition {
  if (code === 0)  return { emoji: '☀️',  ko: '맑음',      en: 'Clear',          ja: '晴れ'         };
  if (code <= 3)   return { emoji: '⛅',  ko: '구름 조금',  en: 'Partly Cloudy',  ja: '晴れ時々曇り'  };
  if (code <= 48)  return { emoji: '🌫️', ko: '안개',      en: 'Fog',            ja: '霧'           };
  if (code <= 57)  return { emoji: '🌦️', ko: '이슬비',    en: 'Drizzle',        ja: '霧雨'         };
  if (code <= 67)  return { emoji: '🌧️', ko: '비',        en: 'Rain',           ja: '雨'           };
  if (code <= 77)  return { emoji: '❄️',  ko: '눈',        en: 'Snow',           ja: '雪'           };
  if (code <= 82)  return { emoji: '🌦️', ko: '소나기',    en: 'Showers',        ja: 'にわか雨'      };
  if (code <= 86)  return { emoji: '🌨️', ko: '눈 소나기', en: 'Snow Showers',   ja: '雪にわか雨'    };
  return            { emoji: '⛈️',  ko: '뇌우',      en: 'Thunderstorm',   ja: '雷雨'         };
}

export function conditionLabel(code: number, lang: Lang): string {
  const c = getCondition(code);
  return `${c.emoji} ${c[lang]}`;
}

export async function fetchSummitWeather(lat: number, lng: number): Promise<WeatherData> {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}` +
    `&current_weather=true&wind_speed_unit=kmh`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Weather API ${res.status}`);
  const json: { current_weather: WeatherData } = await res.json();
  return json.current_weather;
}
