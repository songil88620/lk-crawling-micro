import { Module, forwardRef } from '@nestjs/common';
import { SocketService } from './socket.service';
import { BotModule } from 'src/bot/bot.module';

@Module({
  imports: [
    forwardRef(() => BotModule)
  ],
  providers: [SocketService],
  exports: [SocketService]
})
export class SocketModule { }