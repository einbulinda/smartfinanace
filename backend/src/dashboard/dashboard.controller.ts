import { Controller, Get, Param, ParseIntPipe, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DashboardService } from './dashboard.service';

type AuthReq = { user: { userId: string } };

@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  getFinancialSnapshot(@Request() req: AuthReq) {
    return this.dashboardService.getFinancialSnapshot(req.user.userId);
  }

  @Get('net-worth')
  getNetWorth(@Request() req: AuthReq) {
    return this.dashboardService.getNetWorth(req.user.userId);
  }

  @Get('monthly/:year/:month')
  getMonthlyOverview(
    @Request() req: AuthReq,
    @Param('year', ParseIntPipe) year: number,
    @Param('month', ParseIntPipe) month: number,
  ) {
    return this.dashboardService.getMonthlyOverview(req.user.userId, month, year);
  }
}
