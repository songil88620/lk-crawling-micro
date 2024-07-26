import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from 'src/user/user.module';
import { LinkedInAccountsModule } from 'src/linked_in_accounts/linked_in_accounts.module';
import { ProspectionCampaignsModule } from 'src/prospection_campaigns/prospection_campaigns.module';
import { LeadgendataEntity } from './leadgendata.entity'; 
import { LeadgendataService } from './leadgendata.service';

@Module({
    imports: [
        forwardRef(() => UserModule),
        forwardRef(() => LinkedInAccountsModule),
        forwardRef(() => ProspectionCampaignsModule),
        TypeOrmModule.forFeature(
            [LeadgendataEntity]
        )
    ],
    controllers: [],
    providers: [LeadgendataService],
    exports: [LeadgendataService]
})
export class LeadgendataModule { }
