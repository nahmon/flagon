import AsyncStorage from '@react-native-async-storage/async-storage';

export interface TriviaQuestion {
  id: string;
  q: { ko: string; en: string; ja: string };
  choices: { ko: string[]; en: string[]; ja: string[] };
  correctIdx: number;
}

export interface TriviaState {
  date: string;
  questionIds: string[];
  answers: (number | null)[];
  xpEarned: number;
}

const STORAGE_KEY = 'trivia_state_v1';
const XP_PER_CORRECT = 50;
const QUESTIONS_PER_DAY = 5;

const BANK: TriviaQuestion[] = [
  {
    id: 'q1',
    q: { ko: '한국에서 가장 높은 산은?', en: "What is South Korea's highest peak?", ja: '韓国で最も高い山は？' },
    choices: {
      ko: ['한라산', '지리산', '설악산', '덕유산'],
      en: ['Hallasan', 'Jirisan', 'Seoraksan', 'Deogyusan'],
      ja: ['漢拏山', '智異山', '雪嶽山', '徳裕山'],
    },
    correctIdx: 0,
  },
  {
    id: 'q2',
    q: { ko: '한라산의 해발 고도는?', en: 'What is the elevation of Hallasan?', ja: '漢拏山の標高は？' },
    choices: {
      ko: ['1,950m', '1,915m', '1,708m', '1,614m'],
      en: ['1,950m', '1,915m', '1,708m', '1,614m'],
      ja: ['1,950m', '1,915m', '1,708m', '1,614m'],
    },
    correctIdx: 0,
  },
  {
    id: 'q3',
    q: { ko: '지리산 최고봉의 이름은?', en: "What is Jirisan's highest peak?", ja: '智異山の最高峰は？' },
    choices: {
      ko: ['천왕봉', '반야봉', '노고단', '연하봉'],
      en: ['Cheonwangbong', 'Banyabong', 'Nogodan', 'Yeonhabong'],
      ja: ['天王峰', '般若峰', '老姑壇', '煙霞峰'],
    },
    correctIdx: 0,
  },
  {
    id: 'q4',
    q: { ko: '설악산이 속한 산맥은?', en: 'Which mountain range does Seoraksan belong to?', ja: '雪嶽山が属する山脈は？' },
    choices: {
      ko: ['태백산맥', '소백산맥', '차령산맥', '노령산맥'],
      en: ['Taebaek Range', 'Sobaek Range', 'Charyeong Range', 'Noryeong Range'],
      ja: ['太白山脈', '小白山脈', '車嶺山脈', '蘆嶺山脈'],
    },
    correctIdx: 0,
  },
  {
    id: 'q5',
    q: { ko: '일본에서 가장 높은 산은?', en: "What is Japan's highest peak?", ja: '日本で最も高い山は？' },
    choices: {
      ko: ['후지산', '기타다케', '호타카다케', '야리가타케'],
      en: ['Mount Fuji', 'Kitadake', 'Hotakadake', 'Yarigatake'],
      ja: ['富士山', '北岳', '穂高岳', '槍ヶ岳'],
    },
    correctIdx: 0,
  },
  {
    id: 'q6',
    q: { ko: '후지산의 해발 고도는?', en: 'What is the elevation of Mount Fuji?', ja: '富士山の標高は？' },
    choices: {
      ko: ['3,776m', '3,193m', '3,180m', '3,067m'],
      en: ['3,776m', '3,193m', '3,180m', '3,067m'],
      ja: ['3,776m', '3,193m', '3,180m', '3,067m'],
    },
    correctIdx: 0,
  },
  {
    id: 'q7',
    q: { ko: '북한산 최고봉은?', en: "What is Bukhansan's highest peak?", ja: '北漢山の最高峰は？' },
    choices: {
      ko: ['백운대', '인수봉', '만경대', '노적봉'],
      en: ['Baegundae', 'Insubong', 'Manggyeongdae', 'Nojeokbong'],
      ja: ['白雲台', '仁寿峰', '万景台', '露積峰'],
    },
    correctIdx: 0,
  },
  {
    id: 'q8',
    q: { ko: '백운대의 해발 고도는?', en: 'What is the elevation of Baegundae?', ja: '白雲台の標高は？' },
    choices: {
      ko: ['836m', '811m', '799m', '717m'],
      en: ['836m', '811m', '799m', '717m'],
      ja: ['836m', '811m', '799m', '717m'],
    },
    correctIdx: 0,
  },
  {
    id: 'q9',
    q: { ko: '한국 국립공원 중 가장 오래된 곳은?', en: "Which is South Korea's oldest national park?", ja: '韓国最古の国立公園は？' },
    choices: {
      ko: ['지리산', '한라산', '설악산', '북한산'],
      en: ['Jirisan', 'Hallasan', 'Seoraksan', 'Bukhansan'],
      ja: ['智異山', '漢拏山', '雪嶽山', '北漢山'],
    },
    correctIdx: 0,
  },
  {
    id: 'q10',
    q: { ko: '덕유산의 최고봉은?', en: "What is Deogyusan's highest peak?", ja: '徳裕山の最高峰は？' },
    choices: {
      ko: ['향적봉', '남덕유', '칠봉', '두문봉'],
      en: ['Hyangjeoukbong', 'Namdeogu', 'Chilbong', 'Dumunbong'],
      ja: ['香積峰', '南徳裕', '七峰', '斗文峰'],
    },
    correctIdx: 0,
  },
  {
    id: 'q11',
    q: { ko: '한국에서 두 번째로 높은 산은?', en: "What is South Korea's second highest peak?", ja: '韓国で2番目に高い山は？' },
    choices: {
      ko: ['지리산', '설악산', '덕유산', '가야산'],
      en: ['Jirisan', 'Seoraksan', 'Deogyusan', 'Gayasan'],
      ja: ['智異山', '雪嶽山', '徳裕山', '伽耶山'],
    },
    correctIdx: 0,
  },
  {
    id: 'q12',
    q: { ko: '일본 알프스 중 북알프스의 최고봉은?', en: 'The highest peak of the Northern Japan Alps?', ja: '北アルプスの最高峰は？' },
    choices: {
      ko: ['오쿠호타카다케', '야리가타케', '기타다케', '온타케산'],
      en: ['Okuhotakadake', 'Yarigatake', 'Kitadake', 'Ontakesan'],
      ja: ['奥穂高岳', '槍ヶ岳', '北岳', '御嶽山'],
    },
    correctIdx: 0,
  },
  {
    id: 'q13',
    q: { ko: '소백산의 최고봉은?', en: "What is Sobaeksan's highest peak?", ja: '小白山の最高峰は？' },
    choices: {
      ko: ['비로봉', '국망봉', '도솔봉', '형제봉'],
      en: ['Birobong', 'Gungmangbong', 'Dosolbong', 'Hyeongjaebong'],
      ja: ['毘盧峰', '國望峰', '兜率峰', '兄弟峰'],
    },
    correctIdx: 0,
  },
  {
    id: 'q14',
    q: { ko: '설악산 대청봉의 해발 고도는?', en: "What is Seoraksan Daecheongbong's elevation?", ja: '雪嶽山・大青峰の標高は？' },
    choices: {
      ko: ['1,708m', '1,625m', '1,563m', '1,489m'],
      en: ['1,708m', '1,625m', '1,563m', '1,489m'],
      ja: ['1,708m', '1,625m', '1,563m', '1,489m'],
    },
    correctIdx: 0,
  },
  {
    id: 'q15',
    q: { ko: '가야산의 최고봉은?', en: "What is Gayasan's highest peak?", ja: '伽耶山の最高峰は？' },
    choices: {
      ko: ['칠불봉', '상왕봉', '두리봉', '남산'],
      en: ['Chilbulbong', 'Sangwangbong', 'Duribong', 'Namsan'],
      ja: ['七仏峰', '上王峰', '斗里峰', '南山'],
    },
    correctIdx: 0,
  },
];

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function pickDailyQuestions(dateStr: string): string[] {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) hash = (hash * 31 + dateStr.charCodeAt(i)) | 0;
  const shuffled = [...BANK].sort((a, b) => {
    const ha = (hash ^ a.id.charCodeAt(1)) | 0;
    const hb = (hash ^ b.id.charCodeAt(1)) | 0;
    return ha - hb;
  });
  return shuffled.slice(0, QUESTIONS_PER_DAY).map((q) => q.id);
}

export function getQuestionById(id: string): TriviaQuestion | undefined {
  return BANK.find((q) => q.id === id);
}

export async function getTriviaState(): Promise<TriviaState> {
  const today = todayKey();
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (raw) {
    const state: TriviaState = JSON.parse(raw);
    if (state.date === today) return state;
  }
  const fresh: TriviaState = {
    date: today,
    questionIds: pickDailyQuestions(today),
    answers: Array(QUESTIONS_PER_DAY).fill(null),
    xpEarned: 0,
  };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  return fresh;
}

export async function submitAnswer(questionIdx: number, chosenIdx: number): Promise<{ correct: boolean; xpGained: number }> {
  const state = await getTriviaState();
  const q = getQuestionById(state.questionIds[questionIdx]);
  if (!q) return { correct: false, xpGained: 0 };
  const correct = chosenIdx === q.correctIdx;
  const xpGained = correct ? XP_PER_CORRECT : 0;
  state.answers[questionIdx] = chosenIdx;
  state.xpEarned += xpGained;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  return { correct, xpGained };
}

export const TRIVIA_XP_PER_CORRECT = XP_PER_CORRECT;
export const TRIVIA_QUESTIONS_PER_DAY = QUESTIONS_PER_DAY;
