import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { UserService } from 'src/user/user.service';
import { LinkedInAccountsService } from 'src/linked_in_accounts/linked_in_accounts.service';
import { ProspectionCampaignsService } from 'src/prospection_campaigns/prospection_campaigns.service';
import { LeadgendataEntity } from './leadgendata.entity';
import { Leadgendata } from 'src/type/leadgendata.type';

@Injectable()
export class LeadgendataService {
    constructor(
        @InjectRepository(LeadgendataEntity) private leadgendataRepository: Repository<LeadgendataEntity>,
        @Inject(forwardRef(() => UserService)) private userService: UserService,
        @Inject(forwardRef(() => LinkedInAccountsService)) private linkedinAccountService: LinkedInAccountsService,
        @Inject(forwardRef(() => ProspectionCampaignsService)) private campaignService: ProspectionCampaignsService,
    ) { }

    async onModuleInit() {

    }

    async create_new(data: Leadgendata, st: string) {
        try {
            const member_id = data.member_id;
            const leadgen_data = await this.leadgendataRepository.findOne({ where: { member_id } });
            if (!leadgen_data) {
                const c = this.leadgendataRepository.create(data);
                await this.leadgendataRepository.save(c)
                return true
            } else {
                await this.leadgendataRepository.update({ member_id: member_id, lg_id: data.lg_id }, { status: st })
                return false
            }

        } catch (e) {
            console.log(">>erro", e)
            return false
        }
    }

    async update_status(member_id: number, status: string, lg_id: number) {
        await this.leadgendataRepository.update({ member_id, lg_id }, { status, updated_at: this.getTimestamp() })
    }

    async update_status_by_name(name: string, status: string, lg_id: number) {
        await this.leadgendataRepository.update({ name, lg_id }, { status })
    }


    async update_data(data: any, user_id: number, id: number) {
        // const leadgen = await this.leadgenRepository.findOne({ where: { id: id, user_id: user_id } });
        // if (leadgen) {
        //     await this.leadgenRepository.update({ id: id }, data) 
        //     if ('f2_block' in data || 'f3_block' in data) {
        //         if (data.f2_block == true || data.f3_block == true) {
        //             const lk_id = leadgen.linked_in_account_id;
        //             const cp = await this.campaignService.findByLkid(lk_id, user_id); 
        //             if (cp.success == true) {
        //                 const f_msg = cp.cp.first_message
        //                 if (data.f2_block == true) {
        //                     //need to update f1_message as a first_message of the campaign
        //                     await this.leadgenRepository.update({ id: id }, { f1_message: f_msg })
        //                 }
        //                 if (data.f3_block == true) {
        //                     //need to update f2_message as a first_message of the campaign    
        //                     await this.leadgenRepository.update({ id: id }, { f2_message: f_msg })
        //                 }
        //             }
        //         }
        //     }
        //     return { success: true, data: data }
        // } else {
        //     return { success: false, err: 'not exist leadgen' }
        // }
    }

    async delete_one(data: any) {
        // const id = data.id;
        // const leadgen = await this.leadgenRepository.findOne({ where: { id: id } });
        // if (leadgen) {
        //     await this.leadgenRepository.delete({ id })
        //     return { success: true }
        // } else {
        //     return { success: false, err: 'not exist leadgen' }
        // }
    }

    async get_all(user_id: number) {
        // return await this.leadgenRepository.find({ where: { user_id } })
    }

    async get_one(id: number, user_id: number) {
        // return await this.leadgenRepository.findOne({ where: { id, user_id } })
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
