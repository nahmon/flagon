import { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Animated, ActivityIndicator } from 'react-native';
import { Colors } from '../constants';
import { useLang } from '../contexts/LangContext';
import { t } from '../i18n/strings';
import {
  getTriviaState,
  getQuestionById,
  submitAnswer,
  type TriviaState,
  TRIVIA_QUESTIONS_PER_DAY,
  TRIVIA_XP_PER_CORRECT,
} from '../services/summitTrivia';

const TIMER_SECONDS = 12;
const CHOICE_LABELS = ['A', 'B', 'C', 'D'];

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function SummitTriviaModal({ visible, onClose }: Props) {
  const { lang } = useLang();
  const s = t(lang);
  const [state, setState] = useState<TriviaState | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const timerAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const st = await getTriviaState();
    setState(st);
    const firstUnanswered = st.answers.findIndex((a) => a === null);
    if (firstUnanswered === -1) {
      setDone(true);
    } else {
      setCurrentIdx(firstUnanswered);
      setChosen(null);
      setCorrect(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (visible) load();
  }, [visible, load]);

  const startTimer = useCallback(() => {
    timerAnim.setValue(1);
    animRef.current?.stop();
    animRef.current = Animated.timing(timerAnim, {
      toValue: 0,
      duration: TIMER_SECONDS * 1000,
      useNativeDriver: false,
    });
    animRef.current.start(({ finished }: { finished: boolean }) => {
      if (finished) handleTimeUp();
    });
  }, [timerAnim]);

  useEffect(() => {
    if (!visible || loading || done || chosen !== null) return;
    startTimer();
    return () => {
      animRef.current?.stop();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible, loading, done, currentIdx, chosen, startTimer]);

  const handleTimeUp = () => {
    if (chosen !== null) return;
    handleChoose(-1);
  };

  const handleChoose = async (idx: number) => {
    if (chosen !== null || !state) return;
    animRef.current?.stop();
    setChosen(idx);
    const res = await submitAnswer(currentIdx, idx);
    setCorrect(res.correct);
    setState((prev: TriviaState | null) => {
      if (!prev) return prev;
      const updated: TriviaState = { ...prev, answers: [...prev.answers], xpEarned: prev.xpEarned + res.xpGained };
      updated.answers[currentIdx] = idx;
      return updated;
    });
    timerRef.current = setTimeout(() => advance(), 1400);
  };

  const advance = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const next = currentIdx + 1;
    if (next >= TRIVIA_QUESTIONS_PER_DAY) {
      setDone(true);
    } else {
      setCurrentIdx(next);
      setChosen(null);
      setCorrect(null);
    }
  };

  const question = state ? getQuestionById(state.questionIds[currentIdx]) : undefined;
  const choices: string[] = question ? (question.choices[lang as 'ko' | 'en' | 'ja'] as string[]) : [];
  const correctCount = state?.answers.filter((a: number | null, i: number) => {
    const q = getQuestionById(state.questionIds[i]);
    return a !== null && q && a === q.correctIdx;
  }).length ?? 0;

  const timerWidth = timerAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{s.triviaTitle}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.center}><ActivityIndicator color={Colors.green} size="large" /></View>
        ) : done ? (
          <View style={styles.doneWrapper}>
            <Text style={styles.doneEmoji}>{correctCount >= 4 ? '🏆' : correctCount >= 2 ? '🎯' : '💪'}</Text>
            <Text style={styles.doneTitle}>{s.triviaComplete}</Text>
            <Text style={styles.doneScore}>{s.triviaScore(correctCount, TRIVIA_QUESTIONS_PER_DAY)}</Text>
            <Text style={styles.doneXp}>{s.triviaXp((state?.xpEarned ?? 0))}</Text>
            <Text style={styles.doneReturnNote}>{s.triviaReturnTomorrow}</Text>
            <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
              <Text style={styles.doneBtnText}>{s.triviaClose}</Text>
            </TouchableOpacity>
          </View>
        ) : question ? (
          <View style={styles.quizWrapper}>
            <View style={styles.progressRow}>
              <Text style={styles.progressText}>{s.triviaProgress(currentIdx + 1, TRIVIA_QUESTIONS_PER_DAY)}</Text>
              <Text style={styles.xpHint}>{s.triviaXpHint(TRIVIA_XP_PER_CORRECT)}</Text>
            </View>
            <View style={styles.timerBar}>
              <Animated.View style={[styles.timerFill, { width: timerWidth }]} />
            </View>
            <View style={styles.questionCard}>
              <Text style={styles.questionText}>{question.q[lang as 'ko' | 'en' | 'ja']}</Text>
            </View>
            <View style={styles.choicesGrid}>
              {choices.map((choice: string, i: number) => {
                const isCorrect = i === question.correctIdx;
                const isWrong = i === chosen && !correct;
                const bgColor = chosen !== null
                  ? isCorrect ? '#D4EDDA' : isWrong ? '#FDDEDE' : Colors.white
                  : Colors.white;
                return (
                  <TouchableOpacity
                    key={i}
                    style={[styles.choiceBtn, { backgroundColor: bgColor }]}
                    onPress={() => handleChoose(i)}
                    disabled={chosen !== null}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.choiceLabel}>{CHOICE_LABELS[i]}</Text>
                    <Text style={styles.choiceText}>{choice}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {chosen !== null && (
              <View style={[styles.feedbackBanner, { backgroundColor: correct ? '#D4EDDA' : '#FDDEDE' }]}>
                <Text style={styles.feedbackText}>
                  {correct ? s.triviaCorrect : s.triviaWrong(choices[question.correctIdx] ?? '')}
                </Text>
              </View>
            )}
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12, backgroundColor: Colors.green },
  title: { fontSize: 20, fontWeight: '800', color: Colors.white },
  closeBtn: { padding: 8 },
  closeText: { fontSize: 18, color: Colors.white, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  quizWrapper: { flex: 1, padding: 20 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  progressText: { fontSize: 14, fontWeight: '700', color: Colors.zinc500 },
  xpHint: { fontSize: 13, color: Colors.green, fontWeight: '600' },
  timerBar: { height: 6, backgroundColor: Colors.zinc200, borderRadius: 3, overflow: 'hidden', marginBottom: 20 },
  timerFill: { height: '100%', backgroundColor: Colors.orange, borderRadius: 3 },
  questionCard: { backgroundColor: Colors.white, borderRadius: 16, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 3 },
  questionText: { fontSize: 18, fontWeight: '700', color: Colors.zinc950, lineHeight: 26, textAlign: 'center' },
  choicesGrid: { gap: 12 },
  choiceBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, padding: 14, borderWidth: 1.5, borderColor: Colors.zinc200 },
  choiceLabel: { fontSize: 14, fontWeight: '800', color: Colors.green, width: 22, textAlign: 'center' },
  choiceText: { fontSize: 15, fontWeight: '600', color: Colors.zinc950, flex: 1 },
  feedbackBanner: { marginTop: 16, borderRadius: 12, padding: 14, alignItems: 'center' },
  feedbackText: { fontSize: 14, fontWeight: '700', color: Colors.zinc950, textAlign: 'center' },
  doneWrapper: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  doneEmoji: { fontSize: 64, marginBottom: 16 },
  doneTitle: { fontSize: 24, fontWeight: '800', color: Colors.zinc950, marginBottom: 8 },
  doneScore: { fontSize: 18, fontWeight: '700', color: Colors.green, marginBottom: 4 },
  doneXp: { fontSize: 16, fontWeight: '600', color: Colors.orange, marginBottom: 12 },
  doneReturnNote: { fontSize: 13, color: Colors.zinc500, marginBottom: 28, textAlign: 'center' },
  doneBtn: { backgroundColor: Colors.green, borderRadius: 12, paddingHorizontal: 36, paddingVertical: 14 },
  doneBtnText: { fontSize: 16, fontWeight: '800', color: Colors.white },
});
