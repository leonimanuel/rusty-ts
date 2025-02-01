import { BaseModel, UserRole } from '../common';

export interface UserCompany extends BaseModel {
    user_id: string;
    company_id: string;
    role: UserRole;
} 