import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { UserService } from 'src/user/user.service';
import { LinkedInAccountsService } from 'src/linked_in_accounts/linked_in_accounts.service';
import { LeadgenEntity } from './leadgen.entity';
import { ProspectionCampaignsService } from 'src/prospection_campaigns/prospection_campaigns.service';

@Injectable()
export class LeadgenService {
    constructor(
        @InjectRepository(LeadgenEntity) private leadgenRepository: Repository<LeadgenEntity>,
        @Inject(forwardRef(() => UserService)) private userService: UserService,
        @Inject(forwardRef(() => LinkedInAccountsService)) private linkedinAccountService: LinkedInAccountsService,
    ) { }

    async onModuleInit() {

    }

    async get_one_ip(ip: string) {
        return await this.leadgenRepository.findOne({ where: { proxy: ip } })
    }

    async increase_quee(id: number, m: number) {
        const leadgen = await this.leadgenRepository.findOne({ where: { id } });
        if (m == 0) {
            await this.leadgenRepository.update({ id }, { quee_0: leadgen.quee_0 + 1 })
        } else if (m == 1) {
            await this.leadgenRepository.update({ id }, { quee_1: leadgen.quee_1 + 1 })
        } else if (m == 2) {
            await this.leadgenRepository.update({ id }, { quee_2: leadgen.quee_2 + 1 })
        } else {
            await this.leadgenRepository.update({ id }, { quee_3: leadgen.quee_3 + 1 })
        }
    }

}
