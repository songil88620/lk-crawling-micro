import { Module, forwardRef } from '@nestjs/common';
import { LinkedInAccountsService } from './linked_in_accounts.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BotModule } from 'src/bot/bot.module';
import { LinkedInAccountEntity } from './entities/linked_in_account.entity';

@Module({
  controllers: [],
  imports: [
    forwardRef(() => BotModule),
    TypeOrmModule.forFeature(
      [LinkedInAccountEntity]
    )
  ],
  providers: [LinkedInAccountsService],
  exports: [LinkedInAccountsService]
})
export class LinkedInAccountsModule { }
