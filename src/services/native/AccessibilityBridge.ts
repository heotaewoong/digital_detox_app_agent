import { Platform, Alert, Linking } from 'react-native';

const SIMULATED_APPS = [
  'com.android.chrome',
  'com.instagram.android',
  'com.twitter.android',
  'com.facebook.katana',
  'com.nhn.android.nmap',
  'com.kakao.talk',
];

const SIMULATED_SCREEN_TEXTS = [
  '오늘의 추천 게임을 확인해보세요! 신작 RPG 출시',
  '주말 특가 세일 최대 70% 할인 쿠폰 받기',
  '실시간 인기 뉴스: 오늘의 주요 헤드라인',
  '친구들의 새 게시물을 확인하세요. 좋아요 팔로우',
  '지금 가입하면 첫 베팅 보너스 지급! 카지노 슬롯',
];

/**
 * AccessibilityBridge - interface to native Android AccessibilityService.
 *
 * Currently operates in simulation mode. In production, this would use
 * React Native's NativeModules to communicate with a custom Android
 * AccessibilityService that monitors on-screen content.
 */
export class AccessibilityBridge {
  /**
   * Checks whether the accessibility service is enabled.
   * In simulation mode, always returns false since native setup is required.
   */
  static async isAccessibilityEnabled(): Promise<boolean> {
    // In production, this would call NativeModules.AccessibilityBridge.isEnabled()
    return false;
  }

  /**
   * Requests the user to enable the accessibility permission.
   * In simulation mode, shows an alert or opens device settings.
   */
  static async requestAccessibilityPermission(): Promise<void> {
    if (Platform.OS === 'android') {
      try {
        await Linking.openSettings();
      } catch {
        Alert.alert(
          '접근성 권한 필요',
          '설정 > 접근성 > ContentGuardian에서 서비스를 활성화해주세요.',
          [{ text: '확인' }]
        );
      }
    } else {
      Alert.alert(
        '시뮬레이션 모드',
        '접근성 서비스는 Android에서만 사용 가능합니다. 현재 시뮬레이션 모드로 동작합니다.',
        [{ text: '확인' }]
      );
    }
  }

  /**
   * Returns the name of the currently active app.
   * In simulation mode, returns a random simulated app name.
   */
  static async getCurrentAppName(): Promise<string> {
    // In production: NativeModules.AccessibilityBridge.getCurrentAppName()
    return SIMULATED_APPS[Math.floor(Math.random() * SIMULATED_APPS.length)];
  }

  /**
   * Returns the text currently displayed on screen.
   * In simulation mode, returns simulated screen text.
   */
  static async getScreenText(): Promise<string> {
    // In production: NativeModules.AccessibilityBridge.getScreenText()
    return SIMULATED_SCREEN_TEXTS[
      Math.floor(Math.random() * SIMULATED_SCREEN_TEXTS.length)
    ];
  }

  /**
   * Indicates whether the bridge is operating in simulation mode.
   */
  static isSimulationMode(): boolean {
    return true;
  }
}
