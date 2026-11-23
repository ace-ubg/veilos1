const fs = require('fs');
const files = [
  'public/index.html',
  'static/index.html',
  'public/playground.html',
  'static/playground.html'
];

const gtagSnippet = `
		<script async src="https://www.googletagmanager.com/gtag/js?id=G-0LH2MR13BF"></script>
		<script>
		  window.dataLayer = window.dataLayer || [];
		  function gtag(){dataLayer.push(arguments);}
		  gtag('js', new Date());

		  gtag('config', 'G-0LH2MR13BF');
		</script>
`;

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    if (!content.includes('G-0LH2MR13BF')) {
      content = content.replace('</head>', gtagSnippet + '\t</head>');
      fs.writeFileSync(file, content);
      console.log(`Updated ${file}`);
    }
  }
});
