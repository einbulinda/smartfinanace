import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProjectionService } from './projection.service';
import { ForecastRequestDto } from './dto/forecast-request.dto';

type AuthReq = { user: { userId: string } };

@ApiTags('projection')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projection')
export class ProjectionController {
  constructor(private readonly projectionService: ProjectionService) {}

  @Post('forecast')
  forecast(@Request() req: AuthReq, @Body() dto: ForecastRequestDto) {
    return this.projectionService.forecast(
      req.user.userId,
      dto.months,
      dto.monthlyIncome,
      dto.monthlyExpense,
    );
  }
}
