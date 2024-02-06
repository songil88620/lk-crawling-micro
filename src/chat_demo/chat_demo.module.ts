import { Module, forwardRef } from '@nestjs/common'; 
import { ChatDemoEntity } from './entities/chat_demo.entity';
import { ChatDemoService } from './chat_demo.service';
import { BotModule } from 'src/bot/bot.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProspectsModule } from 'src/prospects/prospects.module';

@Module({
  imports: [
    forwardRef(() => BotModule),
    forwardRef(() => ProspectsModule),
    TypeOrmModule.forFeature(
      [ChatDemoEntity]
    )
  ],
  controllers: [],
  providers: [ChatDemoService],
  exports: [ChatDemoService]
})
export class ChatDemoModule { }
