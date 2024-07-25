import { Module, forwardRef } from '@nestjs/common';
import { BotModule } from 'src/bot/bot.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LinkedInChatsModule } from 'src/linked_in_chats/linked_in_chats.module'; 
import { SystemService } from './system.service';
import { SystemEntity } from './system.entity';

@Module({
    imports: [
        forwardRef(() => BotModule),
        forwardRef(() => LinkedInChatsModule),
        TypeOrmModule.forFeature(
            [SystemEntity]
        )
    ],
    controllers: [],
    providers: [SystemService],
    exports: [SystemService]
})
export class SystemModule { }
