import { Controller, Post, Body } from '@nestjs/common';
import { AppManagerService } from '../services/appManager.service';
import { APPList } from '../appConfg';
import { CreateTokenDto } from '../dto/createToken.dto';
import { VerifyTokenDto } from '../dto/verifyToken.dto';
import { HttpException } from 'src/exceptions/httpException';
import { EXCEPTION_CODE } from 'src/enums/exceptionCode';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('appManager')
@Controller('/api/appManager')
export class AppManagerController {
  constructor(private readonly appManager: AppManagerService) {}

  // 生成 appToken，必须携带正确的 appId + appSecret
  @Post('getToken')
  async getAppToken(@Body() body: CreateTokenDto) {
    const { error } = CreateTokenDto.validate(body);
    if (error) {
      throw new HttpException(
        `参数错误: ${error.message}`,
        EXCEPTION_CODE.PARAMETER_ERROR,
      );
    }
    const { appId, appSecret } = body;
    if (!appId || !appSecret) {
      throw new HttpException(
        'Missing required fields',
        EXCEPTION_CODE.PARAMETER_ERROR,
      );
    }
    const app = APPList.find((item) => item.appId === appId);
    if (!app || app.appSecret !== appSecret) {
      throw new HttpException(
        'Invalid appId or appSecret',
        EXCEPTION_CODE.PARAMETER_ERROR,
      );
    }
    const token = await this.appManager.generateToken(appId, appSecret);
    return {
      code: 200,
      data: token,
    };
  }

  // 认证请求
  @Post('verify')
  async verifySignature(@Body() body: VerifyTokenDto) {
    const { error } = VerifyTokenDto.validate(body);
    if (error) {
      throw new HttpException(
        `参数错误: ${error.message}`,
        EXCEPTION_CODE.PARAMETER_ERROR,
      );
    }
    const { appId, appToken } = body;
    if (!appId || !appToken) {
      throw new HttpException(
        'Missing required fields',
        EXCEPTION_CODE.PARAMETER_ERROR,
      );
    }

    await this.appManager.checkAppManager(appId, appToken);
    return { code: 200, success: true };
  }
}
