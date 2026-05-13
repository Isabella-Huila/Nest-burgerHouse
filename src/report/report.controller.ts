import {
  Controller,
  Get,
  Query,
  ParseUUIDPipe,
  ParseIntPipe,
  ParseEnumPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiResponse,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ReportService } from './report.service';
import { Auth } from '../user/decorators/auth.decorator';
import { ValidRoles } from '../user/enums/valid-roles.enum';
import { PdfService } from '../pdf/pdf.service';

enum TimeGroupBy {
  day = 'day',
  week = 'week',
  month = 'month'
}

@ApiTags('Reports')
@Controller('reports')
@Auth(ValidRoles.admin)
@ApiBearerAuth('JWT-auth')
export class ReportController {
  constructor(private readonly reportService: ReportService,
    private readonly pdfService: PdfService // Assuming you have a PdfModule for PDF generation
  ) { }

  @Get('sales/daily')
  @ApiOperation({ summary: 'Get daily sales report' })
  @ApiResponse({
    status: 200,
    description: 'Returns sales report for the specified day',
  })
  @ApiQuery({
    name: 'date',
    required: false,
    type: String,
    description: 'Date in ISO format (YYYY-MM-DD)',
    example: '2023-05-01',
  })
  async getDailySalesReport(@Query('date') dateString?: string) {
    const date = dateString ? new Date(dateString) : new Date();
    return this.reportService.getDailySalesReport(date);
  }

  @Get('sales/weekly')
  @ApiOperation({ summary: 'Get weekly sales report' })
  @ApiResponse({
    status: 200,
    description: 'Returns sales report for the specified week',
  })
  @ApiQuery({
    name: 'date',
    required: false,
    type: String,
    description: 'Date in ISO format (YYYY-MM-DD) to determine the week',
    example: '2023-05-01',
  })
  async getWeeklySalesReport(@Query('date') dateString?: string) {
    const date = dateString ? new Date(dateString) : new Date();
    return this.reportService.getWeeklySalesReport(date);
  }

  @Get('sales/monthly')
  @ApiOperation({ summary: 'Get monthly sales report' })
  @ApiResponse({
    status: 200,
    description: 'Returns sales report for the specified month',
  })
  @ApiQuery({
    name: 'date',
    required: false,
    type: String,
    description: 'Date in ISO format (YYYY-MM-DD) to determine the month',
    example: '2023-05-01',
  })
  async getMonthlySalesReport(@Query('date') dateString?: string) {
    const date = dateString ? new Date(dateString) : new Date();
    return this.reportService.getMonthlySalesReport(date);
  }


  @Get('products/top-selling/daily')
  @ApiOperation({ summary: 'Get daily top selling products' })
  @ApiResponse({
    status: 200,
    description: 'Returns top selling products for the specified day',
  })
  @ApiQuery({
    name: 'date',
    required: false,
    type: String,
    description: 'Date in ISO format (YYYY-MM-DD)',
    example: '2023-05-01',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of top products to return',
    example: 10,
  })
  async getDailyTopSellingProducts(
    @Query('date') dateString?: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    const date = dateString ? new Date(dateString) : new Date();
    const report = await this.reportService.getDailyTopSellingProducts(date, limit);
    console.log(report);
    return this.pdfService.generateReport("Diario", report);
  }

  @Get('products/top-selling/weekly')
  @ApiOperation({ summary: 'Get weekly top selling products' })
  @ApiResponse({
    status: 200,
    description: 'Returns top selling products for the specified week',
  })
  @ApiQuery({
    name: 'date',
    required: false,
    type: String,
    description: 'Date in ISO format (YYYY-MM-DD) to determine the week',
    example: '2023-05-01',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of top products to return',
    example: 10,
  })
  async getWeeklyTopSellingProducts(
    @Query('date') dateString?: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    const date = dateString ? new Date(dateString) : new Date();
    const report = await this.reportService.getWeeklyTopSellingProducts(date, limit);
    console.log(report);
    return this.pdfService.generateReport("Semanal", report);
  }

  @Get('products/top-selling/monthly')
  @ApiOperation({ summary: 'Get monthly top selling products' })
  @ApiResponse({
    status: 200,
    description: 'Returns top selling products for the specified month',
  })
  @ApiQuery({
    name: 'date',
    required: false,
    type: String,
    description: 'Date in ISO format (YYYY-MM-DD) to determine the month',
    example: '2023-05-01',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of top products to return',
    example: 10,
  })
  async getMonthlyTopSellingProducts(
    @Query('date') dateString?: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    const date = dateString ? new Date(dateString) : new Date();
    const report = await this.reportService.getMonthlyTopSellingProducts(date, limit);
    console.log(report);  
    return this.pdfService.generateReport("Mensual", report);

  }

  @Get('sales/trends')
  @ApiOperation({ summary: 'Get sales trends over time' })
  @ApiResponse({
    status: 200,
    description: 'Returns sales trends for the specified time period',
  })
  @ApiQuery({
    name: 'startDate',
    required: true,
    type: String,
    description: 'Start date in ISO format (YYYY-MM-DD)',
    example: '2023-05-01',
  })
  @ApiQuery({
    name: 'endDate',
    required: true,
    type: String,
    description: 'End date in ISO format (YYYY-MM-DD)',
    example: '2023-05-31',
  })
  @ApiQuery({
    name: 'groupBy',
    required: false,
    enum: TimeGroupBy,
    description: 'How to group the results (day, week, month)',
    example: 'day',
  })
  async getSalesTrends(
    @Query('startDate') startDateString: string,
    @Query('endDate') endDateString: string,
    @Query('groupBy', new ParseEnumPipe(TimeGroupBy, { optional: true }))
    groupBy?: 'day' | 'week' | 'month',
  ) {
    const startDate = new Date(startDateString);
    const endDate = new Date(endDateString);
    return this.reportService.getSalesTrends(startDate, endDate, groupBy || 'day');
  }
}