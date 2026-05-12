import {
  Body, Controller, Get, Param, Post, Request, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BudgetsService } from './budgets.service';
import { UpsertBudgetDto } from './dto/upsert-budget.dto';

type AuthReq = { user: { userId: string } };

@ApiTags('budgets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('budgets')
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Get(':month')
  findByMonth(@Request() req: AuthReq, @Param('month') month: string) {
    return this.budgetsService.findByMonth(req.user.userId, month);
  }

  @Post(':month')
  upsert(@Request() req: AuthReq, @Param('month') month: string, @Body() dto: UpsertBudgetDto) {
    return this.budgetsService.upsert(req.user.userId, month, dto);
  }

  @Post(':month/copy-from/:sourceMonth')
  copyFrom(
    @Request() req: AuthReq,
    @Param('month') month: string,
    @Param('sourceMonth') sourceMonth: string,
  ) {
    return this.budgetsService.copyFromMonth(req.user.userId, month, sourceMonth);
  }

  @Get(':month/vs-actual')
  vsActual(@Request() req: AuthReq, @Param('month') month: string) {
    return this.budgetsService.getVsActual(req.user.userId, month);
  }
}
