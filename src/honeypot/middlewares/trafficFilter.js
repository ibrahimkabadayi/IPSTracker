import {checkBlacklist} from "../../db/database.js";

export function isBlacklisted(ip) {
    const result = checkBlacklist(ip);
    return result !== undefined;
}
