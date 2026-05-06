import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { QueryTransactionDto } from './dto/query-transaction.dto';

type AuthReq = { user: { userId: string } };

@ApiTags('transactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  create(@Request() req: AuthReq, @Body() dto: CreateTransactionDto) {
    return this.transactionsService.create(req.user.userId, dto);
  }

  @Get()
  findAll(@Request() req: AuthReq, @Query() query: QueryTransactionDto) {
    return this.transactionsService.findAll(req.user.userId, query);
  }

  // summary must come before :id to avoid route conflict
  @Get('summary')
  getSummary(
    @Request() req: AuthReq,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    const now = new Date();
    return this.transactionsService.getSummary(
      req.user.userId,
      month ? parseInt(month) : now.getMonth() + 1,
      year ? parseInt(year) : now.getFullYear(),
    );
  }

  @Get(':id')
  findOne(@Request() req: AuthReq, @Param('id') id: string) {
    return this.transactionsService.findOne(req.user.userId, id);
  }

  @Patch(':id')
  update(
    @Request() req: AuthReq,
    @Param('id') id: string,
    @Body() dto: UpdateTransactionDto,
  ) {
    return this.transactionsService.update(req.user.userId, id, dto);
  }

  @Delete(':id')
  remove(@Request() req: AuthReq, @Param('id') id: string) {
    return this.transactionsService.remove(req.user.userId, id);
  }
}
