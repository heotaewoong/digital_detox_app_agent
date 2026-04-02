import { Platform, Alert, Linking } from 'react-native';
import { MotivationContent } from '@/types';

/**
 * OverlayBridge - interface to native overlay window service.
 *
 * In production, this would use Android's SYSTEM_ALERT_WINDOW permission
 * to display a full-screen overlay when harmful content is detected.
 * Currently operates in simulation mode, logging actions and showing alerts.
 */
export class OverlayBridge {
  private static overlayVisible = false;

  /**
   * Checks whether the overlay (draw over other apps) permission is granted.
   * In simulation mode, always returns false.
   */
  static async isOverlayPermissionGranted(): Promise<boolean> {
    // In production: NativeModules.OverlayBridge.isOverlayPermissionGranted()
    return false;
  }

  /**
   * Requests the overlay permission from the user.
   * On Android, opens the system settings for draw-over-apps permission.
   */
  static async requestOverlayPermission(): Promise<void> {
    if (Platform.OS === 'android') {
      try {
        await Linking.openSettings();
      } catch {
        Alert.alert(
          '오버레이 권한 필요',
          '설정 > 앱 > ContentGuardian > 다른 앱 위에 표시에서 권한을 허용해주세요.',
          [{ text: '확인' }]
        );
      }
    } else {
      Alert.alert(
        '시뮬레이션 모드',
        '오버레이 기능은 Android에서만 사용 가능합니다. 현재 시뮬레이션 모드로 동작합니다.',
        [{ text: '확인' }]
      );
    }
  }

  /**
   * Shows a blocking overlay with motivation content.
   * In simulation mode, shows an alert dialog with the motivation message.
   */
  static async showBlockOverlay(
    motivationContent: MotivationContent
  ): Promise<void> {
    // In production: NativeModules.OverlayBridge.showOverlay(motivationContent)
    OverlayBridge.overlayVisible = true;

    if (__DEV__) {
      console.log('[OverlayBridge] Show overlay:', motivationContent.content);
    }

    Alert.alert('ContentGuardian', motivationContent.content, [
      {
        text: '돌아가기',
        onPress: () => {
          OverlayBridge.overlayVisible = false;
        },
      },
    ]);
  }

  /**
   * Hides the blocking overlay.
   */
  static async hideBlockOverlay(): Promise<void> {
    // In production: NativeModules.OverlayBridge.hideOverlay()
    OverlayBridge.overlayVisible = false;

    if (__DEV__) {
      console.log('[OverlayBridge] Hide overlay');
    }
  }

  /**
   * Indicates whether the bridge is operating in simulation mode.
   */
  static isSimulationMode(): boolean {
    return true;
  }
}
