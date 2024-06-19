import { Module } from '@nestjs/common';
import { ProxiesService } from './proxies.service';
import { ProxiesController } from './proxies.controller';

@Module({
  controllers: [ProxiesController],
  providers: [ProxiesService],
  exports: [ProxiesService]
})
export class ProxiesModule { }
