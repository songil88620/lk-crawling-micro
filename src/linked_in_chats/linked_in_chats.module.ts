import { Module, forwardRef } from '@nestjs/common';
import { LinkedInChatsService } from './linked_in_chats.service';
import { LinkedInChatEntity } from './entities/linked_in_chat.entity';
import { BotModule } from 'src/bot/bot.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProspectsModule } from 'src/prospects/prospects.module';

@Module({
  imports: [
    forwardRef(() => BotModule),
    forwardRef(() => ProspectsModule),
    TypeOrmModule.forFeature(
      [LinkedInChatEntity]
    )
  ],
  controllers: [],
  providers: [LinkedInChatsService],
  exports: [LinkedInChatsService]
})
export class LinkedInChatsModule { }
