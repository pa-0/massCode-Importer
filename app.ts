import 'dotenv/config';
import axios from 'axios';
import {v4 as uuidv4} from 'uuid';
import * as fs from "fs";
import {createLogger, format, transports} from 'winston';
import _ from "lodash";

const GITHUB_API_BASE_URL = 'https://api.github.com';

const githubToken = process.env.GITHUB_TOKEN;

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
        for await (const snippets of getUserSnippets(username)) {
            for (const snippet of snippets) {
                const posStartTags = snippet.description.indexOf('#');

                const model = {
                    id: uuidv4().replace('-', ''),
                    isDeleted: false,
                    isFavorites: false,
                    folderId: '',
                    content: new Array<any>,
                    name: snippet.description.substring(0, posStartTags >= 0 ? posStartTags : snippet.description.length).trim(),
                    tagsIds: snippet?.description.match(/#\w+/g)?.map((tag: string) => getOrCreateTag(tag)) || [],
                    createdAt: new Date(snippet.created_at).getTime(),
                    updatedAt: snippet?.updated_at ? new Date(snippet?.updated_at).getTime() : '',
                } as ISnippet;

                for (const fileName of Object.keys(snippet.files)) {
                    const file = snippet.files[fileName] as any;
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

                outSnippets.push(model);

                logger.info(`Snippet "${model.name}" converted with success`);
            }
        }
    } catch (error: any) {
        logger.error('Error fetching snippets:', error.message);
    }
}

function getOrCreateTag(tag: string): string {
    const tagName = tag.replace('#', '')?.trim();

    if (!outTags.some((e: any) => e.name === tagName)) {
        outTags.push({
            id: generateRandomString(8),
            name: tagName,
            createdAt: new Date().getTime(),
            updatedAt: new Date().getTime()
        });
    }

    return outTags.find((e: any) => e.name === tagName)?.id;
}

function generateRandomString(length: number): string {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
        result += charset.charAt(Math.floor(Math.random() * charset.length));
    }

    return result;
}

const outTags: Array<any> = new Array<any>();
const outSnippets: Array<any> = new Array<any>();

listUserSnippets(process.env.GITHUB_USERNAME as string).then(() => {
    fs.writeFileSync(`tags.json`, JSON.stringify(outTags), 'utf-8');
    fs.writeFileSync(`snippets.json`, JSON.stringify(outSnippets), 'utf-8');

    logger.info(`${outTags.length} tags has been converted`);
    logger.info(`${outSnippets.length} snippets has been converted`);
})