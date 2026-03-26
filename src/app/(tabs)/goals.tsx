import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useUserStore } from '@/store/useUserStore';
import { GoalCategory } from '@/types';

const CATEGORIES: { key: GoalCategory; emoji: string; label: string }[] = [
  { key: 'career', emoji: '💼', label: '커리어' },
  { key: 'health', emoji: '❤️', label: '건강' },
  { key: 'education', emoji: '📚', label: '교육' },
  { key: 'relationship', emoji: '👥', label: '관계' },
  { key: 'creative', emoji: '🎨', label: '창작' },
  { key: 'financial', emoji: '💰', label: '재무' },
];

export default function GoalsScreen() {
  const profile = useUserStore((s) => s.profile);
  const addGoal = useUserStore((s) => s.addGoal);
  const removeGoal = useUserStore((s) => s.removeGoal);
  const updateGoalProgress = useUserStore((s) => s.updateGoalProgress);

  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState<GoalCategory>('career');

  const handleAddGoal = () => {
    if (!newTitle.trim()) return;
    addGoal(newTitle.trim(), newDesc.trim(), newCategory);
    setNewTitle('');
    setNewDesc('');
    setShowModal(false);
  };

  const goals = profile?.goals || [];
  const dreams = profile?.dreams || [];

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>나의 목표</Text>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setShowModal(true)}
          >
            <Ionicons name="add" size={24} color="#8B5CF6" />
          </TouchableOpacity>
        </View>

        {/* Dreams Section */}
        {dreams.length > 0 && (
          <LinearGradient
            colors={['rgba(139,92,246,0.15)', 'rgba(168,85,247,0.05)']}
            style={styles.dreamCard}
          >
            <Text style={styles.dreamLabel}>나의 꿈</Text>
            {dreams.map((dream, i) => (
              <Text key={i} style={styles.dreamText}>
                "{dream}"
              </Text>
            ))}
          </LinearGradient>
        )}

        {/* Goals List */}
        {goals.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="rocket-outline" size={48} color="#6B6B8D" />
            <Text style={styles.emptyText}>아직 목표가 없어요</Text>
            <Text style={styles.emptySubtext}>+ 버튼을 눌러 목표를 추가해보세요</Text>
          </View>
        ) : (
          goals.map((goal) => {
            const catInfo = CATEGORIES.find((c) => c.key === goal.category);
            return (
              <View key={goal.id} style={styles.goalCard}>
                <View style={styles.goalHeader}>
                  <View style={styles.goalTitleRow}>
                    <Text style={styles.goalEmoji}>{catInfo?.emoji || '🎯'}</Text>
                    <View style={styles.goalTitleGroup}>
                      <Text style={styles.goalTitle}>{goal.title}</Text>
                      {goal.description ? (
                        <Text style={styles.goalDesc}>{goal.description}</Text>
                      ) : null}
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => removeGoal(goal.id)}>
                    <Ionicons name="close-circle" size={20} color="#6B6B8D" />
                  </TouchableOpacity>
                </View>

                <View style={styles.progressSection}>
                  <View style={styles.progressBarBg}>
                    <LinearGradient
                      colors={['#6C5CE7', '#A855F7']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[
                        styles.progressBarFill,
                        { width: `${Math.min(goal.progress, 100)}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.progressText}>{goal.progress}%</Text>
                </View>

                <View style={styles.progressButtons}>
                  {[10, 25, 50].map((inc) => (
                    <TouchableOpacity
                      key={inc}
                      style={styles.incButton}
                      onPress={() =>
                        updateGoalProgress(
                          goal.id,
                          Math.min(goal.progress + inc, 100)
                        )
                      }
                    >
                      <Text style={styles.incButtonText}>+{inc}%</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            );
          })
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Add Goal Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>새 목표 추가</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color="#A0A0C0" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>목표</Text>
            <TextInput
              style={styles.input}
              placeholder="목표를 입력하세요"
              placeholderTextColor="#6B6B8D"
              value={newTitle}
              onChangeText={setNewTitle}
            />

            <Text style={styles.inputLabel}>설명 (선택)</Text>
            <TextInput
              style={styles.input}
              placeholder="목표에 대한 설명"
              placeholderTextColor="#6B6B8D"
              value={newDesc}
              onChangeText={setNewDesc}
            />

            <Text style={styles.inputLabel}>카테고리</Text>
            <View style={styles.catGrid}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.key}
                  style={[
                    styles.catChip,
                    newCategory === cat.key && styles.catChipActive,
                  ]}
                  onPress={() => setNewCategory(cat.key)}
                >
                  <Text style={styles.catChipEmoji}>{cat.emoji}</Text>
                  <Text
                    style={[
                      styles.catChipLabel,
                      newCategory === cat.key && styles.catChipLabelActive,
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, !newTitle.trim() && { opacity: 0.5 }]}
              onPress={handleAddGoal}
              disabled={!newTitle.trim()}
            >
              <LinearGradient
                colors={['#6C5CE7', '#A855F7']}
                style={styles.saveBtnGrad}
              >
                <Text style={styles.saveBtnText}>추가하기</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A1A',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(139,92,246,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dreamCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.3)',
  },
  dreamLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8B5CF6',
    marginBottom: 8,
  },
  dreamText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    lineHeight: 26,
  },
  emptyCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#6B6B8D',
    marginTop: 6,
  },
  goalCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  goalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  goalEmoji: {
    fontSize: 28,
  },
  goalTitleGroup: {
    flex: 1,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  goalDesc: {
    fontSize: 13,
    color: '#6B6B8D',
    marginTop: 2,
  },
  progressSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  progressBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8B5CF6',
    width: 40,
    textAlign: 'right',
  },
  progressButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  incButton: {
    backgroundColor: 'rgba(139,92,246,0.15)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  incButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  bottomSpacer: {
    height: 100,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1A1A35',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 48,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#A0A0C0',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#FFFFFF',
  },
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  catChipActive: {
    backgroundColor: 'rgba(139,92,246,0.2)',
    borderColor: '#8B5CF6',
  },
  catChipEmoji: {
    fontSize: 14,
  },
  catChipLabel: {
    fontSize: 13,
    color: '#A0A0C0',
  },
  catChipLabelActive: {
    color: '#FFFFFF',
  },
  saveBtn: {
    marginTop: 24,
  },
  saveBtnGrad: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
