/**
 * Chip Service
 * Handles chip/stake validation and calculations
 */

import { ChipType, CHIP_VALUES, CHIP_CONFIGS, ChipConfig } from '../types'

export class ChipService {
  /**
   * Get chip value in points
   */
  static getValue(chipType: ChipType): number {
    return CHIP_VALUES[chipType]
  }

  /**
   * Get chip configuration
   */
  static getConfig(chipType: ChipType): ChipConfig {
    return CHIP_CONFIGS[chipType]
  }

  /**
   * Validate chip type
   */
  static isValidChipType(chipType: string): chipType is ChipType {
    return chipType in CHIP_VALUES
  }

  /**
   * Calculate total stake for a duel series
   */
  static calculateTotalStake(chipType: ChipType, gamesPlanned: number): number {
    return CHIP_VALUES[chipType] * gamesPlanned
  }

  /**
   * Calculate stake per game
   */
  static calculateStakePerGame(chipType: ChipType): number {
    return CHIP_VALUES[chipType]
  }

  /**
   * Get all available chip types
   */
  static getAllChipTypes(): ChipConfig[] {
    return Object.values(CHIP_CONFIGS)
  }

  /**
   * Format stake for display
   */
  static formatStake(chipType: ChipType, amount: number = 1): string {
    const config = CHIP_CONFIGS[chipType]
    const totalValue = config.value * amount
    return `${config.emoji} ${totalValue} pts`
  }

  /**
   * Parse chip type from string (case-insensitive)
   */
  static parseChipType(input: string): ChipType | null {
    const normalized = input.toUpperCase()
    if (this.isValidChipType(normalized)) {
      return normalized
    }
    return null
  }
}

