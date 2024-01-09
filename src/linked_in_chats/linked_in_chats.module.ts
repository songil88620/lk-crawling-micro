import { Module, forwardRef } from '@nestjs/common';
import { LinkedInChatsService } from './linked_in_chats.service';
import { LinkedInChatEntity } from './entities/linked_in_chat.entity';
import { BotModule } from 'src/bot/bot.module';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    forwardRef(() => BotModule),
    TypeOrmModule.forFeature(
      [LinkedInChatEntity]
    )
  ],
  controllers: [],
  providers: [LinkedInChatsService],
  exports: [LinkedInChatsService]
})
export class LinkedInChatsModule { }
