import { Module, forwardRef } from '@nestjs/common';
import { ProspectsService } from './prospects.service'; 
import { ProspectsEntity } from './entities/prospect.entity';
import { BotModule } from 'src/bot/bot.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LinkedInChatsModule } from 'src/linked_in_chats/linked_in_chats.module';
import { ProspectProspectionCampaignModule } from 'src/prospect_prospection_campaign/prospect_prospection_campaign.module';

@Module({
  imports: [
    forwardRef(() => BotModule),
    forwardRef(() => LinkedInChatsModule),
    forwardRef(() => ProspectProspectionCampaignModule),
    TypeOrmModule.forFeature(
      [ProspectsEntity]
    )
  ],
  controllers: [],
  providers: [ProspectsService],
  exports:[ProspectsService]
})
export class ProspectsModule {}
