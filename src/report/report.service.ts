import { Injectable } from '@nestjs/common';
import { OrderService } from '../Order/order.service';
import { Between, In } from 'typeorm';
import * as moment from 'moment';
import { OrderState } from '../Order/enums/valid-state.enums';
import { PdfService } from '../pdf/pdf.service';

export interface SalesReport {
  startDate: Date;
  endDate: Date;
  topProducts: TopProduct[];
}

export interface TopProduct {
  id: string;
  title: string;
  price: number;
  count: number;
  totalRevenue: number;
}

@Injectable()
export class ReportService {
  constructor(
    private readonly orderService: OrderService,
  ) { }

  async getSalesReport(startDate: Date, endDate: Date) {
    type Order = { total: number, products?: any[], date?: Date };
    const result = await this.orderService.findByDateRange(
      startDate,
      endDate,
      [OrderState.Delivered, OrderState.Ready]
    );
    const orders = Array.isArray(result) ? result as Order[] : [];

    const totalSales = orders.reduce((sum, order) => sum + Number(order.total), 0);

    const totalOrders = orders.length;


    const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

    return {
      startDate,
      endDate,
      totalSales,
      totalOrders,
      averageOrderValue,
      orders
    };
  }

  async getDailySalesReport(date: Date = new Date()) {
    const startOfDay = moment(date).startOf('day').toDate();
    const endOfDay = moment(date).endOf('day').toDate();

    return this.getSalesReport(startOfDay, endOfDay);
  }

  async getWeeklySalesReport(date: Date = new Date()) {
    const startOfWeek = moment(date).startOf('week').toDate();
    const endOfWeek = moment(date).endOf('week').toDate();
    const report = await this.getSalesReport(startOfWeek, endOfWeek);
    return report;
  }

  async getMonthlySalesReport(date: Date = new Date()) {
    const startOfMonth = moment(date).startOf('month').toDate();
    const endOfMonth = moment(date).endOf('month').toDate();

    return this.getSalesReport(startOfMonth, endOfMonth);
  }

  async getTopSellingProducts(startDate: Date, endDate: Date, limit: number = 10): Promise<SalesReport> {
    const result = await this.orderService.findByDateRange(
      startDate,
      endDate,
      [OrderState.Delivered, OrderState.Ready]
    );
    const orders = Array.isArray(result) ? result : [];

    const productCounts = {};
    const productData = {};

    orders.forEach(order => {
      order.products.forEach(product => {
        if (!productCounts[product.id]) {
          productCounts[product.id] = 0;
          productData[product.id] = {
            id: product.id,
            title: product.name,
            price: product.price,
            count: 0,
            totalRevenue: 0
          };
        }
        productCounts[product.id]++;
        productData[product.id].count++;
        productData[product.id].totalRevenue += Number(product.price);
      });
    });

    const topProducts: TopProduct[] = Object.values(productData)
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, limit) as TopProduct[];

    return {
      startDate,
      endDate,
      topProducts
    };
  }

  async getDailyTopSellingProducts(date: Date = new Date(), limit: number = 10): Promise<SalesReport> {
    const startOfDay = moment(date).startOf('day').toDate();
    const endOfDay = moment(date).endOf('day').toDate();

    return this.getTopSellingProducts(startOfDay, endOfDay, limit);
  }

  async getWeeklyTopSellingProducts(date: Date = new Date(), limit: number = 10): Promise<SalesReport> {
    const startOfWeek = moment(date).startOf('week').toDate();
    const endOfWeek = moment(date).endOf('week').toDate();

    return this.getTopSellingProducts(startOfWeek, endOfWeek, limit);
  }

  async getMonthlyTopSellingProducts(date: Date = new Date(), limit: number = 10): Promise<SalesReport> {
    const startOfMonth = moment(date).startOf('month').toDate();
    const endOfMonth = moment(date).endOf('month').toDate();

    return this.getTopSellingProducts(startOfMonth, endOfMonth, limit);
  }

  async getSalesTrends(startDate: Date, endDate: Date, groupBy: 'day' | 'week' | 'month' = 'day') {
    const result = await this.orderService.findByDateRange(
      startDate,
      endDate,
      [OrderState.Delivered, OrderState.Ready]
    );
    const orders = Array.isArray(result) ? result : [];

    const salesByPeriod = {};

    orders.forEach(order => {
      let periodKey;
      const orderDate = moment(order.date);

      switch (groupBy) {
        case 'day':
          periodKey = orderDate.format('YYYY-MM-DD');
          break;
        case 'week':
          periodKey = `${orderDate.year()}-W${orderDate.isoWeek()}`;
          break;
        case 'month':
          periodKey = orderDate.format('YYYY-MM');
          break;
      }

      if (!salesByPeriod[periodKey]) {
        salesByPeriod[periodKey] = {
          period: periodKey,
          totalSales: 0,
          orderCount: 0
        };
      }

      salesByPeriod[periodKey].totalSales += Number(order.total);
      salesByPeriod[periodKey].orderCount += 1;
    });

    const trendData = Object.values(salesByPeriod).sort((a: any, b: any) => {
      return a.period.localeCompare(b.period);
    });

    return {
      startDate,
      endDate,
      groupBy,
      trendData
    };
  }
}