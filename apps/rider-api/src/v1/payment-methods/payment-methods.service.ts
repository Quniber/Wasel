import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class PaymentMethodsService {
  constructor(private prisma: PrismaService) {}

  // Get all payment methods for customer
  async getPaymentMethods(customerId: number) {
    const methods = await this.prisma.savedPaymentMethod.findMany({
      where: { customerId },
      include: { paymentGateway: true },
      orderBy: { createdAt: 'desc' },
    });

    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { defaultPaymentMethodId: true },
    });

    return methods.map((m) => ({
      id: m.id,
      title: m.title,
      lastFour: m.lastFour,
      providerBrand: m.providerBrand,
      paymentGatewayType: m.paymentGateway.type,
      isDefault: m.id === customer?.defaultPaymentMethodId,
      createdAt: m.createdAt,
    }));
  }

  // Add a new payment method
  async addPaymentMethod(
    customerId: number,
    data: {
      paymentGatewayId: number;
      title: string;
      token: string;
      lastFour?: string;
      providerBrand?: string;
    },
  ) {
    // Verify payment gateway exists and is enabled
    const gateway = await this.prisma.paymentGateway.findFirst({
      where: { id: data.paymentGatewayId, isEnabled: true },
    });

    if (!gateway) {
      throw new NotFoundException('Payment gateway not found or disabled');
    }

    const method = await this.prisma.savedPaymentMethod.create({
      data: {
        customerId,
        paymentGatewayId: data.paymentGatewayId,
        title: data.title,
        token: data.token,
        lastFour: data.lastFour,
        providerBrand: data.providerBrand,
      },
      include: { paymentGateway: true },
    });

    // If this is the first payment method, set as default
    const count = await this.prisma.savedPaymentMethod.count({
      where: { customerId },
    });

    if (count === 1) {
      await this.prisma.customer.update({
        where: { id: customerId },
        data: { defaultPaymentMethodId: method.id },
      });
    }

    return {
      id: method.id,
      title: method.title,
      lastFour: method.lastFour,
      providerBrand: method.providerBrand,
      paymentGatewayType: method.paymentGateway.type,
      isDefault: count === 1,
    };
  }

  // Delete a payment method
  async deletePaymentMethod(customerId: number, methodId: number) {
    const method = await this.prisma.savedPaymentMethod.findUnique({
      where: { id: methodId },
    });

    if (!method) {
      throw new NotFoundException('Payment method not found');
    }

    if (method.customerId !== customerId) {
      throw new ForbiddenException('Not authorized to delete this payment method');
    }

    // If this was the default, clear it
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { defaultPaymentMethodId: true },
    });

    if (customer?.defaultPaymentMethodId === methodId) {
      await this.prisma.customer.update({
        where: { id: customerId },
        data: { defaultPaymentMethodId: null },
      });
    }

    await this.prisma.savedPaymentMethod.delete({
      where: { id: methodId },
    });

    return { message: 'Payment method deleted successfully' };
  }

  // Set default payment method
  async setDefaultPaymentMethod(customerId: number, methodId: number) {
    const method = await this.prisma.savedPaymentMethod.findUnique({
      where: { id: methodId },
      include: { paymentGateway: true },
    });

    if (!method) {
      throw new NotFoundException('Payment method not found');
    }

    if (method.customerId !== customerId) {
      throw new ForbiddenException('Not authorized to update this payment method');
    }

    await this.prisma.customer.update({
      where: { id: customerId },
      data: { defaultPaymentMethodId: methodId },
    });

    return {
      id: method.id,
      title: method.title,
      lastFour: method.lastFour,
      providerBrand: method.providerBrand,
      paymentGatewayType: method.paymentGateway.type,
      isDefault: true,
    };
  }

  // Get payment gateways (available payment options)
  async getPaymentGateways() {
    const gateways = await this.prisma.paymentGateway.findMany({
      where: { isEnabled: true },
      orderBy: { id: 'asc' },
      include: { media: true },
    });

    return gateways.map((g) => ({
      id: g.id,
      type: g.type,
      title: g.title,
      description: g.description,
      media: g.media,
    }));
  }
}
