import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm'; 
import { SystemEntity } from './system.entity';

@Injectable()
export class SystemService {
    constructor(
        @InjectRepository(SystemEntity) private model: Repository<SystemEntity>,
    ) { }

    async findByKey(key: string) {
        return await this.model.findOne({ where: { key: key } });
    }
}
