/**
 * Notification Service
 * Handles Telegram notifications (stub for now)
 */

import { TelegramNotification, NotificationType } from '../types'

// Notification templates (Russian/Ukrainian)
const NOTIFICATION_TEMPLATES: Record<NotificationType, string> = {
  OPPONENT_FOUND: '🎮 Найден соперник для дуэли!',
  CONFIRMATION_REQUIRED: '⚔️ Зайдите в игру: у вас появился соперник, у вас есть 2 минуты, чтобы подтвердить сражение.',
  GAME_STARTED: '🎯 Игра началась! Введите ваш код.',
  GAME_RESULT: '🏆 Игра завершена! Проверьте результат.',
  DUEL_COMPLETED: '✅ Дуэль завершена!',
  OPPONENT_FORFEITED: '🚫 Соперник не явился. Вы выиграли техническую победу!',
  CONFIRMATION_EXPIRED: '⏰ Время на подтверждение истекло. Дуэль отменена.',
}

export class NotificationService {
  /**
   * Send Telegram notification (stub)
   * In production, this would use Telegram Bot API
   */
  static async sendTelegramNotification(
    userId: string,
    type: NotificationType,
    additionalData?: Record<string, unknown>
  ): Promise<{ sent: boolean; message: string }> {
    const template = NOTIFICATION_TEMPLATES[type]
    
    // Build notification
    const notification: TelegramNotification = {
      userId,
      message: template,
      type,
    }

    // STUB: Log notification (replace with actual Telegram API call)
    console.log('[TELEGRAM NOTIFICATION]', {
      to: userId,
      type,
      message: notification.message,
      additionalData,
      timestamp: new Date().toISOString(),
    })

    // In production:
    // const telegramBot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN)
    // const user = await getUserById(userId)
    // if (user.telegramId) {
    //   await telegramBot.sendMessage(user.telegramId, notification.message)
    // }

    return {
      sent: true,
      message: notification.message,
    }
  }

  /**
   * Send notification for opponent found
   */
  static async notifyOpponentFound(
    ownerUserId: string,
    opponentUsername: string
  ): Promise<void> {
    await this.sendTelegramNotification(ownerUserId, 'CONFIRMATION_REQUIRED', {
      opponentUsername,
    })
  }

  /**
   * Send notification for game started
   */
  static async notifyGameStarted(
    playerAId: string,
    playerBId: string,
    gameIndex: number
  ): Promise<void> {
    await this.sendTelegramNotification(playerAId, 'GAME_STARTED', { gameIndex })
    await this.sendTelegramNotification(playerBId, 'GAME_STARTED', { gameIndex })
  }

  /**
   * Send notification for game result
   */
  static async notifyGameResult(
    winnerId: string | null,
    loserId: string | null,
    isDraw: boolean
  ): Promise<void> {
    if (isDraw) {
      if (winnerId) await this.sendTelegramNotification(winnerId, 'GAME_RESULT', { isDraw: true })
      if (loserId) await this.sendTelegramNotification(loserId, 'GAME_RESULT', { isDraw: true })
    } else {
      if (winnerId) await this.sendTelegramNotification(winnerId, 'GAME_RESULT', { won: true })
      if (loserId) await this.sendTelegramNotification(loserId, 'GAME_RESULT', { won: false })
    }
  }

  /**
   * Send notification for opponent forfeit
   */
  static async notifyOpponentForfeited(winnerId: string): Promise<void> {
    await this.sendTelegramNotification(winnerId, 'OPPONENT_FORFEITED')
  }

  /**
   * Send notification for confirmation expired
   */
  static async notifyConfirmationExpired(opponentId: string): Promise<void> {
    await this.sendTelegramNotification(opponentId, 'CONFIRMATION_EXPIRED')
  }

  /**
   * Send notification for duel completed
   */
  static async notifyDuelCompleted(
    playerAId: string,
    playerBId: string,
    winnerId: string | null
  ): Promise<void> {
    await this.sendTelegramNotification(playerAId, 'DUEL_COMPLETED', { winnerId })
    await this.sendTelegramNotification(playerBId, 'DUEL_COMPLETED', { winnerId })
  }
}


