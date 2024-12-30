export interface Snippet {
    isDeleted: boolean;
    isFavorites: boolean;
    folderId: string;
    tagsIds: string[];
    description: string;
    name: string;
    content: {
        label: string;
        language: string;
        value: string;
    }[];
    id: string;
    createdAt: number;
    updatedAt: number;
}
