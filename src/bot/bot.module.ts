import { Module, forwardRef } from '@nestjs/common'; 
import { BotService } from './bot.service';
import { ProspectionCampaignsModule } from 'src/prospection_campaigns/prospection_campaigns.module';
import { LinkedInAccountsModule } from 'src/linked_in_accounts/linked_in_accounts.module';
import { ProspectsModule } from 'src/prospects/prospects.module';
import { ProspectProspectionCampaignModule } from 'src/prospect_prospection_campaign/prospect_prospection_campaign.module';
import { LinkedInChatsModule } from 'src/linked_in_chats/linked_in_chats.module';
import { PromptDataModule } from 'src/prompt_data/prompt_data.module';
import { SocketModule } from 'src/socket/socket.module';

@Module({
  imports: [ 
    forwardRef(() => ProspectionCampaignsModule),
    forwardRef(() => LinkedInAccountsModule),
    forwardRef(() => ProspectsModule),
    forwardRef(() => ProspectProspectionCampaignModule),
    forwardRef(() => LinkedInChatsModule),
    forwardRef(() => PromptDataModule),
    forwardRef(() => SocketModule)
  ],
  providers: [BotService],
  exports: [BotService,]
})
export class BotModule { }
