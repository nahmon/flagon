import React, { useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../src/constants';

const { width: SCREEN_W } = Dimensions.get('window');

type Slide = {
  id: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  body: string;
};

const SLIDES: Slide[] = [
  {
    id: '1',
    icon: 'flag',
    title: '정상을 정복하라',
    body: 'FlagOn에 오신 것을 환영합니다.\n산 정상에 크루 깃발을 꽂고\n대한민국을 제패하세요.',
  },
  {
    id: '2',
    icon: 'location',
    title: '깃발 꽂기',
    body: '정상 150m 이내에서\n20분 이상 머물면\nGPS로 자동 인증됩니다.',
  },
  {
    id: '3',
    icon: 'people',
    title: '크루 경쟁',
    body: '크루를 만들거나 가입하여\n다른 팀과 정상 점유를\n놓고 경쟁하세요.',
  },
];

export default function OnboardingScreen() {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatRef = useRef<FlatList<Slide>>(null);

  async function finish() {
    await AsyncStorage.setItem('onboarding_done', '1');
    router.replace('/(auth)/login');
  }

  function next() {
    if (activeIndex < SLIDES.length - 1) {
      flatRef.current?.scrollToIndex({ index: activeIndex + 1 });
    } else {
      finish();
    }
  }

  function onViewableItemsChanged({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) {
    if (viewableItems[0]?.index != null) {
      setActiveIndex(viewableItems[0].index);
    }
  }

  const viewConfig = { viewAreaCoveragePercentThreshold: 50 };

  return (
    <View style={styles.root}>
      <Animated.FlatList
        ref={flatRef}
        data={SLIDES}
        keyExtractor={(s) => s.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false },
        )}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewConfig}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <View style={styles.iconWrap}>
              <Ionicons name={item.icon} size={72} color={Colors.white} />
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.body}>{item.body}</Text>
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => {
            const inputRange = [(i - 1) * SCREEN_W, i * SCREEN_W, (i + 1) * SCREEN_W];
            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [8, 24, 8],
              extrapolate: 'clamp',
            });
            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.4, 1, 0.4],
              extrapolate: 'clamp',
            });
            return (
              <Animated.View key={i} style={[styles.dot, { width: dotWidth, opacity }]} />
            );
          })}
        </View>

        <TouchableOpacity style={styles.btn} onPress={next} activeOpacity={0.8}>
          <Text style={styles.btnText}>
            {activeIndex === SLIDES.length - 1 ? '시작하기' : '다음'}
          </Text>
        </TouchableOpacity>

        {activeIndex < SLIDES.length - 1 && (
          <TouchableOpacity onPress={finish} style={styles.skip}>
            <Text style={styles.skipText}>건너뛰기</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.green,
  },
  slide: {
    width: SCREEN_W,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  iconWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.greenDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.cream,
    textAlign: 'center',
    marginBottom: 20,
  },
  body: {
    fontSize: 16,
    color: Colors.cream,
    textAlign: 'center',
    lineHeight: 26,
    opacity: 0.85,
  },
  footer: {
    paddingBottom: 48,
    paddingHorizontal: 32,
    alignItems: 'center',
    gap: 16,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.cream,
  },
  btn: {
    backgroundColor: Colors.cream,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 48,
    width: '100%',
    alignItems: 'center',
  },
  btnText: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.greenDark,
  },
  skip: {
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 14,
    color: Colors.cream,
    opacity: 0.7,
  },
});
