import { useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { MoodType } from '@/types';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit: (mood: MoodType, energy: number, note?: string) => void;
}

const MOODS: { mood: MoodType; emoji: string; label: string }[] = [
  { mood: 'great',    emoji: '😄', label: '좋아요' },
  { mood: 'good',     emoji: '🙂', label: '괜찮아요' },
  { mood: 'neutral',  emoji: '😐', label: '보통' },
  { mood: 'stressed', emoji: '😰', label: '스트레스' },
  { mood: 'anxious',  emoji: '😟', label: '불안' },
];

export default function MoodCheckIn({ visible, onClose, onSubmit }: Props) {
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null);
  const [energy, setEnergy] = useState(3);
  const [note, setNote] = useState('');

  const reset = () => { setSelectedMood(null); setEnergy(3); setNote(''); };

  const handleSubmit = () => {
    if (!selectedMood) return;
    onSubmit(selectedMood, energy, note.trim() || undefined);
    reset();
  };

  const handleClose = () => { reset(); onClose(); };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.kv}>
          <View style={styles.card}>
            <Text style={styles.title}>😊 지금 기분이 어때요?</Text>

            {/* 무드 버튼 */}
            <View style={styles.moodRow}>
              {MOODS.map(({ mood, emoji, label }) => {
                const active = selectedMood === mood;
                return (
                  <TouchableOpacity key={mood} onPress={() => setSelectedMood(mood)}
                    style={styles.moodWrap} activeOpacity={0.8}>
                    {active ? (
                      <LinearGradient colors={['#6C5CE7', '#A855F7']} style={styles.moodBtn}>
                        <Text style={styles.emoji}>{emoji}</Text>
                        <Text style={[styles.moodLabel, { color: '#FFF' }]}>{label}</Text>
                      </LinearGradient>
                    ) : (
                      <View style={[styles.moodBtn, styles.moodBtnInactive]}>
                        <Text style={styles.emoji}>{emoji}</Text>
                        <Text style={styles.moodLabel}>{label}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 에너지 레벨 */}
            <Text style={styles.sectionLabel}>에너지 레벨</Text>
            <View style={styles.energyRow}>
              {[1, 2, 3, 4, 5].map((lv) => (
                <TouchableOpacity key={lv} onPress={() => setEnergy(lv)}
                  style={[styles.circle, lv <= energy && styles.circleFilled]} activeOpacity={0.8}>
                  <Text style={[styles.circleNum, lv <= energy && { color: '#FFF' }]}>{lv}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* 메모 */}
            <TextInput
              style={styles.noteInput}
              placeholder="메모 (선택)"
              placeholderTextColor="#6B6B8D"
              value={note}
              onChangeText={setNote}
              multiline
              maxLength={200}
            />

            {/* 버튼 */}
            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={handleClose} activeOpacity={0.7}>
                <Text style={styles.cancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitWrap, !selectedMood && { opacity: 0.45 }]}
                onPress={handleSubmit} disabled={!selectedMood} activeOpacity={0.8}>
                <LinearGradient
                  colors={selectedMood ? ['#6C5CE7', '#A855F7'] : ['#3A3A5A', '#3A3A5A']}
                  style={styles.submitBtn}>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#FFF" style={{ marginRight: 6 }} />
                  <Text style={styles.submitText}>기록하기</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'center', alignItems: 'center' },
  kv: { width: '100%', alignItems: 'center', paddingHorizontal: 24 },
  card: {
    width: '100%', backgroundColor: 'rgba(26,26,46,0.98)',
    borderRadius: 20, borderWidth: 1, borderColor: '#8B5CF6', padding: 24,
    shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 16, elevation: 10,
  },
  title: { fontSize: 20, fontWeight: '700', color: '#FFF', textAlign: 'center', marginBottom: 20 },
  moodRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  moodWrap: { flex: 1, marginHorizontal: 3 },
  moodBtn: { alignItems: 'center', justifyContent: 'center', borderRadius: 12, paddingVertical: 10 },
  moodBtnInactive: { backgroundColor: '#1A1A35', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  emoji: { fontSize: 22, marginBottom: 4 },
  moodLabel: { fontSize: 10, color: '#A0A0C0', fontWeight: '500' },
  sectionLabel: { fontSize: 14, color: '#A0A0C0', fontWeight: '600', marginBottom: 10 },
  energyRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  circle: {
    width: 40, height: 40, borderRadius: 20,
    borderWidth: 2, borderColor: '#3A3A5A',
    alignItems: 'center', justifyContent: 'center',
  },
  circleFilled: { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' },
  circleNum: { fontSize: 14, color: '#6B6B8D', fontWeight: '600' },
  noteInput: {
    backgroundColor: '#141428', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    color: '#FFF', fontSize: 14, padding: 12,
    minHeight: 72, textAlignVertical: 'top', marginBottom: 20,
  },
  btnRow: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1, borderRadius: 12, borderWidth: 1, borderColor: '#8B5CF6',
    alignItems: 'center', justifyContent: 'center', paddingVertical: 14,
  },
  cancelText: { color: '#8B5CF6', fontSize: 15, fontWeight: '600' },
  submitWrap: { flex: 2, borderRadius: 12, overflow: 'hidden' },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
  submitText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
