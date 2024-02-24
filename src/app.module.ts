import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config'; 
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';  
import { BotModule } from './bot/bot.module';
import { ScheduleModule } from '@nestjs/schedule'; 
import { UserModule } from './user/user.module';
import { LinkedInChatsModule } from './linked_in_chats/linked_in_chats.module';
import { ProspectionCampaignsModule } from './prospection_campaigns/prospection_campaigns.module';
import { ProspectsModule } from './prospects/prospects.module';
import { PromptDataModule } from './prompt_data/prompt_data.module';
import { ProxiesModule } from './proxies/proxies.module';
import { LinkedInAccountsModule } from './linked_in_accounts/linked_in_accounts.module';
import { UserEntity } from './user/entities/user.entity';
import { ProxyEntity } from './proxies/entities/proxy.entity';
import { ProspectsEntity } from './prospects/entities/prospect.entity';
import { ProspectionCampaignsEntity } from './prospection_campaigns/entities/prospection_campaign.entity';
import { ProspectProspectionCampaignModule } from './prospect_prospection_campaign/prospect_prospection_campaign.module';
import { ProspectProspectionCampaignEntity } from './prospect_prospection_campaign/entities/prospect_prospection_campaign.entity';
import { PromptDatumEntity } from './prompt_data/entities/prompt_datum.entity';
import { LinkedInChatEntity } from './linked_in_chats/entities/linked_in_chat.entity';
import { LinkedInAccountEntity } from './linked_in_accounts/entities/linked_in_account.entity';
import { SocketModule } from './socket/socket.module'; 
 
@Module({
  imports: [ 
    ConfigModule.forRoot(),  
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST,
      port: 3306,
      username: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      entities: [ 
        UserEntity,
        ProxyEntity,
        ProspectsEntity,
        ProspectionCampaignsEntity,
        ProspectProspectionCampaignEntity,
        PromptDatumEntity,
        LinkedInAccountEntity,
        LinkedInChatEntity, 
      ],
      synchronize: false
    }),  
    BotModule,
    ScheduleModule.forRoot(),
    UserModule,
    LinkedInChatsModule,
    ProspectionCampaignsModule,
    ProspectsModule,
    PromptDataModule,
    ProxiesModule,
    LinkedInAccountsModule,
    ProspectProspectionCampaignModule, 
    SocketModule, 
  ],
  controllers: [AppController], 
})
export class AppModule  {  }
