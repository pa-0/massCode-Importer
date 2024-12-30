import 'dotenv/config';
import axios from 'axios';
import {v4 as uuidv4} from 'uuid';
import * as fs from 'fs';
import {Snippet} from './model/snippet';
import {ProgrammingLanguage} from './model/programming-language';
import {SnippetContent} from "./model/snippet-content";

const GITHUB_API_BASE_URL = 'https://api.github.com';

const githubToken = process.env.GITHUB_TOKEN;
const githubUsername = process.env.GITHUB_USERNAME!;

if (!githubToken) {
    console.error('GitHub token is missing. Make sure to set it in the .env file.');
    process.exit(1);
}

const logger = require('./helpers/logger');

const languages: Array<ProgrammingLanguage> = JSON.parse(fs.readFileSync('resources/languages.ext.json', 'utf-8')) as Array<ProgrammingLanguage>;

const tags: Array<any> = new Array<any>();
const folders: Array<any> = new Array<any>();
const snippets: Array<any> = new Array<any>();

/**
 * Fetch user snippets from GitHub
 * @param username The GitHub username
 */
async function* fetchUserSnippets(username: string): AsyncGenerator<any> {
    let currentPage = 1;

    while (true) {
        const {data} = await axios.get(`${GITHUB_API_BASE_URL}/users/${username}/gists`, {
            params: {per_page: 100, page: currentPage},
            headers: {Authorization: `token ${githubToken}`},
        });

        if (data?.length <= 0) {
            break;
        }

        yield data;

        currentPage++;
    }
}

/**
 * Process user snippets
 * @param username The GitHub username
 */
async function processUserSnippets(username: string) {
    try {
        for await (const page of fetchUserSnippets(username)) {
            for (const gist of page) {
                const snippet = await convertGistToSnippet(gist);
                if (snippet) snippets.push(snippet);
            }
        }

        saveDataToFiles();

        logger.info('All snippets processed and saved successfully.');
    } catch (e: any) {
        logger.error('Failed to process snippets: %s', e?.message);
    }
}

/**
 * Convert a GitHub gist to a massCode snippet
 * @param gist The GitHub gist
 */
async function convertGistToSnippet(gist: any): Promise<Snippet | null> {
    try {
        const {description, files, created_at, updated_at} = gist;
        const tags = extractTags(description);
        const name = extractName(description);

        const content: SnippetContent[] = [];
        for (const fileName in files) {
            const file = files[fileName];
            if (!file.raw_url) continue;

            const {data: fileContent} = await axios.get(file.raw_url);
            content.push({
                label: fileName,
                language: file.language?.toLowerCase() || 'plain_text',
                value: fileContent,
            });
        }

        if (!content.length) return null;

        const primaryLanguage = getLanguageFromFilename(content[0].label);
        const folderId = getOrCreateFolder(primaryLanguage);

        return {
            id: uuidv4().replace(/-/g, ''),
            isDeleted: false,
            isFavorites: false,
            folderId,
            tagsIds: tags.map(getOrCreateTag),
            description,
            name,
            content,
            createdAt: new Date(created_at).getTime(),
            updatedAt: updated_at ? new Date(updated_at).getTime() : Date.now(),
        };
    } catch (e: any) {
        logger.error('Error converting gist to snippet: %s', e?.message);
        return null;
    }
}

/**
 * Extract tags from the description
 * @param description The description
 */
function extractTags(description: string): string[] {
    return description.match(/#\w+/g)?.map(tag => tag.replace('#', '')) || [];
}

/**
 * Extract the name from the description
 * @param description The description
 */
function extractName(description: string): string {
    const posStartTags = description.indexOf('#');
    return description.substring(0, posStartTags >= 0 ? posStartTags : description.length).trim();
}

/**
 * Get the programming language from a filename
 * @param filename The filename
 */
function getLanguageFromFilename(filename: string): ProgrammingLanguage {
    const extension = filename.split('.').pop()?.toLowerCase();
    return languages.find((lang: ProgrammingLanguage) => lang.extension === extension) || {
        extension: 'txt',
        name: 'Plain Text'
    };
}

/**
 * Get or create a tag
 * @param tagName The tag name
 */
function getOrCreateTag(tagName: string): string {
    const existingTag = tags.find(tag => tag.name === tagName);
    if (existingTag) return existingTag.id;

    const newTag = {
        id: generateRandomString(8),
        name: tagName,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    };
    tags.push(newTag);
    return newTag.id;
}

/**
 * Get or create a folder
 * @param language The programming language
 */
function getOrCreateFolder(language: ProgrammingLanguage): string {
    const existingFolder = folders.find(folder => folder.name === language.name);
    if (existingFolder) {
        return existingFolder.id;
    }

    const newFolder = {
        id: generateRandomString(8),
        name: language.name,
        defaultLanguage: language.extension,
        parentId: null,
        isOpen: false,
        isSystem: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        index: folders.length + 1,
    };
    folders.push(newFolder);
    return newFolder.id;
}

/**
 * Generate a random string
 * @param length The length of the string
 */
function generateRandomString(length: number): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return Array.from({length}, () => charset.charAt(Math.floor(Math.random() * charset.length))).join('');
}

/**
 * Save data to files
 */
function saveDataToFiles(): void {
    const data = {folders, tags, snippets};
    fs.writeFileSync('db.json', JSON.stringify(data, null, 2), 'utf-8');
}

processUserSnippets(githubUsername);
