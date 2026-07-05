import { Injectable } from '@nestjs/common';
import { AppConfigModel } from './models/app-config.persistence-model';

const TRIAL_DAYS_KEY = 'trialDays';
const DEFAULT_TRIAL_DAYS = 7;

@Injectable()
export class AppConfigService {
  async getConfig(): Promise<{ trialDays: number }> {
    const doc = await AppConfigModel.findOne({ key: TRIAL_DAYS_KEY }).lean().exec();
    if (typeof doc?.value === 'number') {
      return { trialDays: doc.value };
    }

    const legacyDoc = await AppConfigModel.findOne({ key: 'global' }).lean().exec();
    return {
      trialDays:
        typeof (legacyDoc as any)?.trialDays === 'number'
          ? (legacyDoc as any).trialDays
          : DEFAULT_TRIAL_DAYS,
    };
  }

  async updateConfig(payload: { trialDays?: number }): Promise<{ trialDays: number }> {
    if (payload.trialDays !== undefined) {
      await AppConfigModel.findOneAndUpdate(
        { key: TRIAL_DAYS_KEY },
        { value: payload.trialDays },
        { upsert: true, new: true },
      ).exec();
    }
    return this.getConfig();
  }
}
