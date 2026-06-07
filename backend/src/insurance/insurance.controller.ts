import {
  Body, Controller, Delete, Get, Param, Patch, Post, Request, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InsuranceService } from './insurance.service';
import { CreateInsuranceDto } from './dto/create-insurance.dto';
import { UpdateInsuranceDto } from './dto/update-insurance.dto';

type AuthReq = { user: { userId: string } };

@ApiTags('insurance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('insurance')
export class InsuranceController {
  constructor(private readonly insuranceService: InsuranceService) {}

  @Post()
  create(@Request() req: AuthReq, @Body() dto: CreateInsuranceDto) {
    return this.insuranceService.create(req.user.userId, dto);
  }

  @Get()
  findAll(@Request() req: AuthReq) {
    return this.insuranceService.findAll(req.user.userId);
  }

  @Patch(':id')
  update(@Request() req: AuthReq, @Param('id') id: string, @Body() dto: UpdateInsuranceDto) {
    return this.insuranceService.update(req.user.userId, id, dto);
  }

  @Post(':id/confirm-deduction')
  confirmDeduction(@Request() req: AuthReq, @Param('id') id: string) {
    return this.insuranceService.confirmDeduction(req.user.userId, id);
  }

  @Delete(':id')
  remove(@Request() req: AuthReq, @Param('id') id: string) {
    return this.insuranceService.remove(req.user.userId, id);
  }
}
