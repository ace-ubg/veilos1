const script1 = document.createElement('script');
script1.async = true;
script1.src = 'https://www.googletagmanager.com/gtag/js?id=G-0LH2MR13BF';
document.head.appendChild(script1);

window.dataLayer = window.dataLayer || [];
function gtag(){window.dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-0LH2MR13BF');

var store = (typeof window !== "undefined" && window.store) ||
	(typeof self !== "undefined" && self.store) ||
	(typeof store !== "undefined" ? store : { transport: "/libcurl/index.mjs", wispurl: (typeof WISP_URL !== "undefined" ? WISP_URL : ((typeof window !== "undefined" && window.WISP_URL) || "wss://fern.best/wisp/")), bareurl: "https://fern.best/bare/" });
const flex = css`
	display: flex;
`;
const col = css`
	flex-direction: column;
`;

const scramjetReady = window.ScramjetHost
	? window.ScramjetHost.boot({ transport: store.transport, wisp: store.wispurl })
	: Promise.reject(new Error("ScramjetHost is not defined. Include /scram-host.js."));

// Serves the editor's HTML/CSS/JS for the fake origin. In Scramjet 2.x requests are handled
// page-side, so this is a controller plugin rather than a service worker "request" event.
class PlaygroundPlugin extends $scramjetController.ManagedPlugin {
	constructor(getData) {
		super("playground", []);
		this.getData = getData;
	}
	install(frame) {
		super.install(frame);
		this.tap(frame.hooks.fetch.intercept, (context, props) => {
			const data = this.getData();
			if (!data) return;
			const href = context.parsed.url.href;
			if (!href.startsWith(data.origin)) return;
			let body = "empty response";
			let type = null;
			if (href === data.origin + "/") {
				body = data.html;
				type = "text/html";
			} else if (href === data.origin + "/style.css") {
				body = data.css;
				type = "text/css";
			} else if (href === data.origin + "/script.js") {
				body = data.js;
				type = "application/javascript";
			}
			props.response = {
				body,
				status: 200,
				statusText: "OK",
				headers: $scramjet.ScramjetHeaders.fromRawHeaders(type ? [["content-type", type]] : []),
			};
		});
	}
}

function PlaygroundApp() {
	this.css = `
    width: 100%;
    height: 100%;
    color: #f0fef4;
    display: flex;
    padding: 0.5em;
    box-sizing: border-box;
    gap: 0.5em;


    .codesplit {
      width: 50%;
      height: 100%;
      display: flex;
      flex-direction: column;

      gap: 0.5em;
    }

    .mcontainer {
      background: #1e1e1e;
      h2 {
        margin: 0.1em;
      }

      border: 1px solid #313131;
      flex-basis: 100%;
      display: flex;
      flex-direction: column;
    }
    .monaco {
      flex: 1;
    }

    .frame {
      height: 100%;
      display: flex;
      flex-direction: column;
      gap: 0.5em;
      iframe {
        width: 100%;
      	border: 1px solid #313131;
      }
    }
    .config {
      border: 1px solid #313131;
      background: #1e1e1e;
      padding: 0.5em;
    }
  `;

	this.fakeorigin = "https://sandboxedorigin.com";
	this.mount = async () => {
		const monaco = await import(
			"https://cdn.jsdelivr.net/npm/monaco-editor/+esm"
		);

		const dedent = (await import("https://cdn.jsdelivr.net/npm/dedent/+esm"))
			.default;

		monaco.editor.setTheme("vs-dark");
		const html = monaco.editor.create(this.htmlbox, {
			value: dedent`
			<html>
				<head>
					<link rel="stylesheet" href="/style.css"></link>
					<script src="/script.js"></script>

					<script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.7.1/jquery.min.js"></script>
				</head>
				<body>
					<h1>Scramjet Sandbox Playground</h1>
					<p>
					Scramjet allows any webpage to be run on the same origin in an isolated manner
					</p>


					<button onclick="checkOrigin()">Test emulated origin</button>
					<button onclick="loadResource('https://example.com/')">Load assets through sandbox</button>
					<br><br>

					<h2>iframe test</h2>
					<button onclick="loadiframe()">test iframe nesting</button>
					<br>
				</body>
			</html>
		`,
			language: "html",
			automaticLayout: true,
		});
		const css = monaco.editor.create(this.cssbox, {
			value: dedent`
			/* resources loaded by css are intercepted by service worker */
			@import url('https://fonts.googleapis.com/css2?family=Hind:wght@300;400;500;600;700&family=Roboto:ital,wght@0,100;0,300;0,400;0,500;0,700;0,900;1,100;1,300;1,400;1,500;1,700;1,900&display=swap');

			body, html {
				background: #1e1e1e;
				color: white;
				width: 100%;
				height: 100%;
				font-family: "Roboto";
			}
			iframe {
				zoom: 0.75;
				width: 50%;
				height: 50%;
			}
		`,
			language: "css",
			automaticLayout: true,
		});
		const js = monaco.editor.create(this.jsbox, {
			value: dedent`
			function checkOrigin() {
				// real origin is hidden from the page
				alert("origin: " + window.origin);
			}

			// external resources fetched will be re-
			// directed to the WISP server
			function loadResource(url) {
				fetch(url).then(r => {
					console.log("loaded", r);
				})
			}
			function loadiframe()  {
				if (document.getElementById("nested-frame")) return;
				let frame = document.createElement("iframe");
				frame.id = "nested-frame";
				frame.src = "https://google.com";
				document.body.appendChild(frame);
			}
		`,
			language: "javascript",
			automaticLayout: true,
		});

		const recompile = async () => {
			const host = await scramjetReady;
			this.playgroundData = {
				html: html.getValue(),
				css: css.getValue(),
				js: js.getValue(),
				origin: this.fakeorigin,
			};
			if (!this.sjFrame) {
				this.sjFrame = host.createFrame(this.frame, {
					plugins: [new PlaygroundPlugin(() => this.playgroundData)],
				});
			}
			this.sjFrame.go(this.fakeorigin);
		};

		recompile();
		html.getModel().onDidChangeContent(recompile);
		css.getModel().onDidChangeContent(recompile);
		js.getModel().onDidChangeContent(recompile);
	};

	return html`
		<div>
			<div class="codesplit">
				<div class="mcontainer">
					<h2>HTML</h2>
					<div class="monaco" bind:this=${use(this.htmlbox)}></div>
				</div>

				<div class="mcontainer">
					<h2>CSS</h2>
					<div class="monaco" bind:this=${use(this.cssbox)}></div>
				</div>

				<div class="mcontainer">
					<h2>JS</h2>
					<div class="monaco" bind:this=${use(this.jsbox)}></div>
				</div>
			</div>
			<div class="frame" style="flex: 1">
				<iframe style="flex: 1" bind:this=${use(this.frame)}></iframe>
				<div class="config">
					<h1>Config</h1>
					<div>
						<label>fake origin:</label>
						<input bind:value=${use(this.fakeorigin)} />

						<label>wisp server:</label>
						<input bind:value=${use(store.wispurl)} />
					</div>
				</div>
			</div>
		</div>
	`;
}

window.addEventListener("load", async () => {
	const root = document.getElementById("app");
	try {
		root.replaceWith(h(PlaygroundApp));
	} catch (e) {
		root.replaceWith(document.createTextNode("" + e));
		throw e;
	}
});
