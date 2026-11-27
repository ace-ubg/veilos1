(function () {
  const TOUR_STORAGE_KEY = "veilos_tour_completed";

  function esc(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatDateTime(ts) {
    if (!ts) return "Never";
    const d = new Date(Number(ts));
    if (isNaN(d.getTime())) return "Invalid date";
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function formatExpiryShort(ts) {
    if (!ts) return "No expiration";
    const n = Number(ts);
    if (n <= Date.now()) return "Expired";
    const diffMs = n - Date.now();
    const hours = Math.floor(diffMs / 3600000);
    if (hours < 24) {
      const mins = Math.max(1, Math.floor((diffMs % 3600000) / 60000));
      return hours > 0 ? `${hours}h ${mins}m left` : `${mins}m left`;
    }
    const days = Math.floor(hours / 24);
    if (days <= 30) return `${days}d left`;
    return formatDateTime(n);
  }

  function resolveDurationMs(presetVal, customDatetimeStr) {
    const now = Date.now();
    if (!presetVal || presetVal === "never") return null;
    if (presetVal === "1h") return now + 3600 * 1000;
    if (presetVal === "24h") return now + 24 * 3600 * 1000;
    if (presetVal === "7d") return now + 7 * 24 * 3600 * 1000;
    if (presetVal === "30d") return now + 30 * 24 * 3600 * 1000;
    if (presetVal === "custom") {
      if (!customDatetimeStr) return null;
      const t = new Date(customDatetimeStr).getTime();
      return Number.isFinite(t) ? t : null;
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // 1. Lock Screen Account & Guest Controller
  // ---------------------------------------------------------------------------
  function mountLockScreenCard(container, osInstance) {
    if (!container) return;

    const uiState = {
      authTab: "signin", // "signin" | "signup"
      editingAccount: false,
      busy: false,
      error: "",
      avatarFile: null,
      avatarName: "Optional profile avatar...",
      lastKey: "",
    };

    function getAuth() {
      return window.VeilAuth || null;
    }

    function render(force) {
      const auth = getAuth();
      const snap = auth
        ? auth.getState()
        : {
            mode: "signed_out",
            user: null,
            isSignedIn: false,
            isGuest: false,
            isVip: false,
            isOwner: false,
            hasVipAccess: false,
          };

      const renderKey = `${snap.mode}|${snap.user?.uid || ""}|${snap.user?.username || ""}|${snap.isVip}|${snap.isOwner}|${uiState.editingAccount}|${uiState.authTab}|${uiState.busy}`;
      if (!force && renderKey === uiState.lastKey && container.childElementCount > 0) {
        return;
      }
      uiState.lastKey = renderKey;

      // Signed-in Onyx Chat account quick unlock card
      if (snap.isSignedIn && snap.user && !uiState.editingAccount) {
        const avatarSrc = snap.user.photoURL || "";
        const roleLabel = snap.isOwner
          ? `<span class="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[10px] font-bold uppercase tracking-wider">Owner + VIP</span>`
          : snap.isVip
            ? `<span class="px-2 py-0.5 rounded-md bg-indigo-500/25 border border-indigo-400/45 text-indigo-200 text-[10px] font-bold uppercase tracking-wider">VIP Active</span>`
            : `<span class="px-2 py-0.5 rounded-md bg-white/10 border border-white/15 text-neutral-300 text-[10px] font-semibold">Onyx Account</span>`;

        container.innerHTML = `
          <div class="w-full flex flex-col items-center gap-3.5">
            <div class="relative group">
              <div class="absolute -inset-1.5 rounded-full bg-gradient-to-r from-indigo-500 via-sky-400 to-indigo-500 opacity-65 blur-md animate-veil-glow"></div>
              <div class="relative w-20 h-20 rounded-full bg-[#111118] flex items-center justify-center shadow-xl border-2 border-indigo-400/45 overflow-hidden shrink-0">
                ${
                  avatarSrc
                    ? `<img src="${esc(avatarSrc)}" alt="${esc(snap.user.username)}" class="w-full h-full object-cover" />`
                    : `<i class="fa-solid fa-user text-2xl text-indigo-300"></i>`
                }
              </div>
            </div>

            <div class="flex flex-col items-center gap-1 text-center w-full">
              <div class="flex items-center gap-2 justify-center flex-wrap">
                <h2 class="text-base sm:text-lg font-bold tracking-tight text-white">@${esc(snap.user.username)}</h2>
                ${roleLabel}
              </div>
              <span class="text-[11px] text-neutral-400 truncate max-w-full">${esc(snap.user.email || "Synced via Onyx Chat")}</span>
            </div>

            <button type="button" id="lock-enter-btn"
              class="group relative w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-sky-500 hover:from-indigo-500 hover:to-sky-400 text-white font-bold text-xs tracking-wider uppercase transition-all duration-300 shadow-xl hover:shadow-indigo-500/35 active:scale-95 cursor-pointer flex items-center justify-center gap-2.5 overflow-hidden shimmer-btn">
              <span class="relative z-10">Enter VeilOS</span>
              <i class="fa-solid fa-arrow-right text-xs relative z-10 transition-transform duration-300 group-hover:translate-x-1.5"></i>
            </button>

            <div class="w-full grid grid-cols-2 gap-2">
              <button type="button" id="lock-guest-btn"
                class="py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white text-[11px] font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5">
                <i class="fa-solid fa-user-secret text-neutral-400"></i>
                <span>Continue as Guest</span>
              </button>
              <button type="button" id="lock-signout-btn"
                class="py-2 px-3 rounded-xl bg-white/5 hover:bg-rose-500/15 border border-white/10 hover:border-rose-400/35 text-neutral-300 hover:text-rose-200 text-[11px] font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5">
                <i class="fa-solid fa-right-from-bracket text-neutral-400"></i>
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        `;

        container.querySelector("#lock-enter-btn").onclick = () => {
          osInstance.unlockOS();
        };
        container.querySelector("#lock-guest-btn").onclick = async () => {
          if (!auth) {
            osInstance.unlockOS();
            return;
          }
          uiState.busy = true;
          render(true);
          try {
            await auth.continueAsGuest();
            uiState.busy = false;
            uiState.editingAccount = false;
            osInstance.unlockOS();
          } catch (err) {
            uiState.busy = false;
            uiState.error = err.message || "Unable to switch to Guest.";
            render(true);
          }
        };
        container.querySelector("#lock-signout-btn").onclick = async () => {
          if (!auth) return;
          uiState.busy = true;
          render(true);
          await auth.signOut();
          uiState.busy = false;
          uiState.error = "";
          uiState.editingAccount = true;
          render(true);
        };
        return;
      }

      // Sign-In / Sign-Up + Continue as Guest card
      const isSignUp = uiState.authTab === "signup";
      container.innerHTML = `
        <div class="w-full flex flex-col items-center gap-3">
          <div class="flex items-center gap-3 w-full">
            <div class="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500/25 via-[#111118] to-sky-500/25 flex items-center justify-center border border-indigo-400/40 shrink-0 shadow-lg">
              <svg viewBox="0 0 64 64" class="w-7 h-7" aria-label="VeilOS">
                <defs>
                  <linearGradient id="veilLockGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#6366f1"/>
                    <stop offset="100%" stop-color="#38bdf8"/>
                  </linearGradient>
                </defs>
                <path d="M12 14L32 52L52 14H41.5L32 33.5L22.5 14H12Z" fill="url(#veilLockGrad2)"/>
              </svg>
            </div>
            <div class="flex flex-col text-left min-w-0">
              <span class="tracking-[0.2em] font-bold uppercase text-xs text-indigo-400">VEILOS ACCOUNT</span>
              <span class="text-xs text-neutral-300 font-medium truncate">Sign in with your Onyx Chat account</span>
            </div>
          </div>

          <div class="w-full grid grid-cols-2 gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
            <button type="button" id="lock-tab-signin"
              class="py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${!isSignUp ? "bg-indigo-500/30 text-white border border-indigo-400/40" : "text-neutral-400 hover:text-white border border-transparent"}">
              Sign In
            </button>
            <button type="button" id="lock-tab-signup"
              class="py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${isSignUp ? "bg-indigo-500/30 text-white border border-indigo-400/40" : "text-neutral-400 hover:text-white border border-transparent"}">
              Create Account
            </button>
          </div>

          ${
            uiState.error
              ? `<div class="w-full px-3 py-2 rounded-xl bg-rose-500/15 border border-rose-500/35 text-rose-200 text-[11px] text-left leading-snug">${esc(uiState.error)}</div>`
              : ""
          }

          <form id="lock-auth-form" class="w-full flex flex-col gap-2 text-left">
            <input id="lock-email-input" type="email" required autocomplete="email"
              placeholder="Email address..."
              class="w-full px-3.5 py-2.5 rounded-xl bg-black/45 border border-white/15 focus:border-indigo-400 text-white text-xs placeholder-neutral-500 outline-none transition-colors select-text" />
            <input id="lock-pass-input" type="password" required autocomplete="${isSignUp ? "new-password" : "current-password"}"
              placeholder="Password..."
              class="w-full px-3.5 py-2.5 rounded-xl bg-black/45 border border-white/15 focus:border-indigo-400 text-white text-xs placeholder-neutral-500 outline-none transition-colors select-text" />
            ${
              isSignUp
                ? `
              <input id="lock-user-input" type="text" required maxlength="20"
                placeholder="Unique username (Onyx Chat & VeilOS)..."
                class="w-full px-3.5 py-2.5 rounded-xl bg-black/45 border border-white/15 focus:border-indigo-400 text-white text-xs placeholder-neutral-500 outline-none transition-colors select-text" />
              <label class="w-full px-3.5 py-2 rounded-xl bg-black/30 border border-dashed border-white/15 hover:border-indigo-400/50 text-neutral-400 hover:text-neutral-200 text-[11px] cursor-pointer flex items-center justify-between gap-2 transition-colors">
                <span class="truncate">${esc(uiState.avatarName)}</span>
                <i class="fa-solid fa-image text-indigo-400 shrink-0"></i>
                <input id="lock-avatar-input" type="file" accept="image/*" class="hidden" />
              </label>
            `
                : ""
            }
            <button type="submit" ${uiState.busy ? "disabled" : ""}
              class="group relative w-full mt-1 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-sky-500 hover:from-indigo-500 hover:to-sky-400 text-white font-bold text-xs tracking-wider uppercase transition-all shadow-xl active:scale-95 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50">
              <span>${uiState.busy ? "Authenticating..." : isSignUp ? "Create Account & Enter" : "Sign In & Enter"}</span>
              <i class="fa-solid fa-arrow-right text-xs transition-transform group-hover:translate-x-1"></i>
            </button>
          </form>

          <div class="w-full flex items-center gap-2 my-0.5">
            <div class="h-px flex-1 bg-white/10"></div>
            <span class="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold">or</span>
            <div class="h-px flex-1 bg-white/10"></div>
          </div>

          <button type="button" id="lock-continue-guest-btn" ${uiState.busy ? "disabled" : ""}
            class="w-full py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/15 text-neutral-200 hover:text-white font-semibold text-xs transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50">
            <i class="fa-solid fa-user-secret text-sky-400"></i>
            <span>Continue as Guest</span>
          </button>
        </div>
      `;

      const tabIn = container.querySelector("#lock-tab-signin");
      const tabUp = container.querySelector("#lock-tab-signup");
      if (tabIn) {
        tabIn.onclick = () => {
          uiState.authTab = "signin";
          uiState.error = "";
          render(true);
        };
      }
      if (tabUp) {
        tabUp.onclick = () => {
          uiState.authTab = "signup";
          uiState.error = "";
          render(true);
        };
      }

      const avatarInp = container.querySelector("#lock-avatar-input");
      if (avatarInp) {
        avatarInp.onchange = (e) => {
          const f = e.target.files && e.target.files[0];
          if (f) {
            uiState.avatarFile = f;
            uiState.avatarName = f.name;
            render(true);
          }
        };
      }

      const form = container.querySelector("#lock-auth-form");
      if (form) {
        form.onsubmit = async (e) => {
          e.preventDefault();
          const emailVal = container.querySelector("#lock-email-input")?.value || "";
          const passVal = container.querySelector("#lock-pass-input")?.value || "";
          const userVal = container.querySelector("#lock-user-input")?.value || "";

          const a = getAuth();
          if (!a) {
            uiState.error = "Auth service is still initializing. Please try again in a moment.";
            render(true);
            return;
          }

          uiState.busy = true;
          uiState.error = "";
          render(true);

          try {
            if (isSignUp) {
              await a.signUp({
                email: emailVal,
                password: passVal,
                username: userVal,
                avatarFile: uiState.avatarFile,
              });
            } else {
              await a.signIn(emailVal, passVal);
            }
            uiState.busy = false;
            uiState.editingAccount = false;
            uiState.error = "";
            render(true);
            osInstance.unlockOS();
          } catch (err) {
            uiState.busy = false;
            uiState.error = err?.message || "Authentication failed.";
            render(true);
          }
        };
      }

      const guestBtn = container.querySelector("#lock-continue-guest-btn");
      if (guestBtn) {
        guestBtn.onclick = async () => {
          const a = getAuth();
          uiState.busy = true;
          render(true);
          try {
            if (a) await a.continueAsGuest();
          } catch (_) {}
          uiState.busy = false;
          uiState.editingAccount = false;
          uiState.error = "";
          osInstance.unlockOS();
        };
      }
    }

    render(true);
    window.addEventListener("veilos-auth-change", () => render(false));
    window.addEventListener("veilos-auth-ready", () => render(true));
    window.addEventListener("veilos-lock-reset", () => {
      uiState.editingAccount = false;
      uiState.error = "";
      render(true);
    });
  }

  // ---------------------------------------------------------------------------
  // 2. Account & VIP Redemption Panel (shared between Dialog & onyx://settings)
  // ---------------------------------------------------------------------------
  const VIP_APP_ITEMS = [
    { id: "movies", name: "SSV Movies", icon: "fa-solid fa-film text-rose-400" },
    { id: "ai", name: "Scenario", icon: "fa-solid fa-brain text-purple-400" },
    { id: "music", name: "Sonora", icon: "fa-solid fa-music text-rose-400" },
    { id: "cloudgaming", name: "Cloud Gaming", icon: "fa-solid fa-cloud text-teal-400" },
  ];

  function renderAccountVipPanel(container, options = {}) {
    if (!container) return;
    let redeemFeedback = options.feedback || null; // { ok: boolean, msg: string }
    let busy = false;

    function draw() {
      const auth = window.VeilAuth;
      const snap = auth
        ? auth.getState()
        : {
            mode: "signed_out",
            user: null,
            vip: null,
            isSignedIn: false,
            isGuest: true,
            isVip: false,
            isOwner: false,
            hasVipAccess: false,
          };

      const statusText = snap.isOwner
        ? "Owner Mode + VIP"
        : snap.isVip
          ? "VIP Unlocked"
          : snap.isSignedIn
            ? "Standard Account"
            : "Guest Session";

      const expiryLabel = snap.isOwner
        ? "Permanent Owner Access"
        : snap.isVip
          ? snap.vip?.expiresAt
            ? `Expires ${formatDateTime(snap.vip.expiresAt)}`
            : "Lifetime VIP Access"
          : snap.isSignedIn
            ? "Redeem a VIP code below to unlock VIP apps"
            : "Sign in with an Onyx Chat account to redeem VIP codes";

      container.innerHTML = `
        <div class="flex flex-col gap-3.5 text-left">
          <div class="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between gap-3 flex-wrap">
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-11 h-11 rounded-2xl bg-indigo-500/20 border border-indigo-400/35 flex items-center justify-center overflow-hidden shrink-0">
                ${
                  snap.user?.photoURL
                    ? `<img src="${esc(snap.user.photoURL)}" alt="" class="w-full h-full object-cover" />`
                    : `<i class="fa-solid ${snap.isGuest ? "fa-user-secret text-sky-400" : "fa-user text-indigo-300"} text-base"></i>`
                }
              </div>
              <div class="flex flex-col min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="text-sm font-bold text-white truncate">${
                    snap.isSignedIn ? `@${esc(snap.user.username)}` : "Guest User"
                  }</span>
                  <span class="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                    snap.isOwner
                      ? "bg-amber-500/20 text-amber-300 border border-amber-400/40"
                      : snap.isVip
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/40"
                        : "bg-white/10 text-neutral-300 border border-white/15"
                  }">${esc(statusText)}</span>
                </div>
                <span class="text-[11px] text-neutral-400 truncate">${
                  snap.isSignedIn ? esc(snap.user.email || "Onyx Chat Account") : "Local guest mode (no VIP access)"
                }</span>
              </div>
            </div>

            <div class="flex items-center gap-2 shrink-0">
              ${
                snap.isSignedIn
                  ? `<button type="button" id="acct-signout-btn" class="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-200 text-xs font-semibold cursor-pointer transition-colors">Sign Out</button>`
                  : `<button type="button" id="acct-signin-btn" class="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer transition-colors">Sign In</button>`
              }
            </div>
          </div>

          <div class="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-[#111118] to-sky-500/10 border border-indigo-400/25 flex flex-col gap-2.5">
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <i class="fa-solid fa-crown text-amber-400 text-sm"></i>
                <span class="text-xs font-bold uppercase tracking-wider text-white">Redeem VIP Code</span>
              </div>
              <span class="text-[11px] text-neutral-400 tabular-nums">${esc(expiryLabel)}</span>
            </div>

            <form id="vip-redeem-form" class="flex items-center gap-2">
              <input id="vip-code-input" type="text" placeholder="Enter VIP code (e.g. VEIL-XXXX-XXXX)"
                class="flex-1 px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 focus:border-indigo-400 text-white text-xs font-mono uppercase tracking-wider placeholder-neutral-500 outline-none" />
              <button type="submit" ${busy ? "disabled" : ""}
                class="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer transition-all shrink-0 disabled:opacity-50">
                ${busy ? "Redeeming..." : "Redeem"}
              </button>
            </form>

            ${
              redeemFeedback
                ? `<div class="px-3 py-2 rounded-xl text-[11px] font-medium ${
                    redeemFeedback.ok
                      ? "bg-emerald-500/15 border border-emerald-500/35 text-emerald-200"
                      : "bg-rose-500/15 border border-rose-500/35 text-rose-200"
                  }">${esc(redeemFeedback.msg)}</div>`
                : ""
            }

            <div class="grid grid-cols-2 gap-1.5 pt-1">
              ${VIP_APP_ITEMS.map((app) => {
                const unlocked = snap.hasVipAccess;
                return `
                  <div class="px-2.5 py-2 rounded-xl bg-black/35 border ${
                    unlocked ? "border-emerald-500/30" : "border-white/10"
                  } flex items-center justify-between gap-2 text-xs">
                    <div class="flex items-center gap-2 truncate">
                      <i class="${app.icon} text-xs shrink-0"></i>
                      <span class="text-neutral-200 font-medium truncate">${esc(app.name)}</span>
                    </div>
                    <i class="fa-solid ${unlocked ? "fa-lock-open text-emerald-400" : "fa-lock text-neutral-500"} text-[10px] shrink-0"></i>
                  </div>
                `;
              }).join("")}
            </div>
          </div>

          <div class="flex items-center justify-between gap-2 p-3 rounded-2xl bg-white/[0.04] border border-white/10">
            <div class="flex items-center gap-2.5">
              <i class="fa-solid fa-compass text-sky-400 text-sm"></i>
              <div class="flex flex-col">
                <span class="text-xs font-semibold text-white">Interactive VeilOS Tour</span>
                <span class="text-[10px] text-neutral-400">Walk through Spotlight, Dock, VIP apps & Cloaking</span>
              </div>
            </div>
            <button type="button" id="acct-tour-btn"
              class="px-3 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/35 text-sky-200 text-xs font-semibold cursor-pointer transition-colors shrink-0">
              Start Tour
            </button>
          </div>
        </div>
      `;

      const signOutBtn = container.querySelector("#acct-signout-btn");
      if (signOutBtn) {
        signOutBtn.onclick = async () => {
          if (auth) await auth.signOut();
          if (typeof options.onCloseDialog === "function") options.onCloseDialog();
          if (window.osGlobalInstance) {
            window.osGlobalInstance.isLocked = true;
            window.osGlobalInstance.windows = [...window.osGlobalInstance.windows];
          }
          window.dispatchEvent(new CustomEvent("veilos-lock-reset"));
        };
      }

      const signInBtn = container.querySelector("#acct-signin-btn");
      if (signInBtn) {
        signInBtn.onclick = () => {
          if (typeof options.onCloseDialog === "function") options.onCloseDialog();
          if (window.osGlobalInstance) {
            window.osGlobalInstance.isLocked = true;
            window.osGlobalInstance.windows = [...window.osGlobalInstance.windows];
          }
          window.dispatchEvent(new CustomEvent("veilos-lock-reset"));
        };
      }

      const tourBtn = container.querySelector("#acct-tour-btn");
      if (tourBtn) {
        tourBtn.onclick = () => {
          if (typeof options.onCloseDialog === "function") options.onCloseDialog();
          if (window.VeilTour) window.VeilTour.start();
        };
      }

      const redeemForm = container.querySelector("#vip-redeem-form");
      if (redeemForm) {
        redeemForm.onsubmit = async (e) => {
          e.preventDefault();
          const codeVal = container.querySelector("#vip-code-input")?.value || "";
          if (!auth) return;
          busy = true;
          redeemFeedback = null;
          draw();
          try {
            const res = await auth.redeemVipCode(codeVal);
            busy = false;
            redeemFeedback = {
              ok: true,
              msg: `VIP activated with code ${res.code}${res.expiresAt ? ` (valid until ${formatDateTime(res.expiresAt)})` : " (Lifetime access)"}!`,
            };
            if (window.veilNotify) {
              window.veilNotify("VIP Unlocked", "SSV Movies, Scenario, Sonora & Cloud Gaming are now unlocked.", "fa-solid fa-crown");
            }
            if (typeof options.onUpdated === "function") options.onUpdated();
            draw();
          } catch (err) {
            busy = false;
            redeemFeedback = { ok: false, msg: err?.message || "Could not redeem VIP code." };
            draw();
          }
        };
      }
    }

    draw();

    const onAuthChange = () => {
      if (!container.isConnected) {
        window.removeEventListener("veilos-auth-change", onAuthChange);
        return;
      }
      if (busy) return;
      const prevInput = container.querySelector("#vip-code-input");
      const savedVal = prevInput ? prevInput.value : "";
      const hadFocus = prevInput && document.activeElement === prevInput;
      draw();
      const nextInput = container.querySelector("#vip-code-input");
      if (nextInput && savedVal) {
        nextInput.value = savedVal;
        if (hadFocus) nextInput.focus();
      }
    };
    window.addEventListener("veilos-auth-change", onAuthChange);
  }

  // ---------------------------------------------------------------------------
  // 3. Owner Mode Panel (Strictly gated on 678.gxvin@gmail.com)
  // ---------------------------------------------------------------------------
  function renderOwnerPanel(container) {
    if (!container) return;
    const state = {
      subtab: "codes", // "codes" | "users"
      loading: true,
      saving: false,
      error: "",
      success: "",
      codes: [],
      users: [],
      userSearch: "",
      assignExpiryPreset: "never",
      codeInput: window.VeilAuth ? window.VeilAuth.generateRandomCode() : "",
      maxUsesInput: "1",
      unlimitedUses: false,
      expiryPreset: "never",
      customExpiry: "",
      ownerNoteInput: "",
      manualEmailInput: "",
    };

    async function loadAll() {
      const auth = window.VeilAuth;
      if (!auth || !auth.isOwner()) {
        state.loading = false;
        state.error = "Owner verification failed. Sign in as 678.gxvin@gmail.com.";
        draw();
        return;
      }
      state.loading = true;
      state.error = "";
      draw();
      try {
        const [codes, users] = await Promise.all([
          auth.ownerListVipCodes(),
          auth.ownerListUsers(),
        ]);
        state.codes = codes;
        state.users = users;
        state.loading = false;
        draw();
      } catch (err) {
        state.loading = false;
        state.error = err?.message || "Failed to load Owner dashboard.";
        draw();
      }
    }

    function draw() {
      const auth = window.VeilAuth;
      if (!auth || !auth.isOwner()) {
        container.innerHTML = `<div class="p-4 rounded-xl bg-rose-500/15 border border-rose-500/35 text-rose-200 text-xs">Owner access restricted to verified 678.gxvin@gmail.com account.</div>`;
        return;
      }

      const filteredUsers = state.users.filter((u) => {
        const q = state.userSearch.trim().toLowerCase();
        if (!q) return true;
        return (
          (u.username || "").toLowerCase().includes(q) ||
          (u.email || "").toLowerCase().includes(q) ||
          (u.uid || "").toLowerCase().includes(q)
        );
      });

      container.innerHTML = `
        <div class="flex flex-col gap-3 text-left">
          <div class="flex items-center justify-between gap-2 flex-wrap">
            <div class="flex items-center gap-2">
              <span class="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-400/40 text-amber-200 text-[11px] font-bold flex items-center gap-1.5">
                <i class="fa-solid fa-shield-halved"></i>
                <span>Owner Console</span>
              </span>
              <span class="text-[11px] text-neutral-400">Notes on VIP codes are visible only here.</span>
            </div>
            <button type="button" id="owner-refresh-btn" class="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 text-[11px] font-semibold cursor-pointer">
              <i class="fa-solid fa-rotate"></i> Refresh
            </button>
          </div>

          <div class="grid grid-cols-2 gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
            <button type="button" id="owner-subtab-codes"
              class="py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${state.subtab === "codes" ? "bg-amber-500/25 text-amber-100 border border-amber-400/40" : "text-neutral-400 hover:text-white border border-transparent"}">
              VIP Codes (${state.codes.length})
            </button>
            <button type="button" id="owner-subtab-users"
              class="py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${state.subtab === "users" ? "bg-amber-500/25 text-amber-100 border border-amber-400/40" : "text-neutral-400 hover:text-white border border-transparent"}">
              Assign User VIP (${state.users.length})
            </button>
          </div>

          ${
            state.error
              ? `<div class="px-3 py-2 rounded-xl bg-rose-500/15 border border-rose-500/35 text-rose-200 text-[11px]">${esc(state.error)}</div>`
              : ""
          }
          ${
            state.success
              ? `<div class="px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/35 text-emerald-200 text-[11px]">${esc(state.success)}</div>`
              : ""
          }

          ${
            state.subtab === "codes"
              ? `
            <form id="owner-create-code-form" class="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col gap-2.5">
              <div class="text-[11px] font-bold uppercase tracking-wider text-neutral-300">Create VIP Code</div>
              <div class="flex items-center gap-2">
                <input id="owner-code-str" type="text" required value="${esc(state.codeInput)}" placeholder="VIP-CODE-2026"
                  class="flex-1 px-3 py-2 rounded-xl bg-black/50 border border-white/15 focus:border-amber-400 text-white text-xs font-mono uppercase outline-none" />
                <button type="button" id="owner-rand-code-btn" class="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-neutral-200 cursor-pointer shrink-0">
                  Random
                </button>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div class="flex flex-col gap-1">
                  <label class="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Usage Amount</label>
                  <div class="flex items-center gap-2">
                    <input id="owner-max-uses" type="number" min="1" step="1" value="${esc(state.maxUsesInput)}" ${state.unlimitedUses ? "disabled" : ""}
                      class="w-24 px-3 py-1.5 rounded-xl bg-black/50 border border-white/15 text-white text-xs font-mono tabular-nums outline-none disabled:opacity-40" />
                    <label class="flex items-center gap-1.5 text-xs text-neutral-300 cursor-pointer select-none">
                      <input id="owner-unlimited-uses" type="checkbox" ${state.unlimitedUses ? "checked" : ""} class="accent-amber-400" />
                      <span>Unlimited</span>
                    </label>
                  </div>
                </div>

                <div class="flex flex-col gap-1">
                  <label class="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Expiration</label>
                  <select id="owner-expiry-preset" class="px-3 py-1.5 rounded-xl bg-black/60 border border-white/15 text-white text-xs outline-none">
                    <option value="never" ${state.expiryPreset === "never" ? "selected" : ""}>Never Expires</option>
                    <option value="1h" ${state.expiryPreset === "1h" ? "selected" : ""}>1 Hour</option>
                    <option value="24h" ${state.expiryPreset === "24h" ? "selected" : ""}>24 Hours</option>
                    <option value="7d" ${state.expiryPreset === "7d" ? "selected" : ""}>7 Days</option>
                    <option value="30d" ${state.expiryPreset === "30d" ? "selected" : ""}>30 Days</option>
                    <option value="custom" ${state.expiryPreset === "custom" ? "selected" : ""}>Custom Date/Time</option>
                  </select>
                </div>
              </div>

              ${
                state.expiryPreset === "custom"
                  ? `<input id="owner-custom-expiry" type="datetime-local" value="${esc(state.customExpiry)}"
                      class="px-3 py-1.5 rounded-xl bg-black/50 border border-white/15 text-white text-xs font-mono outline-none" />`
                  : ""
              }

              <div class="flex flex-col gap-1">
                <label class="text-[10px] font-semibold uppercase tracking-wider text-amber-300">Owner-Only Private Note</label>
                <input id="owner-note-input" type="text" maxlength="500" value="${esc(state.ownerNoteInput)}"
                  placeholder="Private note (e.g., Given to @friend for event — hidden from users)"
                  class="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 focus:border-amber-400 text-white text-xs outline-none" />
              </div>

              <button type="submit" ${state.saving ? "disabled" : ""}
                class="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs cursor-pointer transition-colors disabled:opacity-50">
                ${state.saving ? "Creating VIP Code..." : "Create VIP Code"}
              </button>
            </form>

            <div class="flex flex-col gap-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
              ${
                state.loading
                  ? `<div class="p-4 text-center text-xs text-neutral-400">Loading VIP codes...</div>`
                  : state.codes.length === 0
                    ? `<div class="p-4 text-center text-xs text-neutral-500 border border-dashed border-white/10 rounded-xl">No VIP codes created yet.</div>`
                    : state.codes
                        .map((c) => {
                          const expired = c.expiresAt && c.expiresAt <= Date.now();
                          const exhausted = c.maxUses !== null && c.usedCount >= c.maxUses;
                          const usageStr = c.maxUses === null ? `${c.usedCount} / ∞` : `${c.usedCount} / ${c.maxUses}`;
                          return `
                    <div class="p-3 rounded-xl bg-white/[0.04] border border-white/10 flex flex-col gap-1.5">
                      <div class="flex items-center justify-between gap-2 flex-wrap">
                        <div class="flex items-center gap-2">
                          <span class="font-mono font-bold text-xs text-white tracking-wider">${esc(c.code)}</span>
                          <span class="px-1.5 py-0.5 rounded text-[10px] font-mono tabular-nums ${
                            !c.active || expired || exhausted
                              ? "bg-rose-500/20 text-rose-300"
                              : "bg-emerald-500/20 text-emerald-300"
                          }">${!c.active ? "Disabled" : expired ? "Expired" : exhausted ? "Exhausted" : "Active"}</span>
                        </div>
                        <div class="flex items-center gap-1.5">
                          <span class="text-[11px] font-mono tabular-nums text-neutral-300">${usageStr} uses</span>
                          <span class="text-neutral-600">•</span>
                          <span class="text-[11px] text-neutral-400 tabular-nums">${esc(formatExpiryShort(c.expiresAt))}</span>
                          <button type="button" data-toggle-code="${esc(c.code)}" data-active="${c.active}"
                            class="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[10px] font-semibold text-neutral-200 cursor-pointer">
                            ${c.active ? "Disable" : "Enable"}
                          </button>
                          <button type="button" data-delete-code="${esc(c.code)}"
                            class="px-2 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/35 text-[10px] font-semibold text-rose-200 cursor-pointer">
                            Delete
                          </button>
                        </div>
                      </div>
                      ${
                        c.ownerNote
                          ? `<div class="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/25 text-[11px] text-amber-200 flex items-center gap-1.5">
                              <i class="fa-solid fa-eye-slash text-[10px] text-amber-400 shrink-0"></i>
                              <span class="truncate" title="${esc(c.ownerNote)}">Owner note: ${esc(c.ownerNote)}</span>
                            </div>`
                          : `<div class="text-[10px] text-neutral-500 italic">No owner note</div>`
                      }
                    </div>
                  `;
                        })
                        .join("")
              }
            </div>
          `
              : `
            <div class="p-3 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col gap-2">
              <div class="flex items-center gap-2">
                <input id="owner-user-search" type="text" value="${esc(state.userSearch)}" placeholder="Search registered Onyx Chat users..."
                  class="flex-1 px-3 py-1.5 rounded-xl bg-black/50 border border-white/15 text-white text-xs outline-none" />
                <select id="owner-assign-expiry" class="px-2.5 py-1.5 rounded-xl bg-black/60 border border-white/15 text-white text-xs outline-none">
                  <option value="never" ${state.assignExpiryPreset === "never" ? "selected" : ""}>Lifetime VIP</option>
                  <option value="24h" ${state.assignExpiryPreset === "24h" ? "selected" : ""}>24 Hours</option>
                  <option value="7d" ${state.assignExpiryPreset === "7d" ? "selected" : ""}>7 Days</option>
                  <option value="30d" ${state.assignExpiryPreset === "30d" ? "selected" : ""}>30 Days</option>
                </select>
              </div>
              <form id="owner-manual-email-form" class="flex items-center gap-2">
                <input id="owner-manual-email" type="email" value="${esc(state.manualEmailInput)}" placeholder="Or assign VIP directly by user email..."
                  class="flex-1 px-3 py-1.5 rounded-xl bg-black/50 border border-white/15 text-white text-xs outline-none" />
                <button type="submit" ${state.saving ? "disabled" : ""}
                  class="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs cursor-pointer shrink-0 disabled:opacity-50">
                  ${state.saving ? "Saving..." : "Grant by Email"}
                </button>
              </form>
            </div>

            <div class="flex flex-col gap-1.5 max-h-60 overflow-y-auto custom-scrollbar pr-1">
              ${
                state.loading
                  ? `<div class="p-4 text-center text-xs text-neutral-400">Loading Onyx Chat users...</div>`
                  : filteredUsers.length === 0
                    ? `<div class="p-4 text-center text-xs text-neutral-500 border border-dashed border-white/10 rounded-xl">No matching users found.</div>`
                    : filteredUsers
                        .map(
                          (u) => `
                  <div class="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-between gap-2">
                    <div class="flex items-center gap-2.5 min-w-0">
                      <img src="${esc(u.photoURL || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(u.uid)}`)}" class="w-7 h-7 rounded-full object-cover bg-black/50 shrink-0" />
                      <div class="flex flex-col min-w-0">
                        <span class="text-xs font-semibold text-white truncate">@${esc(u.username)}</span>
                        <span class="text-[10px] text-neutral-400 truncate">${esc(u.email || u.uid)}</span>
                      </div>
                    </div>
                    <div class="flex items-center gap-2 shrink-0">
                      <span class="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        u.vipActive ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-neutral-400"
                      }">${u.vipActive ? "VIP" : "Free"}</span>
                      <button type="button" ${state.saving ? "disabled" : ""} data-vip-uid="${esc(u.uid)}" data-vip-email="${esc(u.email)}" data-vip-username="${esc(u.username)}" data-vip-next="${!u.vipActive}"
                        class="px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors disabled:opacity-50 ${
                          u.vipActive
                            ? "bg-rose-500/20 hover:bg-rose-500/35 text-rose-200"
                            : "bg-indigo-600 hover:bg-indigo-500 text-white"
                        }">
                        ${u.vipActive ? "Revoke" : "Grant VIP"}
                      </button>
                    </div>
                  </div>
                `
                        )
                        .join("")
              }
            </div>
          `
          }
        </div>
      `;

      const refBtn = container.querySelector("#owner-refresh-btn");
      if (refBtn) refBtn.onclick = () => loadAll();

      const tabCodes = container.querySelector("#owner-subtab-codes");
      if (tabCodes) {
        tabCodes.onclick = () => {
          state.subtab = "codes";
          state.error = "";
          state.success = "";
          draw();
        };
      }
      const tabUsers = container.querySelector("#owner-subtab-users");
      if (tabUsers) {
        tabUsers.onclick = () => {
          state.subtab = "users";
          state.error = "";
          state.success = "";
          draw();
        };
      }

      if (state.subtab === "codes") {
        const codeStrInp = container.querySelector("#owner-code-str");
        const maxUsesInp = container.querySelector("#owner-max-uses");
        const unlimitedChk = container.querySelector("#owner-unlimited-uses");
        const presetSel = container.querySelector("#owner-expiry-preset");
        const customExpInp = container.querySelector("#owner-custom-expiry");
        const noteInp = container.querySelector("#owner-note-input");
        const randBtn = container.querySelector("#owner-rand-code-btn");

        if (codeStrInp) codeStrInp.oninput = (e) => { state.codeInput = e.target.value; };
        if (maxUsesInp) maxUsesInp.oninput = (e) => { state.maxUsesInput = e.target.value; };
        if (noteInp) noteInp.oninput = (e) => { state.ownerNoteInput = e.target.value; };
        if (customExpInp) customExpInp.oninput = (e) => { state.customExpiry = e.target.value; };
        if (unlimitedChk) {
          unlimitedChk.onchange = (e) => {
            state.unlimitedUses = Boolean(e.target.checked);
            draw();
          };
        }
        if (presetSel) {
          presetSel.onchange = (e) => {
            state.expiryPreset = e.target.value;
            draw();
          };
        }
        if (randBtn) {
          randBtn.onclick = () => {
            state.codeInput = auth.generateRandomCode();
            draw();
          };
        }

        const createForm = container.querySelector("#owner-create-code-form");
        if (createForm) {
          createForm.onsubmit = async (e) => {
            e.preventDefault();
            if (state.saving) return;
            state.saving = true;
            state.error = "";
            state.success = "";
            draw();
            try {
              const expiresAt = resolveDurationMs(state.expiryPreset, state.customExpiry);
              if (state.expiryPreset === "custom" && !expiresAt) {
                throw new Error("Select a valid future date/time for custom expiration.");
              }
              const maxUses = state.unlimitedUses ? null : Number(state.maxUsesInput);
              const created = await auth.ownerCreateVipCode({
                code: state.codeInput,
                maxUses,
                expiresAt,
                ownerNote: state.ownerNoteInput,
              });
              state.saving = false;
              state.codes = [created, ...state.codes.filter((x) => x.code !== created.code)];
              state.success = `Created VIP code ${created.code}`;
              state.codeInput = auth.generateRandomCode();
              state.ownerNoteInput = "";
              await loadAll();
            } catch (err) {
              state.saving = false;
              state.error = err?.message || "Failed to create VIP code.";
              draw();
            }
          };
        }

        container.querySelectorAll("[data-toggle-code]").forEach((btn) => {
          btn.onclick = async () => {
            if (state.saving) return;
            const c = btn.getAttribute("data-toggle-code");
            const curActive = btn.getAttribute("data-active") === "true";
            state.saving = true;
            state.error = "";
            draw();
            try {
              await auth.ownerToggleVipCode(c, !curActive);
              state.saving = false;
              state.success = `${c} ${curActive ? "disabled" : "enabled"}.`;
              await loadAll();
            } catch (err) {
              state.saving = false;
              state.error = err?.message || "Failed to update code.";
              draw();
            }
          };
        });

        container.querySelectorAll("[data-delete-code]").forEach((btn) => {
          btn.onclick = async () => {
            if (state.saving) return;
            const c = btn.getAttribute("data-delete-code");
            state.saving = true;
            state.error = "";
            draw();
            try {
              await auth.ownerDeleteVipCode(c);
              state.saving = false;
              state.codes = state.codes.filter((x) => x.code !== c);
              state.success = `Deleted VIP code ${c}.`;
              await loadAll();
            } catch (err) {
              state.saving = false;
              state.error = err?.message || "Failed to delete code.";
              draw();
            }
          };
        });
      } else {
        const searchInp = container.querySelector("#owner-user-search");
        if (searchInp) {
          searchInp.oninput = (e) => {
            state.userSearch = e.target.value;
            draw();
            const nextInp = container.querySelector("#owner-user-search");
            if (nextInp) {
              nextInp.focus();
              nextInp.selectionStart = nextInp.selectionEnd = nextInp.value.length;
            }
          };
        }
        const assignSel = container.querySelector("#owner-assign-expiry");
        if (assignSel) {
          assignSel.onchange = (e) => {
            state.assignExpiryPreset = e.target.value;
          };
        }
        const manualInp = container.querySelector("#owner-manual-email");
        if (manualInp) manualInp.oninput = (e) => { state.manualEmailInput = e.target.value; };

        const manualForm = container.querySelector("#owner-manual-email-form");
        if (manualForm) {
          manualForm.onsubmit = async (e) => {
            e.preventDefault();
            if (state.saving) return;
            const email = state.manualEmailInput.trim().toLowerCase();
            if (!email) return;
            state.saving = true;
            state.error = "";
            state.success = "";
            draw();
            try {
              const exp = resolveDurationMs(state.assignExpiryPreset, null);
              const res = await auth.ownerSetUserVip({ email }, true, exp);
              state.saving = false;
              state.manualEmailInput = "";
              state.success = res?.pendingEmail
                ? `VIP queued for ${email} (activates automatically when they sign in).`
                : `Granted VIP to ${email}.`;
              await loadAll();
            } catch (err) {
              state.saving = false;
              state.error = err?.message || "Failed to assign VIP.";
              draw();
            }
          };
        }

        container.querySelectorAll("[data-vip-uid]").forEach((btn) => {
          btn.onclick = async () => {
            if (state.saving) return;
            const uid = btn.getAttribute("data-vip-uid");
            const email = btn.getAttribute("data-vip-email") || "";
            const username = btn.getAttribute("data-vip-username") || "";
            const grant = btn.getAttribute("data-vip-next") === "true";
            state.saving = true;
            state.error = "";
            state.success = "";
            draw();
            try {
              const exp = grant ? resolveDurationMs(state.assignExpiryPreset, null) : null;
              await auth.ownerSetUserVip({ uid, email, username }, grant, exp);
              state.saving = false;
              state.users = state.users.map((u) =>
                u.uid === uid ? { ...u, vipActive: grant, vipExpiresAt: exp || null } : u
              );
              state.success = `${grant ? "Granted" : "Revoked"} VIP for @${username || email}.`;
              await loadAll();
            } catch (err) {
              state.saving = false;
              state.error = err?.message || "Failed to update user VIP.";
              draw();
            }
          };
        });
      }
    }

    loadAll();
  }

  // ---------------------------------------------------------------------------
  // 4. Interactive VeilOS First-Use Tour
  // ---------------------------------------------------------------------------
  const TOUR_STEPS = [
    {
      title: "Welcome to VeilOS",
      body: "Your Onyx Chat account is synced across the entire OS. Launch apps, browse through Scramjet, customize cloaking, and manage extensions from one workspace.",
      selector: null,
    },
    {
      title: "Quick Search & Commands (⌘K)",
      body: "Press ⌘K (or click here) anytime to open Spotlight. Search apps, calculate math expressions, or jump directly to any URL.",
      selector: '[data-tour="spotlight"]',
    },
    {
      title: "App Dock & VIP Apps",
      body: "Launch Onyx Browser, Pulse Games, and Onyx Chat right from the dock. SSV Movies, Scenario, Sonora, and Cloud Gaming unlock automatically with VIP.",
      selector: '[data-tour="dock"]',
    },
    {
      title: "VeilOS Menu & Tab Cloaking",
      body: "Open the VeilOS Menu to toggle the dock, desktop widgets, sound effects, About:Blank stealth mode, or Preferences.",
      selector: '[data-tour="startmenu"]',
    },
    {
      title: "Account, VIP Codes & Browser",
      body: "Click your Account chip anytime to open Settings, redeem VIP codes, replay this tour, or install Chrome extensions via onyx://extensions.",
      selector: '[data-tour="account-widget"]',
    },
  ];

  let activeTourRoot = null;
  let activeTourStep = 0;

  function removeTourOverlay(markDone) {
    if (markDone) {
      try {
        localStorage.setItem(TOUR_STORAGE_KEY, "true");
      } catch (_) {}
    }
    if (activeTourRoot) {
      try { activeTourRoot.remove(); } catch (_) {}
      activeTourRoot = null;
    }
    window.removeEventListener("resize", renderTourStepPosition);
    window.removeEventListener("keydown", handleTourKey);
  }

  function handleTourKey(e) {
    if (!activeTourRoot) return;
    if (e.key === "Escape") {
      e.preventDefault();
      removeTourOverlay(true);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      if (activeTourStep < TOUR_STEPS.length - 1) {
        activeTourStep++;
        renderTourStep();
      } else {
        removeTourOverlay(true);
      }
    } else if (e.key === "ArrowLeft" && activeTourStep > 0) {
      e.preventDefault();
      activeTourStep--;
      renderTourStep();
    }
  }

  function renderTourStepPosition() {
    if (!activeTourRoot) return;
    const step = TOUR_STEPS[activeTourStep];
    const spotlightBox = activeTourRoot.querySelector("#veil-tour-spotlight");
    const card = activeTourRoot.querySelector("#veil-tour-card");
    const backdrop = activeTourRoot.querySelector("#veil-tour-backdrop");
    if (!spotlightBox || !card || !backdrop) return;

    const target = step.selector ? document.querySelector(step.selector) : null;
    const rect = target ? target.getBoundingClientRect() : null;
    const visibleRect = rect && rect.width > 0 && rect.height > 0 ? rect : null;

    if (visibleRect) {
      const pad = 8;
      const top = Math.max(4, visibleRect.top - pad);
      const left = Math.max(4, visibleRect.left - pad);
      const width = Math.min(window.innerWidth - left - 4, visibleRect.width + pad * 2);
      const height = Math.min(window.innerHeight - top - 4, visibleRect.height + pad * 2);

      spotlightBox.style.display = "block";
      spotlightBox.style.top = `${top}px`;
      spotlightBox.style.left = `${left}px`;
      spotlightBox.style.width = `${width}px`;
      spotlightBox.style.height = `${height}px`;
      backdrop.style.background = "transparent";

      const cardW = Math.min(340, window.innerWidth - 24);
      card.style.width = `${cardW}px`;
      let cardLeft = left + width / 2 - cardW / 2;
      cardLeft = Math.max(12, Math.min(window.innerWidth - cardW - 12, cardLeft));

      const spaceBelow = window.innerHeight - (top + height);
      const spaceAbove = top;
      card.style.transform = "none";
      if (spaceAbove > 210 && spaceAbove >= spaceBelow) {
        card.style.top = "auto";
        card.style.bottom = `${window.innerHeight - top + 14}px`;
      } else {
        card.style.bottom = "auto";
        card.style.top = `${Math.min(window.innerHeight - 210, top + height + 14)}px`;
      }
      card.style.left = `${cardLeft}px`;
    } else {
      spotlightBox.style.display = "none";
      backdrop.style.background = "rgba(4, 4, 8, 0.78)";
      card.style.width = `${Math.min(360, window.innerWidth - 24)}px`;
      card.style.bottom = "auto";
      card.style.top = "50%";
      card.style.left = "50%";
      card.style.transform = "translate(-50%, -50%)";
    }
  }

  function renderTourStep() {
    if (!activeTourRoot) return;
    const step = TOUR_STEPS[activeTourStep];
    const isFirst = activeTourStep === 0;
    const isLast = activeTourStep === TOUR_STEPS.length - 1;
    const card = activeTourRoot.querySelector("#veil-tour-card");
    if (!card) return;

    card.innerHTML = `
      <div class="flex items-center justify-between gap-2 mb-2">
        <span class="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-300 tabular-nums">Step ${activeTourStep + 1} of ${TOUR_STEPS.length}</span>
        <button type="button" id="veil-tour-skip" class="text-[11px] text-neutral-400 hover:text-white cursor-pointer transition-colors">Skip tour</button>
      </div>
      <h3 class="text-sm font-bold text-white mb-1.5">${esc(step.title)}</h3>
      <p class="text-xs text-neutral-300 leading-relaxed mb-4">${esc(step.body)}</p>
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-1">
          ${TOUR_STEPS.map((_, idx) => `<span class="h-1.5 rounded-full transition-all ${idx === activeTourStep ? "w-4 bg-indigo-400" : "w-1.5 bg-white/20"}"></span>`).join("")}
        </div>
        <div class="flex items-center gap-2">
          ${!isFirst ? `<button type="button" id="veil-tour-back" class="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white cursor-pointer">Back</button>` : ""}
          <button type="button" id="veil-tour-next" class="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-500 hover:from-indigo-500 hover:to-sky-400 text-xs font-bold text-white cursor-pointer shadow-lg">
            ${isLast ? "Finish Tour" : "Next"}
          </button>
        </div>
      </div>
    `;

    card.querySelector("#veil-tour-skip").onclick = () => removeTourOverlay(true);
    const backBtn = card.querySelector("#veil-tour-back");
    if (backBtn) {
      backBtn.onclick = () => {
        if (activeTourStep > 0) {
          activeTourStep--;
          renderTourStep();
        }
      };
    }
    card.querySelector("#veil-tour-next").onclick = () => {
      if (activeTourStep < TOUR_STEPS.length - 1) {
        activeTourStep++;
        renderTourStep();
      } else {
        removeTourOverlay(true);
      }
    };

    renderTourStepPosition();
  }

  const VeilTour = {
    start() {
      removeTourOverlay(false);
      activeTourStep = 0;

      const root = document.createElement("div");
      root.id = "veil-tour-root";
      root.className = "fixed inset-0 z-[10050] pointer-events-auto font-sans";
      root.innerHTML = `
        <div id="veil-tour-backdrop" class="fixed inset-0 transition-colors duration-200"></div>
        <div id="veil-tour-spotlight" style="position:fixed;border-radius:18px;box-shadow:0 0 0 9999px rgba(4,4,8,0.78), 0 0 0 2px rgba(129,140,248,0.9), 0 0 28px rgba(99,102,241,0.45);transition:all 0.25s cubic-bezier(0.16,1,0.3,1);pointer-events:none;z-index:10051;"></div>
        <div id="veil-tour-card" style="position:fixed;z-index:10052;" class="bg-[#111118]/98 border border-indigo-400/35 rounded-2xl p-4 shadow-2xl backdrop-blur-2xl text-white"></div>
      `;
      document.body.appendChild(root);
      activeTourRoot = root;
      renderTourStep();
      window.addEventListener("resize", renderTourStepPosition);
      window.addEventListener("keydown", handleTourKey);
    },
    startIfFirstTime() {
      try {
        if (localStorage.getItem(TOUR_STORAGE_KEY) === "true") return;
      } catch (_) {}
      setTimeout(() => {
        if (window.osGlobalInstance && !window.osGlobalInstance.isLocked) {
          VeilTour.start();
        }
      }, 450);
    },
    stop() {
      removeTourOverlay(true);
    },
  };

  window.VeilAccountUI = {
    mountLockScreenCard,
    renderPanel: renderAccountVipPanel,
  };
  window.VeilOwnerUI = {
    renderPanel: renderOwnerPanel,
  };
  window.VeilTour = VeilTour;
})();
