import { Controller, Post, Body, Res, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AIGenerateService } from '../services/ai-generate.service';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { HttpException } from 'src/exceptions/httpException';
import { Logger } from 'src/logger';
import { EXCEPTION_CODE } from 'src/enums/exceptionCode';
import { Authentication } from 'src/guards/authentication.guard';

@UseGuards(Authentication)
@Controller('/api/ai-generate')
@ApiTags('survey')
export class AIGenerateController {
  constructor(
    private readonly aiService: AIGenerateService,
    private configService: ConfigService,
    private logger: Logger,
  ) {}

  @Post('call-deepseek')
  async callDeepseek(@Body() body: { prompt: string }, @Res() res: Response) {
    const apiUrl = this.configService.get('AImodel_API_URL');
    const apiKey = this.configService.get('AImodel_API_KEY');
    if (!apiUrl || !apiKey) {
      this.logger.error('模型配置有误，请检查配置');
      throw new HttpException(
        '模型配置有误，请联系管理员',
        EXCEPTION_CODE.SYSTEM_CONFIG_ERROR,
      );
    }
    if (
      !body.prompt ||
      typeof body.prompt !== 'string' ||
      body.prompt.length > 4000
    ) {
      throw new HttpException('prompt参数有误', EXCEPTION_CODE.PARAMETER_ERROR);
    }
    const response = await this.aiService.callDeepSeekAPI({
      prompt: body.prompt,
      apiKey,
      apiUrl,
    });
    if (!response.ok) {
      this.logger.error(`上游模型服务错误: ${response.statusText}`);
      throw new HttpException('上游服务错误', EXCEPTION_CODE.SERVER_ERROR);
    }
    const contentType = response.headers.get('Content-Type');
    const responseHeaders: Record<string, any> = {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache',
      'Content-Encoding': 'identity',
    };
    res.writeHead(200, responseHeaders);
    if (contentType.includes('text/event-stream')) {
      response.body
        .on('error', () => res.end())
        .pipe(res)
        .on('error', () => response.body.destroy());
    } else {
      return response.json();
    }
  }
}
