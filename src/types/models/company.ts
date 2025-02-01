import { BaseModel } from '../common';

export interface Company extends BaseModel {
    name: string;
    description?: string;
    logo_url?: string;
} 