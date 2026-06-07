import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DebtsService } from './debts.service';
import { CreateDebtDto } from './dto/create-debt.dto';
import { UpdateDebtDto } from './dto/update-debt.dto';
import { MakePaymentDto } from './dto/make-payment.dto';

type AuthReq = { user: { userId: string } };

@ApiTags('debts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('debts')
export class DebtsController {
  constructor(private readonly debtsService: DebtsService) {}

  @Post()
  create(@Request() req: AuthReq, @Body() dto: CreateDebtDto) {
    return this.debtsService.create(req.user.userId, dto);
  }

  @Get()
  findAll(@Request() req: AuthReq) {
    return this.debtsService.findAll(req.user.userId);
  }

  @Get(':id')
  findOne(@Request() req: AuthReq, @Param('id') id: string) {
    return this.debtsService.findOne(req.user.userId, id);
  }

  @Patch(':id')
  update(@Request() req: AuthReq, @Param('id') id: string, @Body() dto: UpdateDebtDto) {
    return this.debtsService.update(req.user.userId, id, dto);
  }

  @Post(':id/payment')
  makePayment(@Request() req: AuthReq, @Param('id') id: string, @Body() dto: MakePaymentDto) {
    return this.debtsService.makePayment(req.user.userId, id, dto);
  }

  @Post(':id/confirm-deduction')
  confirmDeduction(@Request() req: AuthReq, @Param('id') id: string) {
    return this.debtsService.confirmDeduction(req.user.userId, id);
  }

  @Delete(':id')
  remove(@Request() req: AuthReq, @Param('id') id: string) {
    return this.debtsService.remove(req.user.userId, id);
  }
}
