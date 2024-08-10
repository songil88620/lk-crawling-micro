import { Entity, Column, PrimaryGeneratedColumn} from "typeorm";

@Entity('linkedin_leadgen')
export class LeadgenEntity {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column()
    linked_in_account_id: string;

    @Column()
    template: number;

    @Column()
    autocancel: boolean;

    @Column()
    inv_message: string;

    @Column({ type: "longtext" })
    f1_message: string;

    @Column()
    f1_block: boolean;

    @Column()
    f1_delay: number;

    @Column({ type: "longtext" })
    f2_message: string;

    @Column()
    f2_block: boolean;

    @Column()
    f2_delay: number;

    @Column({ type: "longtext" })
    f3_message: string;

    @Column()
    f3_block: boolean;

    @Column()
    f3_delay: number;

    @Column()
    status: string;

    @Column()
    keyword: string;

    @Column()
    relation: string;

    @Column()
    proxy: string;

    @Column()
    created_at: string;  

    @Column()
    user_id: number;

    @Column({ type: "longtext" })
    setting: string;

    @Column()
    updated_at: string;

    @Column()
    quee_0: number;

    @Column()
    quee_1: number

    @Column()
    quee_2: number

    @Column()
    quee_3: number

}
