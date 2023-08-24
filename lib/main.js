"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("./util");
const github_1 = require("./github");
const github_2 = require("@actions/github");
const core_1 = require("@actions/core");
const process_1 = require("process");
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const config = (0, util_1.parseConfig)(process_1.env);
            if (!config.input_tag_name &&
                !(0, util_1.isTag)(config.github_ref) &&
                !config.input_draft) {
                throw new Error(`⚠️ GitHub Releases requires a tag | config.input_tag_name: ${config.input_tag_name} | config.github_ref: ${config.github_ref} | isTag(config.github_ref): ${(0, util_1.isTag)(config.github_ref)} | config.input_draft: ${config.input_draft}`);
            }
            if (config.input_files) {
                const patterns = (0, util_1.unmatchedPatterns)(config.input_files);
                patterns.forEach((pattern) => console.warn(`🤔 Pattern '${pattern}' does not match any files.`));
                if (patterns.length > 0 && config.input_fail_on_unmatched_files) {
                    throw new Error(`⚠️ There were unmatched files`);
                }
            }
            // const oktokit = GitHub.plugin(
            //   require("@octokit/plugin-throttling"),
            //   require("@octokit/plugin-retry")
            // );
            const gh = (0, github_2.getOctokit)(config.github_token, {
                //new oktokit(
                throttle: {
                    onRateLimit: (retryAfter, options) => {
                        console.warn(`Request quota exhausted for request ${options.method} ${options.url}`);
                        if (options.request.retryCount === 0) {
                            // only retries once
                            console.log(`Retrying after ${retryAfter} seconds!`);
                            return true;
                        }
                    },
                    onAbuseLimit: (retryAfter, options) => {
                        // does not retry, only logs a warning
                        console.warn(`Abuse detected for request ${options.method} ${options.url}`);
                    },
                },
            });
            //);
            const rel = yield (0, github_1.release)(config, new github_1.GitHubReleaser(gh));
            if (config.input_files) {
                const files = (0, util_1.paths)(config.input_files);
                if (files.length == 0) {
                    console.warn(`🤔 ${config.input_files} not include valid file.`);
                }
                const currentAssets = rel.assets;
                const assets = yield Promise.all(files.map((path) => __awaiter(this, void 0, void 0, function* () {
                    const json = yield (0, github_1.upload)(config, gh, (0, util_1.uploadUrl)(rel.upload_url), path, currentAssets);
                    delete json.uploader;
                    return json;
                }))).catch((error) => {
                    throw error;
                });
                (0, core_1.setOutput)("assets", assets);
            }
            console.log(`🎉 Release ready at ${rel.html_url}`);
            (0, core_1.setOutput)("url", rel.html_url);
            (0, core_1.setOutput)("id", rel.id.toString());
            (0, core_1.setOutput)("upload_url", rel.upload_url);
        }
        catch (error) {
            (0, core_1.setFailed)(error.message);
        }
    });
}
run();
