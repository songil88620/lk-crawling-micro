import { Injectable } from '@nestjs/common';
import { LinkedInChatEntity } from './entities/linked_in_chat.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { LinkedInChatType } from 'src/type/linkedin_chat.type';
import { ChatStatus } from 'src/type/chat_status.type';

@Injectable()
export class LinkedInChatsService {
  constructor(
    @InjectRepository(LinkedInChatEntity)
    private linkedinChatRepository: Repository<LinkedInChatEntity>
  ) { }

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
    const c = this.linkedinChatRepository.create(chat);
    await this.linkedinChatRepository.save(c);
    return c;
  }

}
