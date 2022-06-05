import { get_dist_dir, pluralize, values, walk_directory } from "#lib/functions";
import { basename, join } from "node:path";

export function create_loader<T extends Module>(name: string, hooks: LoaderHooks<T> = {}): Loader<T> {
    return {
        modules: new Map<string, T>(),
        get all(): Array<T> {
            return values(this.modules);
        },
        async load_folder(this: Loader<T>, directory_name: string) {
            const dir = join(await get_dist_dir(), directory_name);
            for (const file of walk_directory(dir)) {
                if (basename(file).startsWith("_") || !file.endsWith(".js")) {
                    /* _ is used as an exclusion identifier */
                    continue;
                }

                /* hopefully this doesn't break in the future lmao */
                const imported = await import(file);
                const module: T = imported.default;

                /* check if this module interferes with another. */
                if (this.modules.has(module.id)) {
                    console.warn(`[${name}] duplicate id found:`, module.id);
                    continue;
                }

                /* run hooks on this module */
                if ((await hooks.registered?.call(this, module)) === false) {
                    continue;
                }

                /* add this to the commands list. */
                console.debug(`[${name}] registered module`, file);
                this.modules.set(module.id, module);
            }

            console.info(`[${name}] registered ${pluralize("module", this.modules.size)}`);
        },
    };
}

export interface Loader<T extends Module> {
    modules: Map<string, T>;

    get all(): Array<T>;

    load_folder(directory_name: string): Promise<void>;
}

export interface LoaderHooks<T extends Module> {
    registered?(this: Loader<T>, module: T): Promise<boolean>;
}

export interface Module {
    id: string;
}
