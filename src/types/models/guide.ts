import { BaseModel } from '../common';

export interface Guide extends BaseModel {
    title: string;
    description?: string;
    company_id?: string;
    parent_guide_id?: string;
    created_by?: string;
    order_index: number;
    is_published: boolean;
} 