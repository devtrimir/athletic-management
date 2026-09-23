export type PaginationLink = {
    url: string | null;
    label: string;
    active: boolean;
};

export type SportOption = { id: number; name: string };

export type Member = {
    id: number;
    member_code: string;
    pno: string | null;
    photo_path?: string | null;
    full_name: string;
    rank: string | null;
    gender?: string | null;
    blood_group?: string | null;
    player_category: string;
    player_level: string;
    current_status: string;
    deleted_at?: string | null;
    home_district: { id: number | null; name: string } | null;
    current_unit: { id: number; name: string } | null;
    posting_district: { id: number; name: string } | null;
    playable_sports: Array<
        SportOption & {
            pivot?: {
                role?: string | null;
                position?: string | null;
                sport_event?: string | null;
                weight?: string | null;
                notes?: string | null;
            };
            role?: string | null;
            position?: string | null;
            sport_event?: string | null;
            weight?: string | null;
            notes?: string | null;
        }
    >;
};

export type MasterOption = {
    code: string;
    name: string;
    name_en: string | null;
    short_name: string | null;
};

export type PaginatedMembers = {
    data: Member[];
    links: PaginationLink[];
    current_page: number;
    last_page: number;
    total: number;
    from: number | null;
    to: number | null;
};
