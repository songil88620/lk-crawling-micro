import { Injectable } from '@nestjs/common'; 
import { ProxyEntity } from './entities/proxy.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class ProxiesService {

  constructor(
    @InjectRepository(ProxyEntity) private model: Repository<ProxyEntity>,

  ) { }

  async update(proxy: string, mode: boolean, time: number) {
    if (!mode) {
      await this.model.update({ proxy }, { tool_end: time, order: true, run: false })
    }
  }

}
