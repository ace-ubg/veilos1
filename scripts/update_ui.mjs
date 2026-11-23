import fs from "fs";

let content = fs.readFileSync("public/ui.js", "utf8");

const oldAppsDef = `	const APPS = [
		{ id: "browser", name: "Onyx Browser", iconClass: "fa-solid fa-compass", iconColor: "text-sky-400", dockGradient: "from-blue-500 to-indigo-600", desc: "Proxy Web Browser with tabs & search", category: "Internet", defaultW: 980, defaultH: 640 },
		{ id: "chat", name: "Onyx Chat", iconClass: "fa-solid fa-comments", iconColor: "text-emerald-400", dockGradient: "from-emerald-500 to-teal-600", desc: "Multi-channel community chat room", category: "Social", defaultW: 860, defaultH: 580 },
		{ id: "ai", name: "Scenario", iconClass: "fa-solid fa-wand-magic-sparkles", iconColor: "text-purple-400", dockGradient: "from-indigo-600 via-purple-600 to-pink-500", desc: "Scenario AI Assistant Web Application", category: "Productivity", defaultW: 1040, defaultH: 700 },
		{ id: "movies", name: "SSV Movies", iconClass: "fa-solid fa-film", iconColor: "text-pink-400", dockGradient: "from-pink-600 via-purple-700 to-indigo-800", desc: "Proxied movies, TV shows, and streaming player", category: "Entertainment", defaultW: 1080, defaultH: 720 },
		{ id: "vault", name: "Helium Vault", iconClass: "fa-solid fa-tv", iconColor: "text-cyan-400", dockGradient: "from-rose-500 via-indigo-600 to-cyan-500", desc: "Curated Movies, TV Shows, Anime & Direct Streams", category: "Entertainment", defaultW: 1120, defaultH: 740 },
		{ id: "games", name: "Pulse Games", iconClass: "fa-solid fa-gamepad", iconColor: "text-violet-400", dockGradient: "from-violet-600 to-purple-800", desc: "Unblocked arcade with 8 providers & 1,000+ games", category: "Gaming", defaultW: 1080, defaultH: 720 },
		{ id: "cloudgaming", name: "Cloud Gaming", iconClass: "fa-solid fa-cloud", iconColor: "text-indigo-400", dockGradient: "from-purple-600 to-indigo-700", desc: "Play cloud games directly at nowgg.fun", category: "Gaming", defaultW: 1040, defaultH: 700 }
	];`;

const newAppsDef = `	const APPS = [
		{ id: "browser", name: "Onyx Browser", reicon: "compass", iconClass: "fa-solid fa-compass", iconColor: "text-sky-400", dockGradient: "from-emerald-700 to-teal-900", desc: "Proxy Web Browser with tabs & search (Novene engine)", category: "Internet", defaultW: 1020, defaultH: 660 },
		{ id: "chat", name: "Onyx Chat", reicon: "chat", iconClass: "fa-solid fa-comments", iconColor: "text-emerald-400", dockGradient: "from-emerald-500 to-teal-600", desc: "Multi-channel community chat room", category: "Social", defaultW: 860, defaultH: 580 },
		{ id: "ai", name: "Scenario", reicon: "sparkles", iconClass: "fa-solid fa-wand-magic-sparkles", iconColor: "text-purple-400", dockGradient: "from-indigo-600 via-purple-600 to-pink-500", desc: "Scenario AI Assistant Web Application", category: "Productivity", defaultW: 1040, defaultH: 700 },
		{ id: "movies", name: "SSV Movies", reicon: "film", iconClass: "fa-solid fa-film", iconColor: "text-pink-400", dockGradient: "from-pink-600 via-purple-700 to-indigo-800", desc: "Proxied movies, TV shows, and streaming player", category: "Entertainment", defaultW: 1080, defaultH: 720 },
		{ id: "vault", name: "Helium Vault", reicon: "tv", iconClass: "fa-solid fa-tv", iconColor: "text-cyan-400", dockGradient: "from-rose-500 via-indigo-600 to-cyan-500", desc: "Curated Movies, TV Shows, Anime & Direct Streams", category: "Entertainment", defaultW: 1120, defaultH: 740 },
		{ id: "games", name: "Pulse Games", reicon: "game", iconClass: "fa-solid fa-gamepad", iconColor: "text-violet-400", dockGradient: "from-violet-600 to-purple-800", desc: "Unblocked arcade with 8 providers & 1,000+ games", category: "Gaming", defaultW: 1080, defaultH: 720 },
		{ id: "cloudgaming", name: "Cloud Gaming", reicon: "game", iconClass: "fa-solid fa-cloud", iconColor: "text-indigo-400", dockGradient: "from-purple-600 to-indigo-700", desc: "Play cloud games directly at nowgg.fun", category: "Gaming", defaultW: 1040, defaultH: 700 }
	];`;

if (content.includes(oldAppsDef)) {
  content = content.replace(oldAppsDef, newAppsDef);
  console.log("Updated APPS definition with Reicon icons.");
} else {
  console.warn("Could not find exact APPS definition, checking alternative match...");
}

const oldDockBadges = `					
					<div class="flex items-center gap-2 shrink-0">
						<div class="relative group flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 hover:scale-110 active:scale-95 transition-all cursor-pointer shadow-md shrink-0 border border-white/20"
							on:click=\${() => this.openApp("browser")} title="Onyx Browser">
							<i class="fa-solid fa-compass text-lg text-white drop-shadow-md"></i>
							\${use(this.windows, (winList) => winList.some(w => w.appId === "browser") ? html\`<div class="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-white shadow-sm"></div>\` : null)}
						</div>

						<div class="relative group flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 hover:scale-110 active:scale-95 transition-all cursor-pointer shadow-md shrink-0 border border-white/20"
							on:click=\${() => this.openApp("chat")} title="Onyx Chat">
							<i class="fa-solid fa-comments text-lg text-white drop-shadow-md"></i>
							\${use(this.windows, (winList) => winList.some(w => w.appId === "chat") ? html\`<div class="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-white shadow-sm"></div>\` : null)}
						</div>

						<div class="relative group flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 hover:scale-110 active:scale-95 transition-all cursor-pointer shadow-md shrink-0 border border-white/20"
							on:click=\${() => this.openApp("ai")} title="Scenario">
							<i class="fa-solid fa-wand-magic-sparkles text-lg text-white drop-shadow-md"></i>
							\${use(this.windows, (winList) => winList.some(w => w.appId === "ai") ? html\`<div class="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-white shadow-sm"></div>\` : null)}
						</div>

						<div class="relative group flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-600 via-purple-700 to-indigo-800 hover:scale-110 active:scale-95 transition-all cursor-pointer shadow-md shrink-0 border border-white/20"
							on:click=\${() => this.openApp("movies")} title="SSV Movies & TV (Proxied)">
							<i class="fa-solid fa-film text-lg text-white drop-shadow-md"></i>
							\${use(this.windows, (winList) => winList.some(w => w.appId === "movies") ? html\`<div class="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-white shadow-sm"></div>\` : null)}
						</div>

						\${use(this.windows, (winList) => {
							const otherRunning = ["vault", "games", "cloudgaming"].filter(id => winList.some(w => w.appId === id));
							if (otherRunning.length === 0) return null;
							return html\`
								<div class="w-px h-5 bg-white/15 mx-0.5 shrink-0"></div>
								\${otherRunning.map(appId => {
									const appMeta = APPS.find(a => a.id === appId);
									if (!appMeta) return null;
									let grad = "from-neutral-700 to-neutral-800";
									if (appId === "vault") grad = "from-rose-500 via-indigo-600 to-cyan-500";
									if (appId === "games") grad = "from-violet-600 to-purple-800";
									if (appId === "cloudgaming") grad = "from-purple-600 to-indigo-700";
									return html\`
										<div class="relative group flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br \${grad} hover:scale-110 active:scale-95 transition-all cursor-pointer shadow-md shrink-0 border border-white/20 animate-fade"
											on:click=\${() => this.openApp(appId)} title="\${appMeta.name}">
											<i class="\${appMeta.iconClass} text-lg text-white drop-shadow-md"></i>
											<div class="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-white shadow-sm"></div>
										</div>
									\`;
								})}
							\`;
						})}`;

const newDockBadges = `					
					<div class="flex items-center gap-2 shrink-0">
						<div class="relative group flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-700 to-[#040706] hover:scale-110 active:scale-95 transition-all cursor-pointer shadow-md shrink-0 border border-[#35b97a]/40 shadow-[#1f7a4d]/20"
							on:click=\${() => this.openApp("browser")} title="Onyx Browser">
							\${window.reicon ? html([window.reicon.toSvg('compass', { size: 20, color: '#35b97a' })]) : html\`<i class="fa-solid fa-compass text-lg text-emerald-400"></i>\`}
							\${use(this.windows, (winList) => winList.some(w => w.appId === "browser") ? html\`<div class="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-[#35b97a] shadow-sm shadow-[#35b97a]"></div>\` : null)}
						</div>

						<div class="relative group flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 hover:scale-110 active:scale-95 transition-all cursor-pointer shadow-md shrink-0 border border-white/20"
							on:click=\${() => this.openApp("chat")} title="Onyx Chat">
							\${window.reicon ? html([window.reicon.toSvg('chat', { size: 20, color: '#ffffff' })]) : html\`<i class="fa-solid fa-comments text-lg text-white drop-shadow-md"></i>\`}
							\${use(this.windows, (winList) => winList.some(w => w.appId === "chat") ? html\`<div class="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-white shadow-sm"></div>\` : null)}
						</div>

						<div class="relative group flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 hover:scale-110 active:scale-95 transition-all cursor-pointer shadow-md shrink-0 border border-white/20"
							on:click=\${() => this.openApp("ai")} title="Scenario">
							\${window.reicon ? html([window.reicon.toSvg('sparkles', { size: 20, color: '#ffffff' })]) : html\`<i class="fa-solid fa-wand-magic-sparkles text-lg text-white drop-shadow-md"></i>\`}
							\${use(this.windows, (winList) => winList.some(w => w.appId === "ai") ? html\`<div class="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-white shadow-sm"></div>\` : null)}
						</div>

						<div class="relative group flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-600 via-purple-700 to-indigo-800 hover:scale-110 active:scale-95 transition-all cursor-pointer shadow-md shrink-0 border border-white/20"
							on:click=\${() => this.openApp("movies")} title="SSV Movies & TV (Proxied)">
							\${window.reicon ? html([window.reicon.toSvg('film', { size: 20, color: '#ffffff' })]) : html\`<i class="fa-solid fa-film text-lg text-white drop-shadow-md"></i>\`}
							\${use(this.windows, (winList) => winList.some(w => w.appId === "movies") ? html\`<div class="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-white shadow-sm"></div>\` : null)}
						</div>

						\${use(this.windows, (winList) => {
							const otherRunning = ["vault", "games", "cloudgaming"].filter(id => winList.some(w => w.appId === id));
							if (otherRunning.length === 0) return null;
							return html\`
								<div class="w-px h-5 bg-white/15 mx-0.5 shrink-0"></div>
								\${otherRunning.map(appId => {
									const appMeta = APPS.find(a => a.id === appId);
									if (!appMeta) return null;
									let grad = "from-neutral-700 to-neutral-800";
									let reic = "game";
									if (appId === "vault") { grad = "from-rose-500 via-indigo-600 to-cyan-500"; reic = "tv"; }
									if (appId === "games") { grad = "from-violet-600 to-purple-800"; reic = "game"; }
									if (appId === "cloudgaming") { grad = "from-purple-600 to-indigo-700"; reic = "game"; }
									return html\`
										<div class="relative group flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br \${grad} hover:scale-110 active:scale-95 transition-all cursor-pointer shadow-md shrink-0 border border-white/20 animate-fade"
											on:click=\${() => this.openApp(appId)} title="\${appMeta.name}">
											\${window.reicon ? html([window.reicon.toSvg(reic, { size: 20, color: '#ffffff' })]) : html\`<i class="\${appMeta.iconClass} text-lg text-white drop-shadow-md"></i>\`}
											<div class="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-white shadow-sm"></div>
										</div>
									\`;
								})}
							\`;
						})}`;

if (content.includes(oldDockBadges)) {
  content = content.replace(oldDockBadges, newDockBadges);
  console.log("Updated Dock Badges with Reicon icons.");
} else {
  console.warn("Could not find exact oldDockBadges.");
}

const oldLockAvatar = `<div class="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-pink-500/20 flex items-center justify-center shadow-xl border-2 border-white/30 overflow-hidden">
										<img src="https://raw.githubusercontent.com/1sunW/ICONS-FOR-LINKS/refs/heads/main/the-veil-icon-1024.png" alt="Veil OS" class="w-full h-full object-cover rounded-full" />
									</div>`;
const newLockAvatar = `<div class="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-600 via-teal-700 to-emerald-900 flex items-center justify-center text-3xl shadow-xl border-2 border-[#35b97a]/40 shadow-[#1f7a4d]/30 text-[#d3e3d9]">
										\${window.reicon ? html([window.reicon.toSvg('user', { size: 36, color: '#ffffff' })]) : html\`<i class="fa-solid fa-user text-white"></i>\`}
									</div>`;

if (content.includes(oldLockAvatar)) {
  content = content.replace(oldLockAvatar, newLockAvatar);
  console.log("Updated Lock Avatar to Reicon.");
}

const oldLockSignInBtn = `<button type="button"
										class="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-xs tracking-wide transition-all shadow-lg hover:shadow-indigo-500/25 active:scale-98 cursor-pointer flex items-center justify-center gap-2"
										on:click=\${() => this.unlockOS()}>
										<span>Sign In</span>
										<i class="fa-solid fa-arrow-right text-xs"></i>
									</button>`;
const newLockSignInBtn = `<button type="button"
										class="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-semibold text-xs tracking-wide transition-all shadow-lg hover:shadow-emerald-500/25 active:scale-98 cursor-pointer flex items-center justify-center gap-2 border border-[#35b97a]/30"
										on:click=\${() => this.unlockOS()}>
										<span>Sign In</span>
										\${window.reicon ? html([window.reicon.toSvg('arrowright', { size: 14, color: '#ffffff' })]) : html\`<i class="fa-solid fa-arrow-right text-xs"></i>\`}
									</button>`;

if (content.includes(oldLockSignInBtn)) {
  content = content.replace(oldLockSignInBtn, newLockSignInBtn);
  console.log("Updated Lock SignIn button to Reicon.");
}

fs.writeFileSync("public/ui.js", content, "utf8");
console.log("Part 1 finished!");
