import {
  Body, Controller, Delete, Get, Param, Patch, Post, Request, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReceivablesService } from './receivables.service';
import { CreateReceivableDto } from './dto/create-receivable.dto';
import { UpdateReceivableDto } from './dto/update-receivable.dto';
import { RecordRepaymentDto } from './dto/record-repayment.dto';

type AuthReq = { user: { userId: string } };

@ApiTags('receivables')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('receivables')
export class ReceivablesController {
  constructor(private readonly receivablesService: ReceivablesService) {}

  @Post()
  create(@Request() req: AuthReq, @Body() dto: CreateReceivableDto) {
    return this.receivablesService.create(req.user.userId, dto);
  }

  @Get()
  findAll(@Request() req: AuthReq) {
    return this.receivablesService.findAll(req.user.userId);
  }

  @Get(':id')
  findOne(@Request() req: AuthReq, @Param('id') id: string) {
    return this.receivablesService.findOne(req.user.userId, id);
  }

  @Patch(':id')
  update(@Request() req: AuthReq, @Param('id') id: string, @Body() dto: UpdateReceivableDto) {
    return this.receivablesService.update(req.user.userId, id, dto);
  }

  @Delete(':id')
  remove(@Request() req: AuthReq, @Param('id') id: string) {
    return this.receivablesService.remove(req.user.userId, id);
  }

  @Post(':id/repayments')
  recordRepayment(@Request() req: AuthReq, @Param('id') id: string, @Body() dto: RecordRepaymentDto) {
    return this.receivablesService.recordRepayment(req.user.userId, id, dto);
  }

  @Patch(':id/write-off')
  writeOff(@Request() req: AuthReq, @Param('id') id: string) {
    return this.receivablesService.writeOff(req.user.userId, id);
  }
}
