import { Module } from '@nestjs/common';
import { ProxiesService } from './proxies.service';
import { ProxiesController } from './proxies.controller';
import { ProxyEntity } from './entities/proxy.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [ 
    TypeOrmModule.forFeature(
      [ProxyEntity]
    )
  ],
  controllers: [ProxiesController],
  providers: [ProxiesService],
  exports: [ProxiesService]
})
export class ProxiesModule { }
