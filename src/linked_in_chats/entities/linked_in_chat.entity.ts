
import { ChatStatus } from "src/type/chat_status.type";
import { Entity, Column, PrimaryColumn, BeforeInsert, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";

 

@Entity('linked_in_chats')
export class LinkedInChatEntity {

    @PrimaryGeneratedColumn()
    id: number;  

    @Column({type:"longtext"})
    chat_history: string;

    @Column({width:20})
    prospect_id: number;

    @Column({width:20})
    prospection_campaign_id: number;

    @Column({
        type: "enum",
        enum: ChatStatus,
        default: ChatStatus.OPENING,
    })
    chat_status: ChatStatus  

    @Column()
    linked_in_chat_urn: string;

    @Column()
    first_message_urn: string;

    @Column()
    automatic_answer: boolean;

    @Column()
    requires_human_intervention: boolean;

    @Column()
    follow_up_count: number;  

    @Column()
    created_at: string;

    @Column()
    updated_at: string;
}
