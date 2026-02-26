import { Controller, Get } from '@nestjs/common';
import { SettingsService } from './settings.service';

@Controller({ path: 'settings', version: '1' })
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('car-models')
  async getCarModels() {
    return this.settingsService.getCarModels();
  }

  @Get('car-colors')
  async getCarColors() {
    return this.settingsService.getCarColors();
  }
}
