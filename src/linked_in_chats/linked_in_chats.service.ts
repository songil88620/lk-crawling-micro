import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { LinkedInChatEntity } from './entities/linked_in_chat.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { LinkedInChatType } from 'src/type/linkedin_chat.type';
import { ChatStatus } from 'src/type/chat_status.type';
import { ProspectsService } from 'src/prospects/prospects.service';

@Injectable()
export class LinkedInChatsService {
  constructor(
    @InjectRepository(LinkedInChatEntity) private linkedinChatRepository: Repository<LinkedInChatEntity>,
    @Inject(forwardRef(() => ProspectsService)) private prospectsService: ProspectsService,
  ) { }


  async onModuleInit() {

    // const chats: LinkedInChatType[] = await this.linkedinChatRepository.find();

    // for (var ct of chats) {
    //   try {
    //     const id = ct.id;
    //     if (id == 2178) {
    //       continue;
    //     }
    //     var chat_history = JSON.parse(ct.chat_history);
    //     chat_history.forEach((ch: any, idx: number) => {
    //       var createdAt = ch.createdAt;
    //       createdAt = "20" + createdAt.substr(6, 2) + "-" + createdAt.substr(0, 2) + "-" + createdAt.substr(3, 2) + " " + createdAt.substr(9, 5);
    //       chat_history[idx].createdAt = createdAt;
    //     });
    //     ct.chat_history = JSON.stringify(chat_history);
    //     await this.linkedinChatRepository.update({ id }, ct)

    //     await this.delay(200);
    //   } catch (e) {

    //   }

    // }
    // console.log(">>DONE")


  }

  async delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // this provides prospects(linkedin memeber id) list based on campaign id 
  async findOneChatByProspect(c_id: number, p_id: number) {
    return await this.linkedinChatRepository.findOne({ where: { prospection_campaign_id: c_id, prospect_id: p_id } });
  }

  async updateChatOne(c: LinkedInChatType) {
    return await this.linkedinChatRepository.update({ id: c.id }, c)
  }

  async getChatForInquireAndFollow(c_id: number) {
    return await this.linkedinChatRepository.find(
      {
        where: {
          prospection_campaign_id: c_id,
          chat_status: In([ChatStatus.OPENING, ChatStatus.INQUIRING, ChatStatus.UNANSWERED, ChatStatus.NOANSWERED, ChatStatus.INPROGRESS, ChatStatus.FOLLOWUP, ChatStatus.ONHOLD]),
          automatic_answer: true,
          requires_human_intervention: false
        }
      }
    )
  }

  async createNewChat(chat: LinkedInChatType) {
    try {
      const ps = await this.prospectsService.findProspectByMemberId(chat.prospect_id.toString());
      const ps_id = ps.id;
      const res = await this.linkedinChatRepository.findOne({ where: { prospect_id: ps_id, prospection_campaign_id: chat.prospection_campaign_id } });
      if (!res) {
        var new_ct: LinkedInChatType = chat;
        new_ct.prospect_id = ps_id;
        const c = this.linkedinChatRepository.create(new_ct);
        await this.linkedinChatRepository.save(c);
        console.log(">>history created...")
      }
    } catch (e) {
      console.log(">>err", chat.prospect_id)
    }
  }

  async getChatByMidCid(member_id: string, campaign_id: number) {
    const prospect = await this.prospectsService.findProspectByMemberId(member_id);
    return await this.findOneChatByProspect(campaign_id, prospect.id);
  }





}
