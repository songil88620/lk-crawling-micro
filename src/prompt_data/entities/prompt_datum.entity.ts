 
import { Entity, Column, PrimaryColumn, BeforeInsert, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";


@Entity('prompt_data')
export class PromptDatumEntity {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    account_id: number;

    @Column({type:"text"})
    q_1_1: string;

    @Column({type:"text"})
    q_1_2: string;

    @Column({type:"text"})
    q_2: string;

    @Column({type:"text"})
    q_3: string;

    @Column({type:"text"})
    q_4: string;

    @Column({type:"text"})
    q_5: string;

    @Column({type:"text"})
    q_6: string;

    @Column({type:"text"})
    q_7: string;

    @Column({type:"text"})
    q_8: string;

    @Column({type:"text"})
    q_9: string;

    @Column({type:"text"})
    q_10_1: string;

    @Column({type:"text"})
    q_10_2: string;

    @Column({type:"text"})
    q_11_1: string;

    @Column({type:"text"})
    q_11_2: string;

    @Column({type:"text"})
    q_12_1: string;

    @Column({type:"text"})
    q_12_2: string;

    @Column({type:"text"})
    first_msg: string;

    @Column()
    lang: number; 

    @CreateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP(20)" })
    created_at: Date;

    @UpdateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP(20)", onUpdate: "CURRENT_TIMESTAMP(20)" })
    updated_at: Date;
    
}
