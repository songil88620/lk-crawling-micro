import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from 'src/user/user.module';
import { LinkedInAccountsModule } from 'src/linked_in_accounts/linked_in_accounts.module';
import { LeadgenEntity } from './leadgen.entity';
import { LeadgenService } from './leadgen.service';

@Module({
    imports: [
        forwardRef(() => UserModule),
        forwardRef(() => LinkedInAccountsModule),
        TypeOrmModule.forFeature(
            [LeadgenEntity]
        )
    ],
    controllers: [],
    providers: [LeadgenService],
    exports: [LeadgenService]
})
export class LeadgenModule { }
