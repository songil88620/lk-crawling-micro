import { Module, forwardRef } from '@nestjs/common';
import { PromptDataService } from './prompt_data.service';
import { PromptDatumEntity } from './entities/prompt_datum.entity';
import { BotModule } from 'src/bot/bot.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProspectsModule } from 'src/prospects/prospects.module';
import { PromptMultiService } from './prompt_multi.service';
import { UserModule } from 'src/user/user.module';

@Module({
  imports: [
    forwardRef(() => BotModule),
    forwardRef(() => ProspectsModule),
    forwardRef(() => UserModule),
    TypeOrmModule.forFeature(
      [PromptDatumEntity]
    )
  ],
  controllers: [],
  providers: [PromptDataService, PromptMultiService],
  exports: [PromptDataService, PromptMultiService]
})
export class PromptDataModule { }
