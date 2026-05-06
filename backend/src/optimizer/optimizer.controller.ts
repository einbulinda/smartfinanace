import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptimizerService } from './optimizer.service';
import { OptimizeRequestDto } from './dto/optimize-request.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsPositive } from 'class-validator';

class CompareRequestDto {
  @ApiProperty({ example: 40000 })
  @IsNumber()
  @IsPositive()
  monthlyBudget: number;
}

type AuthReq = { user: { userId: string } };

@ApiTags('optimizer')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('optimizer')
export class OptimizerController {
  constructor(private readonly optimizerService: OptimizerService) {}

  @Post('calculate')
  calculate(@Request() req: AuthReq, @Body() dto: OptimizeRequestDto) {
    return this.optimizerService.calculate(req.user.userId, dto.strategy, dto.monthlyBudget);
  }

  @Post('compare')
  compare(@Request() req: AuthReq, @Body() dto: CompareRequestDto) {
    return this.optimizerService.compare(req.user.userId, dto.monthlyBudget);
  }
}
