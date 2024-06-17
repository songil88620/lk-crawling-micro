
import { Entity, Column, PrimaryGeneratedColumn } from "typeorm";

@Entity('first_msgs')
export class FirstmsgEntity {

    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: "longtext" })
    msg: string;  

    @Column()
    cid: number;  
 
    @Column()
    created_at: string; 
      
}
