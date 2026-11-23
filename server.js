import "dotenv/config";
import { createBareServer } from "@nebula-services/bare-server-node";
import { createServer } from "http";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { server as wisp } from "@mercuryworkshop/wisp-js/server";

import { chmodSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { GoogleGenAI } from "@google/genai";
import ts from "typescript";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

let aiClient = null;
function getAiClient() {
	if (!aiClient) {
		const apiKey = process.env.GEMINI_API_KEY;
		if (!apiKey) {
			throw new Error("GEMINI_API_KEY environment variable is required");
		}
		aiClient = new GoogleGenAI({
			apiKey,
			httpOptions: {
				headers: {
					"User-Agent": "aistudio-build",
				},
			},
		});
	}
	return aiClient;
}

if (!process.env.VERCEL) {
	try {
		execSync("node scripts/copy-assets.mjs", { cwd: __dirname, stdio: "inherit" });
		execSync("node scripts/patch-sapphire-init.mjs", { cwd: __dirname, stdio: "inherit" });
	} catch (e) {
		console.error("Failed to sync static assets or apply patch:", e);
	}
}

const bare = createBareServer("/bare/", {
	logErrors: true,
	blockLocal: false,
});

wisp.options.allow_loopback_ips = true;
wisp.options.allow_private_ips = true;
wisp.options.hostname_blacklist = [/\.invalid$/i];

const fastify = Fastify({
	serverFactory: (handler) => {
		return createServer()
			.on("request", (req, res) => {
				if (bare.shouldRoute(req)) {
					bare.routeRequest(req, res);
				} else {
					handler(req, res);
				}
			})
			.on("upgrade", (req, socket, head) => {
				if (bare.shouldRoute(req)) {
					bare.routeUpgrade(req, socket, head);
				} else {
					wisp.routeRequest(req, socket, head);
				}
			});
	},
});

fastify.register(fastifyStatic, {
	root: join(__dirname, "public"),
	decorateReply: false,
});
fastify.register(fastifyStatic, {
	root: join(__dirname, "assets"),
	prefix: "/assets/",
	decorateReply: false,
});

async function serveOnyxChat(request, reply) {
	if (process.env.ONYX_CHAT_URL) {
		try {
			const targetUrl = new URL("/index.html", process.env.ONYX_CHAT_URL);
			const upstream = await fetch(targetUrl, {
				headers: {
					Accept: request.headers.accept || "text/html,application/xhtml+xml,*/*",
				},
			});
			const html = await upstream.text();
			return reply
				.code(upstream.status)
				.type(upstream.headers.get("content-type") || "text/html; charset=utf-8")
				.send(html);
		} catch (err) {
			console.error("Failed to fetch bound onyx-chat service:", err);
			return reply.code(502).send({ error: "Failed to reach onyx-chat service" });
		}
	}

	const candidates = [
		join(__dirname, "public", "onyx-chat", "index.html"),
		join(__dirname, "onyx-chat", "dist", "index.html"),
		join(__dirname, "public", "chat.html"),
	];
	for (const candidate of candidates) {
		if (existsSync(candidate)) {
			const html = readFileSync(candidate, "utf8");
			return reply.type("text/html; charset=utf-8").send(html);
		}
	}
	return reply.code(404).send("Onyx Chat bundle not found");
}

fastify.get("/onyx-chat", serveOnyxChat);
fastify.get("/onyx-chat/", serveOnyxChat);
fastify.get("/chat.html", serveOnyxChat);
fastify.get("/chat", async (request, reply) => {
	return reply.redirect("/chat.html");
});

function getDataTsPath() {
	const candidates = [
		join(__dirname, "data.tsx"),
		join(__dirname, "src", "data.tsx"),
		join(__dirname, "static", "data.tsx"),
		join(__dirname, "data.ts"),
		join(__dirname, "src", "data.ts"),
		join(__dirname, "static", "data.ts"),
	];
	return candidates.find((p) => existsSync(p)) || null;
}

function transpileDataFile(source) {
	return ts.transpileModule(source, {
		compilerOptions: {
			target: ts.ScriptTarget.ES2022,
			module: ts.ModuleKind.ES2022,
			jsx: ts.JsxEmit.ReactJSX,
			removeComments: false,
		},
	});
}

fastify.get("/data.tsx", async (request, reply) => {
	try {
		const filePath = getDataTsPath();
		if (!filePath) {
			return reply
				.header("Content-Type", "application/javascript; charset=utf-8")
				.header("Cache-Control", "no-cache, no-store, must-revalidate")
				.send("export const VAULT_DATA = { movies: [], tv: [], anime: [], manga: [], apps: [], proxies: [] }; export default VAULT_DATA;");
		}
		const source = readFileSync(filePath, "utf8");
		const transpiled = transpileDataFile(source);
		return reply
			.header("Content-Type", "application/javascript; charset=utf-8")
			.header("Cache-Control", "no-cache, no-store, must-revalidate")
			.send(transpiled.outputText);
	} catch (err) {
		console.error("Transpiling data.tsx error:", err);
		return reply
			.header("Content-Type", "application/javascript; charset=utf-8")
			.header("Cache-Control", "no-cache, no-store, must-revalidate")
			.send(`console.error("data.tsx transpile error:", ${JSON.stringify(err.message)}); export const VAULT_DATA = { movies: [], tv: [], anime: [], manga: [], apps: [], proxies: [] }; export default VAULT_DATA;`);
	}
});

fastify.get("/data.ts", async (request, reply) => {
	try {
		const filePath = getDataTsPath();
		if (!filePath) {
			return reply
				.header("Content-Type", "application/javascript; charset=utf-8")
				.header("Cache-Control", "no-cache, no-store, must-revalidate")
				.send("export const VAULT_DATA = { movies: [], tv: [], anime: [], manga: [], apps: [], proxies: [] }; export default VAULT_DATA;");
		}
		const source = readFileSync(filePath, "utf8");
		const transpiled = transpileDataFile(source);
		return reply
			.header("Content-Type", "application/javascript; charset=utf-8")
			.header("Cache-Control", "no-cache, no-store, must-revalidate")
			.send(transpiled.outputText);
	} catch (err) {
		console.error("Transpiling data.ts error:", err);
		return reply
			.header("Content-Type", "application/javascript; charset=utf-8")
			.header("Cache-Control", "no-cache, no-store, must-revalidate")
			.send(`console.error("data.ts transpile error:", ${JSON.stringify(err.message)}); export const VAULT_DATA = { movies: [], tv: [], anime: [], manga: [], apps: [], proxies: [] }; export default VAULT_DATA;`);
	}
});

fastify.get("/data.js", async (request, reply) => {
	try {
		const filePath = getDataTsPath();
		if (!filePath) {
			return reply
				.header("Content-Type", "application/javascript; charset=utf-8")
				.header("Cache-Control", "no-cache, no-store, must-revalidate")
				.send("window.VAULT_DATA = { movies: [], tv: [], anime: [], manga: [], apps: [], proxies: [] };");
		}
		const source = readFileSync(filePath, "utf8");
		const transpiled = transpileDataFile(source);
		return reply
			.header("Content-Type", "application/javascript; charset=utf-8")
			.header("Cache-Control", "no-cache, no-store, must-revalidate")
			.send(transpiled.outputText);
	} catch (err) {
		console.error("Transpiling data.js error:", err);
		return reply
			.header("Content-Type", "application/javascript; charset=utf-8")
			.header("Cache-Control", "no-cache, no-store, must-revalidate")
			.send(`console.error("data.js transpile error:", ${JSON.stringify(err.message)});`);
	}
});

fastify.all("/api/music/*", async (request, reply) => {
	const upstreamUrl = "https://musicv-production.up.railway.app" + request.raw.url;
	try {
		const reqHeaders = {
			"Accept": request.headers["accept"] || "*/*",
			"User-Agent": request.headers["user-agent"] || "Mozilla/5.0",
		};
		if (request.headers["range"]) {
			reqHeaders["range"] = request.headers["range"];
		}
		const upstreamRes = await fetch(upstreamUrl, {
			method: request.method,
			headers: reqHeaders,
			body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
			redirect: "follow",
		});

		reply.status(upstreamRes.status);
		upstreamRes.headers.forEach((val, key) => {
			const k = key.toLowerCase();
			if (!["content-encoding", "content-length", "transfer-encoding"].includes(k)) {
				reply.header(key, val);
			}
		});

		const arrayBuffer = await upstreamRes.arrayBuffer();
		return reply.send(Buffer.from(arrayBuffer));
	} catch (err) {
		console.error("Sonora proxy error:", err);
		return reply.status(502).send({ error: "Failed to connect to music service" });
	}
});



const EMIS_BASE_URL = (process.env.EMIS_BASE_URL || "https://emis.zxs-is-very.cool/v1").replace(/\/$/, "");
const EMIS_API_KEY = process.env.EMIS_API_KEY;
const DEFAULT_LLM_MODEL = "glm-5.3";

if (!EMIS_API_KEY) {
	console.warn(
		"[EMIS API] Warning: EMIS_API_KEY is not set. Set it in your environment or .env file. LLM chat/model endpoints will fail until this is configured."
	);
}

const ALL_EMIS_MODELS = [
	{"id":"gpt-5.6-luna","object":"model","owned_by":"openai","label":"GPT-5.6 Luna","reasoning":true,"tools":true,"vision":true},
	{"id":"claude-sonnet-5","object":"model","owned_by":"anthropic","label":"Claude Sonnet 5","reasoning":true,"tools":true,"vision":true},
	{"id":"gpt-5.6-sol","object":"model","owned_by":"openai","label":"GPT-5.6 Sol","reasoning":true,"tools":true,"vision":true},
	{"id":"claude-opus-4-8","object":"model","owned_by":"anthropic","label":"Claude Opus 4.8","reasoning":true,"tools":true,"vision":true},
	{"id":"claude-opus-5","object":"model","owned_by":"anthropic","label":"Claude Opus 5","reasoning":true,"tools":true,"vision":true},
	{"id":"claude-fable-5","object":"model","owned_by":"anthropic","label":"Claude Fable 5","reasoning":false,"tools":true,"vision":true},
	{"id":"gpt-6-astra","object":"model","owned_by":"openai","label":"GPT-6 Astra","reasoning":false,"tools":true,"vision":true},
	{"id":"claude-fable-5-1","object":"model","owned_by":"anthropic","label":"Claude Fable 5.1","reasoning":false,"tools":true,"vision":true},
	{"id":"glm-5.2","object":"model","owned_by":"zai","label":"GLM 5.2","reasoning":true,"tools":true,"vision":false},
	{"id":"glm-5.3","object":"model","owned_by":"zai","label":"GLM 5.3","reasoning":true,"tools":true,"vision":false},
	{"id":"glm-5.3-flash","object":"model","owned_by":"zai","label":"GLM 5.3 Flash","reasoning":true,"tools":true,"vision":false},
	{"id":"deepseek-v4-pro","object":"model","owned_by":"deepseek","label":"Deepseek V4 Pro","reasoning":true,"tools":true,"vision":false},
	{"id":"deepseek-v4-flash","object":"model","owned_by":"deepseek","label":"Deepseek V4 Flash","reasoning":true,"tools":true,"vision":false},
	{"id":"qwen3.8-max","object":"model","owned_by":"qwen","label":"Qwen3.8 Max","reasoning":false,"tools":true,"vision":false},
	{"id":"command-a","object":"model","owned_by":"cohere","label":"Command A","reasoning":false,"vision":false,"tools":false},
	{"id":"command-a-plus","object":"model","owned_by":"cohere","label":"Command A Plus","reasoning":false,"vision":false,"tools":false},
	{"id":"command-a-reasoning","object":"model","owned_by":"cohere","label":"Command A Reasoning","reasoning":true,"vision":false,"tools":false},
	{"id":"command-a-vision","object":"model","owned_by":"cohere","label":"Command A Vision","reasoning":false,"vision":true,"tools":false},
	{"id":"command-r-plus","object":"model","owned_by":"cohere","label":"Command R+","reasoning":false,"vision":false,"tools":false},
	{"id":"command-r","object":"model","owned_by":"cohere","label":"Command R","reasoning":false,"vision":false,"tools":false},
	{"id":"command-r7b","object":"model","owned_by":"cohere","label":"Command R7B","reasoning":false,"vision":false,"tools":false},
	{"id":"aya-expanse-32b","object":"model","owned_by":"cohere","label":"Aya Expanse 32B","reasoning":false,"vision":false,"tools":false},
	{"id":"aya-vision-32b","object":"model","owned_by":"cohere","label":"Aya Vision 32B","reasoning":false,"vision":true,"tools":false},
	{"id":"north-mini-code","object":"model","owned_by":"cohere","label":"North Mini Code","reasoning":false,"vision":false,"tools":false},
	{"id":"deepseek-v4-flash-0731-turbo","object":"model","owned_by":"deepseek","label":"DeepSeek V4 Flash (0731)","tools":true},
	{"id":"compound-mini","object":"model","owned_by":"groq","label":"Compound Mini","premium":false,"tools":true,"vision":false,"reasoning":false},
	{"id":"gpt-oss-120b","object":"model","owned_by":"groq","label":"GPT-OSS 120B","premium":false,"tools":true,"vision":false,"reasoning":false},
	{"id":"gpt-oss-20b","object":"model","owned_by":"groq","label":"GPT-OSS 20B","premium":false,"tools":true,"vision":false,"reasoning":false},
	{"id":"compound","object":"model","owned_by":"groq","label":"Compound","premium":false,"tools":true,"vision":false,"reasoning":false},
	{"id":"qwen-3.6-27b","object":"model","owned_by":"qwen","label":"Qwen 3.6 27B","premium":false,"tools":true,"vision":false,"reasoning":false},
	{"id":"allam-2-7b","object":"model","owned_by":"huggingface","label":"Allam 2 7B","premium":false,"tools":true,"vision":false,"reasoning":false},
	{"id":"qwen3-235b","object":"model","owned_by":"qwen","label":"Qwen3 235B","premium":false,"reasoning":true},
	{"id":"gpt-5-nano","object":"model","owned_by":"openai","label":"GPT-5 Nano","premium":false,"reasoning":false},
	{"id":"gpt-4.1-nano","object":"model","owned_by":"openai","label":"GPT-4.1 Nano","premium":false,"reasoning":false},
	{"id":"gpt-4o-mini","object":"model","owned_by":"openai","label":"GPT-4o Mini","premium":false,"reasoning":false},
	{"id":"gemma-4","object":"model","owned_by":"google","label":"Gemma 4","premium":false,"reasoning":false},
	{"id":"gemini-2.5-flash-lite","object":"model","owned_by":"google","label":"Gemini 2.5 Flash Lite","premium":false,"reasoning":false},
	{"id":"llama-3.3-70b-instruct","object":"model","owned_by":"meta","label":"Llama 3.3 70B","premium":false,"reasoning":false},
	{"id":"llama-3.1-8b-instant","object":"model","owned_by":"meta","label":"Llama 3.1 8B","premium":false,"reasoning":false},
	{"id":"standard","object":"model","owned_by":"deepai","label":"Standard","premium":false,"reasoning":false},
	{"id":"online","object":"model","owned_by":"deepai","label":"Online (web search)","premium":false,"reasoning":false},
	{"id":"unfiltered_x","object":"model","owned_by":"huggingface","label":"Unfiltered X","premium":false,"reasoning":false},
	{"id":"minimax-text-01","object":"model","owned_by":"minimax","label":"MiniMax Text 01","premium":false,"reasoning":false},
	{"id":"vibethinker-3b","object":"model","owned_by":"huggingface","label":"VibeThinker 3B","premium":false,"reasoning":true},
	{"id":"kimi-k3-base","object":"model","owned_by":"moonshotai","label":"Kimi K3 (GitHub)","premium":false,"tools":true,"vision":true,"reasoning":true},
	{"id":"kimi-k3","object":"model","owned_by":"moonshotai","label":"Kimi K3","premium":false,"tools":true,"vision":true,"reasoning":true},
	{"id":"gpt-5-mini","object":"model","owned_by":"openai","label":"GPT-5 mini","premium":false,"tools":true,"vision":true,"reasoning":true},
	{"id":"claude-haiku-4.5","object":"model","owned_by":"anthropic","label":"Claude Haiku 4.5","premium":false,"tools":true,"vision":true,"reasoning":false},
	{"id":"gpt-4.1","object":"model","owned_by":"openai","label":"GPT-4.1","premium":false,"tools":true,"vision":true,"reasoning":false},
	{"id":"gpt-4o","object":"model","owned_by":"openai","label":"GPT-4o","premium":false,"tools":true,"vision":true,"reasoning":false},
	{"id":"nova","object":"model","owned_by":"amazon","label":"Nova 2 Lite","premium":false,"tools":false,"vision":false,"reasoning":false},
	{"id":"gemma-4-31b-heretic","object":"model","owned_by":"google","label":"Gemma 4 31B (heretic)","premium":false,"tools":false,"vision":false,"reasoning":false},
	{"id":"stheno-l3-8b","object":"model","owned_by":"huggingface","label":"L3 8B Stheno v3.2","premium":false,"tools":false,"vision":false,"reasoning":false},
	{"id":"llama-3.2-3b","object":"model","owned_by":"meta","label":"Llama 3.2 3B Instruct","premium":false,"tools":false,"vision":false,"reasoning":false},
	{"id":"llama-3.2-1b","object":"model","owned_by":"meta","label":"Llama 3.2 1B Instruct","premium":false,"tools":false,"vision":false,"reasoning":false},
	{"id":"deepseek-v4.1","object":"model","owned_by":"deepseek","label":"DeepSeek V4.1 Flash","tools":true,"vision":true,"reasoning":true},
	{"id":"mimo-v2.5","object":"model","owned_by":"xiaomi","label":"MiMo V2.5","premium":false,"tools":true,"vision":false},
	{"id":"kimi-k2.6","object":"model","owned_by":"moonshotai","label":"Kimi K2.6","premium":false,"tools":true,"vision":false},
	{"id":"gemma-4-26b","object":"model","owned_by":"google","label":"Gemma 4 26B","premium":false,"tools":true,"vision":true},
	{"id":"qwen-3.8-27b","object":"model","owned_by":"qwen","label":"Qwen 3.8 27b","premium":false,"tools":true,"vision":false},
	{"id":"openai","object":"model","owned_by":"openai","label":"OpenAI","premium":false,"tools":true,"vision":false},
	{"id":"openai-fast","object":"model","owned_by":"openai","label":"OpenAI Fast","premium":false,"tools":true,"vision":false},
	{"id":"gpt-oss","object":"model","owned_by":"openai","label":"GPT OSS","premium":false,"tools":true,"vision":false},
	{"id":"codestral-latest","object":"model","owned_by":"mistral","label":"Codestral Latest","premium":false,"tools":true,"vision":false},
	{"id":"meta-llama-3_3-70b-instruct","object":"model","owned_by":"meta","label":"Meta Llama 3 3 70b Instruct","premium":false,"tools":true,"vision":false},
	{"id":"qwen3.5-397b-a17b","object":"model","owned_by":"qwen","label":"Qwen3.5 397b A17b","premium":false,"tools":true,"vision":false},
	{"id":"mistral-small-3.2-24b-instruct-2506","object":"model","owned_by":"mistral","label":"Mistral Small 3.2 24b Instruct 2506","premium":false,"tools":true,"vision":false},
	{"id":"mistral-nemo-instruct-2407","object":"model","owned_by":"mistral","label":"Mistral Nemo Instruct 2407","premium":false,"tools":true,"vision":false},
	{"id":"qwen3.6-27b","object":"model","owned_by":"qwen","label":"Qwen3.6 27b","premium":false,"tools":true,"vision":false},
	{"id":"qwen3-32b","object":"model","owned_by":"qwen","label":"Qwen3 32b","premium":false,"tools":true,"vision":false},
	{"id":"qwen3.5-9b","object":"model","owned_by":"qwen","label":"Qwen3.5 9b","premium":false,"tools":true,"vision":false},
	{"id":"qwen2.5-vl-72b-instruct","object":"model","owned_by":"qwen","label":"Qwen2.5 VL 72b Instruct","premium":false,"tools":true,"vision":true},
	{"id":"mistral-7b-instruct-v0.3","object":"model","owned_by":"mistral","label":"Mistral 7b Instruct V0.3","premium":false,"tools":true,"vision":false},
	{"id":"qwen3-coder-30b-a3b-instruct","object":"model","owned_by":"qwen","label":"Qwen3 Coder 30b A3b Instruct","premium":false,"tools":true,"vision":false},
	{"id":"poolside-laguna-xs-2.1","object":"model","owned_by":"poolside","label":"Poolside Laguna XS 2.1","premium":false,"tools":true,"vision":false},
	{"id":"stepfun-step-3.7-flash","object":"model","owned_by":"stepfun","label":"Stepfun Step 3.7 Flash","premium":false,"tools":true,"vision":false},
	{"id":"nvidia-nemotron-3-nano-omni-30b-a3b-reasoning","object":"model","owned_by":"nvidia","label":"Nvidia Nemotron 3 Nano Omni 30b A3b Reasoning","premium":false,"tools":true,"vision":true},
	{"id":"nvidia-nemotron-3-super-120b-a12b","object":"model","owned_by":"nvidia","label":"Nvidia Nemotron 3 Super 120b A12b","premium":false,"tools":true,"vision":false},
	{"id":"nvidia-nemotron-3-ultra-550b-a55b","object":"model","owned_by":"nvidia","label":"Nvidia Nemotron 3 Ultra 550b A55b","premium":false,"tools":true,"vision":false},
	{"id":"dots-studio-dots-3-note-preview","object":"model","owned_by":"rednote","label":"Dots Studio Dots 3 Note Preview","premium":false,"tools":true,"vision":false},
	{"id":"inclusionai-ling-3.0-flash-fin","object":"model","owned_by":"inclusionai","label":"Inclusionai Ling 3.0 Flash Fin","premium":false,"tools":true,"vision":false},
	{"id":"liquid-lfm-2.5-2.6b","object":"model","owned_by":"liquidai","label":"Liquid Lfm 2.5 2.6b","premium":false,"tools":true,"vision":false},
	{"id":"minimax-minimax-m2.7","object":"model","owned_by":"minimax","label":"Minimax Minimax M2.7","premium":false,"tools":true,"vision":false},
	{"id":"nvidia-nemotron-3.5-lightning","object":"model","owned_by":"nvidia","label":"Nvidia Nemotron 3.5 Lightning","premium":false,"tools":true,"vision":false},
	{"id":"poolside-laguna-s-2.1","object":"model","owned_by":"poolside","label":"Poolside Laguna S 2.1","premium":false,"tools":true,"vision":false},
	{"id":"image","object":"model","owned_by":"blackforest","label":"FLUX (fast)","image":true},
	{"id":"sdxl-lightning","object":"model","owned_by":"stabilityai","label":"Stable Diffusion XL Lightning","premium":false,"image":true},
	{"id":"flux-2-klein-4b","object":"model","owned_by":"blackforest","label":"FLUX.2 Klein 4B","premium":false,"image":true},
	{"id":"flux-2-klein-9b","object":"model","owned_by":"blackforest","label":"FLUX.2 Klein 9B","premium":false,"image":true},
	{"id":"flux-2-dev","object":"model","owned_by":"blackforest","label":"FLUX.2 Dev","premium":false,"image":true},
	{"id":"flux-1-schnell","object":"model","owned_by":"blackforest","label":"FLUX.1 Schnell","premium":false,"image":true},
	{"id":"phoenix-1.0","object":"model","owned_by":"leonardo","label":"Leonardo Phoenix","premium":false,"image":true},
	{"id":"lucid-origin","object":"model","owned_by":"leonardo","label":"Leonardo Lucid Origin","premium":false,"image":true},
	{"id":"image-edit","object":"model","owned_by":"blackforest","label":"FLUX.2 Edit","edit":true,"vision":true},
	{"id":"music","object":"model","owned_by":"media","label":"Music (auto)","audio":true},
	{"id":"musicgen","object":"model","owned_by":"media","label":"MusicGen","audio":true},
	{"id":"musicgen-stream","object":"model","owned_by":"media","label":"MusicGen Streaming","audio":true},
	{"id":"stable-audio","object":"model","owned_by":"media","label":"Stable Audio Open","audio":true},
	{"id":"audioldm2","object":"model","owned_by":"media","label":"AudioLDM 2","audio":true},
	{"id":"mustango","object":"model","owned_by":"media","label":"Mustango","audio":true},
	{"id":"video","object":"model","owned_by":"media","label":"Video (auto)","video":true},
	{"id":"ltx-video","object":"model","owned_by":"media","label":"LTX-Video","video":true},
	{"id":"wan-2.1","object":"model","owned_by":"media","label":"Wan 2.1 Fast","video":true},
	{"id":"self-forcing","object":"model","owned_by":"media","label":"Self-Forcing (streaming)","video":true},
	{"id":"cogvideox","object":"model","owned_by":"media","label":"CogVideoX 5B","video":true},
	{"id":"claude-opus-5-fast","object":"model","owned_by":"anthropic","label":"Claude Opus 5 Fast","tools":true},
	{"id":"deepseek-v4-flash-0731","object":"model","owned_by":"deepseek","label":"DeepSeek V4 Flash 0731","tools":true},
	{"id":"deepseek-v4-pro-0813","object":"model","owned_by":"deepseek","label":"DeepSeek V4 Pro 0813","tools":true},
	{"id":"gemini-2.5-flash","object":"model","owned_by":"google","label":"Gemini 2.5 Flash","tools":true},
	{"id":"gemini-2.5-pro","object":"model","owned_by":"google","label":"Gemini 2.5 Pro","tools":true},
	{"id":"gemini-3.1-pro-preview","object":"model","owned_by":"google","label":"Gemini 3.1 Pro Preview","tools":true},
	{"id":"gemini-3.8-flash","object":"model","owned_by":"google","label":"Gemini 3.8 Flash","tools":true},
	{"id":"minimax-m3","object":"model","owned_by":"minimax","label":"MiniMax M3","tools":true},
	{"id":"gpt-5.6-terra","object":"model","owned_by":"openai","label":"GPT-5.6 Terra","tools":true},
	{"id":"qwen3-coder-plus","object":"model","owned_by":"qwen","label":"Qwen3 Coder Plus","tools":true},
	{"id":"qwen3.7-flash","object":"model","owned_by":"qwen","label":"Qwen3.7 Flash","tools":true},
	{"id":"qwen3.7-max","object":"model","owned_by":"qwen","label":"Qwen3.7 Max","tools":true},
	{"id":"qwen3.7-plus","object":"model","owned_by":"qwen","label":"Qwen3.7 Plus","tools":true},
	{"id":"qwen3.8-27b","object":"model","owned_by":"qwen","label":"Qwen3.8 27B","tools":true},
	{"id":"qwen3.8-flash","object":"model","owned_by":"qwen","label":"Qwen3.8 Flash","tools":true},
	{"id":"qwen3.8-max-0902","object":"model","owned_by":"qwen","label":"Qwen3.8 Max 0902","tools":true},
	{"id":"grok-4.3","object":"model","owned_by":"xai","label":"Grok 4.3","tools":true},
	{"id":"mimo-v2.5-pro","object":"model","owned_by":"xiaomi","label":"MiMo V2.5 Pro","tools":true}
];

async function fetchEmisModels() {
	try {
		const res = await fetch(`${EMIS_BASE_URL}/models`, {
			method: "GET",
			headers: {
				"Authorization": `Bearer ${EMIS_API_KEY}`,
				"Accept": "application/json",
			},
		});
		if (res.ok) {
			const json = await res.json();
			if (json && Array.isArray(json.data) && json.data.length > 0) {
				const modelMap = new Map();
				ALL_EMIS_MODELS.forEach(m => modelMap.set(m.id, { ...m }));
				json.data.forEach(m => {
					const existing = modelMap.get(m.id) || {};
					modelMap.set(m.id, { ...existing, ...m });
				});
				return Array.from(modelMap.values());
			}
		}
	} catch (err) {
		console.warn("[EMIS API] Could not fetch models from upstream, using catalog:", err.message);
	}
	return ALL_EMIS_MODELS;
}

function parseEmisPayload(rawText) {
	const trimmed = (rawText || "").trim();
	if (!trimmed) return { text: "", raw: null };

	if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
		try {
			const json = JSON.parse(trimmed);
			if (json.choices && Array.isArray(json.choices) && json.choices.length > 0) {
				const c = json.choices[0];
				const content = c.message?.content || c.delta?.content || c.text || "";
				return { text: content, raw: json, id: json.id, usage: json.usage };
			}
			if (typeof json.text === "string") {
				return { text: json.text, raw: json, id: json.id, usage: json.usage };
			}
		} catch (e) {
		}
	}

	let accumulated = "";
	let lastId = null;
	let parsedModel = null;
	let lastUsage = null;
	const lines = trimmed.split("\n");

	for (const line of lines) {
		const l = line.trim();
		if (!l || !l.startsWith("data:")) continue;
		const dataStr = l.replace(/^data:\s*/, "").trim();
		if (dataStr === "[DONE]") continue;

		try {
			const parsed = JSON.parse(dataStr);
			if (parsed.id) lastId = parsed.id;
			if (parsed.model) parsedModel = parsed.model;
			if (parsed.usage) lastUsage = parsed.usage;
			if (Array.isArray(parsed.choices) && parsed.choices.length > 0) {
				const c = parsed.choices[0];
				if (c.delta && typeof c.delta.content === "string") {
					accumulated += c.delta.content;
				} else if (c.message && typeof c.message.content === "string") {
					accumulated += c.message.content;
				} else if (typeof c.text === "string") {
					accumulated += c.text;
				}
			}
		} catch (e) {
		}
	}

	if (accumulated.length > 0) {
		return {
			text: accumulated,
			raw: { id: lastId, model: parsedModel, usage: lastUsage },
			id: lastId,
			usage: lastUsage,
		};
	}

	return { text: trimmed, raw: null };
}

async function callEmisChatCompletions({ model, messages, temperature = 0.7, max_tokens, systemInstruction }) {
	if (!EMIS_API_KEY) {
		throw new Error("EMIS_API_KEY is not configured on the server.");
	}

	const selectedModel = model || DEFAULT_LLM_MODEL;
	const fullMessages = [];

	if (systemInstruction) {
		fullMessages.push({ role: "system", content: systemInstruction });
	}

	if (Array.isArray(messages)) {
		for (const m of messages) {
			fullMessages.push({
				role: m.role === "model" || m.role === "assistant" ? "assistant" : m.role === "system" ? "system" : "user",
				content: typeof m.content === "string" ? m.content : (Array.isArray(m.parts) ? m.parts.map(p => p.text || "").join("\n") : String(m.content || "")),
			});
		}
	}

	const bodyPayload = {
		model: selectedModel,
		messages: fullMessages,
		temperature: typeof temperature === "number" ? temperature : 0.7,
	};
	if (max_tokens) {
		bodyPayload.max_tokens = max_tokens;
	}

	const res = await fetch(`${EMIS_BASE_URL}/chat/completions`, {
		method: "POST",
		headers: {
			"Authorization": `Bearer ${EMIS_API_KEY}`,
			"Content-Type": "application/json",
			"Accept": "text/event-stream, application/json, */*",
		},
		body: JSON.stringify(bodyPayload),
	});

	if (!res.ok) {
		const errText = await res.text();
		throw new Error(`Emis API returned ${res.status}: ${errText}`);
	}

	const rawText = await res.text();
	const parsed = parseEmisPayload(rawText);

	return {
		text: parsed.text || "",
		raw: parsed.raw || parsed,
		model: selectedModel,
		usage: parsed.usage || null,
	};
}

fastify.get("/api/llm/models", async (request, reply) => {
	try {
		const models = await fetchEmisModels();
		return reply.send({
			object: "list",
			data: models,
			defaultModel: DEFAULT_LLM_MODEL,
			baseUrl: EMIS_BASE_URL,
		});
	} catch (err) {
		console.error("Models API Error:", err);
		return reply.code(500).send({ error: err.message || "Failed to fetch models" });
	}
});

fastify.get("/api/ai/models", async (request, reply) => {
	try {
		const models = await fetchEmisModels();
		return reply.send({
			object: "list",
			data: models,
			defaultModel: DEFAULT_LLM_MODEL,
			baseUrl: EMIS_BASE_URL,
		});
	} catch (err) {
		console.error("AI Models API Error:", err);
		return reply.code(500).send({ error: err.message || "Failed to fetch models" });
	}
});

fastify.post("/api/llm/chat", async (request, reply) => {
	try {
		const {
			model = DEFAULT_LLM_MODEL,
			messages,
			prompt,
			history = [],
			pageContext,
			systemInstruction,
			temperature,
			max_tokens
		} = request.body || {};

		let chatMessages = Array.isArray(messages) ? [...messages] : [];

		if (chatMessages.length === 0) {
			if (history && history.length > 0) {
				chatMessages = history.map(msg => ({
					role: msg.role === "user" ? "user" : "assistant",
					content: msg.content || (msg.parts ? msg.parts.map(p => p.text || "").join("") : ""),
				}));
			}

			if (prompt) {
				const contextText = pageContext && (pageContext.url || pageContext.title || pageContext.text)
					? `[Page Context: Title "${pageContext.title || "Untitled"}", URL "${pageContext.url || "Unknown"}"${pageContext.text ? `\nSnippet: ${pageContext.text.slice(0, 2000)}` : ""}]\n\n`
					: "";

				chatMessages.push({
					role: "user",
					content: contextText + prompt,
				});
			}
		}

		if (chatMessages.length === 0) {
			return reply.code(400).send({ error: "Messages or prompt required." });
		}

		const defaultSystem = systemInstruction || "You are Scenario, a powerful, fast, and helpful assistant built into SpadeOS. You assist with coding, web navigation, research, creative writing, and problem solving. Provide accurate, clear markdown formatted responses.";

		try {
			const result = await callEmisChatCompletions({
				model,
				messages: chatMessages,
				temperature,
				max_tokens,
				systemInstruction: defaultSystem,
			});

			return reply.send({
				id: result.raw?.id || `chatcmpl-${Date.now()}`,
				object: "chat.completion",
				created: Math.floor(Date.now() / 1000),
				model: result.model,
				text: result.text,
				choices: [
					{
						index: 0,
						message: {
							role: "assistant",
							content: result.text,
						},
						finish_reason: "stop",
					},
				],
				usage: result.usage,
			});
		} catch (emisErr) {
			console.warn("[EMIS Chat Error] Falling back to Gemini if available:", emisErr.message);

			if (process.env.GEMINI_API_KEY) {
				const ai = getAiClient();
				const contents = chatMessages.map(msg => ({
					role: msg.role === "assistant" || msg.role === "model" ? "model" : "user",
					parts: [{ text: msg.content }],
				}));

				const geminiRes = await ai.models.generateContent({
					model: "gemini-3.8-flash",
					contents,
					config: { systemInstruction: defaultSystem },
				});

				const replyText = geminiRes.text || "No response generated.";
				return reply.send({
					id: `chatcmpl-${Date.now()}`,
					object: "chat.completion",
					created: Math.floor(Date.now() / 1000),
					model: "gemini-3.8-flash",
					text: replyText,
					choices: [
						{
							index: 0,
							message: {
								role: "assistant",
								content: replyText,
							},
							finish_reason: "stop",
						},
					],
				});
			}

			throw emisErr;
		}
	} catch (err) {
		console.error("LLM Chat API Error:", err);
		return reply.code(500).send({ error: err.message || "Failed to generate AI response" });
	}
});

fastify.post("/api/ai/chat", async (request, reply) => {
	try {
		const {
			model = DEFAULT_LLM_MODEL,
			prompt,
			history = [],
			messages,
			pageContext,
			systemInstruction,
			temperature,
		} = request.body || {};

		let chatMessages = Array.isArray(messages) ? [...messages] : [];

		if (chatMessages.length === 0) {
			if (history && history.length > 0) {
				chatMessages = history.map(msg => ({
					role: msg.role === "user" ? "user" : "assistant",
					content: msg.content || (msg.parts ? msg.parts.map(p => p.text || "").join("") : ""),
				}));
			}

			if (prompt) {
				const contextText = pageContext && (pageContext.url || pageContext.title || pageContext.text)
					? `[Page Context: Title "${pageContext.title || "Untitled"}", URL "${pageContext.url || "Unknown"}"${pageContext.text ? `\nSnippet: ${pageContext.text.slice(0, 2000)}` : ""}]\n\n`
					: "";

				chatMessages.push({
					role: "user",
					content: contextText + prompt,
				});
			}
		}

		if (chatMessages.length === 0) {
			return reply.code(400).send({ error: "Prompt or message history is required." });
		}

		const defaultSystem = systemInstruction || "You are Spade AI, an intelligent, fast browser assistant built into SpadeOS. You help users navigate the web, summarize content, answer questions, explain code, and assist with creative or research tasks. Keep answers concise, accurate, formatted in clear markdown, and friendly.";

		try {
			const result = await callEmisChatCompletions({
				model,
				messages: chatMessages,
				temperature,
				systemInstruction: defaultSystem,
			});
			return reply.send({ text: result.text || "No response generated.", model: result.model });
		} catch (emisErr) {
			console.warn("[EMIS /api/ai/chat Error] Trying Gemini fallback:", emisErr.message);
			if (process.env.GEMINI_API_KEY) {
				const ai = getAiClient();
				const contents = chatMessages.map(msg => ({
					role: msg.role === "assistant" || msg.role === "model" ? "model" : "user",
					parts: [{ text: msg.content }],
				}));

				const response = await ai.models.generateContent({
					model: "gemini-3.8-flash",
					contents,
					config: { systemInstruction: defaultSystem },
				});

				return reply.send({ text: response.text || "No response generated.", model: "gemini-3.8-flash" });
			}
			throw emisErr;
		}
	} catch (err) {
		console.error("AI Chat API Error:", err);
		return reply.code(500).send({ error: err.message || "Failed to generate AI response" });
	}
});

fastify.post("/api/ai/summarize", async (request, reply) => {
	try {
		const { content = "", title = "N/A", url = "N/A", model = DEFAULT_LLM_MODEL } = request.body || {};

		if (!content && !url) {
			return reply.code(400).send({ error: "Content or URL is required to summarize" });
		}

		const summaryPrompt = `Please summarize this content concisely:\nTitle: ${title}\nURL: ${url}\n\nContent:\n${content.slice(0, 15000)}`;
		const sysPrompt = "You are Spade AI Page Summarizer. Produce clear, elegant, markdown-formatted summaries including an executive summary (2-3 sentences), key takeaways (3-5 bullet points), and Conclusions/Actionable Insights.";

		try {
			const result = await callEmisChatCompletions({
				model,
				messages: [{ role: "user", content: summaryPrompt }],
				systemInstruction: sysPrompt,
			});
			return reply.send({ summary: result.text || "Unable to generate summary.", model: result.model });
		} catch (emisErr) {
			if (process.env.GEMINI_API_KEY) {
				const ai = getAiClient();
				const response = await ai.models.generateContent({
					model: "gemini-3.8-flash",
					contents: summaryPrompt,
					config: { systemInstruction: sysPrompt },
				});
				return reply.send({ summary: response.text || "Unable to generate summary.", model: "gemini-3.8-flash" });
			}
			throw emisErr;
		}
	} catch (err) {
		console.error("AI Summarize API Error:", err);
		return reply.code(500).send({ error: err.message || "Failed to summarize page" });
	}
});


const FEATURED_EXTENSIONS = [
	{
		id: "eimadpbcbfnmbkopoojfekhnkhdbieeh",
		name: "Dark Reader",
		icon: "https://lh3.googleusercontent.com/T66wTLk-gpBBGsMm0SDJJ3VaI8YM0Utr8NaGCSANmXOfb84K-9GmyXORLKoslfxtasKtQ4spDCdq_zlp_t3QQ6SI0A",
		description: "Dark mode for every website. Invert colors cleanly, reduce eye strain, and protect your eyes day and night.",
		rating: 4.7,
		ratingCount: 13185,
		users: 7000000,
		category: "Accessibility & Themes"
	},
	{
		id: "ddkjiahejlhfcafbddmgiahcphecmpfh",
		name: "uBlock Origin Lite",
		icon: "https://lh3.googleusercontent.com/TNijZW_Gp9MZ3eqXkve0YWDEiHV-a2IpSpD6IJzrV3Y76GJcLEyzX2regTLemXzBHbHVqkKuxnnWDT34Cp4sNh-Y",
		description: "Permission-less, fast, efficient MV3 ad blocker and content filter by Raymond Hill.",
		rating: 4.6,
		ratingCount: 5240,
		users: 1000000,
		category: "Privacy & Ad Blockers"
	},
	{
		id: "mnjggcdmjocbbbhaepdhchncahnbgone",
		name: "SponsorBlock for YouTube",
		icon: "https://lh3.googleusercontent.com/o_XWfKq5Lgq5e7Y9M3v5E1R4m0w4k6Y9P1b2N3X5Z7V9W1L3Q5A7C9E1G3I5K7M9",
		description: "Skip sponsor segments, intros, animated endcards, and self-promotion in YouTube videos.",
		rating: 4.8,
		ratingCount: 6800,
		users: 1000000,
		category: "Video & Media"
	},
	{
		id: "gebbhagfogifgggkldgodflihgfeippi",
		name: "Return YouTube Dislike",
		icon: "https://lh3.googleusercontent.com/P0_k6M8Y1W3v5E7Q9A1C3E5G7I9K1M3O5Q7S9U1W3Y5a7c9e1g3i5k7m9o1q3s5",
		description: "Restores the ability to see dislike counts on YouTube videos using community data.",
		rating: 4.7,
		ratingCount: 14200,
		users: 4000000,
		category: "Social & Media"
	},
	{
		id: "fmkadmapgofadopljbjfkapdkoienihi",
		name: "React Developer Tools",
		icon: "https://lh3.googleusercontent.com/TNijZW_Gp9MZ3eqXkve0YWDEiHV-a2IpSpD6IJzrV3Y76GJcLEyzX2regTLemXzBHbHVqkKuxnnWDT34Cp4sNh-Y",
		description: "Inspect the React component hierarchies, props, state, and context in Chrome DevTools.",
		rating: 3.9,
		ratingCount: 1640,
		users: 5000000,
		category: "Developer Tools"
	},
	{
		id: "jinjaccalgkegednnccohejagnlnfdag",
		name: "Violentmonkey",
		icon: "https://lh3.googleusercontent.com/Z4w2t5_F8A0X3s_C5v7D_q2qA2D_r0W4p4A4h7q0F5D4h4e4p_u4x4F5F4h4e4p",
		description: "Open-source userscript manager for running Greasemonkey and Tampermonkey scripts.",
		rating: 4.7,
		ratingCount: 2200,
		users: 800000,
		category: "Productivity & Scripting"
	},
	{
		id: "bgnkhhnnamicmpeenaelnjfhikgbkllg",
		name: "AdGuard AdBlocker",
		icon: "https://lh3.googleusercontent.com/bgnkhhnnamicmpeenaelnjfhikgbkllg",
		description: "Blocks all types of advertisements, popups, and intrusive tracking across websites.",
		rating: 4.7,
		ratingCount: 48900,
		users: 10000000,
		category: "Privacy & Ad Blockers"
	},
	{
		id: "nngceckbapebfimnlniiiahkandclblb",
		name: "Bitwarden - Free Password Manager",
		icon: "https://lh3.googleusercontent.com/nngceckbapebfimnlniiiahkandclblb",
		description: "Secure, open-source password manager to store and autofill credentials securely.",
		rating: 4.8,
		ratingCount: 8800,
		users: 5000000,
		category: "Security"
	}
];

fastify.get("/api/webstore/search", async (request, reply) => {
	try {
		const rawQuery = (request.query && request.query.q ? String(request.query.q).trim() : "");

		let directExtId = null;
		const urlMatch = rawQuery.match(/detail\/(?:[^\/]+\/)?([a-z]{32})/i);
		if (urlMatch) {
			directExtId = urlMatch[1].toLowerCase();
		} else if (/^[a-z]{32}$/i.test(rawQuery)) {
			directExtId = rawQuery.toLowerCase();
		}

		if (!rawQuery || rawQuery.toLowerCase() === "popular" || rawQuery.toLowerCase() === "featured") {
			return reply.send({ results: FEATURED_EXTENSIONS });
		}

		const searchQuery = directExtId || rawQuery;
		const searchUrl = `https://chromewebstore.google.com/search/${encodeURIComponent(searchQuery)}`;
		const response = await fetch(searchUrl, {
			headers: {
				"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
				"Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
				"Accept-Language": "en-US,en;q=0.9",
			},
		});

		if (!response.ok) {
			const fallback = FEATURED_EXTENSIONS.filter(ex =>
				ex.name.toLowerCase().includes(rawQuery.toLowerCase()) ||
				ex.description.toLowerCase().includes(rawQuery.toLowerCase()) ||
				ex.id.toLowerCase() === rawQuery.toLowerCase()
			);
			return reply.send({ results: fallback.length ? fallback : FEATURED_EXTENSIONS });
		}

		const html = await response.text();
		const items = [];
		const seenIds = new Set();

		for (const feat of FEATURED_EXTENSIONS) {
			if (
				feat.name.toLowerCase().includes(rawQuery.toLowerCase()) ||
				rawQuery.toLowerCase().includes(feat.name.toLowerCase()) ||
				feat.id.toLowerCase() === rawQuery.toLowerCase()
			) {
				items.push(feat);
				seenIds.add(feat.id);
			}
		}

		const cbMatches = [...html.matchAll(/AF_initDataCallback\(([\s\S]*?)\);<\/script>/g)];
		for (const match of cbMatches) {
			const raw = match[1];
			if (raw.includes("https://lh3.googleusercontent.com") || raw.includes("data:")) {
				try {
					const fn = new Function("AF_initDataCallback", "AF_initDataCallback(" + raw + ")");
					fn((obj) => {
						function walk(node) {
							if (!node || typeof node !== "object") return;
							if (Array.isArray(node)) {
								if (
									typeof node[0] === "string" &&
									/^[a-z]{32}$/.test(node[0]) &&
									typeof node[2] === "string"
								) {
									const id = node[0];
									if (!seenIds.has(id)) {
										seenIds.add(id);
										items.push({
											id,
											icon: typeof node[1] === "string" ? node[1] : "",
											name: typeof node[2] === "string" ? node[2] : "Chrome Extension",
											rating: typeof node[3] === "number" ? Math.round(node[3] * 10) / 10 : null,
											ratingCount: typeof node[4] === "number" ? node[4] : null,
											description: typeof node[6] === "string" ? node[6] : "",
											users: typeof node[14] === "number" ? node[14] : null,
											category: "Chrome Web Store"
										});
									}
								}
								for (const child of node) walk(child);
							}
						}
						walk(obj.data);
					});
				} catch {
				}
			}
		}

		if (items.length === 0) {
			const linkMatches = [...html.matchAll(/detail\/([^\/]+)\/([a-z]{32})/g)];
			for (const m of linkMatches) {
				const slug = decodeURIComponent(m[1]).replace(/-/g, " ");
				const id = m[2];
				if (!seenIds.has(id)) {
					seenIds.add(id);
					const cleanName = slug
						.split(" ")
						.map(w => w.charAt(0).toUpperCase() + w.slice(1))
						.join(" ");
					items.push({
						id,
						icon: "",
						name: cleanName || "Chrome Extension",
						rating: 4.5,
						ratingCount: null,
						description: "Chrome Web Store extension ready to install.",
						users: null,
						category: "Chrome Web Store"
					});
				}
			}
		}

		return reply.send({ results: items });
	} catch (err) {
		console.error("WebStore Search API Error:", err);
		return reply.code(500).send({ error: err.message || "Failed to search Chrome Web Store" });
	}
});

fastify.get("/api/webstore/download", async (request, reply) => {
	try {
		const { id } = request.query || {};
		if (!id || !/^[a-z]{32}$/i.test(String(id).trim())) {
			return reply.code(400).send({ error: "Invalid extension ID. Must be 32 lowercase letters." });
		}

		const cleanId = String(id).trim().toLowerCase();

		const metaUrls = [
			`https://clients2.google.com/service/update2/crx?prodversion=130.0.6723.70&acceptformat=crx2,crx3&x=id%3D${cleanId}%26installsource%3Dondemand%26uc`,
			`https://clients2.google.com/service/update2/crx?prodversion=120.0.0.0&acceptformat=crx2,crx3&x=id%3D${cleanId}%26installsource%3Dondemand%26uc`,
			`https://clients2.google.com/service/update2/crx?prodversion=130.0.6723.70&acceptformat=crx2,crx3&x=id%3D${cleanId}%26uc`,
			`https://clients2.google.com/service/update2/crx?prodversion=114.0.0.0&acceptformat=crx2,crx3&x=id%3D${cleanId}%26uc`,
		];

		let crxBuffer = null;

		for (const metaUrl of metaUrls) {
			try {
				const metaRes = await fetch(metaUrl, {
					headers: {
						"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
						"Accept": "*/*",
					},
				});
				if (!metaRes.ok) continue;

				const metaText = await metaRes.text();
				const match = metaText.match(/codebase="([^"]+)"/i);
				if (match && match[1]) {
					const crxUrl = match[1];
					const crxRes = await fetch(crxUrl, {
						headers: {
							"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
							"Accept": "*/*",
						},
					});
					if (crxRes.ok) {
						const ab = await crxRes.arrayBuffer();
						const buf = Buffer.from(ab);
						if (buf.length >= 16) {
							crxBuffer = buf;
							break;
						}
					}
				}
			} catch (fetchErr) {
				console.warn(`[CRX Download] Attempt failed for ${metaUrl}:`, fetchErr.message);
			}
		}

		if (!crxBuffer) {
			return reply.code(404).send({
				error: "Failed to download CRX from Chrome Web Store. The extension might be removed, incompatible, or private."
			});
		}

		return reply
			.header("Content-Type", "application/x-chrome-extension")
			.header("Content-Disposition", `attachment; filename="${cleanId}.crx"`)
			.header("Content-Length", crxBuffer.length)
			.header("Cache-Control", "public, max-age=3600")
			.send(crxBuffer);
	} catch (err) {
		console.error("WebStore Download API Error:", err);
		return reply.code(500).send({ error: err.message || "Failed to download extension CRX" });
	}
});

const PORT = Number(process.env.PORT) || 3000;

fastify.setNotFoundHandler((request, reply) => {
	console.error("PAGE PUNCHED THROUGH SW - " + request.url);
	reply.code(593).send("punch through");
});

if (!process.env.VERCEL) {
	fastify.listen({
		port: PORT,
		host: "0.0.0.0",
	});
	console.log(`Listening on http://localhost:${PORT}/`);

	if (process.env.NODE_ENV !== "production" && existsSync(join(__dirname, ".git"))) {
		try {
			writeFileSync(
				join(__dirname, ".git/hooks/pre-commit"),
				"pnpm format\ngit update-index --again"
			);
			chmodSync(join(__dirname, ".git/hooks/pre-commit"), 0o755);
		} catch {}

		const [{ default: rspackConfig }, { rspack }] = await Promise.all([
			import("./rspack.config.js"),
			import("@rspack/core"),
		]);
		const compiler = rspack(rspackConfig);
		compiler.watch({}, (err, stats) => {
			console.log(
				stats
					? stats.toString({
							preset: "minimal",
							colors: true,
							version: false,
						})
					: ""
			);
		});
	}
}

export default async function handler(req, res) {
	await fastify.ready();
	fastify.server.emit("request", req, res);
}