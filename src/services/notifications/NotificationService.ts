import { Platform, Alert } from 'react-native';

/**
 * 알림 서비스 - 로컬 푸시 알림 관리
 * 
 * 기능:
 * - 휴식 알림 (포모도로)
 * - 일일 리포트 알림
 * - 목표 리마인더
 * - 사용 제한 경고
 * - 파트너 알림
 */

export type NotificationType =
  | 'break_reminder'    // 휴식 알림
  | 'daily_report'      // 일일 리포트
  | 'goal_reminder'     // 목표 리마인더
  | 'usage_warning'     // 사용 제한 경고
  | 'partner_alert'     // 파트너 알림
  | 'streak_celebrate'  // 연속 달성 축하
  | 'challenge_remind'  // 챌린지 리마인더
  | 'focus_complete';   // 집중 세션 완료

interface ScheduledNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  scheduledTime: string; // HH:mm
  enabled: boolean;
  repeatDaily: boolean;
}

const DEFAULT_NOTIFICATIONS: ScheduledNotification[] = [
  {
    id: 'morning_remind',
    type: 'goal_reminder',
    title: '🌅 좋은 아침이에요!',
    body: '오늘의 디지털 디톡스 목표를 확인해보세요.',
    scheduledTime: '08:00',
    enabled: true,
    repeatDaily: true,
  },
  {
    id: 'break_1',
    type: 'break_reminder',
    title: '☕ 휴식 시간이에요',
    body: '50분 동안 집중했어요. 10분 쉬어가세요!',
    scheduledTime: '',
    enabled: true,
    repeatDaily: false,
  },
  {
    id: 'daily_report',
    type: 'daily_report',
    title: '📊 오늘의 리포트',
    body: '오늘 하루 사용 분석이 준비되었어요.',
    scheduledTime: '22:00',
    enabled: true,
    repeatDaily: true,
  },
  {
    id: 'usage_warn',
    type: 'usage_warning',
    title: '⚠️ 사용 시간 경고',
    body: '오늘 설정한 사용 제한에 가까워지고 있어요.',
    scheduledTime: '',
    enabled: true,
    repeatDaily: false,
  },
  {
    id: 'challenge',
    type: 'challenge_remind',
    title: '🎯 오늘의 챌린지',
    body: '오늘의 디지털 디톡스 챌린지를 확인하세요!',
    scheduledTime: '09:00',
    enabled: false,
    repeatDaily: true,
  },
];

export class NotificationService {
  private static scheduledNotifications: ScheduledNotification[] = [...DEFAULT_NOTIFICATIONS];

  /**
   * 알림 권한 요청
   */
  static async requestPermission(): Promise<boolean> {
    // 시뮬레이션 모드에서는 항상 true
    // 프로덕션에서는 expo-notifications 사용
    return true;
  }

  /**
   * 즉시 알림 표시 (시뮬레이션)
   */
  static async showImmediate(title: string, body: string, type: NotificationType): Promise<void> {
    if (__DEV__) {
      console.log(`[Notification] ${type}: ${title} - ${body}`);
    }
    // 시뮬레이션 모드에서는 Alert 사용
    Alert.alert(title, body);
  }

  /**
   * 휴식 알림 (포모도로 스타일)
   */
  static async scheduleBreakReminder(afterMinutes: number): Promise<void> {
    if (__DEV__) {
      console.log(`[Notification] Break reminder scheduled in ${afterMinutes} minutes`);
    }
    // 프로덕션에서는 expo-notifications의 scheduleNotificationAsync 사용
  }

  /**
   * 파트너에게 알림 전송 (시뮬레이션)
   */
  static async notifyPartner(partnerName: string, event: string): Promise<void> {
    if (__DEV__) {
      console.log(`[Notification] Partner ${partnerName}: ${event}`);
    }
    // 프로덕션에서는 서버를 통해 푸시 알림 전송
  }

  /**
   * 연속 달성 축하 알림
   */
  static async celebrateStreak(days: number): Promise<void> {
    const messages: Record<number, string> = {
      3: '3일 연속 달성! 좋은 시작이에요 🔥',
      7: '일주일 연속! 대단해요 ⚡',
      14: '2주 연속! 습관이 되어가고 있어요 💪',
      30: '한 달 연속! 당신은 진정한 마스터 👑',
      100: '100일 연속! 전설이 되었어요 🏆',
    };

    const msg = messages[days];
    if (msg) {
      await this.showImmediate('🎉 축하합니다!', msg, 'streak_celebrate');
    }
  }

  /**
   * 스케줄된 알림 목록 반환
   */
  static getScheduledNotifications(): ScheduledNotification[] {
    return [...this.scheduledNotifications];
  }

  /**
   * 알림 활성화/비활성화
   */
  static toggleNotification(id: string): void {
    this.scheduledNotifications = this.scheduledNotifications.map((n) =>
      n.id === id ? { ...n, enabled: !n.enabled } : n
    );
  }
}
