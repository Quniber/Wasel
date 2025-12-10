import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus, DriverStatus, CustomerStatus } from 'database';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const [
      totalCustomers,
      activeCustomers,
      totalDrivers,
      approvedDrivers,
      onlineDrivers,
      totalOrders,
      completedOrders,
      cancelledOrders,
      todayOrders,
      todayRevenue,
    ] = await Promise.all([
      // Customers
      this.prisma.customer.count(),
      this.prisma.customer.count({ where: { status: CustomerStatus.enabled } }),

      // Drivers
      this.prisma.driver.count(),
      this.prisma.driver.count({ where: { status: { in: [DriverStatus.online, DriverStatus.offline, DriverStatus.in_ride] } } }),
      this.prisma.driver.count({ where: { status: DriverStatus.online } }),

      // Orders
      this.prisma.order.count(),
      this.prisma.order.count({ where: { status: OrderStatus.Finished } }),
      this.prisma.order.count({ where: { status: { in: [OrderStatus.DriverCanceled, OrderStatus.RiderCanceled] } } }),

      // Today's orders
      this.prisma.order.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),

      // Today's revenue
      this.prisma.order.aggregate({
        where: {
          status: OrderStatus.Finished,
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
        _sum: { paidAmount: true },
      }),
    ]);

    // Calculate total revenue
    const totalRevenueResult = await this.prisma.order.aggregate({
      where: { status: OrderStatus.Finished },
      _sum: { paidAmount: true },
    });

    // Calculate pending orders
    const pendingOrders = await this.prisma.order.count({
      where: {
        status: { in: [OrderStatus.Requested, OrderStatus.Booked] },
      },
    });

    return {
      totalCustomers,
      totalDrivers,
      activeDrivers: onlineDrivers,
      totalOrders,
      pendingOrders,
      totalRevenue: Number(totalRevenueResult._sum?.paidAmount || 0),
      // Keep nested data for backward compatibility
      customers: {
        total: totalCustomers,
        active: activeCustomers,
      },
      drivers: {
        total: totalDrivers,
        approved: approvedDrivers,
        online: onlineDrivers,
      },
      orders: {
        total: totalOrders,
        completed: completedOrders,
        cancelled: cancelledOrders,
        today: todayOrders,
      },
      revenue: {
        total: Number(totalRevenueResult._sum?.paidAmount || 0),
        today: Number(todayRevenue._sum?.paidAmount || 0),
      },
    };
  }

  async getCharts(period: 'week' | 'month' = 'week') {
    const now = new Date();
    const days = period === 'week' ? 7 : 30;
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // Get orders grouped by day
    const orders = await this.prisma.order.findMany({
      where: {
        createdAt: { gte: startDate },
      },
      select: {
        createdAt: true,
        status: true,
        paidAmount: true,
      },
    });

    // Group orders by date
    const ordersByDay: Record<string, { count: number; completed: number; revenue: number }> = {};

    for (let i = 0; i < days; i++) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateKey = date.toISOString().split('T')[0];
      ordersByDay[dateKey] = { count: 0, completed: 0, revenue: 0 };
    }

    orders.forEach((order) => {
      const dateKey = order.createdAt.toISOString().split('T')[0];
      if (ordersByDay[dateKey]) {
        ordersByDay[dateKey].count++;
        if (order.status === OrderStatus.Finished) {
          ordersByDay[dateKey].completed++;
          ordersByDay[dateKey].revenue += Number(order.paidAmount || 0);
        }
      }
    });

    // Convert to array sorted by date
    const chartData = Object.entries(ordersByDay)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      orders: chartData,
      period,
      summary: {
        totalOrders: orders.length,
        totalCompleted: orders.filter(o => o.status === OrderStatus.Finished).length,
        totalRevenue: orders
          .filter(o => o.status === OrderStatus.Finished)
          .reduce((sum, o) => sum + Number(o.paidAmount || 0), 0),
      },
    };
  }

  async getLiveData() {
    const [
      onlineDrivers,
      activeOrders,
      pendingOrders,
      inProgressOrders,
    ] = await Promise.all([
      // Online drivers with location
      this.prisma.driver.findMany({
        where: { status: DriverStatus.online },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          latitude: true,
          longitude: true,
          status: true,
        },
        take: 100,
      }),

      // Active orders (not completed/cancelled)
      this.prisma.order.findMany({
        where: {
          status: {
            in: [
              OrderStatus.Requested,
              OrderStatus.Booked,
              OrderStatus.Found,
              OrderStatus.NotFound,
              OrderStatus.NoCloseFound,
              OrderStatus.DriverAccepted,
              OrderStatus.Arrived,
              OrderStatus.Started,
              OrderStatus.WaitingForPrePay,
              OrderStatus.WaitingForPostPay,
            ],
          },
        },
        include: {
          customer: {
            select: { id: true, firstName: true, lastName: true },
          },
          driver: {
            select: { id: true, firstName: true, lastName: true },
          },
          service: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),

      // Pending orders count
      this.prisma.order.count({
        where: {
          status: { in: [OrderStatus.Requested, OrderStatus.Booked] },
        },
      }),

      // In-progress orders count
      this.prisma.order.count({
        where: {
          status: { in: [OrderStatus.DriverAccepted, OrderStatus.Arrived, OrderStatus.Started] },
        },
      }),
    ]);

    return {
      drivers: {
        online: onlineDrivers.length,
        list: onlineDrivers,
      },
      orders: {
        active: activeOrders.length,
        pending: pendingOrders,
        inProgress: inProgressOrders,
        list: activeOrders,
      },
      timestamp: new Date().toISOString(),
    };
  }

  async getRecentActivity(limit = 20) {
    const [recentOrders, recentCustomers, recentDrivers] = await Promise.all([
      this.prisma.order.findMany({
        select: {
          id: true,
          status: true,
          createdAt: true,
          customer: { select: { firstName: true, lastName: true } },
          driver: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      this.prisma.customer.findMany({
        select: { id: true, firstName: true, lastName: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      this.prisma.driver.findMany({
        select: { id: true, firstName: true, lastName: true, status: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    return {
      recentOrders,
      recentCustomers,
      recentDrivers,
    };
  }

  async getRecentOrders(limit = 10) {
    return this.prisma.order.findMany({
      include: {
        customer: {
          select: { id: true, firstName: true, lastName: true, mobileNumber: true },
        },
        driver: {
          select: { id: true, firstName: true, lastName: true, mobileNumber: true },
        },
        service: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getOrdersByStatus() {
    const [requested, accepted, started, finished, cancelled] = await Promise.all([
      this.prisma.order.count({ where: { status: OrderStatus.Requested } }),
      this.prisma.order.count({ where: { status: OrderStatus.DriverAccepted } }),
      this.prisma.order.count({ where: { status: OrderStatus.Started } }),
      this.prisma.order.count({ where: { status: OrderStatus.Finished } }),
      this.prisma.order.count({ where: { status: { in: [OrderStatus.DriverCanceled, OrderStatus.RiderCanceled] } } }),
    ]);

    return {
      pending: requested,
      accepted,
      in_progress: started,
      completed: finished,
      cancelled,
    };
  }

  async getRevenueByDate(startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const orders = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.Finished,
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      select: {
        createdAt: true,
        paidAmount: true,
      },
    });

    // Group by date
    const revenueByDate: Record<string, { revenue: number; orders: number }> = {};

    orders.forEach((order) => {
      const dateKey = order.createdAt.toISOString().split('T')[0];
      if (!revenueByDate[dateKey]) {
        revenueByDate[dateKey] = { revenue: 0, orders: 0 };
      }
      revenueByDate[dateKey].revenue += Number(order.paidAmount || 0);
      revenueByDate[dateKey].orders++;
    });

    return Object.entries(revenueByDate)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
}
