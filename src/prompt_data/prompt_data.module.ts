import { Module, forwardRef } from '@nestjs/common';
import { PromptDataService } from './prompt_data.service'; 
import { PromptDatumEntity } from './entities/prompt_datum.entity';
import { BotModule } from 'src/bot/bot.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProspectsModule } from 'src/prospects/prospects.module';
import { PromptMultiService } from './prompt_multi.service';

@Module({
  imports: [
    forwardRef(() => BotModule),
    forwardRef(() => ProspectsModule),
    TypeOrmModule.forFeature(
      [PromptDatumEntity]
    )
  ],
  controllers: [],
  providers: [PromptDataService, PromptMultiService],
  exports:[PromptDataService, PromptMultiService]
})
export class PromptDataModule {}
