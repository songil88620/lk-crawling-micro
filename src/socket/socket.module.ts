import { Module, forwardRef } from '@nestjs/common';
import { SocketService } from './socket.service';
import { BotModule } from 'src/bot/bot.module';
import { LinkedInAccountsModule } from 'src/linked_in_accounts/linked_in_accounts.module';

@Module({
  imports: [
    forwardRef(() => BotModule),
    forwardRef(() => LinkedInAccountsModule)
  ],
  providers: [SocketService],
  exports: [SocketService]
})
export class SocketModule { }