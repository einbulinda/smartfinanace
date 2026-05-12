import {
  Body, Controller, Delete, Get, Param, Patch, Post, Request, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InvestmentsService } from './investments.service';
import { CreateInvestmentDto } from './dto/create-investment.dto';
import { UpdateInvestmentDto } from './dto/update-investment.dto';

type AuthReq = { user: { userId: string } };

@ApiTags('investments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('investments')
export class InvestmentsController {
  constructor(private readonly investmentsService: InvestmentsService) {}

  @Post()
  create(@Request() req: AuthReq, @Body() dto: CreateInvestmentDto) {
    return this.investmentsService.create(req.user.userId, dto);
  }

  @Get()
  findAll(@Request() req: AuthReq) {
    return this.investmentsService.findAll(req.user.userId);
  }

  @Patch(':id')
  update(@Request() req: AuthReq, @Param('id') id: string, @Body() dto: UpdateInvestmentDto) {
    return this.investmentsService.update(req.user.userId, id, dto);
  }

  @Delete(':id')
  remove(@Request() req: AuthReq, @Param('id') id: string) {
    return this.investmentsService.remove(req.user.userId, id);
  }
}
