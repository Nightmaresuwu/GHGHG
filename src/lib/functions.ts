import { accessSync, constants, lstatSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Channel, Client } from "revolt.js";
import type { TrackInfo } from "./types";

const REGEX = {
    CHANNEL: /^<#(?<mid>[A-Z\d]{26})>|(?<id>[A-Z\d]{26})$/gm,
};

export function unique<T>(items: T[]): T[] {
    return [...new Set(items)];
}

export function fuck_iterators<T>(iterator: Iterable<T>) {
    return [...iterator];
}

export function values<V>(map: Map<any, V>): V[] {
    return [...map.values()];
}

export function parse_channel(client: Client, content: string): Channel | null {
    /* parse content */
    const exec = REGEX.CHANNEL.exec(content) ?? REGEX.CHANNEL.exec(content);

    if (!exec) {
        return null;
    }

    const id = exec[1] ?? exec[2];

    /* fetch the channel */
    return client.channels.get(id);
}

export function create_functional_timeout(): FunctionalTimeout {
    let id: NodeJS.Timeout;
    return {
        start: (duration, callback) => id = setTimeout(callback, duration),
        stop: () => clearTimeout(id),
    };
}

export interface FunctionalTimeout {
    start: (duration: number, callback: () => void) => NodeJS.Timeout;
    stop: () => void;
}

export function walk_directory(dir: string, files: string[] = []): string[] {
    for (const path of readdirSync(dir)) {
        const full_path = join(dir, path);
        try {
            accessSync(full_path, constants.R_OK);
        } catch (e) {
            /* unable to read from path */
            continue;
        }

        const stat = lstatSync(full_path);
        if (stat.isDirectory()) {
            files.concat(walk_directory(full_path, files));
        } else if (stat.isFile() && !stat.isSymbolicLink()) {
            files.push(full_path);
        }

        /* fuck every other kind of file */
    }

    return files;
}

/* this is so fucking scuffed LOL */
export async function get_dist_dir(): Promise<string> {
    const { default: pkg } = await import(`${process.cwd()}/package.json`);
    return dirname(join(process.cwd(), pkg.main));
}

export function pluralize(word: string, num: number, suffix: string = "s"): string {
    return `${num} ${word}${num === 1 ? "" : suffix}`;
}

export function format_track(track: TrackInfo) {
    return `**[${track.title}](${track.uri}) from ${track.author}**`;
}

export function extend<A extends {}, B>(target: A, source: B): A & B {
    for (const key in source) {
        Object.defineProperty(
            target,
            key,
            Object.getOwnPropertyDescriptor(source, key),
        );
    }

    return target as A & B;
}

export function chunked<T>(items: T[], size: number): T[][] {
    const chunks: T[][] = [];

    let idx = 0;
    for (const item of items) {
        let chunk = chunks[idx] ?? [];
        if (chunk.length >= size) {
            chunk = chunks[idx].slice(size);
            idx++;
        }

        chunk.push(item);
        chunks[idx] = chunk;
    }

    return chunks;
}

export function constrain(number: number, min: number, max: number): number {
    return Math.min(Math.max(number, min), max);
}
