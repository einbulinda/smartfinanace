import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GoalsService } from './goals.service';
import { AiService } from '../ai/ai.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';

type AuthReq = { user: { userId: string } };

@ApiTags('goals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('goals')
export class GoalsController {
  constructor(
    private readonly goalsService: GoalsService,
    private readonly aiService: AiService,
  ) {}

  @Post()
  create(@Request() req: AuthReq, @Body() dto: CreateGoalDto) {
    return this.goalsService.create(req.user.userId, dto);
  }

  @Get()
  findAll(@Request() req: AuthReq) {
    return this.goalsService.findAll(req.user.userId);
  }

  @Get(':id')
  findOne(@Request() req: AuthReq, @Param('id') id: string) {
    return this.goalsService.findOne(req.user.userId, id);
  }

  @Patch(':id')
  update(@Request() req: AuthReq, @Param('id') id: string, @Body() dto: UpdateGoalDto) {
    return this.goalsService.update(req.user.userId, id, dto);
  }

  @Delete(':id')
  remove(@Request() req: AuthReq, @Param('id') id: string) {
    return this.goalsService.remove(req.user.userId, id);
  }

  @Patch(':id/progress')
  updateProgress(
    @Request() req: AuthReq,
    @Param('id') id: string,
    @Body('value') value: number,
  ) {
    return this.goalsService.updateProgress(req.user.userId, id, value);
  }

  @Post(':id/generate-plan')
  generatePlan(@Request() req: AuthReq, @Param('id') id: string) {
    return this.aiService.generateGoalPlan(req.user.userId, id);
  }

  @Post(':id/review-plan')
  reviewPlan(@Request() req: AuthReq, @Param('id') id: string) {
    return this.aiService.reviewGoalPlan(req.user.userId, id);
  }

  @Patch(':id/milestones/:mid')
  toggleMilestone(
    @Request() req: AuthReq,
    @Param('id') goalId: string,
    @Param('mid') milestoneId: string,
    @Body('isCompleted') isCompleted: boolean,
  ) {
    return this.goalsService.toggleMilestone(req.user.userId, goalId, milestoneId, isCompleted);
  }
}
