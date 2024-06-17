import { Module, MiddlewareConsumer, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from 'src/user/user.module';   
import { FirstmsgEntity } from './firstmsg.entity';
import { FirstmsgService } from './firstmsg.service';
import { ProspectionCampaignsModule } from 'src/prospection_campaigns/prospection_campaigns.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([FirstmsgEntity]),
        forwardRef(() => UserModule),
        forwardRef(() => ProspectionCampaignsModule)
    ],
    controllers: [],
    providers: [FirstmsgService],
    exports: [FirstmsgService]
})
export class FirstmsgModule { }
