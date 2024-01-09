import { Module, forwardRef } from '@nestjs/common';
import { ProspectProspectionCampaignService } from './prospect_prospection_campaign.service'; 
import { ProspectProspectionCampaignEntity } from './entities/prospect_prospection_campaign.entity';
import { BotModule } from 'src/bot/bot.module';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    forwardRef(() => BotModule),
    TypeOrmModule.forFeature(
      [ProspectProspectionCampaignEntity]
    )
  ],
  controllers: [],
  providers: [ProspectProspectionCampaignService],
  exports: [ProspectProspectionCampaignService]
})
export class ProspectProspectionCampaignModule { }
