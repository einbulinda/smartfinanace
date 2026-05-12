import { Body, Controller, Delete, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ManualAssetsService } from './manual-assets.service';
import { CreateManualAssetDto } from './dto/create-manual-asset.dto';
import { UpdateManualAssetDto } from './dto/update-manual-asset.dto';

type AuthReq = { user: { userId: string } };

@ApiTags('assets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('assets')
export class ManualAssetsController {
  constructor(private readonly assetsService: ManualAssetsService) {}

  @Post()
  create(@Request() req: AuthReq, @Body() dto: CreateManualAssetDto) {
    return this.assetsService.create(req.user.userId, dto);
  }

  @Get()
  findAll(@Request() req: AuthReq) {
    return this.assetsService.findAll(req.user.userId);
  }

  @Get(':id')
  findOne(@Request() req: AuthReq, @Param('id') id: string) {
    return this.assetsService.findOne(req.user.userId, id);
  }

  @Patch(':id')
  update(@Request() req: AuthReq, @Param('id') id: string, @Body() dto: UpdateManualAssetDto) {
    return this.assetsService.update(req.user.userId, id, dto);
  }

  @Delete(':id')
  remove(@Request() req: AuthReq, @Param('id') id: string) {
    return this.assetsService.remove(req.user.userId, id);
  }
}
