import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '@/utils/theme';

interface MoodCheckInProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (mood: string, energy: number, note?: string) => void;
}

const MOOD_OPTIONS = [
  { emoji: '\u{1F604}', label: '좋아요', value: 'great' },
  { emoji: '\u{1F642}', label: '괜찮아요', value: 'okay' },
  { emoji: '\u{1F610}', label: '보통', value: 'neutral' },
  { emoji: '\u{1F630}', label: '스트레스', value: 'stressed' },
  { emoji: '\u{1F61F}', label: '불안', value: 'anxious' },
] as const;

const ENERGY_LEVELS = [1, 2, 3, 4, 5] as const;

export default function MoodCheckIn({ visible, onClose, onSubmit }: MoodCheckInProps) {
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [energy, setEnergy] = useState<number>(0);
  const [note, setNote] = useState('');

  const handleSubmit = () => {
    if (!selectedMood || energy === 0) return;
    onSubmit(selectedMood, energy, note.trim() || undefined);
    // Reset state
    setSelectedMood(null);
    setEnergy(0);
    setNote('');
  };

  const handleClose = () => {
    setSelectedMood(null);
    setEnergy(0);
    setNote('');
    onClose();
  };

  const isValid = selectedMood !== null && energy > 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          {/* Header */}
          <Text style={styles.title}>오늘 기분이 어떠세요?</Text>
          <Text style={styles.subtitle}>감정을 기록하면 패턴을 분석해드려요</Text>

          {/* Mood Selector */}
          <View style={styles.moodRow}>
            {MOOD_OPTIONS.map((mood) => (
              <TouchableOpacity
                key={mood.value}
                style={[
                  styles.moodButton,
                  selectedMood === mood.value && styles.moodButtonSelected,
                ]}
                onPress={() => setSelectedMood(mood.value)}
                activeOpacity={0.7}
              >
                <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                <Text
                  style={[
                    styles.moodLabel,
                    selectedMood === mood.value && styles.moodLabelSelected,
                  ]}
                >
                  {mood.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Energy Slider */}
          <View style={styles.energySection}>
            <Text style={styles.sectionLabel}>에너지 레벨</Text>
            <View style={styles.energyRow}>
              {ENERGY_LEVELS.map((level) => (
                <TouchableOpacity
                  key={level}
                  onPress={() => setEnergy(level)}
                  activeOpacity={0.7}
                  style={styles.energyTouchable}
                >
                  <View
                    style={[
                      styles.energyCircle,
                      energy >= level && styles.energyCircleFilled,
                    ]}
                  />
                  <Text style={styles.energyNumber}>{level}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Note Input */}
          <View style={styles.noteSection}>
            <Text style={styles.sectionLabel}>메모 (선택)</Text>
            <TextInput
              style={styles.noteInput}
              placeholder="오늘 느낀 점을 자유롭게 적어보세요..."
              placeholderTextColor={colors.textMuted}
              value={note}
              onChangeText={setNote}
              multiline
              maxLength={200}
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={!isValid}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={
                isValid
                  ? [colors.primaryStart, colors.primaryEnd]
                  : ['#333350', '#333350']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.submitButton}
            >
              <Text
                style={[
                  styles.submitText,
                  !isValid && styles.submitTextDisabled,
                ]}
              >
                기록하기
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: spacing.lg,
    // Glassmorphism
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  moodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  moodButton: {
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'transparent',
    flex: 1,
    marginHorizontal: 2,
  },
  moodButtonSelected: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderColor: colors.primary,
  },
  moodEmoji: {
    fontSize: 28,
    marginBottom: spacing.xs,
  },
  moodLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: fontWeight.medium,
  },
  moodLabelSelected: {
    color: colors.primary,
  },
  energySection: {
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  energyRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  energyTouchable: {
    alignItems: 'center',
    gap: 6,
  },
  energyCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.textMuted,
    backgroundColor: 'transparent',
  },
  energyCircleFilled: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  energyNumber: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  noteSection: {
    marginBottom: spacing.lg,
  },
  noteInput: {
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    minHeight: 72,
    textAlignVertical: 'top',
  },
  submitButton: {
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  submitTextDisabled: {
    color: colors.textMuted,
  },
});
