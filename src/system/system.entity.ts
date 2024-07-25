import { Entity, Column, PrimaryGeneratedColumn } from "typeorm";


@Entity('system_data')
export class SystemEntity {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    key: string;

    @Column()
    value: string;

}
