import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { ProspectsEntity } from './entities/prospect.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { LinkedInChatsService } from 'src/linked_in_chats/linked_in_chats.service';
import { ProspectType } from 'src/type/prospect.type';
import { ProspectProspectionCampaignService } from 'src/prospect_prospection_campaign/prospect_prospection_campaign.service';

@Injectable()
export class ProspectsService {
  constructor(
    @InjectRepository(ProspectsEntity) private prospectsRepository: Repository<ProspectsEntity>,
    @Inject(forwardRef(() => LinkedInChatsService)) private chatService: LinkedInChatsService,
    @Inject(forwardRef(() => ProspectProspectionCampaignService)) private ppcService: ProspectProspectionCampaignService,
  ) { }

  async checkProspect(member_id: string, first_name: string, last_name: string, url: string) {
    try {
      const ps = await this.prospectsRepository.findOne({ where: { linked_in_member_id: member_id } })
      console.log(">>>ps", ps)
      if (ps == null) {
        const new_ps = {
          linked_in_member_id: member_id,
          linked_in_email: '',
          first_name: first_name,
          last_name: last_name,
          linked_in_profile_url: url,
          linked_in_headline: '',
          linked_in_current_company: '',
          linked_in_user_urn: '',
          created_at: this.getTimestamp(),
          updated_at: this.getTimestamp()
        }
        const c = this.prospectsRepository.create(new_ps);
        await this.prospectsRepository.save(c);
      }
    } catch (e) {
      console.log(">>check...", e)
    }
  }

  // this provides linkein member details including linked_in_member_id, first_name and last_name
  async findProspectById(id: number) {
    return await this.prospectsRepository.findOne({ where: { id: id } });
  }

  async findProspectByMemberId(member_id: string) {
    return await this.prospectsRepository.findOne({ where: { linked_in_member_id: member_id } })
  }

  async getFreshProspects(c_id: number) {
    const fresh: ProspectType[] = [];
    const psc = await this.ppcService.findProspectsIdsByCampaignId(c_id);
    var cnt = 0;
    for (const ps of psc) {
      const _prospect = await this.prospectsRepository.findOne({ where: { id: ps.prospect_id } });
      const chat = await this.chatService.findOneChatByProspect(c_id, _prospect.id);
      if (chat == null) {
        fresh.push(_prospect)
        cnt++;
      }
      if (cnt == 100) {
        break;
      }
    }
    return fresh;
  }

  async removeProspect(id: number) {
    await this.prospectsRepository.update({ id }, { used: true })
  }

  getTimestamp() {
    const currentDate = new Date();
    const padZero = (num) => (num < 10 ? `0${num}` : num);
    const month = padZero(currentDate.getMonth() + 1);
    const day = padZero(currentDate.getDate());
    const year = currentDate.getFullYear();
    const hours = padZero(currentDate.getHours());
    const minutes = padZero(currentDate.getMinutes());
    return year + "-" + month + "-" + day + " " + hours + ":" + minutes;
  }

}
