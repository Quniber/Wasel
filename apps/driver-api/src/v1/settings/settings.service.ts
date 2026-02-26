import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getCarModels() {
    return this.prisma.carModel.findMany({
      where: { isActive: true },
      orderBy: [
        { brand: 'asc' },
        { model: 'asc' },
      ],
    });
  }

  async getCarColors() {
    return this.prisma.carColor.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }
}
