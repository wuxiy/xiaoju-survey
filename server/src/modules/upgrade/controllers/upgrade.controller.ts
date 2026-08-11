import { Controller, Get, HttpCode, Request, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UpgradeService } from '../services/upgrade.service';
import { Authentication } from 'src/guards/authentication.guard';

@ApiTags('survey')
@Controller('/api/upgrade')
export class UpgradeController {
  constructor(private readonly upgradeService: UpgradeService) {}

  // 数据升级脚本会全库扫描，必须登录后才能触发
  @UseGuards(Authentication)
  @Get('/upgradeFeatureStatus')
  @HttpCode(200)
  async upgradeSubStatus(@Request() req) {
    this.upgradeService.upgradeFeatureStatus();
    return {
      code: 200,
      data: {
        traceId: req.traceId,
      },
    };
  }
}
