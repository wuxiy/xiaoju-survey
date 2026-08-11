import { Module } from '@nestjs/common';
import { MessagePushingTaskService } from './services/messagePushingTask.service';
import { MessagePushingLogService } from './services/messagePushingLog.service';

import { MessagePushingTaskController } from './controllers/messagePushingTask.controller';

import { MessagePushingTask } from 'src/models/messagePushingTask.entity';
import { MessagePushingLog } from 'src/models/messagePushingLog.entity';
import { SurveyMeta } from 'src/models/surveyMeta.entity';
import { Collaborator } from 'src/models/collaborator.entity';
import { WorkspaceMember } from 'src/models/workspaceMember.entity';

import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from '../auth/auth.module';
import { WorkspaceModule } from '../workspace/workspace.module';

import { LoggerProvider } from 'src/logger/logger.provider';
import { PluginManagerProvider } from 'src/securityPlugin/pluginManager.provider';
import { SurveyMetaService } from 'src/modules/survey/services/surveyMeta.service';
import { CollaboratorService } from 'src/modules/survey/services/collaborator.service';
import { WorkspaceMemberService } from 'src/modules/workspace/services/workspaceMember.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MessagePushingTask,
      MessagePushingLog,
      SurveyMeta,
      Collaborator,
      WorkspaceMember,
    ]),
    ConfigModule,
    AuthModule,
    WorkspaceModule,
  ],
  controllers: [MessagePushingTaskController],
  providers: [
    MessagePushingTaskService,
    MessagePushingLogService,
    LoggerProvider,
    PluginManagerProvider,
    SurveyMetaService,
    CollaboratorService,
    WorkspaceMemberService,
  ],
  exports: [MessagePushingTaskService],
})
export class MessageModule {}
