import { Injectable } from '@nestjs/common';
import { ProspectProspectionCampaignEntity } from './entities/prospect_prospection_campaign.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class ProspectProspectionCampaignService {
  constructor(
    @InjectRepository(ProspectProspectionCampaignEntity)
    private ppcRepository: Repository<ProspectProspectionCampaignEntity>
  ) { }

  // this provides prospects(linkedin memeber id) list based on campaign id 
  async findProspectsIdsByCampaignId(id: number) {
    return await this.ppcRepository.find({ where: { prospection_campaign_id: id } });
  }
}
