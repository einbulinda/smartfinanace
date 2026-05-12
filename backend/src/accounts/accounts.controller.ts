import {
  Body, Controller, Delete, Get, Param, Patch, Post, Request, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AccountsService } from './accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { CreateTransferDto } from './dto/create-transfer.dto';

type AuthReq = { user: { userId: string } };

@ApiTags('accounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Post()
  create(@Request() req: AuthReq, @Body() dto: CreateAccountDto) {
    return this.accountsService.create(req.user.userId, dto);
  }

  @Get()
  findAll(@Request() req: AuthReq) {
    return this.accountsService.findAllWithBalances(req.user.userId);
  }

  @Get('transfers')
  getTransfers(@Request() req: AuthReq) {
    return this.accountsService.getTransfers(req.user.userId);
  }

  @Post('transfers')
  createTransfer(@Request() req: AuthReq, @Body() dto: CreateTransferDto) {
    return this.accountsService.createTransfer(req.user.userId, dto);
  }

  @Get(':id')
  findOne(@Request() req: AuthReq, @Param('id') id: string) {
    return this.accountsService.findAllWithBalances(req.user.userId).then(
      (accounts) => accounts.find((a) => a.id === id),
    );
  }

  @Patch(':id')
  update(@Request() req: AuthReq, @Param('id') id: string, @Body() dto: UpdateAccountDto) {
    return this.accountsService.update(req.user.userId, id, dto);
  }

  @Delete(':id')
  remove(@Request() req: AuthReq, @Param('id') id: string) {
    return this.accountsService.remove(req.user.userId, id);
  }
}
