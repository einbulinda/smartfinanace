import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { FinancialSnapshot } from './ai.service';
import { AiService } from './ai.service';

type AuthReq = { user: { userId: string } };

@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('insights')
  getInsights(@Request() req: AuthReq) {
    return this.aiService.getLatestInsights(req.user.userId);
  }

  @Post('insights/generate')
  generateInsights(@Request() req: AuthReq, @Body() snapshot: Record<string, unknown>) {
    return this.aiService.generateInsights(req.user.userId, snapshot as unknown as FinancialSnapshot);
  }
}
