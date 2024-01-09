import { Module, forwardRef } from '@nestjs/common';
import { ProspectionCampaignsService } from './prospection_campaigns.service';
import { BotModule } from 'src/bot/bot.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProspectionCampaignsEntity } from './entities/prospection_campaign.entity';
import { LinkedInAccountsModule } from 'src/linked_in_accounts/linked_in_accounts.module';

@Module({
  controllers: [],
  imports: [
    forwardRef(() => BotModule),
    forwardRef(() => LinkedInAccountsModule),
    TypeOrmModule.forFeature(
      [ProspectionCampaignsEntity]
    )
  ],
  providers: [ProspectionCampaignsService],
  exports: [ProspectionCampaignsService]
})
export class ProspectionCampaignsModule { }
