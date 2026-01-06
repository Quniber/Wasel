import { Controller, Get } from '@nestjs/common';
import { SettingsService } from './settings.service';

@Controller('settings')
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
