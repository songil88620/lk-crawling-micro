export interface CampaignType {
    id: number,
    name: string,
    status: string,
    linked_in_account_id: number,
    first_message: string,
    base_calendar: string,
    extended_calendar: string,
    uid?: string,
    is_ghl?: boolean,
    type?: string,
    warn?: boolean,
    created_at: string,
    updated_at: string
}