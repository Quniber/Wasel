import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddressType } from 'database';

@Injectable()
export class AddressesService {
  constructor(private prisma: PrismaService) {}

  // Get all saved addresses for a customer
  async getAddresses(customerId: number) {
    return this.prisma.customerAddress.findMany({
      where: { customerId },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }

  // Get a single address
  async getAddress(customerId: number, addressId: number) {
    const address = await this.prisma.customerAddress.findUnique({
      where: { id: addressId },
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    if (address.customerId !== customerId) {
      throw new ForbiddenException('Not authorized to access this address');
    }

    return address;
  }

  // Create a new saved address
  async createAddress(
    customerId: number,
    data: {
      title: string;
      address: string;
      latitude: number;
      longitude: number;
      type?: string;
      isDefault?: boolean;
    },
  ) {
    // If this is set as default, unset other defaults
    if (data.isDefault) {
      await this.prisma.customerAddress.updateMany({
        where: { customerId, isDefault: true },
        data: { isDefault: false },
      });
    }

    // Map string type to AddressType enum
    let addressType: AddressType = AddressType.other;
    if (data.type === 'home') addressType = AddressType.home;
    else if (data.type === 'work') addressType = AddressType.work;

    return this.prisma.customerAddress.create({
      data: {
        customerId,
        title: data.title,
        address: data.address,
        latitude: data.latitude,
        longitude: data.longitude,
        type: addressType,
        isDefault: data.isDefault || false,
      },
    });
  }

  // Update an address
  async updateAddress(
    customerId: number,
    addressId: number,
    data: {
      title?: string;
      address?: string;
      latitude?: number;
      longitude?: number;
      type?: string;
      isDefault?: boolean;
    },
  ) {
    // Check ownership
    const existing = await this.prisma.customerAddress.findUnique({
      where: { id: addressId },
    });

    if (!existing) {
      throw new NotFoundException('Address not found');
    }

    if (existing.customerId !== customerId) {
      throw new ForbiddenException('Not authorized to update this address');
    }

    // If setting as default, unset other defaults
    if (data.isDefault) {
      await this.prisma.customerAddress.updateMany({
        where: { customerId, isDefault: true, NOT: { id: addressId } },
        data: { isDefault: false },
      });
    }

    // Build update data with proper enum type
    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.latitude !== undefined) updateData.latitude = data.latitude;
    if (data.longitude !== undefined) updateData.longitude = data.longitude;
    if (data.isDefault !== undefined) updateData.isDefault = data.isDefault;
    if (data.type !== undefined) {
      if (data.type === 'home') updateData.type = AddressType.home;
      else if (data.type === 'work') updateData.type = AddressType.work;
      else updateData.type = AddressType.other;
    }

    return this.prisma.customerAddress.update({
      where: { id: addressId },
      data: updateData,
    });
  }

  // Delete an address
  async deleteAddress(customerId: number, addressId: number) {
    // Check ownership
    const existing = await this.prisma.customerAddress.findUnique({
      where: { id: addressId },
    });

    if (!existing) {
      throw new NotFoundException('Address not found');
    }

    if (existing.customerId !== customerId) {
      throw new ForbiddenException('Not authorized to delete this address');
    }

    await this.prisma.customerAddress.delete({
      where: { id: addressId },
    });

    return { message: 'Address deleted successfully' };
  }

  // Set an address as default
  async setDefaultAddress(customerId: number, addressId: number) {
    // Check ownership
    const existing = await this.prisma.customerAddress.findUnique({
      where: { id: addressId },
    });

    if (!existing) {
      throw new NotFoundException('Address not found');
    }

    if (existing.customerId !== customerId) {
      throw new ForbiddenException('Not authorized to update this address');
    }

    // Unset all other defaults
    await this.prisma.customerAddress.updateMany({
      where: { customerId, isDefault: true },
      data: { isDefault: false },
    });

    // Set this one as default
    return this.prisma.customerAddress.update({
      where: { id: addressId },
      data: { isDefault: true },
    });
  }
}
