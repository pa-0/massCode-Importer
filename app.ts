import 'dotenv/config';
import axios from 'axios';
import {v4 as uuidv4} from 'uuid';
import * as fs from 'fs';
import {createLogger, format, transports} from 'winston';
import _ from 'lodash';

const GITHUB_API_BASE_URL = 'https://api.github.com';
const githubToken = process.env.GITHUB_TOKEN;

type Language = {
    extension: string;
    name: string;
};

interface ISnippet {
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

const logger = createLogger({
    transports: [new transports.Console()],
    format: format.combine(
        format.colorize(),
        format.splat(),
        format.metadata(),
        format.timestamp(),
        format.printf(({timestamp, level, message}) => {
            return `[${timestamp}] ${_.upperCase(level)}: ${message}.`;
        })
    ),
});

if (!githubToken) {
    console.error('GitHub token is missing. Make sure to set it in the .env file.');
    process.exit(1);
}

const languages: Array<Language> = JSON.parse(fs.readFileSync('resources/languages.ext.json', 'utf-8')) as Array<Language>;

async function* getUserSnippets(username: string): AsyncGenerator<any> {
    let currentPage = 1;

    while (true) {
        try {
            const response = await axios.get(`${GITHUB_API_BASE_URL}/users/${username}/gists?per_page=100&page=${currentPage}`, {
                headers: {
                    Authorization: `token ${githubToken}`,
                },
            });

            yield response.data;

            if (response.data?.length <= 0) {
                break;
            }

            currentPage++;
        } catch (error) {
            throw error;
        }
    }
}

async function listUserSnippets(username: string) {
    try {
        for await (const page of getUserSnippets(username)) {
            for (const item of page) {
                const posStartTags = item.description.indexOf('#');

                const model = {
                    id: uuidv4().replace('-', ''),
                    isDeleted: false,
                    isFavorites: false,
                    content: new Array<any>,
                    name: item.description.substring(0, posStartTags >= 0 ? posStartTags : item.description.length).trim(),
                    tagsIds: item?.description.match(/#\w+/g)?.map((tag: string) => getOrCreateTag(tag)) || [],
                    createdAt: new Date(item.created_at).getTime(),
                    updatedAt: item?.updated_at ? new Date(item?.updated_at).getTime() : '',
                } as ISnippet;

                for (const fileName of Object.keys(item.files)) {
                    const file = item.files[fileName] as any;
                    if (!file.raw_url) {
                        continue;
                    }

                    const source = await axios.get(`${file.raw_url}`);

                    model.content.push({
                        label: fileName,
                        language: file.language ? file.language.toLowerCase() : 'plain_text',
                        value: source.data
                    })
                }

                if (model.content.length) {
                    const language = getLanguageNameFromFilename(model.content[0].label);
                    model.folderId = getOrCreateFolder(language);
                }

                snippets.push(model);

                logger.info(`Snippet "${model.name}" converted with success`);
            }
        }
    } catch (error: any) {
        logger.error('Error fetching snippets:', error.message);
    }
}

function getLanguageNameFromFilename(name: string): Language {
    const extension = name.split('.').pop()?.toLowerCase();
    return languages.find((e: any) => e.extension === extension) || {extension: 'txt', name: 'Plain Text'};
}

function getOrCreateTag(name: string): string {
    const tagName = name.replace('#', '').trim();

    let tagId = tags.find((tag: any) => tag.name === tagName);
    if (tagId) {
        return tagId;
    }

    tagId = generateRandomString(8);
    tags.push({
        id: tagId,
        name: tagName,
        createdAt: new Date().getTime(),
        updatedAt: new Date().getTime()
    });

    return tagId;
}

function getOrCreateFolder(language: Language): string {
    let folderId = folders.find((e: any) => e.name === language.name)?.id;
    if (folderId) {
        return folderId;
    }

    folderId = generateRandomString(8);
    folders.push({
        id: folderId,
        name: language.name,
        defaultLanguage: language.extension,
        parentId: null,
        isOpen: false,
        isSystem: false,
        createdAt: new Date().getTime(),
        updatedAt: new Date().getTime(),
        index: folders.length + 1
    });

    return folderId;
}

function generateRandomString(length: number): string {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
        result += charset.charAt(Math.floor(Math.random() * charset.length));
    }

    return result;
}

const tags: Array<any> = new Array<any>();
const folders: Array<any> = new Array<any>();
const snippets: Array<any> = new Array<any>();

listUserSnippets(process.env.GITHUB_USERNAME as string).then(() => {
    fs.writeFileSync(`tags.json`, JSON.stringify(tags), 'utf-8');
    fs.writeFileSync(`folders.json`, JSON.stringify(folders), 'utf-8');
    fs.writeFileSync(`snippets.json`, JSON.stringify(snippets), 'utf-8');

    fs.writeFileSync(`db.json`, JSON.stringify(
        {
            folders: folders,
            tags: tags,
            snippets: snippets
        }, null, 2
    ), 'utf-8');
})
