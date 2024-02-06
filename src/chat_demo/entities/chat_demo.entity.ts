
import { ChatStatus } from "src/type/chat_status.type";
import { Entity, Column, PrimaryColumn, BeforeInsert, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";

 

@Entity('chat_demo')
export class ChatDemoEntity {

    @PrimaryGeneratedColumn()
    id: number;  

    @Column({type:"longtext"})
    chat_history: string;  

    @Column({width:20})
    prospection_campaign_id: number;

    @Column({
        type: "enum",
        enum: ChatStatus,
        default: ChatStatus.OPENING,
    })
    chat_status: ChatStatus   

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

    @Column()
    account_id: number;

    @Column()
    status: number;
}
