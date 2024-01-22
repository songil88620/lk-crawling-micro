import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { ProspectsEntity } from './entities/prospect.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { LinkedInChatsService } from 'src/linked_in_chats/linked_in_chats.service';
import { ProspectType } from 'src/type/prospect.type';

@Injectable()
export class ProspectsService {
  constructor(
    @InjectRepository(ProspectsEntity) private prospectsRepository: Repository<ProspectsEntity>,
    @Inject(forwardRef(() => LinkedInChatsService)) private chatService: LinkedInChatsService,
  ) { }

  // this provides linkein member details including linked_in_member_id, first_name and last_name
  async findProspectById(id: number) {
    return await this.prospectsRepository.findOne({ where: { id: id } });
  }

  async findProspectByMemberId(member_id: string) {
    return await this.prospectsRepository.findOne({ where: { linked_in_member_id: member_id } })
  }

  async getFreshProspects(c_id: number) {
    const prospects: ProspectType[] = await this.prospectsRepository.find({ where: { used: false } });
    const fresh: ProspectType[] = [];
    var cnt = 0;
    for (const prospect of prospects) {
      const chat = await this.chatService.findOneChatByProspect(c_id, prospect.id);
      if (chat == undefined) {
        fresh.push(prospect)
        cnt++;
      }
      if (cnt == 2) {
        break
      }
    }
    return fresh;
  }

  async removeProspect(id: number) {
    await this.prospectsRepository.update({ id }, { used: true })
  }

}
