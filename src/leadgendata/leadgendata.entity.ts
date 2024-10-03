
import { ChatStatus } from "src/type/chat_status.type";
import { Entity, Column, PrimaryColumn, BeforeInsert, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";

@Entity('leadgen_data')
export class LeadgendataEntity {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    member_id: string;

    @Column()
    name: string;

    @Column()
    avatar: string;

    @Column({ type: "longtext" })
    data: string;

    @Column()
    status: string;

    @Column()
    updated_at: string;

    @Column()
    f_stage: number;

    @Column()
    user_id: number;

    @Column()
    lg_id: number;

    @Column()
    urls: string;

    @Column()
    btn: string;

    @Column()
    smode: number;

}
